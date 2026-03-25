import { API } from "../constants/api";
import { authFetch } from "./authFetch";

/**
 * Trip Intelligence Engine
 * Fetches real-time signals (weather, currency, directions, EV, attractions, language)
 * and returns unified intelligence for a trip's current day.
 *
 * Results are cached per location+day to avoid redundant API calls.
 */

const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Detect the user's home currency from browser locale
 */
function detectHomeCurrency() {
  try {
    const locale = navigator.language || 'en-GB';
    // Map common locales to currencies
    const localeCurrencyMap = {
      'en-US': 'USD', 'en-GB': 'GBP', 'en-AU': 'AUD', 'en-CA': 'CAD',
      'en-NZ': 'NZD', 'en-IE': 'EUR', 'de': 'EUR', 'fr': 'EUR', 'es': 'EUR',
      'it': 'EUR', 'nl': 'EUR', 'pt': 'EUR', 'ja': 'JPY', 'zh': 'CNY',
      'ko': 'KRW', 'hi': 'INR', 'ar': 'AED', 'sv': 'SEK', 'no': 'NOK',
      'da': 'DKK', 'pl': 'PLN', 'cs': 'CZK', 'hu': 'HUF', 'ro': 'RON',
      'bg': 'BGN', 'hr': 'HRK', 'tr': 'TRY', 'ru': 'RUB', 'th': 'THB',
      'id': 'IDR', 'ms': 'MYR', 'vi': 'VND', 'fil': 'PHP', 'zh-TW': 'TWD',
      'zh-HK': 'HKD', 'en-SG': 'SGD', 'en-ZA': 'ZAR', 'pt-BR': 'BRL',
      'es-MX': 'MXN', 'es-AR': 'ARS', 'es-CL': 'CLP', 'es-CO': 'COP',
    };
    // Try exact match first, then language prefix
    return localeCurrencyMap[locale] || localeCurrencyMap[locale.split('-')[0]] || 'GBP';
  } catch { return 'GBP'; }
}

function cacheKey(location, dayNum) {
  return `${location.toLowerCase().trim()}|${dayNum}`;
}

/**
 * Fetch trip intelligence for a specific day/location
 * @param {Object} trip - The trip object
 * @param {number} dayNum - Current day number
 * @param {string} currentLocation - Location for this day
 * @returns {Object} intelligence data with signals, tips, alerts, weather, currency, etc.
 */
export async function fetchTripIntelligence(trip, dayNum, currentLocation) {
  if (!currentLocation || !trip) return null;

  const key = cacheKey(currentLocation, dayNum);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await authFetch(API.ENRICH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: currentLocation,
        places: trip.places || [],
        tripDates: trip.rawStart && trip.rawEnd ? { start: trip.rawStart, end: trip.rawEnd } : null,
        travelMode: trip.travel,
        homeCurrency: detectHomeCurrency(),
        dayNum,
        travellers: trip.travellers,
        budget: trip.budget,
        stays: trip.stays,
        timeline: trip.timeline,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    cache.set(key, { data, ts: Date.now() });
    return data;
  } catch (e) {
    console.warn("Trip intelligence fetch failed:", e.message);
    return null;
  }
}

/**
 * Build a smart greeting that incorporates intelligence signals
 */
export function buildSmartGreeting(intelligence, dayNum, location, stayName) {
  if (!intelligence) return null;

  const parts = [];

  // Weather line
  if (intelligence.weather?.current) {
    const w = intelligence.weather.current;
    const icon = weatherEmoji(w.condition);
    parts.push(`${icon} **${w.temp}°C** in ${location} — ${w.description}`);
  }

  // Travel day alert
  if (intelligence.directions) {
    const d = intelligence.directions;
    parts.push(`🚗 **Travel day:** ${d.totalDistanceText} ahead (${d.totalDurationText})`);
  }

  // Top alerts
  const topAlerts = (intelligence.alerts || []).slice(0, 2);
  for (const alert of topAlerts) {
    parts.push(`${alert.icon} ${alert.message}`);
  }

  // Currency (first visit to this location only)
  if (intelligence.currency?.rates) {
    const rates = Object.entries(intelligence.currency.rates);
    if (rates.length > 0 && dayNum <= 2) {
      const [code, info] = rates[0];
      parts.push(`💱 ${info.example}`);
    }
  }

  // Language tip (day 1 only)
  if (intelligence.language && dayNum === 1) {
    parts.push(`🌐 **${intelligence.language.lang}:** ${intelligence.language.greeting} (${intelligence.language.hello})`);
  }

  return parts.length > 0 ? parts.join("\n") : null;
}

/**
 * Build smart tips panel content
 */
export function buildSmartTips(intelligence) {
  if (!intelligence?.tips?.length) return [];

  // Deduplicate and limit to top 6 tips
  const seen = new Set();
  return intelligence.tips
    .filter(t => {
      const key = t.connector + t.tip.slice(0, 30);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6)
    .map(t => ({
      ...t,
      icon: connectorIcon(t.connector),
    }));
}

function weatherEmoji(condition) {
  const map = { Clear: "☀️", Clouds: "☁️", Rain: "🌧️", Drizzle: "🌦️", Thunderstorm: "⛈️", Snow: "🌨️", Mist: "🌫️", Fog: "🌫️" };
  return map[condition] || "🌤️";
}

function connectorIcon(connector) {
  const map = {
    weather: "🌤️", currency: "💱", ev: "⚡", traffic: "🚗", places: "📍",
    booking: "🎟️", accommodation: "🏨", restaurants: "🍽️", translate: "🌐",
    photos: "📸", payments: "💳", notifications: "🔔",
  };
  return map[connector] || "💡";
}
