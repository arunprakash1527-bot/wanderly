// Vercel Serverless Function — OpenWeatherMap API proxy
// Set OPENWEATHER_API_KEY in Vercel environment variables
// Free tier: 1000 calls/day, 5-day forecast

import { createClient } from "@supabase/supabase-js";

const ALLOWED_ORIGINS = ["https://tripwithme.app", "https://www.tripwithme.app", "http://localhost:3000"];

function getAllowedOrigin(req) {
  const origin = req.headers?.origin || "";
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
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
    return res.status(503).json({ error: "Auth service not configured", fallback: true });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized — missing auth token", fallback: true });
  }
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: "Unauthorized", fallback: true });
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized — token validation failed", fallback: true });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Weather API not configured", fallback: true });

  try {
    const { location, lat, lng, units } = req.body;
    if (!location && (!lat || !lng)) return res.status(400).json({ error: "Location or coordinates required" });

    const unitParam = units || "metric";

    // Step 1: Get coordinates if only location name provided
    let latitude = lat, longitude = lng;
    if (!latitude || !longitude) {
      const geoParams = new URLSearchParams({ q: location, limit: 1, appid: apiKey });
      const geoRes = await fetch(`https://api.openweathermap.org/geo/1.0/direct?${geoParams}`);
      const geoData = await geoRes.json();
      if (!geoData?.[0]) return res.status(404).json({ error: "Location not found" });
      latitude = geoData[0].lat;
      longitude = geoData[0].lon;
    }

    // Step 2: Get current weather + 5-day forecast in parallel
    const [currentRes, forecastRes] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=${unitParam}&appid=${apiKey}`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=${unitParam}&appid=${apiKey}`),
    ]);

    const current = await currentRes.json();
    const forecast = await forecastRes.json();

    if (current.cod !== 200) {
      return res.status(400).json({ error: current.message || "Weather fetch failed" });
    }

    // Step 3: Parse current weather
    const now = {
      temp: Math.round(current.main.temp),
      feelsLike: Math.round(current.main.feels_like),
      humidity: current.main.humidity,
      condition: current.weather?.[0]?.main || "Unknown",
      description: current.weather?.[0]?.description || "",
      icon: current.weather?.[0]?.icon || "",
      wind: { speed: current.wind?.speed, deg: current.wind?.deg },
      visibility: current.visibility,
      sunrise: current.sys?.sunrise,
      sunset: current.sys?.sunset,
    };

    // Step 4: Parse 5-day forecast into daily summaries
    const dailyMap = {};
    for (const item of (forecast.list || [])) {
      const date = item.dt_txt.split(" ")[0];
      if (!dailyMap[date]) {
        dailyMap[date] = { temps: [], conditions: [], rain: 0, wind: [], humidity: [] };
      }
      dailyMap[date].temps.push(item.main.temp);
      dailyMap[date].conditions.push(item.weather?.[0]?.main);
      dailyMap[date].rain += (item.rain?.["3h"] || 0);
      dailyMap[date].wind.push(item.wind?.speed || 0);
      dailyMap[date].humidity.push(item.main.humidity);
    }

    const daily = Object.entries(dailyMap).map(([date, d]) => ({
      date,
      high: Math.round(Math.max(...d.temps)),
      low: Math.round(Math.min(...d.temps)),
      condition: mostFrequent(d.conditions),
      rainMm: Math.round(d.rain * 10) / 10,
      windAvg: Math.round(d.wind.reduce((a, b) => a + b, 0) / d.wind.length * 10) / 10,
      humidityAvg: Math.round(d.humidity.reduce((a, b) => a + b, 0) / d.humidity.length),
    }));

    // Step 5: Generate smart alerts
    const alerts = [];
    for (const day of daily) {
      if (day.rainMm > 5) alerts.push({ date: day.date, type: "rain", message: `Heavy rain expected (${day.rainMm}mm) — consider indoor activities` });
      else if (day.rainMm > 1) alerts.push({ date: day.date, type: "rain_light", message: `Light rain possible — bring an umbrella` });
      if (day.high >= 35) alerts.push({ date: day.date, type: "heat", message: `Very hot (${day.high}°C) — stay hydrated, plan shade breaks` });
      if (day.low <= 0) alerts.push({ date: day.date, type: "cold", message: `Near freezing (${day.low}°C) — dress warmly, check for ice` });
      if (day.windAvg > 10) alerts.push({ date: day.date, type: "wind", message: `Strong winds (${day.windAvg} m/s) — not ideal for outdoor activities` });
    }

    return res.status(200).json({ current: now, daily, alerts, location: location || `${latitude},${longitude}`, units: unitParam });
  } catch (err) {
    console.error("Weather API error:", err);
    return res.status(500).json({ error: "Internal server error", fallback: true });
  }
}

function mostFrequent(arr) {
  const counts = {};
  let max = 0, result = arr[0];
  for (const item of arr) {
    counts[item] = (counts[item] || 0) + 1;
    if (counts[item] > max) { max = counts[item]; result = item; }
  }
  return result;
}
