// Vercel Serverless Function — Trip Intelligence Enrichment
// Orchestrates Weather, Currency, Places, and Directions APIs
// Returns unified intelligence for a trip's current day

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
    const { location, places, tripDates, travelMode, homeCurrency, dayNum, travellers, budget, stays, timeline } = req.body;

    if (!location) return res.status(400).json({ error: "Location required" });

    const intelligence = { location, dayNum, signals: [], tips: [], alerts: [] };
    const promises = [];

    // ── 1. Weather Intelligence ──
    const weatherKey = process.env.OPENWEATHER_API_KEY;
    if (weatherKey) {
      promises.push(
        fetchWeather(weatherKey, location, tripDates, dayNum).then(weather => {
          intelligence.weather = weather;
          if (weather) {
            // Generate weather-aware signals
            const today = weather.today;
            if (today) {
              intelligence.signals.push({ type: "weather", icon: weatherIcon(today.condition), label: `${today.high}°/${today.low}° ${today.condition}` });

              if (today.rainMm > 5) {
                intelligence.alerts.push({ type: "weather", severity: "warning", title: "Heavy rain expected", message: `${today.rainMm}mm of rain forecast. Consider indoor alternatives.`, icon: "🌧️" });
                intelligence.tips.push({ connector: "weather", tip: "Move outdoor activities indoors or reschedule to a drier day", priority: 1 });
              } else if (today.rainMm > 1) {
                intelligence.tips.push({ connector: "weather", tip: "Light rain possible — pack an umbrella and waterproof layer", priority: 3 });
              }

              if (today.high >= 35) {
                intelligence.alerts.push({ type: "weather", severity: "warning", title: "Extreme heat", message: `${today.high}°C expected. Schedule outdoor activities for morning/evening.`, icon: "🔥" });
                intelligence.tips.push({ connector: "weather", tip: "Plan outdoor activities before 11am or after 4pm to avoid peak heat", priority: 1 });
              } else if (today.high >= 30) {
                intelligence.tips.push({ connector: "weather", tip: "Hot day — stay hydrated, seek shade during midday", priority: 2 });
              }

              if (today.low <= 2) {
                intelligence.alerts.push({ type: "weather", severity: "info", title: "Near freezing", message: `Lows of ${today.low}°C. Watch for ice, dress warmly.`, icon: "🥶" });
              }

              if (today.windAvg > 10) {
                intelligence.tips.push({ connector: "weather", tip: `Strong winds (${today.windAvg} m/s) — avoid exposed cliff walks or boat trips`, priority: 2 });
              }

              // Golden hour tip for photographers
              if (weather.current?.sunset) {
                const sunsetTime = new Date(weather.current.sunset * 1000);
                const goldenHour = new Date(sunsetTime.getTime() - 60 * 60 * 1000);
                intelligence.tips.push({ connector: "photos", tip: `Golden hour starts ~${goldenHour.getHours()}:${String(goldenHour.getMinutes()).padStart(2, "0")} — great for photos`, priority: 4 });
              }
            }

            // Multi-day outlook
            if (weather.daily?.length > 1) {
              const nextRainy = weather.daily.find((d, i) => i > 0 && d.rainMm > 3);
              if (nextRainy) {
                intelligence.tips.push({ connector: "weather", tip: `Rain forecast on ${formatDate(nextRainy.date)} — consider swapping outdoor plans to today`, priority: 2 });
              }
            }
          }
        }).catch(() => {})
      );
    }

    // ── 2. Currency Intelligence ──
    if (places && places.length > 0) {
      promises.push(
        fetchCurrency(homeCurrency || "GBP", places).then(currency => {
          intelligence.currency = currency;
          if (currency?.rates && Object.keys(currency.rates).length > 0) {
            for (const [code, info] of Object.entries(currency.rates)) {
              intelligence.signals.push({ type: "currency", icon: "💱", label: info.example });
              intelligence.tips.push({ connector: "currency", tip: `${info.example} — ${info.tips}`, priority: 3 });
            }
          }
        }).catch(() => {})
      );
    }

    // ── 3. EV Charging Intelligence (if EV travel mode) ──
    const mapsKey = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.GOOGLE_MAPS_API_KEY;
    const isEV = travelMode && /ev|electric/i.test(Array.isArray(travelMode) ? travelMode.join(" ") : travelMode);
    if (isEV && mapsKey) {
      promises.push(
        fetchNearbyPlaces(mapsKey, location, "electric_vehicle_charging_station", 15000).then(evData => {
          intelligence.evChargers = evData;
          if (evData?.length > 0) {
            intelligence.signals.push({ type: "ev", icon: "⚡", label: `${evData.length} chargers nearby` });
            const openNow = evData.filter(c => c.openNow === true);
            intelligence.tips.push({ connector: "ev", tip: `${evData.length} EV chargers within 15km${openNow.length > 0 ? ` (${openNow.length} open now)` : ""}. Plan charging during meals or sightseeing.`, priority: 2 });
          } else {
            intelligence.alerts.push({ type: "ev", severity: "warning", title: "Limited EV charging", message: `Few charging stations found near ${location}. Plan your charging stops carefully.`, icon: "⚡" });
          }
        }).catch(() => {})
      );
    }

    // ── 4. Direction Intelligence (for travel days) ──
    if (mapsKey && stays && stays.length > 1 && dayNum) {
      const sortedStays = [...stays].filter(s => s.location).sort((a, b) => (a.checkIn || "").localeCompare(b.checkIn || ""));
      // Check if today is a travel day (moving between stays)
      if (tripDates?.start) {
        const tripStart = new Date(tripDates.start + "T12:00:00");
        const dayDate = new Date(tripStart.getTime() + (dayNum - 1) * 86400000).toISOString().split("T")[0];
        const currentStay = sortedStays.find(s => s.checkIn <= dayDate && s.checkOut > dayDate);
        const nextStay = sortedStays.find(s => s.checkIn === dayDate || (s.checkIn > dayDate && (!currentStay || s.location !== currentStay.location)));

        if (nextStay && currentStay && nextStay.location !== currentStay.location) {
          promises.push(
            fetchDirections(mapsKey, currentStay.location, nextStay.location, isEV ? "driving" : undefined).then(dirs => {
              intelligence.directions = dirs;
              if (dirs) {
                intelligence.signals.push({ type: "directions", icon: "🚗", label: `${dirs.totalDistanceText} · ${dirs.totalDurationText} to ${nextStay.location}` });
                intelligence.tips.push({ connector: "traffic", tip: `Travel day: ${dirs.totalDistanceText} to ${nextStay.name || nextStay.location} (about ${dirs.totalDurationText}). Leave early to maximise your day.`, priority: 1 });

                if (isEV && dirs.totalDistance > 150000) {
                  intelligence.tips.push({ connector: "ev", tip: `Long drive (${dirs.totalDistanceText}) — plan a charging stop midway`, priority: 1 });
                }
              }
            }).catch(() => {})
          );
        }
      }
    }

    // ── 5. Nearby Attractions Intelligence ──
    if (mapsKey) {
      promises.push(
        fetchNearbyPlaces(mapsKey, location, "tourist_attraction", 10000).then(attractions => {
          if (attractions?.length > 0) {
            intelligence.nearbyAttractions = attractions.slice(0, 5);
            const topRated = attractions.filter(a => a.rating >= 4.5).slice(0, 2);
            if (topRated.length > 0) {
              intelligence.tips.push({ connector: "places", tip: `Top-rated nearby: ${topRated.map(a => `${a.name} (${a.rating}★)`).join(", ")}`, priority: 3 });
            }
          }
        }).catch(() => {})
      );
    }

    // ── 6. Traveller-Aware Intelligence ──
    if (travellers) {
      const allKids = [...(travellers.olderKids || []), ...(travellers.youngerKids || []), ...(travellers.infants || [])];
      if (allKids.length > 0) {
        const youngest = Math.min(...allKids.map(k => parseInt(k.age) || 10));
        if (youngest <= 2) {
          intelligence.tips.push({ connector: "accommodation", tip: "Travelling with infants — check if your stay has a cot/crib. Pack nappies for travel days.", priority: 2 });
        } else if (youngest <= 5) {
          intelligence.tips.push({ connector: "booking", tip: "With young kids, keep activities under 2 hours. Schedule rest breaks after lunch.", priority: 2 });
        }
        if (allKids.some(k => parseInt(k.age) >= 8 && parseInt(k.age) <= 14)) {
          intelligence.tips.push({ connector: "booking", tip: "Tweens/teens enjoy hands-on experiences — look for kayaking, cycling, or cooking classes", priority: 4 });
        }
      }

      const adultCount = (travellers.adults?.length || 0);
      if (adultCount >= 4) {
        intelligence.tips.push({ connector: "restaurants", tip: "Large group — book restaurants in advance, ask about group menus for better value", priority: 3 });
      }
    }

    // ── 7. Budget Intelligence ──
    if (budget) {
      const budgetTips = {
        "Budget": "Look for free walking tours, picnic lunches, and happy hour deals",
        "Mid-range": "Balance paid attractions with free experiences. Lunch menus are often cheaper than dinner",
        "Luxury": "Consider concierge-booked experiences and restaurant tastings",
        "No limit": "Ask locals for hidden gems — the best experiences aren't always the most expensive",
      };
      if (budgetTips[budget]) {
        intelligence.tips.push({ connector: "payments", tip: budgetTips[budget], priority: 4 });
      }
    }

    // ── 8. Translation Intelligence ──
    const foreignLang = detectLanguage(location, places);
    if (foreignLang) {
      intelligence.language = foreignLang;
      intelligence.tips.push({ connector: "translate", tip: `${foreignLang.greeting} — locals appreciate when you try! Key phrases: hello (${foreignLang.hello}), thank you (${foreignLang.thanks}), the bill please (${foreignLang.bill})`, priority: 3 });
    }

    // Wait for all async enrichments
    await Promise.allSettled(promises);

    // Sort tips by priority (1 = most important)
    intelligence.tips.sort((a, b) => a.priority - b.priority);

    return res.status(200).json(intelligence);
  } catch (err) {
    console.error("Enrich API error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Helper: Fetch weather ───
async function fetchWeather(apiKey, location, tripDates, dayNum) {
  // Geocode the location
  const geoParams = new URLSearchParams({ q: location, limit: 1, appid: apiKey });
  const geoRes = await fetch(`http://api.openweathermap.org/geo/1.0/direct?${geoParams}`);
  const geoData = await geoRes.json();
  if (!geoData?.[0]) return null;

  const { lat, lon } = geoData[0];

  const [currentRes, forecastRes] = await Promise.all([
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`),
    fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`),
  ]);

  const current = await currentRes.json();
  const forecast = await forecastRes.json();

  // Parse daily from 3-hour forecast
  const dailyMap = {};
  for (const item of (forecast.list || [])) {
    const date = item.dt_txt.split(" ")[0];
    if (!dailyMap[date]) dailyMap[date] = { temps: [], conditions: [], rain: 0, wind: [], humidity: [] };
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

  // Match today's date to forecast
  const todayStr = tripDates?.start ? (() => {
    const start = new Date(tripDates.start + "T12:00:00");
    return new Date(start.getTime() + ((dayNum || 1) - 1) * 86400000).toISOString().split("T")[0];
  })() : new Date().toISOString().split("T")[0];

  const today = daily.find(d => d.date === todayStr) || daily[0] || null;

  return {
    current: {
      temp: Math.round(current.main?.temp || 0),
      feelsLike: Math.round(current.main?.feels_like || 0),
      condition: current.weather?.[0]?.main || "Unknown",
      description: current.weather?.[0]?.description || "",
      humidity: current.main?.humidity,
      sunset: current.sys?.sunset,
      sunrise: current.sys?.sunrise,
    },
    today,
    daily,
  };
}

// ─── Helper: Fetch currency ───
async function fetchCurrency(homeCurrency, places) {
  // Detect currencies from place names
  const LOCATION_CURRENCIES = {
    "uk": "GBP", "united kingdom": "GBP", "england": "GBP", "scotland": "GBP", "wales": "GBP", "london": "GBP", "edinburgh": "GBP", "bath": "GBP", "york": "GBP", "cornwall": "GBP", "cotswolds": "GBP", "lake district": "GBP", "brighton": "GBP", "manchester": "GBP", "devon": "GBP", "norfolk": "GBP",
    "france": "EUR", "paris": "EUR", "germany": "EUR", "berlin": "EUR", "italy": "EUR", "rome": "EUR", "spain": "EUR", "barcelona": "EUR", "portugal": "EUR", "lisbon": "EUR", "greece": "EUR", "amsterdam": "EUR", "dublin": "EUR", "croatia": "EUR",
    "switzerland": "CHF", "zurich": "CHF", "geneva": "CHF",
    "usa": "USD", "new york": "USD", "los angeles": "USD",
    "japan": "JPY", "tokyo": "JPY", "thailand": "THB", "bangkok": "THB",
    "india": "INR", "delhi": "INR", "mumbai": "INR", "goa": "INR",
    "turkey": "TRY", "istanbul": "TRY", "iceland": "ISK",
    "norway": "NOK", "sweden": "SEK", "denmark": "DKK",
    "australia": "AUD", "sydney": "AUD", "new zealand": "NZD",
    "uae": "AED", "dubai": "AED", "morocco": "MAD", "marrakech": "MAD",
    "czech republic": "CZK", "prague": "CZK", "hungary": "HUF", "budapest": "HUF", "poland": "PLN",
    "singapore": "SGD", "malaysia": "MYR", "indonesia": "IDR", "bali": "IDR",
    "south africa": "ZAR", "mexico": "MXN", "canada": "CAD",
  };

  const detected = new Set();
  for (const loc of places) {
    const lower = loc.toLowerCase().trim();
    for (const [key, currency] of Object.entries(LOCATION_CURRENCIES)) {
      if (lower.includes(key) || key.includes(lower)) { detected.add(currency); break; }
    }
  }
  detected.delete(homeCurrency);
  if (detected.size === 0) return null;

  const toParam = [...detected].join(",");
  const rateRes = await fetch(`https://api.frankfurter.app/latest?from=${homeCurrency}&to=${toParam}`);
  const rateData = await rateRes.json();
  if (!rateData.rates) return null;

  const rates = {};
  const currencyTips = {
    EUR: "Cards work almost everywhere in eurozone.",
    USD: "Tip 15-20% at US restaurants.",
    JPY: "Japan is still largely cash-based.",
    THB: "Bargaining expected at Thai markets.",
    CHF: "Switzerland is very expensive — budget 50% more.",
    TRY: "Lira fluctuates — exchange as needed.",
    INR: "UPI payments increasingly common in India.",
    ISK: "Iceland is nearly cashless.",
    CZK: "Great value — watch for tourist-trap exchange booths.",
  };

  for (const [code, rate] of Object.entries(rateData.rates)) {
    rates[code] = {
      rate: Math.round(rate * 100) / 100,
      example: `1 ${homeCurrency} = ${Math.round(rate * 100) / 100} ${code}`,
      tips: currencyTips[code] || "Check local card acceptance and tipping customs.",
    };
  }

  return { homeCurrency, rates, date: rateData.date };
}

// ─── Helper: Fetch nearby places ───
async function fetchNearbyPlaces(apiKey, location, type, radius) {
  // First geocode
  const geoParams = new URLSearchParams({ address: location, key: apiKey });
  const geoRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${geoParams}`);
  const geoData = await geoRes.json();
  if (!geoData.results?.[0]) return [];

  const { lat, lng } = geoData.results[0].geometry.location;
  const params = new URLSearchParams({
    location: `${lat},${lng}`,
    radius: radius || 10000,
    type,
    key: apiKey,
  });

  const res = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params}`);
  const data = await res.json();

  return (data.results || []).slice(0, 8).map(p => ({
    name: p.name,
    address: p.formatted_address || p.vicinity || "",
    rating: p.rating || null,
    openNow: p.opening_hours?.open_now ?? null,
    placeId: p.place_id,
    types: (p.types || []).slice(0, 3),
  }));
}

// ─── Helper: Fetch directions ───
async function fetchDirections(apiKey, origin, destination, mode) {
  const params = new URLSearchParams({ origin, destination, mode: mode || "driving", key: apiKey });
  const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`);
  const data = await res.json();
  if (data.status !== "OK" || !data.routes?.[0]) return null;

  const leg = data.routes[0].legs[0];
  return {
    totalDistance: leg.distance.value,
    totalDistanceText: leg.distance.text,
    totalDuration: leg.duration.value,
    totalDurationText: leg.duration.text,
  };
}

// ─── Helper: Detect language for location ───
function detectLanguage(location, places) {
  const allLocs = [location, ...(places || [])].join(" ").toLowerCase();
  const langs = {
    "france|paris|nice|lyon|bordeaux|marseille": { lang: "French", greeting: "Bonjour!", hello: "Bonjour", thanks: "Merci", bill: "L'addition, s'il vous plaît" },
    "spain|madrid|barcelona|seville|malaga": { lang: "Spanish", greeting: "¡Hola!", hello: "Hola", thanks: "Gracias", bill: "La cuenta, por favor" },
    "italy|rome|milan|venice|florence|naples|amalfi": { lang: "Italian", greeting: "Ciao!", hello: "Ciao / Buongiorno", thanks: "Grazie", bill: "Il conto, per favore" },
    "germany|berlin|munich|hamburg|frankfurt": { lang: "German", greeting: "Hallo!", hello: "Hallo", thanks: "Danke", bill: "Die Rechnung, bitte" },
    "portugal|lisbon|porto|algarve": { lang: "Portuguese", greeting: "Olá!", hello: "Olá", thanks: "Obrigado/a", bill: "A conta, por favor" },
    "japan|tokyo|kyoto|osaka": { lang: "Japanese", greeting: "Konnichiwa!", hello: "Konnichiwa", thanks: "Arigatō", bill: "O-kaikei onegaishimasu" },
    "thailand|bangkok|phuket|chiang mai": { lang: "Thai", greeting: "Sawadee ka/krap!", hello: "Sawadee", thanks: "Khob khun", bill: "Check bin" },
    "turkey|istanbul|antalya": { lang: "Turkish", greeting: "Merhaba!", hello: "Merhaba", thanks: "Teşekkürler", bill: "Hesap, lütfen" },
    "greece|athens|santorini|crete|mykonos": { lang: "Greek", greeting: "Yia sou!", hello: "Yia sou", thanks: "Efcharistó", bill: "Ton logariasmo, parakaló" },
    "morocco|marrakech": { lang: "Arabic/French", greeting: "Salam!", hello: "Salam / Bonjour", thanks: "Shukran / Merci", bill: "L'addition / Al-hisab" },
    "vietnam|hanoi|ho chi minh": { lang: "Vietnamese", greeting: "Xin chào!", hello: "Xin chào", thanks: "Cảm ơn", bill: "Tính tiền" },
    "india|delhi|mumbai|goa|jaipur|kerala": { lang: "Hindi", greeting: "Namaste!", hello: "Namaste", thanks: "Dhanyavaad", bill: "Bill de dijiye" },
    "croatia|dubrovnik|split": { lang: "Croatian", greeting: "Bok!", hello: "Bok / Zdravo", thanks: "Hvala", bill: "Račun, molim" },
    "czech|prague": { lang: "Czech", greeting: "Ahoj!", hello: "Dobrý den", thanks: "Děkuji", bill: "Účet, prosím" },
    "hungary|budapest": { lang: "Hungarian", greeting: "Szia!", hello: "Szia", thanks: "Köszönöm", bill: "A számlát kérem" },
    "poland|warsaw|krakow": { lang: "Polish", greeting: "Cześć!", hello: "Dzień dobry", thanks: "Dziękuję", bill: "Rachunek, proszę" },
    "iceland|reykjavik": { lang: "Icelandic", greeting: "Halló!", hello: "Halló", thanks: "Takk", bill: "Reikninginn, takk" },
    "netherlands|amsterdam": { lang: "Dutch", greeting: "Hoi!", hello: "Hallo", thanks: "Dank je", bill: "De rekening, alstublieft" },
  };

  for (const [pattern, info] of Object.entries(langs)) {
    if (new RegExp(pattern).test(allLocs)) return info;
  }
  return null;
}

function weatherIcon(condition) {
  const icons = { Clear: "☀️", Clouds: "☁️", Rain: "🌧️", Drizzle: "🌦️", Thunderstorm: "⛈️", Snow: "🌨️", Mist: "🌫️", Fog: "🌫️", Haze: "🌫️" };
  return icons[condition] || "🌤️";
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function mostFrequent(arr) {
  const counts = {};
  let max = 0, result = arr[0];
  for (const item of arr) { counts[item] = (counts[item] || 0) + 1; if (counts[item] > max) { max = counts[item]; result = item; } }
  return result;
}
