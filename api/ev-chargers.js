// Vercel Serverless Function — Open Charge Map API proxy for EV charger data
// Returns detailed charger info: connectors, facilities, distance, real-time status

function getAllowedOrigin(req) {
  const origin = req.headers?.origin || "";
  const allowed = ["https://tripwithme.app", "https://www.tripwithme.app", "http://localhost:3000"];
  return allowed.includes(origin) ? origin : allowed[0];
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", getAllowedOrigin(req));
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
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
