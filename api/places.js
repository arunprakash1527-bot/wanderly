// Vercel Serverless Function — Google Places API proxy
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
    const { query, location, radius, type } = req.body;
    if (!query && !location) return res.status(400).json({ error: "Query or location required" });

    let results;
    let apiStatus;
    let errorMessage;

    if (query && location) {
      // Text search near a location
      const params = new URLSearchParams({
        query,
        location: `${location.lat},${location.lng}`,
        radius: radius || 5000,
        key: apiKey,
      });
      if (type) params.set("type", type);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`
      );
      const data = await response.json();
      results = data.results || [];
      apiStatus = data.status;
      errorMessage = data.error_message;
    } else if (query) {
      // Text search without location
      const params = new URLSearchParams({ query, key: apiKey });
      if (type) params.set("type", type);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`
      );
      const data = await response.json();
      results = data.results || [];
      apiStatus = data.status;
      errorMessage = data.error_message;
    } else {
      // Nearby search (location only, no query)
      const params = new URLSearchParams({
        location: `${location.lat},${location.lng}`,
        radius: radius || 5000,
        key: apiKey,
      });
      if (type) params.set("type", type);

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`
      );
      const data = await response.json();
      results = data.results || [];
      apiStatus = data.status;
      errorMessage = data.error_message;
    }

    // Log issues for debugging
    if (apiStatus !== "OK" && apiStatus !== "ZERO_RESULTS") {
      console.error("Places API status:", apiStatus, errorMessage);
    }

    // Map to clean format (limit to top 8)
    const places = results.slice(0, 8).map(place => ({
      name: place.name,
      address: place.formatted_address || place.vicinity || "",
      rating: place.rating || null,
      totalRatings: place.user_ratings_total || 0,
      priceLevel: place.price_level != null ? "£".repeat(place.price_level || 1) : null,
      types: (place.types || []).slice(0, 3),
      location: place.geometry?.location || null,
      openNow: place.opening_hours?.open_now ?? null,
      placeId: place.place_id,
      photo: place.photos?.[0]
        ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${apiKey}`
        : null,
    }));

    return res.status(200).json({
      places,
      ...(places.length === 0 ? { apiStatus, error: errorMessage } : {}),
    });
  } catch (err) {
    console.error("Places API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
