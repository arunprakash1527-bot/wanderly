// Vercel Serverless Function — Open Charge Map API proxy for EV charger data
// Returns detailed charger info: connectors, facilities, distance, real-time status

import { createClient } from "@supabase/supabase-js";

const ALLOWED_ORIGINS = ["https://tripwithme.app", "https://www.tripwithme.app", "http://localhost:3000"];

function getAllowedOrigin(req) {
  const origin = req.headers?.origin || "";
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

// Score a charger for route-planning quality (0-100)
function scoreCharger(charger) {
  let score = 0;
  // More charge points = less queue risk (max 30 pts)
  score += Math.min(30, (charger.totalPoints || 1) * 5);
  // Faster charger = better (max 40 pts)
  const kw = charger.maxPowerKW || 0;
  if (kw >= 150) score += 40;
  else if (kw >= 50) score += 30;
  else if (kw > 7) score += 15;
  else score += 5;
  // Operational bonus (20 pts)
  if (charger.isOperational) score += 20;
  // Facilities bonus (max 10 pts)
  score += Math.min(10, (charger.facilities?.length || 0) * 3);
  return score;
}

// Linear interpolation between two coords at a given fraction (0-1)
function interpolateCoords(from, to, fraction) {
  return {
    lat: from.lat + (to.lat - from.lat) * fraction,
    lng: from.lng + (to.lng - from.lng) * fraction,
  };
}

// Haversine distance in miles between two {lat, lng} objects
function haversineMiles(a, b) {
  const R = 3959; // Earth radius in miles
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const x = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export default async function handler(req, res) {
  const origin = getAllowedOrigin(req);
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }

  if (req.method === "OPTIONS") return res.status(origin ? 200 : 403).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Verify Supabase auth token
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(503).json({ error: "Auth service not configured" });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized — missing auth token" });
  }
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: "Unauthorized" });
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized — token validation failed" });
  }

  try {
    // ── ROUTE MODE: find best chargers along a route ──
    if (req.body.mode === "route") {
      const { fromLat, fromLng, toLat, toLng, rangeMiles = 200, connectorType, maxStops = 3 } = req.body;
      if (!fromLat || !fromLng || !toLat || !toLng) {
        return res.status(400).json({ error: "Route mode requires fromLat, fromLng, toLat, toLng" });
      }

      const from = { lat: fromLat, lng: fromLng };
      const to = { lat: toLat, lng: toLng };
      const totalMiles = haversineMiles(from, to);
      const safeRange = rangeMiles * 0.65; // 65% of rated range for real-world + safety margin

      // Determine how many stops needed
      const stopsNeeded = Math.min(maxStops, Math.max(0, Math.ceil(totalMiles / safeRange) - 1));

      if (stopsNeeded === 0) {
        return res.status(200).json({
          stopPoints: [],
          totalMiles: Math.round(totalMiles),
          stopsNeeded: 0,
          message: `No charging stops needed — ${Math.round(totalMiles)} miles is within your ${rangeMiles} mile range.`,
        });
      }

      const ocmKey = process.env.OCM_API_KEY;
      const connectorMap = { "type2": "25", "ccs": "33", "chademo": "2", "type1": "1,32" };
      const connTypeId = connectorType ? connectorMap[connectorType.toLowerCase()] : null;

      // For each stop point, find chargers at that position along the route
      const stopPoints = await Promise.all(
        Array.from({ length: stopsNeeded }, (_, i) => {
          const fraction = (i + 1) / (stopsNeeded + 1); // Evenly space stops
          const point = interpolateCoords(from, to, fraction);
          const milesFromStart = Math.round(totalMiles * fraction);

          const params = new URLSearchParams({
            output: "json", latitude: point.lat, longitude: point.lng,
            distance: 20, distanceunit: "KM", maxresults: 8,
            compact: "true", verbose: "false",
          });
          if (connTypeId) params.set("connectiontypeid", connTypeId);
          if (ocmKey) params.set("key", ocmKey);

          return fetch(`https://api.openchargemap.io/v3/poi/?${params.toString()}`, {
            headers: { "User-Agent": "Wanderly-TripWithMe/1.0", ...(ocmKey ? { "x-api-key": ocmKey } : {}) },
          })
          .then(r => r.ok ? r.json() : [])
          .then(data => {
            if (!Array.isArray(data) || data.length === 0) return { milesFromStart, lat: point.lat, lng: point.lng, chargers: [] };
            const chargers = data.map(station => {
              const connections = (station.Connections || []).map(c => ({
                type: c.ConnectionType?.Title || "Unknown",
                powerKW: c.PowerKW || null,
                quantity: c.Quantity || 1,
                status: c.StatusType?.Title || null,
              }));
              const connectorTypes = [...new Set(connections.map(c => c.type))];
              const maxPower = Math.max(...connections.map(c => c.powerKW || 0));
              const totalPoints = connections.reduce((sum, c) => sum + c.quantity, 0);
              let speedLabel = "Slow (≤7kW)";
              if (maxPower >= 150) speedLabel = "Ultra-Rapid (150kW+)";
              else if (maxPower >= 50) speedLabel = "Rapid (50kW+)";
              else if (maxPower > 7) speedLabel = "Fast (7-50kW)";
              const isOperational = station.StatusType?.IsOperational !== false;
              const comments = [station.GeneralComments || "", (station.MetadataValues?.map(m => m.ItemValue) || []).join("; ")].join(" ");
              const facilities = [];
              const fkw = { "wifi": /wi-?fi|internet/i, "toilet": /toilet|restroom|wc/i, "cafe": /caf[eé]|coffee|costa|starbucks/i, "restaurant": /restaurant|food|diner/i, "shop": /shop|store|supermarket|tesco|sainsbury/i, "parking": /parking|car park/i, "24h": /24.?h|24.?7|always open/i };
              for (const [label, regex] of Object.entries(fkw)) {
                if (regex.test(comments) || regex.test(station.AddressInfo?.AddressLine1 || "")) facilities.push(label);
              }
              return {
                name: station.AddressInfo?.Title || "EV Charger",
                address: [station.AddressInfo?.AddressLine1, station.AddressInfo?.Town, station.AddressInfo?.Postcode].filter(Boolean).join(", "),
                lat: station.AddressInfo?.Latitude, lng: station.AddressInfo?.Longitude,
                connectors: connectorTypes, connections, maxPowerKW: maxPower > 0 ? maxPower : null,
                speedLabel, totalPoints, isOperational, facilities,
                operator: station.OperatorInfo?.Title || null,
                usageCost: station.UsageCost || null,
                mapsLink: `https://www.google.com/maps/dir/?api=1&destination=${station.AddressInfo?.Latitude},${station.AddressInfo?.Longitude}`,
                zapMapLink: `https://www.zap-map.com/live/?lat=${station.AddressInfo?.Latitude}&lng=${station.AddressInfo?.Longitude}&z=15`,
                ocmId: station.ID,
              };
            });

            // Score and rank chargers
            const scored = chargers
              .filter(c => c.isOperational)
              .map(c => ({ ...c, score: scoreCharger(c) }))
              .sort((a, b) => b.score - a.score)
              .slice(0, 3);

            return { milesFromStart, lat: point.lat, lng: point.lng, chargers: scored };
          })
          .catch(() => ({ milesFromStart, lat: point.lat, lng: point.lng, chargers: [] }));
        })
      );

      return res.status(200).json({
        stopPoints,
        totalMiles: Math.round(totalMiles),
        stopsNeeded,
        message: `${stopsNeeded} charging stop${stopsNeeded > 1 ? "s" : ""} recommended along ${Math.round(totalMiles)} mile route.`,
      });
    }

    // ── SINGLE-POINT MODE (existing behaviour) ──
    const { lat, lng, locationName, maxResults = 5, connectorType } = req.body;
    if (!lat && !lng && !locationName) return res.status(400).json({ error: "Location required" });

    let searchLat = lat, searchLng = lng;

    // If no coords, geocode the location name
    if (!searchLat || !searchLng) {
      const geoKey = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.GOOGLE_MAPS_API_KEY;
      if (geoKey && locationName) {
        const geoRes = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationName)}&key=${geoKey}`
        );
        const geoData = await geoRes.json();
        if (geoData.results?.[0]?.geometry?.location) {
          searchLat = geoData.results[0].geometry.location.lat;
          searchLng = geoData.results[0].geometry.location.lng;
        }
      }
      if (!searchLat || !searchLng) {
        return res.status(400).json({ error: "Could not determine location coordinates" });
      }
    }

    // Open Charge Map API — free, no key required (optional key for higher rate limits)
    const params = new URLSearchParams({
      output: "json",
      latitude: searchLat,
      longitude: searchLng,
      distance: 15,
      distanceunit: "KM",
      maxresults: maxResults,
      compact: "true",
      verbose: "false",
    });

    // Filter by connector type if specified
    // OCM ConnectionTypeIDs: 25=Type2, 2=CHAdeMO, 33=CCS(Type2), 32=CCS(Type1), 1=Type1
    if (connectorType) {
      const connectorMap = {
        "type2": "25",
        "ccs": "33",
        "chademo": "2",
        "type1": "1,32",
      };
      const typeId = connectorMap[connectorType.toLowerCase()];
      if (typeId) params.set("connectiontypeid", typeId);
    }

    // OCM requires an API key — add via Vercel env var OCM_API_KEY
    const ocmKey = process.env.OCM_API_KEY;
    if (ocmKey) params.set("key", ocmKey);

    let ocmData = [];
    try {
      const ocmRes = await fetch(`https://api.openchargemap.io/v3/poi/?${params.toString()}`, {
        headers: { "User-Agent": "Wanderly-TripWithMe/1.0", ...(ocmKey ? { "x-api-key": ocmKey } : {}) },
      });
      if (ocmRes.ok) {
        const parsed = await ocmRes.json();
        if (Array.isArray(parsed)) ocmData = parsed;
      }
    } catch (e) { /* OCM failed — try Google Places fallback */ }

    // Fallback to Google Places if OCM returns nothing (no key / no results)
    if (ocmData.length === 0) {
      const geoKey = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.GOOGLE_MAPS_API_KEY;
      if (geoKey) {
        try {
          const gParams = new URLSearchParams({
            query: `EV charging station`,
            location: `${searchLat},${searchLng}`,
            radius: 15000,
            type: "electric_vehicle_charging_station",
            key: geoKey,
          });
          const gRes = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?${gParams.toString()}`);
          const gData = await gRes.json();
          if (gData.results?.length > 0) {
            const fallbackChargers = gData.results.slice(0, maxResults).map(p => {
              const plat = p.geometry?.location?.lat;
              const plng = p.geometry?.location?.lng;
              // Haversine distance
              let distKm = null;
              if (plat && plng) {
                const R = 6371;
                const dLat = (plat - searchLat) * Math.PI / 180;
                const dLng = (plng - searchLng) * Math.PI / 180;
                const a = Math.sin(dLat/2)**2 + Math.cos(searchLat*Math.PI/180)*Math.cos(plat*Math.PI/180)*Math.sin(dLng/2)**2;
                distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              }
              return {
                name: p.name,
                address: p.formatted_address || p.vicinity || "",
                lat: plat, lng: plng,
                distance: distKm ? `${distKm.toFixed(1)} km` : null,
                distanceKm: distKm,
                connectors: [],
                connections: [],
                maxPowerKW: null,
                speedLabel: null,
                totalPoints: null,
                operator: null, operatorUrl: null,
                usageType: null, usageCost: null,
                isOperational: p.business_status === "OPERATIONAL",
                facilities: [],
                zapMapLink: plat ? `https://www.zap-map.com/live/?lat=${plat}&lng=${plng}&z=15` : null,
                mapsLink: plat ? `https://www.google.com/maps/dir/?api=1&destination=${plat},${plng}` : `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
                rating: p.rating || null,
                openNow: p.opening_hours?.open_now ?? null,
                source: "google", // flag so chat handler knows detail level is lower
              };
            });
            return res.status(200).json({ chargers: fallbackChargers, source: "google" });
          }
        } catch (e) { /* both failed */ }
      }
      return res.status(200).json({ chargers: [] });
    }

    const chargers = ocmData.map(station => {
      // Extract unique connector types
      const connections = (station.Connections || []).map(c => ({
        type: c.ConnectionType?.Title || "Unknown",
        powerKW: c.PowerKW || null,
        quantity: c.Quantity || 1,
        status: c.StatusType?.Title || null,
      }));

      const connectorTypes = [...new Set(connections.map(c => c.type))];
      const maxPower = Math.max(...connections.map(c => c.powerKW || 0));
      const totalPoints = connections.reduce((sum, c) => sum + c.quantity, 0);

      // Speed classification
      let speedLabel = "Slow (≤7kW)";
      if (maxPower >= 150) speedLabel = "Ultra-Rapid (150kW+)";
      else if (maxPower >= 50) speedLabel = "Rapid (50kW+)";
      else if (maxPower > 7) speedLabel = "Fast (7-50kW)";

      // Distance
      const dist = station.AddressInfo?.Distance;
      const distUnit = station.AddressInfo?.DistanceUnit === 2 ? "mi" : "km";

      // Usage / access info
      const usageType = station.UsageType?.Title || null;
      const usageCost = station.UsageCost || null;
      const isOperational = station.StatusType?.IsOperational !== false;

      // Facilities — derive from operator and metadata
      const operator = station.OperatorInfo?.Title || null;
      const operatorUrl = station.OperatorInfo?.WebsiteURL || null;

      // General comments often mention facilities
      const comments = station.GeneralComments || "";
      const metaComments = station.MetadataValues?.map(m => m.ItemValue)?.join("; ") || "";
      const allComments = [comments, metaComments].filter(Boolean).join(" ");

      // Extract facility hints from comments and address
      const facilities = [];
      const facilityKeywords = {
        "wifi": /wi-?fi|internet/i,
        "toilet": /toilet|restroom|wc|bathroom/i,
        "cafe": /caf[eé]|coffee|costa|starbucks/i,
        "restaurant": /restaurant|food|diner|dining/i,
        "shop": /shop|store|retail|supermarket|tesco|sainsbury|asda|lidl|aldi/i,
        "parking": /parking|car park/i,
        "24h access": /24.?h|24.?7|always open/i,
      };
      for (const [label, regex] of Object.entries(facilityKeywords)) {
        if (regex.test(allComments) || regex.test(station.AddressInfo?.AddressLine1 || "")) {
          facilities.push(label);
        }
      }

      // Zap-Map deep link (UK chargers)
      const zapMapLink = `https://www.zap-map.com/live/?lat=${station.AddressInfo?.Latitude}&lng=${station.AddressInfo?.Longitude}&z=15`;

      return {
        name: station.AddressInfo?.Title || "EV Charger",
        address: [
          station.AddressInfo?.AddressLine1,
          station.AddressInfo?.Town,
          station.AddressInfo?.Postcode,
        ].filter(Boolean).join(", "),
        lat: station.AddressInfo?.Latitude,
        lng: station.AddressInfo?.Longitude,
        distance: dist ? `${dist.toFixed(1)} ${distUnit}` : null,
        distanceKm: dist || null,
        connectors: connectorTypes,
        connections,
        maxPowerKW: maxPower > 0 ? maxPower : null,
        speedLabel,
        totalPoints,
        operator,
        operatorUrl,
        usageType,
        usageCost,
        isOperational,
        facilities,
        zapMapLink,
        mapsLink: `https://www.google.com/maps/dir/?api=1&destination=${station.AddressInfo?.Latitude},${station.AddressInfo?.Longitude}`,
        ocmId: station.ID,
      };
    });

    return res.status(200).json({ chargers });
  } catch (err) {
    console.error("EV Chargers API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
