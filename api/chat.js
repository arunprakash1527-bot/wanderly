// Vercel Serverless Function — proxies chat requests to Claude API
// Set ANTHROPIC_API_KEY in Vercel environment variables

import { createClient } from "@supabase/supabase-js";

function getAllowedOrigin(req) {
  const origin = req.headers?.origin || "";
  const allowed = ["https://tripwithme.app", "https://www.tripwithme.app", "http://localhost:3000"];
  return allowed.includes(origin) ? origin : allowed[0];
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", getAllowedOrigin(req));
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Verify Supabase auth token
  const authHeader = req.headers.authorization;
  if (authHeader) {
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ error: "Unauthorized", fallback: true });
      }
    } catch (e) {
      // If Supabase env vars not set, allow request (dev mode)
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "API not configured", fallback: true });
  }

  try {
    const { message, tripContext, chatHistory } = req.body;

    if (!message) return res.status(400).json({ error: "Message is required" });

    // Build system prompt with trip context
    const systemPrompt = buildSystemPrompt(tripContext);

    // Build messages array from chat history
    const messages = [];
    if (chatHistory && chatHistory.length > 0) {
      // Include last 10 messages for context
      const recent = chatHistory.slice(-10);
      for (const msg of recent) {
        messages.push({
          role: msg.role === "ai" ? "assistant" : "user",
          content: msg.text,
        });
      }
    }
    // Add the current message
    messages.push({ role: "user", content: message });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Claude API error:", response.status, errBody);
      return res.status(502).json({ error: "API request failed", fallback: true });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "I couldn't process that request.";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    return res.status(500).json({ error: "Internal server error", fallback: true });
  }
}

function buildSystemPrompt(ctx) {
  if (!ctx) {
    return `You are Trip With Me, a friendly and knowledgeable AI travel concierge.
Help users plan trips, find restaurants, activities, and local recommendations.
Keep responses concise (under 200 words), use markdown formatting with bold and bullet points.
Be warm, helpful, and specific with recommendations.`;
  }

  const parts = [`You are Trip With Me, an AI travel concierge helping plan a trip.`];

  if (ctx.tripName) parts.push(`Trip: "${ctx.tripName}"`);
  if (ctx.dates) parts.push(`Dates: ${ctx.dates}`);
  if (ctx.places?.length) parts.push(`Places: ${ctx.places.join(", ")}`);
  if (ctx.travelMode) parts.push(`Travel mode: ${ctx.travelMode}`);

  if (ctx.travellers) {
    const t = ctx.travellers;
    const ppl = [];
    if (t.adults?.length) ppl.push(`${t.adults.length} adults`);
    if (t.olderKids?.length) ppl.push(`${t.olderKids.length} older kids (${t.olderKids.map(k => `${k.name}, ${k.age}`).join("; ")})`);
    if (t.youngerKids?.length) ppl.push(`${t.youngerKids.length} younger kids (${t.youngerKids.map(k => `${k.name}, ${k.age}`).join("; ")})`);
    if (ppl.length) parts.push(`Travellers: ${ppl.join(", ")}`);
  }

  if (ctx.stays?.length) {
    parts.push(`Stays: ${ctx.stays.map(s => `${s.name} (${s.type}, ${s.checkIn || ""} to ${s.checkOut || ""})`).join("; ")}`);
  }

  if (ctx.prefs) {
    if (ctx.prefs.food?.length) parts.push(`Food preferences: ${ctx.prefs.food.join(", ")}`);
    if (ctx.prefs.adultActs?.length) parts.push(`Adult activities: ${ctx.prefs.adultActs.join(", ")}`);
    if (ctx.prefs.olderActs?.length) parts.push(`Older kid activities: ${ctx.prefs.olderActs.join(", ")}`);
    if (ctx.prefs.youngerActs?.length) parts.push(`Younger kid activities: ${ctx.prefs.youngerActs.join(", ")}`);
    if (ctx.prefs.instructions) parts.push(`Special instructions: ${ctx.prefs.instructions}`);
  }

  if (ctx.budget) parts.push(`Budget: ${ctx.budget}`);
  if (ctx.currentDay) parts.push(`Currently viewing: Day ${ctx.currentDay}`);
  if (ctx.currentLocation) parts.push(`Current location: ${ctx.currentLocation}`);

  parts.push(`
Guidelines:
- Keep responses concise (under 200 words), use markdown with **bold** and bullet points
- ALWAYS base recommendations on the Current location (the place the user is at on their selected day) — never default to another city
- Give specific, real recommendations with ratings and prices when possible
- Consider the group composition (kids' ages, dietary prefs) in all suggestions
- For restaurants: recommend places IN the current location, mention cuisine type, price range (£/££/£££), family-friendliness
- For activities: recommend things to do IN the current location, mention suitability for different ages, duration, cost
- Be warm, friendly, and proactive — suggest things they might not have thought of
- Use emoji sparingly for visual appeal
- If asked about routes/directions, give estimated times and recommend stops
- Format links as [text](url) when providing external references
- When suggesting restaurants or activities, remind the user they can say "Add [name] to Day X" to plug it into their itinerary
- Always mention which day/location you're recommending for`);

  return parts.join("\n");
}
