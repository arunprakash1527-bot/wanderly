// Vercel Serverless Function — proxies chat requests to Claude API
// Set ANTHROPIC_API_KEY in Vercel environment variables

import { createClient } from "@supabase/supabase-js";

const ALLOWED_ORIGINS = ["https://tripwithme.app", "https://www.tripwithme.app", "http://localhost:3000"];

function getAllowedOrigin(req) {
  const origin = req.headers?.origin || "";
  return ALLOWED_ORIGINS.includes(origin) ? origin : null;
}

export default async function handler(req, res) {
  // CORS headers
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
    return res.status(401).json({ error: "Unauthorized — missing auth token", fallback: true });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Unauthorized", fallback: true });
    }
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized — token validation failed", fallback: true });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "API not configured", fallback: true });
  }

  try {
    const { message, tripContext, chatHistory, intelligence, stream: wantStream } = req.body;

    if (!message) return res.status(400).json({ error: "Message is required" });

    // Build system prompt with trip context + real-time intelligence
    const systemPrompt = buildSystemPrompt(tripContext, intelligence);

    // Build messages array from chat history
    const messages = [];
    if (chatHistory && chatHistory.length > 0) {
      // Include last 10 messages for context, filtering out empty/invalid entries
      const recent = chatHistory.slice(-10);
      for (const msg of recent) {
        if (!msg.text || typeof msg.text !== 'string' || msg.text.trim().length === 0) continue;
        const role = msg.role === "ai" ? "assistant" : "user";
        // Ensure no consecutive same-role messages (Claude API requirement)
        if (messages.length > 0 && messages[messages.length - 1].role === role) {
          messages[messages.length - 1].content += "\n" + msg.text;
        } else {
          messages.push({ role, content: msg.text });
        }
      }
    }
    // Add the current message
    if (messages.length > 0 && messages[messages.length - 1].role === "user") {
      messages[messages.length - 1].content += "\n" + message;
    } else {
      messages.push({ role: "user", content: message });
    }

    // Add chatSummary context if provided
    if (req.body.chatSummary) {
      messages[0] = { role: messages[0].role, content: `[Context: ${req.body.chatSummary}]\n\n${messages[0].content}` };
    }

    // ── SSE streaming mode ──
    if (wantStream) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

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
          stream: true,
          system: systemPrompt,
          messages,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        console.error("Claude API stream error:", response.status, errBody);
        res.write(`data: ${JSON.stringify({ error: "API request failed" })}\n\n`);
        return res.end();
      }

      const reader = response.body;
      let buffer = "";

      reader.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") { res.write("data: [DONE]\n\n"); continue; }
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              res.write(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`);
            }
            if (parsed.type === "message_stop") {
              res.write("data: [DONE]\n\n");
            }
          } catch (e) { /* skip unparseable lines */ }
        }
      });

      reader.on("end", () => { res.write("data: [DONE]\n\n"); res.end(); });
      reader.on("error", (err) => {
        console.error("Stream read error:", err);
        res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
        res.end();
      });
      return;
    }

    // ── Non-streaming mode (original) ──
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

function buildSystemPrompt(ctx, intel) {
  if (!ctx) {
    return `You are Trip With Me, a friendly and knowledgeable AI travel concierge.
Help users plan trips, find restaurants, activities, and local recommendations.
Keep responses concise (under 200 words), use markdown formatting with bold and bullet points.
Be warm, helpful, and specific with recommendations.`;
  }

  const parts = [`You are Trip With Me, an AI travel concierge helping plan a trip.`];

  if (ctx.tripName) parts.push(`Trip: "${ctx.tripName}"`);
  if (ctx.brief) parts.push(`Trip brief (from the organiser — use this to personalise all recommendations): ${ctx.brief}`);
  if (ctx.dates) parts.push(`Dates: ${ctx.dates}`);
  if (ctx.places?.length) parts.push(`Places: ${ctx.places.join(", ")}`);
  if (ctx.travelMode) parts.push(`Travel mode: ${ctx.travelMode}`);

  if (ctx.travellers) {
    const t = ctx.travellers;
    const ppl = [];
    if (t.adults?.length) ppl.push(`${t.adults.length} adults`);
    if (t.olderKids?.length) ppl.push(`${t.olderKids.length} older kids (${t.olderKids.map(k => `${k.name}, ${k.age}`).join("; ")})`);
    if (t.youngerKids?.length) ppl.push(`${t.youngerKids.length} younger kids (${t.youngerKids.map(k => `${k.name}, ${k.age}`).join("; ")})`);
    if (t.infants?.length) ppl.push(`${t.infants.length} infants (${t.infants.map(k => `${k.name}, ${k.age}`).join("; ")})`);
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

  // ── Real-time Intelligence from connectors ──
  if (intel) {
    parts.push("\n--- REAL-TIME INTELLIGENCE (use this to give smart, contextual advice) ---");

    if (intel.weather) {
      const w = intel.weather;
      if (w.current) parts.push(`WEATHER NOW: ${w.current.temp}°C, ${w.current.condition} (feels like ${w.current.feelsLike}°C)`);
      if (w.today) parts.push(`TODAY'S FORECAST: High ${w.today.high}°C / Low ${w.today.low}°C, ${w.today.condition}, rain: ${w.today.rainMm}mm, wind: ${w.today.windAvg} m/s`);
      if (w.daily?.length > 1) {
        const upcoming = w.daily.slice(1, 4).map(d => `${d.date}: ${d.high}°/${d.low}° ${d.condition}${d.rainMm > 1 ? ` (${d.rainMm}mm rain)` : ""}`).join("; ");
        parts.push(`NEXT DAYS: ${upcoming}`);
      }
    }

    if (intel.currency?.rates) {
      const rateStrs = Object.entries(intel.currency.rates).map(([code, info]) => info.example);
      if (rateStrs.length > 0) parts.push(`EXCHANGE RATES: ${rateStrs.join(", ")}`);
    }

    if (intel.language) {
      parts.push(`LOCAL LANGUAGE: ${intel.language.lang} — hello: "${intel.language.hello}", thanks: "${intel.language.thanks}", bill: "${intel.language.bill}"`);
    }

    if (intel.directions) {
      parts.push(`TRAVEL TODAY: ${intel.directions.totalDistanceText} drive (${intel.directions.totalDurationText})`);
    }

    if (intel.evChargers?.length > 0) {
      parts.push(`EV CHARGING: ${intel.evChargers.length} stations nearby — ${intel.evChargers.slice(0, 3).map(c => c.name).join(", ")}`);
    }

    if (intel.nearbyAttractions?.length > 0) {
      parts.push(`TOP ATTRACTIONS NEARBY: ${intel.nearbyAttractions.slice(0, 5).map(a => `${a.name}${a.rating ? ` (${a.rating}★)` : ""}`).join(", ")}`);
    }

    if (intel.alerts?.length > 0) {
      parts.push(`ACTIVE ALERTS: ${intel.alerts.map(a => `${a.icon} ${a.title}: ${a.message}`).join("; ")}`);
    }
  }

  parts.push(`
Guidelines:
- Keep responses concise (under 200 words), use markdown with **bold** and bullet points
- If the user mentions a specific place in their message, base recommendations on THAT place — even if it differs from the current day's location
- Otherwise base recommendations on the Current location (the place the user is at on their selected day)
- Give specific, real recommendations with ratings and prices when possible
- Consider the group composition (kids' ages, dietary prefs) in all suggestions
- USE THE REAL-TIME INTELLIGENCE above to give weather-aware, currency-aware, context-rich advice:
  • If it's rainy, suggest indoor alternatives. If sunny, push outdoor activities.
  • If it's a travel day, factor in drive time. Suggest rest stops and charging stops for EV.
  • Mention exchange rates when discussing costs ("about X in local currency").
  • Share language tips when relevant ("try saying X to locals").
  • Warn about weather changes in coming days ("tomorrow looks rainy — do outdoor stuff today").
  • For EV travellers, proactively mention charging options.
- For restaurants: recommend places IN the current location, mention cuisine type, price range (£/££/£££), family-friendliness
- For activities: recommend things to do IN the current location, mention suitability for different ages, duration, cost
- Be warm, friendly, and proactive — suggest things they might not have thought of
- Use emoji sparingly for visual appeal
- If asked about routes/directions, give estimated times and recommend stops
- When suggesting restaurants or activities, remind the user they can say "Add [name] to Day X" to plug it into their itinerary
- Always mention which day/location you're recommending for`);

  return parts.join("\n");
}
