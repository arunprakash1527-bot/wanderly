// Vercel Serverless Function — Currency exchange rates
// Uses free frankfurter.app API (no key needed, ECB data)

function getAllowedOrigin(req) {
  const origin = req.headers?.origin || "";
  const allowed = ["https://tripwithme.app", "https://www.tripwithme.app", "http://localhost:3000"];
  return allowed.includes(origin) ? origin : allowed[0];
}

// Map country/region to currency code
const LOCATION_CURRENCIES = {
  // Europe
  "uk": "GBP", "united kingdom": "GBP", "england": "GBP", "scotland": "GBP", "wales": "GBP", "london": "GBP", "edinburgh": "GBP", "manchester": "GBP", "birmingham": "GBP", "liverpool": "GBP", "bath": "GBP", "york": "GBP", "cornwall": "GBP", "lake district": "GBP", "cotswolds": "GBP", "brighton": "GBP", "oxford": "GBP", "cambridge": "GBP", "bristol": "GBP", "devon": "GBP", "dorset": "GBP", "norfolk": "GBP",
  "france": "EUR", "paris": "EUR", "nice": "EUR", "lyon": "EUR", "marseille": "EUR", "bordeaux": "EUR",
  "germany": "EUR", "berlin": "EUR", "munich": "EUR", "hamburg": "EUR", "frankfurt": "EUR",
  "italy": "EUR", "rome": "EUR", "milan": "EUR", "venice": "EUR", "florence": "EUR", "naples": "EUR", "amalfi": "EUR",
  "spain": "EUR", "madrid": "EUR", "barcelona": "EUR", "seville": "EUR", "malaga": "EUR", "ibiza": "EUR",
  "portugal": "EUR", "lisbon": "EUR", "porto": "EUR", "algarve": "EUR",
  "greece": "EUR", "athens": "EUR", "santorini": "EUR", "mykonos": "EUR", "crete": "EUR",
  "netherlands": "EUR", "amsterdam": "EUR",
  "belgium": "EUR", "brussels": "EUR",
  "austria": "EUR", "vienna": "EUR", "salzburg": "EUR",
  "ireland": "EUR", "dublin": "EUR",
  "switzerland": "CHF", "zurich": "CHF", "geneva": "CHF",
  "sweden": "SEK", "stockholm": "SEK",
  "norway": "NOK", "oslo": "NOK", "bergen": "NOK",
  "denmark": "DKK", "copenhagen": "DKK",
  "poland": "PLN", "warsaw": "PLN", "krakow": "PLN",
  "czech republic": "CZK", "prague": "CZK", "czechia": "CZK",
  "hungary": "HUF", "budapest": "HUF",
  "croatia": "EUR", "dubrovnik": "EUR", "split": "EUR",
  "turkey": "TRY", "istanbul": "TRY", "antalya": "TRY",
  "iceland": "ISK", "reykjavik": "ISK",
  // Americas
  "usa": "USD", "united states": "USD", "new york": "USD", "los angeles": "USD", "las vegas": "USD", "miami": "USD", "san francisco": "USD", "chicago": "USD", "hawaii": "USD", "florida": "USD", "california": "USD",
  "canada": "CAD", "toronto": "CAD", "vancouver": "CAD", "montreal": "CAD",
  "mexico": "MXN", "cancun": "MXN", "mexico city": "MXN",
  "brazil": "BRL", "rio": "BRL", "sao paulo": "BRL",
  "colombia": "COP", "bogota": "COP", "cartagena": "COP",
  "argentina": "ARS", "buenos aires": "ARS",
  // Asia
  "japan": "JPY", "tokyo": "JPY", "kyoto": "JPY", "osaka": "JPY",
  "thailand": "THB", "bangkok": "THB", "phuket": "THB", "chiang mai": "THB",
  "india": "INR", "delhi": "INR", "mumbai": "INR", "goa": "INR", "jaipur": "INR", "kerala": "INR",
  "vietnam": "VND", "hanoi": "VND", "ho chi minh": "VND",
  "singapore": "SGD",
  "malaysia": "MYR", "kuala lumpur": "MYR",
  "indonesia": "IDR", "bali": "IDR", "jakarta": "IDR",
  "south korea": "KRW", "seoul": "KRW",
  "china": "CNY", "beijing": "CNY", "shanghai": "CNY",
  "sri lanka": "LKR", "colombo": "LKR",
  // Middle East
  "uae": "AED", "dubai": "AED", "abu dhabi": "AED",
  "qatar": "QAR", "doha": "QAR",
  "israel": "ILS", "tel aviv": "ILS", "jerusalem": "ILS",
  "egypt": "EGP", "cairo": "EGP",
  "morocco": "MAD", "marrakech": "MAD",
  // Africa
  "south africa": "ZAR", "cape town": "ZAR", "johannesburg": "ZAR",
  "kenya": "KES", "nairobi": "KES",
  "tanzania": "TZS", "zanzibar": "TZS",
  // Oceania
  "australia": "AUD", "sydney": "AUD", "melbourne": "AUD",
  "new zealand": "NZD", "auckland": "NZD", "queenstown": "NZD",
  "fiji": "FJD",
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", getAllowedOrigin(req));
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { from, to, locations } = req.body;

    // If locations provided, detect currencies
    let fromCurrency = from || "GBP";
    let toCurrencies = to ? [to] : [];

    if (locations && locations.length > 0) {
      const detected = new Set();
      for (const loc of locations) {
        const lower = loc.toLowerCase().trim();
        for (const [key, currency] of Object.entries(LOCATION_CURRENCIES)) {
          if (lower.includes(key) || key.includes(lower)) {
            detected.add(currency);
            break;
          }
        }
      }
      // Remove home currency from destination currencies
      detected.delete(fromCurrency);
      toCurrencies = [...detected];
    }

    if (toCurrencies.length === 0) {
      return res.status(200).json({ rates: {}, homeCurrency: fromCurrency, note: "No foreign currencies detected" });
    }

    // Fetch rates from frankfurter.app (free, ECB data, no key needed)
    const toParam = toCurrencies.join(",");
    const rateRes = await fetch(`https://api.frankfurter.app/latest?from=${fromCurrency}&to=${toParam}`);
    const rateData = await rateRes.json();

    if (!rateData.rates) {
      return res.status(400).json({ error: "Could not fetch exchange rates" });
    }

    // Build useful rate info
    const rates = {};
    for (const [currency, rate] of Object.entries(rateData.rates)) {
      rates[currency] = {
        rate: Math.round(rate * 100) / 100,
        example: `1 ${fromCurrency} = ${Math.round(rate * 100) / 100} ${currency}`,
        tips: getCurrencyTips(currency),
      };
    }

    return res.status(200).json({
      homeCurrency: fromCurrency,
      rates,
      date: rateData.date,
    });
  } catch (err) {
    console.error("Currency API error:", err);
    return res.status(500).json({ error: "Internal server error", fallback: true });
  }
}

function getCurrencyTips(currency) {
  const tips = {
    EUR: "Widely accepted across eurozone. Cards work almost everywhere.",
    USD: "US dollar. Tip 15-20% at restaurants.",
    JPY: "Japan is still largely cash-based. Get yen at airport ATMs.",
    THB: "Thailand. Bargaining expected at markets. Avoid airport exchange.",
    INR: "India. Carry small denominations. UPI payments increasingly common.",
    CHF: "Switzerland. Very expensive — budget 50% more than eurozone.",
    TRY: "Turkey. Lira fluctuates — exchange as needed, not all at once.",
    MAD: "Morocco. Bargaining expected in souks. Keep small notes handy.",
    AUD: "Australia. Cards/tap accepted everywhere. No tipping expected.",
    NZD: "New Zealand. Cards work everywhere. No tipping culture.",
    SEK: "Sweden is nearly cashless. Cards/mobile payment for everything.",
    NOK: "Norway. Very expensive — budget accordingly. Cashless society.",
    ISK: "Iceland. Extremely card-friendly. No tipping expected.",
    CZK: "Czech Republic. Cheaper than western Europe. Watch for tourist traps.",
    HUF: "Hungary. Great value. Ruin bars in Budapest are cash-friendly.",
    PLN: "Poland. Excellent value. Card acceptance growing fast.",
    MXN: "Mexico. Tip 10-15%. Street vendors prefer cash.",
    SGD: "Singapore. Cards everywhere. Hawker centres may be cash.",
    AED: "UAE. Dirham pegged to USD. Cards widely accepted.",
    ZAR: "South Africa. Good value. Keep small change for tips.",
  };
  return tips[currency] || "Check local tipping customs and card acceptance.";
}
