import { LOCATION_VIBES, TRAVEL_TIMES, LOCATION_ACTIVITIES } from '../constants/locations';
import { ACCOM_TEMPLATES, REGION_ACCOM_TEMPLATES } from '../constants/accommodations';

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
  if (/edinburgh|glasgow|inverness|aberdeen|isle of skye|skye|highlands|loch ness|stirling|dundee|fort william|oban|st andrews/.test(all)) return "scotland";
  if (/london|manchester|birmingham|liverpool|bristol|oxford|cambridge|york|bath|brighton|cornwall|lake district|cotswolds|leeds|newcastle|nottingham|sheffield/.test(all)) return "england";
  return "uk";
}

export function estimateTravelHours(from, to) {
  if (!from || !to) return 2;
  const a = from.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  const b = to.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  if (a === b) return 0;
  const key1 = `${a}|${b}`, key2 = `${b}|${a}`;
  if (TRAVEL_TIMES[key1]) return TRAVEL_TIMES[key1];
  if (TRAVEL_TIMES[key2]) return TRAVEL_TIMES[key2];
  for (const [k, v] of Object.entries(TRAVEL_TIMES)) {
    const [ka, kb] = k.split("|");
    if ((a.includes(ka) || ka.includes(a)) && (b.includes(kb) || kb.includes(b))) return v;
    if ((a.includes(kb) || kb.includes(a)) && (b.includes(ka) || ka.includes(b))) return v;
  }
  const isPostcode = /^[a-z]{1,2}\d/.test(a) || /^[a-z]{1,2}\d/.test(b);
  if (isPostcode) {
    const scottish = /edinburgh|glasgow|inverness|aberdeen|dundee|stirling|fort william|oban|isle of skye|skye|loch ness|highlands|st andrews/;
    const northern = /manchester|liverpool|leeds|york|newcastle|lake district|sheffield/;
    const midlands = /birmingham|nottingham|leicester|coventry/;
    const dest = scottish.test(b) ? 7 : northern.test(b) ? 4 : midlands.test(b) ? 2.5 : scottish.test(a) ? 7 : northern.test(a) ? 4 : midlands.test(a) ? 2.5 : 3;
    return dest;
  }
  return 3;
}

export function getLocationActivities(place) {
  const key = place.toLowerCase();
  if (LOCATION_ACTIVITIES[key]) return LOCATION_ACTIVITIES[key];
  for (const [k, v] of Object.entries(LOCATION_ACTIVITIES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
}

export function generateLocalAccommodations(places) {
  if (!places || places.length === 0) return [];
  const region = getRegion(places);
  const templates = REGION_ACCOM_TEMPLATES[region] || ACCOM_TEMPLATES;
  const results = [];
  places.forEach(place => {
    const placeName = place.trim();
    templates.forEach(tmpl => {
      results.push({
        name: `${placeName} ${tmpl.suffix}`,
        type: tmpl.type,
        tags: [...tmpl.baseTags],
        rating: tmpl.baseRating,
        price: tmpl.price,
        location: placeName,
      });
    });
  });
  return results.sort((a, b) => b.rating - a.rating);
}
