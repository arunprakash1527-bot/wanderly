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

    const ocmRes = await fetch(`https://api.openchargemap.io/v3/poi/?${params.toString()}`, {
      headers: { "User-Agent": "Wanderly-TripWithMe/1.0" },
    });
    const ocmData = await ocmRes.json();

    if (!Array.isArray(ocmData) || ocmData.length === 0) {
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
