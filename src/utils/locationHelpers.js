import { LOCATION_VIBES, TRAVEL_TIMES, LOCATION_ACTIVITIES, LOCATION_COORDS } from '../constants/locations';

export function getLocationVibes(places) {
  const all = places.join(" ").toLowerCase();
  const vibes = [];
  for (const [vibe, config] of Object.entries(LOCATION_VIBES)) {
    if (config.match.test(all)) vibes.push(vibe);
  }
  return vibes;
}

export function getRegion(places) {
  const all = places.join(" ").toLowerCase();
  if (/tokyo|kyoto|osaka|japan|hiroshima|nara|sapporo|okinawa/.test(all)) return "japan";
  if (/paris|lyon|marseille|france|nice|bordeaux/.test(all)) return "france";
  if (/barcelona|madrid|spain|seville|valencia|malaga/.test(all)) return "spain";
  if (/rome|florence|venice|italy|milan|naples|amalfi/.test(all)) return "italy";
  if (/amsterdam|netherlands|rotterdam|hague/.test(all)) return "netherlands";
  if (/berlin|munich|germany|hamburg|frankfurt/.test(all)) return "germany";
  if (/lisbon|porto|portugal|algarve/.test(all)) return "portugal";
  if (/prague|czech/.test(all)) return "czech";
  if (/vienna|austria|salzburg/.test(all)) return "austria";
  if (/zurich|geneva|switzerland|bern/.test(all)) return "switzerland";
  if (/dublin|ireland|galway|cork/.test(all)) return "ireland";
  if (/new york|los angeles|san francisco|usa|america|miami|chicago|boston|seattle/.test(all)) return "usa";
  if (/sydney|melbourne|australia|brisbane|perth/.test(all)) return "australia";
  if (/dubai|abu dhabi|uae/.test(all)) return "uae";
  if (/singapore/.test(all)) return "singapore";
  if (/bangkok|thailand|phuket|chiang mai/.test(all)) return "thailand";
  if (/bali|indonesia|jakarta/.test(all)) return "indonesia";
  if (/maldives/.test(all)) return "maldives";
  if (/delhi|mumbai|chennai|bangalore|bengaluru|hyderabad|kolkata|jaipur|goa|kerala|udaipur|agra|rishikesh|varanasi|pune|ahmedabad|kochi|mysore|shimla|darjeeling|amritsar|jodhpur|india/.test(all)) return "india";
  if (/colombo|kandy|ella|mirissa|galle|sri lanka/.test(all)) return "srilanka";
  if (/edinburgh|glasgow|inverness|aberdeen|isle of skye|skye|highlands|loch ness|stirling|dundee|fort william|oban|st andrews/.test(all)) return "scotland";
  if (/london|manchester|birmingham|liverpool|bristol|oxford|cambridge|york|bath|brighton|cornwall|lake district|cotswolds|leeds|newcastle|nottingham|sheffield/.test(all)) return "england";
  return "uk";
}

// Haversine distance in km between two [lat, lng] pairs
function haversineKm(c1, c2) {
  const toRad = d => d * Math.PI / 180;
  const [lat1, lon1] = c1, [lat2, lon2] = c2;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Look up coordinates for a location name (fuzzy match)
export function findCoords(name) {
  const n = name.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  if (LOCATION_COORDS[n]) return LOCATION_COORDS[n];
  for (const [k, v] of Object.entries(LOCATION_COORDS)) {
    if (n.includes(k) || k.includes(n)) return v;
  }
  return null;
}

// Estimate driving hours from straight-line km distance
function kmToDrivingHours(km) {
  const roadFactor = km > 500 ? 1.25 : 1.35; // long routes use more highways
  const avgSpeedKmh = km > 800 ? 80 : km > 400 ? 70 : km > 200 ? 60 : km > 50 ? 50 : 35;
  return Math.round((km * roadFactor / avgSpeedKmh) * 10) / 10;
}

// Convert driving hours to other modes using straight-line distance
function adjustForMode(drivingHrs, mode, km) {
  const m = (mode || "").toLowerCase();
  if (/flight|fly|plane|air/.test(m)) {
    // Use km if available, otherwise estimate from driving hours
    const dist = km || drivingHrs * 65; // rough reverse: avg 65 km/h driving
    const flyHrs = dist / 800; // ~800 km/h cruise speed
    const airportOverhead = dist > 1500 ? 3 : 2; // longer flights = more overhead
    return Math.round((flyHrs + airportOverhead) * 10) / 10;
  }
  if (/train|rail/.test(m)) {
    const dist = km || drivingHrs * 65;
    const trainSpeed = dist > 500 ? 120 : dist > 200 ? 90 : 70; // km/h
    const stationOverhead = 0.5; // getting to/from station
    return Math.round((dist / trainSpeed + stationOverhead) * 10) / 10;
  }
  if (/bus|coach/.test(m)) {
    return Math.round(drivingHrs * 1.3 * 10) / 10; // buses are slower
  }
  if (/walk|hik/.test(m)) {
    const dist = km || drivingHrs * 65;
    return Math.round(dist / 5 * 10) / 10; // ~5 km/h walking
  }
  if (/cycl|bike/.test(m)) {
    const dist = km || drivingHrs * 65;
    return Math.round(dist / 18 * 10) / 10; // ~18 km/h cycling
  }
  return drivingHrs; // driving/EV/car/default
}

export function estimateTravelHours(from, to, mode) {
  if (!from || !to) return 2;
  const a = from.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  const b = to.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  if (a === b) return 0;

  let drivingHrs = null;
  let km = null;

  // 1. Exact lookup
  const key1 = `${a}|${b}`, key2 = `${b}|${a}`;
  if (TRAVEL_TIMES[key1]) drivingHrs = TRAVEL_TIMES[key1];
  else if (TRAVEL_TIMES[key2]) drivingHrs = TRAVEL_TIMES[key2];

  // 2. Partial match lookup
  if (drivingHrs === null) {
    for (const [k, v] of Object.entries(TRAVEL_TIMES)) {
      const [ka, kb] = k.split("|");
      if ((a.includes(ka) || ka.includes(a)) && (b.includes(kb) || kb.includes(b))) { drivingHrs = v; break; }
      if ((a.includes(kb) || kb.includes(a)) && (b.includes(ka) || ka.includes(b))) { drivingHrs = v; break; }
    }
  }

  // 3. Coordinate-based estimation (Haversine + driving factor)
  const coordA = findCoords(a), coordB = findCoords(b);
  if (coordA && coordB) {
    km = haversineKm(coordA, coordB);
    if (km < 5) return 0.25;
    if (drivingHrs === null) drivingHrs = kmToDrivingHours(km);
  }

  // 4. UK postcode fallback
  if (drivingHrs === null) {
    const isPostcode = /^[a-z]{1,2}\d/.test(a) || /^[a-z]{1,2}\d/.test(b);
    if (isPostcode) {
      const scottish = /edinburgh|glasgow|inverness|aberdeen|dundee|stirling|fort william|oban|isle of skye|skye|loch ness|highlands|st andrews/;
      const northern = /manchester|liverpool|leeds|york|newcastle|lake district|sheffield/;
      const midlands = /birmingham|nottingham|leicester|coventry/;
      drivingHrs = scottish.test(b) ? 7 : northern.test(b) ? 4 : midlands.test(b) ? 2.5 : scottish.test(a) ? 7 : northern.test(a) ? 4 : midlands.test(a) ? 2.5 : 3;
    }
  }

  // 5. Default fallback
  if (drivingHrs === null) drivingHrs = 3;

  // Adjust for travel mode
  return adjustForMode(drivingHrs, mode, km);
}

// Estimate straight-line distance in miles between two locations
export function estimateDistanceMiles(from, to) {
  if (!from || !to) return null;
  const a = from.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  const b = to.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  if (a === b) return 0;
  const coordA = findCoords(a), coordB = findCoords(b);
  if (coordA && coordB) return Math.round(haversineKm(coordA, coordB) * 0.621);
  // Fallback: estimate from driving hours × avg speed
  // Use a lower speed for fallback to avoid overestimating short unknown routes
  const hrs = estimateTravelHours(from, to);
  return Math.round(hrs * 45);
}

export function getLocationActivities(place) {
  const key = place.toLowerCase();
  if (LOCATION_ACTIVITIES[key]) return LOCATION_ACTIVITIES[key];
  for (const [k, v] of Object.entries(LOCATION_ACTIVITIES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}
