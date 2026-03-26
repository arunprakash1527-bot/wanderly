/**
 * Packing List Auto-Suggester
 * Generates smart packing suggestions based on:
 * - Weather forecast (temperature, rain)
 * - Trip duration
 * - Activities planned
 * - Traveller ages (kids, infants)
 * - Travel mode (EV, flight)
 * - Destination type
 * - Trip template profile
 */
import { TEMPLATE_PROFILES } from "../constants/templateProfiles";

const BASE_ESSENTIALS = [
  { item: "Passport / ID", category: "documents", forAll: true },
  { item: "Phone charger", category: "electronics", forAll: true },
  { item: "Medications", category: "health", forAll: true },
  { item: "Travel insurance docs", category: "documents", forAll: true },
  { item: "Cash + cards", category: "documents", forAll: true },
];

const WEATHER_ITEMS = {
  hot: [
    { item: "Sunscreen (SPF 50+)", category: "health" },
    { item: "Sunglasses", category: "clothing" },
    { item: "Sun hat", category: "clothing" },
    { item: "Light breathable clothes", category: "clothing" },
    { item: "Water bottle", category: "essentials" },
    { item: "Flip flops / sandals", category: "clothing" },
  ],
  cold: [
    { item: "Warm jacket", category: "clothing" },
    { item: "Thermal layers", category: "clothing" },
    { item: "Gloves", category: "clothing" },
    { item: "Warm hat / beanie", category: "clothing" },
    { item: "Scarf", category: "clothing" },
  ],
  rainy: [
    { item: "Waterproof jacket", category: "clothing" },
    { item: "Umbrella", category: "essentials" },
    { item: "Waterproof shoes", category: "clothing" },
    { item: "Dry bag for electronics", category: "essentials" },
  ],
  mild: [
    { item: "Light jacket / layers", category: "clothing" },
    { item: "Comfortable walking shoes", category: "clothing" },
  ],
};

const ACTIVITY_ITEMS = {
  hiking: [
    { item: "Hiking boots", category: "clothing" },
    { item: "Backpack (daypack)", category: "essentials" },
    { item: "Trail snacks", category: "food" },
    { item: "First aid kit", category: "health" },
    { item: "Portable phone charger", category: "electronics" },
  ],
  beach: [
    { item: "Swimsuit", category: "clothing" },
    { item: "Beach towel", category: "essentials" },
    { item: "Snorkel / goggles", category: "essentials" },
    { item: "After-sun lotion", category: "health" },
  ],
  cycling: [
    { item: "Cycling helmet", category: "essentials" },
    { item: "Padded shorts", category: "clothing" },
    { item: "Cycling gloves", category: "clothing" },
  ],
  skiing: [
    { item: "Ski jacket", category: "clothing" },
    { item: "Ski goggles", category: "essentials" },
    { item: "Thermal base layers", category: "clothing" },
    { item: "Ski socks", category: "clothing" },
  ],
  swimming: [
    { item: "Swimsuit", category: "clothing" },
    { item: "Goggles", category: "essentials" },
    { item: "Swim towel", category: "essentials" },
  ],
  photography: [
    { item: "Camera + charger", category: "electronics" },
    { item: "Extra memory cards", category: "electronics" },
    { item: "Tripod", category: "electronics" },
  ],
  formal: [
    { item: "Smart outfit", category: "clothing" },
    { item: "Dress shoes", category: "clothing" },
  ],
};

const KID_ITEMS = {
  infant: [
    { item: "Nappies (pack extra)", category: "baby", person: "infant" },
    { item: "Baby wipes", category: "baby", person: "infant" },
    { item: "Baby formula / food", category: "baby", person: "infant" },
    { item: "Bottles + steriliser", category: "baby", person: "infant" },
    { item: "Comforter / dummy", category: "baby", person: "infant" },
    { item: "Change mat", category: "baby", person: "infant" },
    { item: "Baby carrier / sling", category: "baby", person: "infant" },
    { item: "Pushchair / travel stroller", category: "baby", person: "infant" },
    { item: "Cot travel sheet", category: "baby", person: "infant" },
    { item: "Baby sunhat + sunscreen", category: "baby", person: "infant" },
  ],
  toddler: [
    { item: "Snacks + drinks", category: "food", person: "child" },
    { item: "Travel toys / activity book", category: "entertainment", person: "child" },
    { item: "Favourite soft toy", category: "entertainment", person: "child" },
    { item: "Night light (familiar)", category: "essentials", person: "child" },
    { item: "Spare change of clothes (car bag)", category: "clothing", person: "child" },
    { item: "Car seat / booster", category: "essentials", person: "child" },
  ],
  child: [
    { item: "Tablet + headphones", category: "electronics", person: "child" },
    { item: "Books / games", category: "entertainment", person: "child" },
    { item: "Snacks for the journey", category: "food", person: "child" },
    { item: "Favourite pillow / blanket", category: "essentials", person: "child" },
  ],
  teen: [
    { item: "Phone charger + power bank", category: "electronics", person: "teen" },
    { item: "Headphones", category: "electronics", person: "teen" },
    { item: "Toiletries bag", category: "health", person: "teen" },
  ],
};

const TRAVEL_MODE_ITEMS = {
  ev: [
    { item: "EV charging cable (Type 2)", category: "ev" },
    { item: "Charging network apps (installed)", category: "ev" },
    { item: "Charging adapter", category: "ev" },
  ],
  flight: [
    { item: "Boarding passes", category: "documents" },
    { item: "Luggage tags", category: "essentials" },
    { item: "Travel-size toiletries (<100ml)", category: "health" },
    { item: "Neck pillow", category: "essentials" },
    { item: "Entertainment for flight", category: "entertainment" },
  ],
  car: [
    { item: "Sat nav / phone mount", category: "electronics" },
    { item: "Car snacks + drinks", category: "food" },
    { item: "Tissues + bags (car sickness)", category: "health" },
    { item: "Aux cable / car charger", category: "electronics" },
  ],
};

const DURATION_ITEMS = {
  long: [ // 5+ days
    { item: "Laundry bag", category: "essentials" },
    { item: "Travel washing powder/pods", category: "essentials" },
    { item: "Extra underwear + socks", category: "clothing" },
  ],
};

const FOREIGN_ITEMS = [
  { item: "Plug adapter", category: "electronics" },
  { item: "Travel phrasebook / offline translate", category: "essentials" },
  { item: "Foreign currency (small notes)", category: "documents" },
];

/**
 * Generate packing suggestions based on trip data + intelligence
 * @param {Object} trip - Trip object
 * @param {Object} intelligence - Trip intelligence data (weather, etc.)
 * @returns {Array} [{ item, category, reason, person?, checked: false }]
 */
export function generatePackingSuggestions(trip, intelligence) {
  const suggestions = [];
  const seen = new Set();

  const add = (item, category, reason, person) => {
    const key = (item + (person || "")).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push({ item, category, reason, person: person || "everyone", checked: false, auto: true });
  };

  // Base essentials
  for (const e of BASE_ESSENTIALS) add(e.item, e.category, "Essential");

  // Weather-based — scan all forecast days for the trip, not just today
  const forecastDays = intelligence?.weather?.daily || [];
  if (forecastDays.length > 0) {
    const maxHigh = Math.max(...forecastDays.map(d => d.high));
    const minLow = Math.min(...forecastDays.map(d => d.low));
    const totalRain = forecastDays.reduce((sum, d) => sum + (d.rainMm || 0), 0);
    const rainyDays = forecastDays.filter(d => d.rainMm > 1);

    if (maxHigh >= 28) WEATHER_ITEMS.hot.forEach(i => add(i.item, i.category, `Hot weather expected (up to ${maxHigh}°C)`));
    if (minLow <= 5) WEATHER_ITEMS.cold.forEach(i => add(i.item, i.category, `Cold weather expected (lows of ${minLow}°C)`));
    if (maxHigh < 28 && minLow > 5) WEATHER_ITEMS.mild.forEach(i => add(i.item, i.category, "Mild weather forecast"));

    if (rainyDays.length > 0) WEATHER_ITEMS.rainy.forEach(i => add(i.item, i.category, `Rain on ${rainyDays.length} day${rainyDays.length > 1 ? "s" : ""} (${Math.round(totalRain)}mm total)`));
  } else if (intelligence?.weather?.today) {
    // Fallback to single-day if no forecast array
    const w = intelligence.weather.today;
    if (w.high >= 28) WEATHER_ITEMS.hot.forEach(i => add(i.item, i.category, `Hot weather (${w.high}°C)`));
    else if (w.high <= 5) WEATHER_ITEMS.cold.forEach(i => add(i.item, i.category, `Cold weather (${w.low}°C)`));
    else WEATHER_ITEMS.mild.forEach(i => add(i.item, i.category, "Mild weather"));
    if (w.rainMm > 1) WEATHER_ITEMS.rainy.forEach(i => add(i.item, i.category, `Rain forecast (${w.rainMm}mm)`));
  }

  // Activity-based
  const allActivities = [
    ...(trip.prefs?.adultActs || []),
    ...(trip.prefs?.olderActs || []),
    ...(trip.prefs?.youngerActs || []),
    ...(trip.prefs?.activities || []),
  ].join(" ").toLowerCase();

  const timeline = trip.timeline ? Object.values(trip.timeline).flat().map(i => (i.title + " " + (i.desc || "")).toLowerCase()).join(" ") : "";
  const allText = allActivities + " " + timeline;

  for (const [activity, items] of Object.entries(ACTIVITY_ITEMS)) {
    if (new RegExp(activity, "i").test(allText)) {
      items.forEach(i => add(i.item, i.category, `For ${activity}`));
    }
  }

  // Kid-specific
  const travellers = trip.travellers || {};
  if (travellers.infants?.length > 0) {
    KID_ITEMS.infant.forEach(i => {
      travellers.infants.forEach(inf => add(i.item, i.category, `For ${inf.name || "baby"}`, inf.name || "Baby"));
    });
  }
  if (travellers.youngerKids?.length > 0) {
    const items = travellers.youngerKids.some(k => parseInt(k.age) <= 3) ? KID_ITEMS.toddler : KID_ITEMS.child;
    items.forEach(i => {
      travellers.youngerKids.forEach(kid => add(i.item, i.category, `For ${kid.name}`, kid.name));
    });
  }
  if (travellers.olderKids?.length > 0) {
    KID_ITEMS.teen.forEach(i => {
      travellers.olderKids.forEach(kid => add(i.item, i.category, `For ${kid.name}`, kid.name));
    });
  }

  // Travel mode
  const travelModes = trip.travel || [];
  const modeStr = (Array.isArray(travelModes) ? travelModes.join(" ") : String(travelModes)).toLowerCase();
  if (/ev|electric/i.test(modeStr)) TRAVEL_MODE_ITEMS.ev.forEach(i => add(i.item, i.category, "EV travel"));
  if (/flight|fly|plane/i.test(modeStr)) TRAVEL_MODE_ITEMS.flight.forEach(i => add(i.item, i.category, "Flying"));
  if (/car|drive/i.test(modeStr) && !/ev|electric/i.test(modeStr)) TRAVEL_MODE_ITEMS.car.forEach(i => add(i.item, i.category, "Road trip"));

  // Duration
  if (trip.rawStart && trip.rawEnd) {
    const days = Math.round((new Date(trip.rawEnd) - new Date(trip.rawStart)) / 86400000) + 1;
    if (days >= 5) DURATION_ITEMS.long.forEach(i => add(i.item, i.category, `Long trip (${days} days)`));
  }

  // Foreign destination — detect if destination country differs from start location
  if (intelligence?.language) {
    FOREIGN_ITEMS.forEach(i => add(i.item, i.category, `Travelling to ${intelligence.language.lang}-speaking area`));
  }

  // International travel detection — compare start location country to destination countries
  const COUNTRY_KEYWORDS = [
    "France", "Spain", "Italy", "Germany", "Portugal", "Netherlands", "Belgium", "Austria", "Switzerland",
    "Greece", "Croatia", "Turkey", "Morocco", "Egypt", "Thailand", "Japan", "China", "India", "Australia",
    "New Zealand", "Canada", "USA", "United States", "Mexico", "Brazil", "Argentina", "Colombia",
    "South Africa", "Kenya", "Iceland", "Norway", "Sweden", "Denmark", "Finland", "Poland", "Czech",
    "Hungary", "Romania", "Ireland", "Scotland", "Wales", "England", "UK", "United Kingdom",
    "Singapore", "Malaysia", "Indonesia", "Vietnam", "Cambodia", "Philippines", "South Korea", "Taiwan",
    "Dubai", "UAE", "Qatar", "Oman", "Sri Lanka", "Nepal", "Maldives", "Fiji", "Cuba", "Jamaica",
    "Costa Rica", "Peru", "Chile", "Cyprus", "Malta", "Montenegro", "Albania", "Slovenia",
    "Bali", "Tenerife", "Mallorca", "Ibiza", "Crete", "Santorini", "Mykonos", "Corfu",
    "Marrakech", "Bangkok", "Tokyo", "Paris", "Rome", "Barcelona", "Amsterdam", "Berlin", "Lisbon",
    "Prague", "Budapest", "Vienna", "Dubrovnik", "Istanbul", "Reykjavik", "Oslo", "Stockholm",
    "Copenhagen", "Helsinki", "Krakow", "Bucharest", "Athens", "Naples", "Florence", "Venice",
    "Milan", "Nice", "Lyon", "Bordeaux", "Seville", "Valencia", "Munich", "Hamburg", "Zurich",
    "Geneva", "Brussels", "Bruges", "Porto", "Lagos", "Faro", "Algarve",
  ];
  // Map well-known cities/regions to their country for comparison
  const CITY_TO_COUNTRY = {
    "bali": "Indonesia", "tenerife": "Spain", "mallorca": "Spain", "ibiza": "Spain",
    "crete": "Greece", "santorini": "Greece", "mykonos": "Greece", "corfu": "Greece",
    "marrakech": "Morocco", "bangkok": "Thailand", "tokyo": "Japan", "paris": "France",
    "rome": "Italy", "barcelona": "Spain", "amsterdam": "Netherlands", "berlin": "Germany",
    "lisbon": "Portugal", "prague": "Czech Republic", "budapest": "Hungary", "vienna": "Austria",
    "dubrovnik": "Croatia", "istanbul": "Turkey", "reykjavik": "Iceland", "oslo": "Norway",
    "stockholm": "Sweden", "copenhagen": "Denmark", "helsinki": "Finland", "krakow": "Poland",
    "bucharest": "Romania", "athens": "Greece", "naples": "Italy", "florence": "Italy",
    "venice": "Italy", "milan": "Italy", "nice": "France", "lyon": "France", "bordeaux": "France",
    "seville": "Spain", "valencia": "Spain", "munich": "Germany", "hamburg": "Germany",
    "zurich": "Switzerland", "geneva": "Switzerland", "brussels": "Belgium", "bruges": "Belgium",
    "porto": "Portugal", "lagos": "Portugal", "faro": "Portugal", "algarve": "Portugal",
    "dubai": "UAE", "singapore": "Singapore", "edinburgh": "Scotland", "london": "England",
    "manchester": "England", "birmingham": "England", "cardiff": "Wales", "belfast": "Northern Ireland",
    "glasgow": "Scotland", "new york": "USA", "los angeles": "USA", "sydney": "Australia",
    "melbourne": "Australia", "auckland": "New Zealand", "toronto": "Canada", "vancouver": "Canada",
  };
  const UK_COUNTRIES = ["england", "scotland", "wales", "northern ireland", "uk", "united kingdom"];
  const resolveCountry = (locStr) => {
    if (!locStr) return null;
    const lower = locStr.toLowerCase();
    // Check city-to-country mapping first
    for (const [city, country] of Object.entries(CITY_TO_COUNTRY)) {
      if (lower.includes(city)) return country.toLowerCase();
    }
    // Check direct country name matches
    for (const c of COUNTRY_KEYWORDS) {
      if (lower.includes(c.toLowerCase())) return c.toLowerCase();
    }
    return null;
  };
  const isSameCountryGroup = (c1, c2) => {
    if (!c1 || !c2) return false;
    if (c1 === c2) return true;
    // Treat UK constituent countries as same
    if (UK_COUNTRIES.includes(c1) && UK_COUNTRIES.includes(c2)) return true;
    return false;
  };
  if (!intelligence?.language) {
    const startCountry = resolveCountry(trip.startLocation);
    const destPlaces = trip.places || [];
    const destCountries = destPlaces.map(p => resolveCountry(p)).filter(Boolean);
    const isForeign = startCountry && destCountries.length > 0 && destCountries.some(dc => !isSameCountryGroup(dc, startCountry));
    if (isForeign) {
      const foreignDest = destPlaces.find(p => {
        const dc = resolveCountry(p);
        return dc && !isSameCountryGroup(dc, startCountry);
      }) || destPlaces[0];
      add("Passport", "documents", `International travel to ${foreignDest}`);
      add("Travel insurance docs", "documents", `International travel to ${foreignDest}`);
      add("Foreign currency / travel card", "documents", `International travel to ${foreignDest}`);
      add("Plug adapter", "electronics", `International travel to ${foreignDest}`);
      add("Travel adapter (universal)", "electronics", `Different plug types in ${foreignDest}`);
      add("Copies of booking confirmations", "documents", `International travel to ${foreignDest}`);
    }
  }

  // ─── Template-specific packing ───
  const profile = TEMPLATE_PROFILES[trip.templateKey];
  if (profile) {
    if (profile.packingTags.includes("light")) {
      add("Weekend bag (not suitcase)", "essentials", "Weekend trip — pack light");
    }
    if (profile.packingTags.includes("backpacking")) {
      add("Quick-dry clothes", "clothing", "Backpacking essentials");
      add("Daypack", "essentials", "Backpacking essentials");
      add("Padlock (for hostel lockers)", "essentials", "Backpacking essentials");
      add("Travel towel", "essentials", "Backpacking essentials");
    }
    if (profile.packingTags.includes("smart-casual")) {
      add("Smart casual outfit", "clothing", "Romantic trip attire");
      add("Evening wear / dress shoes", "clothing", "Romantic trip attire");
    }
    if (profile.packingTags.includes("nightlife")) {
      add("Going-out clothes", "clothing", "Nightlife essentials");
      add("Hangover recovery kit", "health", "Nightlife essentials");
    }
    if (profile.packingTags.includes("road-trip")) {
      add("Car snacks & drinks", "essentials", "Road trip essentials");
      add("Car phone mount", "electronics", "Road trip essentials");
      add("Aux cable / car charger", "electronics", "Road trip essentials");
    }
    if (profile.packingTags.includes("adventure")) {
      add("Hiking boots", "clothing", "Adventure gear");
      add("Sports layers (base + mid + shell)", "clothing", "Adventure gear");
      add("High-energy snacks (bars, nuts)", "essentials", "Adventure fuel");
      add("First aid kit", "health", "Adventure safety");
      add("Head torch", "essentials", "Adventure gear");
    }
    if (profile.packingTags.includes("cultural")) {
      add("Comfortable walking shoes", "clothing", "Cultural explorer essentials");
      add("Notebook / sketchbook", "essentials", "Cultural explorer essentials");
      add("Portable charger (for photos)", "electronics", "Cultural explorer essentials");
    }
    if (profile.packingTags.includes("family")) {
      add("Wet wipes (bulk)", "essentials", "Family travel essentials");
      add("Snack boxes for kids", "essentials", "Family travel essentials");
      add("Travel games / entertainment", "essentials", "Family travel essentials");
    }
    if (profile.packingTags.includes("evening-wear")) {
      add("Swimwear (if spa)", "clothing", "Romantic trip extras");
    }
  }

  return suggestions;
}

export const PACKING_CATEGORIES = {
  documents: { label: "Documents", icon: "📄" },
  clothing: { label: "Clothing", icon: "👕" },
  electronics: { label: "Electronics", icon: "🔌" },
  health: { label: "Health & Toiletries", icon: "💊" },
  essentials: { label: "Essentials", icon: "🎒" },
  food: { label: "Food & Drinks", icon: "🍎" },
  entertainment: { label: "Entertainment", icon: "🎮" },
  baby: { label: "Baby Essentials", icon: "🍼" },
  ev: { label: "EV Charging", icon: "⚡" },
};
