// Vercel Serverless Function — Google Geocoding API proxy

import { createClient } from "@supabase/supabase-js";

function getAllowedOrigin(req) {
  const origin = req.headers?.origin || "";
  const allowed = ["https://tripwithme.app", "https://www.tripwithme.app", "http://localhost:3000"];
  return allowed.includes(origin) ? origin : allowed[0];
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", getAllowedOrigin(req));
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Verify Supabase auth token
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
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

  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Google Maps API not configured" });

  try {
    const { address, addresses } = req.body;

    // Batch geocode multiple addresses
    if (addresses && addresses.length > 0) {
      const results = await Promise.all(
        addresses.map(async (addr) => {
          const params = new URLSearchParams({ address: addr, key: apiKey });
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
          );
          const data = await response.json();
          if (data.results?.[0]) {
            return {
              address: addr,
              formatted: data.results[0].formatted_address,
              location: data.results[0].geometry.location,
            };
          }
          return { address: addr, formatted: null, location: null };
        })
      );
      return res.status(200).json({ results });
    }

    // Single address geocode
    if (!address) return res.status(400).json({ error: "Address required" });

    const params = new URLSearchParams({ address, key: apiKey });
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
    );
    const data = await response.json();

    if (data.status !== "OK" || !data.results?.[0]) {
      return res.status(404).json({ error: "Location not found" });
    }

    return res.status(200).json({
      formatted: data.results[0].formatted_address,
      location: data.results[0].geometry.location,
    });
  } catch (err) {
    console.error("Geocode API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
