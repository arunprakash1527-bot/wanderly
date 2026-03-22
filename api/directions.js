// Vercel Serverless Function — Google Directions API proxy
// Uses GOOGLE_MAPS_API_KEY from environment variables

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Google Maps API not configured" });

  try {
    const { origin, destination, waypoints, mode } = req.body;
    if (!origin || !destination) return res.status(400).json({ error: "Origin and destination required" });

    const params = new URLSearchParams({
      origin,
      destination,
      mode: mode || "driving",
      key: apiKey,
    });

    if (waypoints && waypoints.length > 0) {
      params.set("waypoints", waypoints.join("|"));
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
    );
    const data = await response.json();

    if (data.status !== "OK") {
      return res.status(400).json({ error: data.status, message: data.error_message || "Directions request failed" });
    }

    // Extract useful info from the response
    const route = data.routes[0];
    const legs = route.legs.map(leg => ({
      start: leg.start_address,
      end: leg.end_address,
      distance: leg.distance,
      duration: leg.duration,
      steps: leg.steps.map(s => ({
        instruction: s.html_instructions,
        distance: s.distance,
        duration: s.duration,
      })),
    }));

    return res.status(200).json({
      legs,
      totalDistance: legs.reduce((sum, l) => sum + l.distance.value, 0),
      totalDuration: legs.reduce((sum, l) => sum + l.duration.value, 0),
      totalDistanceText: formatDistance(legs.reduce((sum, l) => sum + l.distance.value, 0)),
      totalDurationText: formatDuration(legs.reduce((sum, l) => sum + l.duration.value, 0)),
      polyline: route.overview_polyline?.points || null,
      bounds: route.bounds,
    });
  } catch (err) {
    console.error("Directions API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

function formatDistance(meters) {
  const miles = meters / 1609.34;
  return miles < 1 ? `${Math.round(meters)} m` : `${Math.round(miles * 10) / 10} mi`;
}

function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  if (hrs === 0) return `${mins} min`;
  return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
}
