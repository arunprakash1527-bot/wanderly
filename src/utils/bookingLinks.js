/**
 * Booking Deep Links — generates smart booking/reservation links
 * for restaurants (OpenTable, TheFork) and activities (Viator, GetYourGuide)
 *
 * Uses affiliate deep links where available, search URL fallbacks otherwise.
 */

// ─── Affiliate config (set env vars once you have partner IDs) ───
const VIATOR_PID = process.env.REACT_APP_VIATOR_PID || "";
const VIATOR_MCID = process.env.REACT_APP_VIATOR_MCID || "";
const GYG_PARTNER_ID = process.env.REACT_APP_GYG_PARTNER_ID || "";

// ─── TheFork coverage — operates different domains per country ───
const THEFORK_DOMAINS = {
  france: "thefork.fr", italy: "thefork.it", spain: "thefork.es",
  portugal: "thefork.pt", belgium: "thefork.be", netherlands: "thefork.nl",
  switzerland: "thefork.ch", austria: "thefork.at", denmark: "thefork.dk",
  sweden: "thefork.se", norway: "thefork.no", uk: "thefork.co.uk",
  "united kingdom": "thefork.co.uk", england: "thefork.co.uk",
  scotland: "thefork.co.uk", wales: "thefork.co.uk",
  australia: "thefork.com.au", brazil: "thefork.com.br",
};

// ─── Region detection ───
const EUROPE_COUNTRIES = new Set([
  "france", "spain", "italy", "germany", "portugal", "netherlands", "belgium",
  "austria", "switzerland", "greece", "croatia", "turkey", "sweden", "norway",
  "denmark", "finland", "poland", "czech", "hungary", "romania", "ireland",
  "scotland", "wales", "england", "uk", "united kingdom",
]);

const resolveCountryFromLocation = (location) => {
  if (!location) return null;
  const l = location.toLowerCase();
  const cityMap = {
    paris: "france", lyon: "france", nice: "france", bordeaux: "france",
    rome: "italy", florence: "italy", venice: "italy", milan: "italy", naples: "italy",
    barcelona: "spain", madrid: "spain", seville: "spain", valencia: "spain",
    lisbon: "portugal", porto: "portugal",
    amsterdam: "netherlands", brussels: "belgium", bruges: "belgium",
    berlin: "germany", munich: "germany", hamburg: "germany",
    vienna: "austria", zurich: "switzerland", geneva: "switzerland",
    london: "england", manchester: "england", edinburgh: "scotland",
    dublin: "ireland", copenhagen: "denmark", stockholm: "sweden",
    oslo: "norway", helsinki: "finland", athens: "greece",
    prague: "czech", budapest: "hungary", dubrovnik: "croatia",
    istanbul: "turkey", sydney: "australia", melbourne: "australia",
    "new york": "usa", "los angeles": "usa", toronto: "canada",
    tokyo: "japan", bangkok: "thailand", singapore: "singapore",
  };
  for (const [city, country] of Object.entries(cityMap)) {
    if (l.includes(city)) return country;
  }
  // Check if the location itself is a country name
  for (const c of EUROPE_COUNTRIES) {
    if (l.includes(c)) return c;
  }
  if (l.includes("usa") || l.includes("united states") || l.includes("america")) return "usa";
  if (l.includes("canada")) return "canada";
  if (l.includes("australia")) return "australia";
  return null;
};

const isEuropean = (country) => country && EUROPE_COUNTRIES.has(country.toLowerCase());

/**
 * Generate restaurant booking/reservation links
 * @param {{ name: string, address?: string, placeId?: string }} restaurant
 * @param {{ city?: string, country?: string, date?: string, partySize?: number, places?: string[] }} ctx
 * @returns {{ provider: string, label: string, url: string, icon: string }[]}
 */
export function getRestaurantBookingLinks(restaurant, ctx = {}) {
  const links = [];
  const name = restaurant.name || "";
  const city = ctx.city || "";
  const country = ctx.country || resolveCountryFromLocation(city) || resolveCountryFromLocation(ctx.places?.[0]) || "";
  const q = encodeURIComponent(`${name} ${city}`.trim());

  // OpenTable — search link (works globally, strongest in NA/UK)
  const otParams = new URLSearchParams({ term: `${name} ${city}`.trim() });
  if (ctx.partySize) otParams.set("covers", ctx.partySize);
  if (ctx.date) otParams.set("dateTime", ctx.date);
  links.push({
    provider: "opentable", label: "Reserve on OpenTable",
    url: `https://www.opentable.com/s?${otParams}`,
    icon: "🍽️",
  });

  // TheFork — if European destination
  const tfDomain = THEFORK_DOMAINS[country.toLowerCase()];
  if (tfDomain || isEuropean(country)) {
    const domain = tfDomain || "thefork.com";
    links.push({
      provider: "thefork", label: "Reserve on TheFork",
      url: `https://www.${domain}/search?queryText=${q}`,
      icon: "🍴",
    });
  }

  // Google Maps — always works, shows Reserve button if available
  if (restaurant.placeId) {
    links.push({
      provider: "google", label: "View on Google Maps",
      url: `https://www.google.com/maps/place/?q=place_id:${restaurant.placeId}`,
      icon: "📍",
    });
  }

  return links;
}

/**
 * Generate activity booking links (Viator + GetYourGuide)
 * @param {{ title: string, location?: string }} activity
 * @param {{ city?: string, country?: string }} ctx
 * @returns {{ provider: string, label: string, url: string, icon: string }[]}
 */
export function getActivityBookingLinks(activity, ctx = {}) {
  const links = [];
  const title = activity.title || "";
  const city = ctx.city || activity.location || "";
  const q = `${title} ${city}`.trim();

  // Viator
  const viatorParams = new URLSearchParams({ text: q });
  if (VIATOR_PID) { viatorParams.set("pid", VIATOR_PID); viatorParams.set("medium", "link"); viatorParams.set("campaign", "twm-itinerary"); }
  if (VIATOR_MCID) viatorParams.set("mcid", VIATOR_MCID);
  links.push({
    provider: "viator", label: "Book on Viator",
    url: `https://www.viator.com/searchResults/all?${viatorParams}`,
    icon: "🎟️",
  });

  // GetYourGuide
  const gygParams = new URLSearchParams({ q, customerSearch: "true" });
  if (GYG_PARTNER_ID) gygParams.set("partner_id", GYG_PARTNER_ID);
  links.push({
    provider: "gyg", label: "Book on GetYourGuide",
    url: `https://www.getyourguide.com/s/?${gygParams}`,
    icon: "🎫",
  });

  // Google search fallback
  links.push({
    provider: "google", label: "Search for tickets",
    url: `https://www.google.com/search?q=book+${encodeURIComponent(q)}`,
    icon: "🔍",
  });

  return links;
}

/**
 * Detect if a timeline item is a restaurant/food vs activity
 * @param {{ title: string, desc?: string, cuisine?: string }} item
 * @returns {"restaurant"|"activity"}
 */
export function detectItemType(item) {
  const text = `${item.title || ""} ${item.desc || ""}`.toLowerCase();
  if (item.cuisine) return "restaurant";
  if (/\b(lunch|dinner|breakfast|brunch|supper|cafe|coffee|restaurant|bistro|brasserie|trattoria|pub food|eat at|dine|dining)\b/.test(text)) return "restaurant";
  if (/\b(museum|hike|walk|tour|cruise|boat|castle|palace|garden|park|workshop|class|zoo|aquarium|gallery|monument|show|theatre|theater|concert|festival|spa|kayak|climb|cycle|surf|dive|ski|snorkel)\b/.test(text)) return "activity";
  return "activity"; // default to activity for needsBooking items
}

/**
 * Get the primary booking link text for chat markdown
 * @param {{ name: string, placeId?: string }} restaurant
 * @param {{ city?: string, places?: string[] }} ctx
 * @returns {string} markdown link text
 */
export function getRestaurantBookingMarkdown(restaurant, ctx = {}) {
  const links = getRestaurantBookingLinks(restaurant, ctx);
  // Show first available: OpenTable or TheFork
  const primary = links.find(l => l.provider === "opentable") || links[0];
  if (!primary) return "";
  return `[${primary.label} ↗](${primary.url})`;
}
