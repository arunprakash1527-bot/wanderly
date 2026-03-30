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
  if (!supabaseUrl || !supabaseAnonKey) return res.status(503).json({ error: "Auth not configured" });
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (error || !user) return res.status(401).json({ error: "Unauthorized" });
  } catch { return res.status(401).json({ error: "Unauthorized" }); }

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TripWithMe/1.0)' },
    });
    clearTimeout(timeout);
    const html = await response.text();

    const getMetaContent = (property) => {
      const match = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'))
        || html.match(new RegExp(`content=["']([^"']*?)["'][^>]*(?:property|name)=["']${property}["']`, 'i'));
      return match ? match[1] : null;
    };

    const title = getMetaContent('og:title') || (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1] || '';
    const description = getMetaContent('og:description') || getMetaContent('description') || '';
    const image = getMetaContent('og:image') || '';

    return res.status(200).json({ title: title.trim(), description: description.trim(), image });
  } catch (e) {
    return res.status(200).json({ title: '', description: '', image: '' });
  }
}
