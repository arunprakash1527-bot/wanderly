import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from '@supabase/supabase-js';

// ─── Supabase Client (inline to avoid module init issues) ───
const supabase = createClient(
  'https://bwahdnkptexvvsoofidg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3YWhkbmtwdGV4dnZzb29maWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NjMyNTgsImV4cCI6MjA4OTQzOTI1OH0.0XeadG7jWY3_n39SUfI0zImB4NUKK1RLo37gYrGONGs'
);

// ─── Design Tokens ───
const T = {
  bg: "#FAF9F6", s: "#FFFFFF", s2: "#F0EFEB", s3: "#E8E7E2",
  t1: "#1A1A18", t2: "#5E5D58", t3: "#767570",
  a: "#1B8F6A", al: "#E1F3EC", ad: "#0D6B4F",
  coral: "#D85A30", coralL: "#FAECE7",
  blue: "#2E7CC9", blueL: "#E4F0FB",
  amber: "#B87215", amberL: "#FAF0DA",
  purple: "#7B6FD6", purpleL: "#EDECFE",
  pink: "#CF4D78", pinkL: "#FBEAF0",
  red: "#D93E3E", redL: "#FCEBEB",
  green: "#4A9E2E", greenL: "#EAF3DE",
  border: "rgba(0,0,0,0.07)",
  r: "16px", rs: "10px", rr: "24px",
  font: "'DM Sans', system-ui, sans-serif",
  fontD: "'Instrument Serif', Georgia, serif",
  shadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
  shadowHover: "0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)",
};

// ─── Connector Config (API Integration Points) ───
const CONNECTORS = {
  maps: { name: "Google Maps Platform", apis: ["Maps JS", "Places", "Directions", "Geocoding", "Distance Matrix"], icon: "🗺️", status: "ready", color: T.green },
  weather: { name: "OpenWeatherMap", apis: ["Current Weather", "5-Day Forecast", "Weather Alerts"], icon: "🌤️", status: "ready", color: T.blue },
  places: { name: "Google Places / Foursquare", apis: ["Nearby Search", "Place Details", "Photos", "Reviews"], icon: "📍", status: "ready", color: T.coral },
  booking: { name: "Viator / GetYourGuide", apis: ["Activity Search", "Availability", "Booking", "Cancellation"], icon: "🎟️", status: "ready", color: T.purple },
  accommodation: { name: "Booking.com / Airbnb", apis: ["Search", "Availability", "Property Details", "Booking"], icon: "🏨", status: "ready", color: T.amber },
  ev: { name: "Open Charge Map", apis: ["Nearby Chargers", "Charger Details", "Availability", "Connector Types"], icon: "⚡", status: "ready", color: T.green },
  traffic: { name: "TomTom / HERE", apis: ["Traffic Flow", "Incidents", "Route Planning", "ETA"], icon: "🚗", status: "ready", color: T.red },
  flights: { name: "Skyscanner / Amadeus", apis: ["Flight Search", "Price Alerts", "Seat Maps", "Check-in"], icon: "✈️", status: "ready", color: T.blue },
  translate: { name: "Google Translate", apis: ["Text Translation", "Language Detection", "Camera Translation"], icon: "🌐", status: "ready", color: T.purple },
  currency: { name: "Wise / XE", apis: ["Exchange Rates", "Currency Conversion", "Rate Alerts"], icon: "💱", status: "ready", color: T.green },
  payments: { name: "Stripe", apis: ["Payment Intent", "Subscriptions", "Split Payments", "Refunds"], icon: "💳", status: "ready", color: T.purple },
  calendar: { name: "Google Calendar", apis: ["Create Event", "Sync Itinerary", "Reminders", "Invites"], icon: "📅", status: "ready", color: T.blue },
  photos: { name: "Cloudinary / S3", apis: ["Upload", "Transform", "AI Tagging", "Video Generation"], icon: "📸", status: "ready", color: T.coral },
  ai: { name: "Claude / GPT", apis: ["Chat", "Recommendations", "Itinerary Gen", "Summarization"], icon: "🤖", status: "ready", color: T.a },
  notifications: { name: "Firebase / OneSignal", apis: ["Push", "In-App", "Email", "SMS"], icon: "🔔", status: "ready", color: T.amber },
  social: { name: "Auth0 / Firebase Auth", apis: ["Google SSO", "Apple SSO", "Email/Pass", "Magic Link"], icon: "👤", status: "ready", color: T.pink },
  rideshare: { name: "Uber / Bolt", apis: ["Price Estimate", "Request Ride", "Trip Status", "Receipt"], icon: "🚕", status: "ready", color: T.t1 },
  restaurants: { name: "OpenTable / TheFork", apis: ["Search", "Availability", "Reservation", "Menu"], icon: "🍽️", status: "ready", color: T.coral },
};

// ─── Trip Data ───
const TRIP = {
  name: "Easter Lake District", start: "3 Apr", end: "7 Apr", year: "2026",
  places: ["Windermere", "Ambleside", "Keswick", "Grasmere"],
  startLocation: "Manchester",
  travelMode: "EV vehicle",
  travellers: { adults: 4, older: [{ name: "Max", age: 12 }], younger: [{ name: "Ella", age: 8 }] },
  stays: [
    { name: "Windermere Boutique Hotel", dates: "3-5 Apr", nights: 2, type: "Hotel", tags: ["2 rooms", "Breakfast", "EV charger"] },
    { name: "Keswick Lakeside Cottage", dates: "5-7 Apr", nights: 2, type: "Cottage", tags: ["3 beds", "Garden", "Dog friendly"] },
  ],
};

const DAYS = [
  { day: 1, date: "3 Apr", label: "Thu", location: "Windermere", weather: { temp: 10, cond: "Partly cloudy", icon: "⛅" } },
  { day: 2, date: "4 Apr", label: "Fri", location: "Ambleside", weather: { temp: 12, cond: "Cloudy", icon: "☁️" } },
  { day: 3, date: "5 Apr", label: "Sat", location: "Grasmere", weather: { temp: 14, cond: "Sunny spells", icon: "🌤️" } },
  { day: 4, date: "6 Apr", label: "Sun", location: "Keswick", weather: { temp: 11, cond: "Light rain", icon: "🌧️" } },
  { day: 5, date: "7 Apr", label: "Mon", location: "Keswick", weather: { temp: 13, cond: "Sunny", icon: "☀️" } },
];

const TIMELINE = {
  1: [
    { time: "9:00 AM", title: "Depart Manchester", desc: "Pack car · Final check · Full EV charge", for: "all", rating: null, price: null },
    { time: "10:30 AM", title: "Arrive Windermere", desc: "Check in at Windermere Boutique Hotel · EV charge", for: "all", rating: null, price: null },
    { time: "11:30 AM", title: "Lake Windermere walk", desc: "Gentle 1hr lakeside stroll · Settle in to the area", for: "all", rating: 4.8, price: "Free" },
    { time: "1:00 PM", title: "Lunch at Francine's", desc: "4.7★ · Cosy cafe · Great cakes · Veggie options", for: "all", rating: 4.7, price: "££" },
    { time: "7:00 PM", title: "Dinner at The Angel Inn", desc: "4.5★ · Local ales · Roast lamb · Kids portions", for: "all", rating: 4.5, price: "£££" },
  ],
  2: [
    { time: "8:30 AM", title: "Breakfast at Homeground", desc: "4.8★ · Top-rated cafe · Veggie + full English", for: "all", rating: 4.8, price: "££" },
    { time: "10:00 AM", title: "Drive to Ambleside", desc: "22 min · EV charge at Rydal Road (50kW)", for: "all", rating: null, price: null },
    { time: "10:30 AM", title: "Loughrigg Fell walk", desc: "Light hike · 1.5 hrs · Panoramic views", for: "adults", rating: 4.9, price: "Free" },
    { time: "10:30 AM", title: "Brockhole Adventure Park", desc: "Tree-top nets · Soft play · Free entry", for: "kids", rating: 4.8, price: "Free" },
    { time: "12:30 PM", title: "Lunch at Fellinis", desc: "4.6★ · Vegetarian + grills · Cinema dining", for: "all", rating: 4.6, price: "££" },
    { time: "2:30 PM", title: "Windermere boat cruise", desc: "45 min · 4 adult + 2 child tickets", for: "all", rating: 4.5, price: "£42", needsBooking: true },
    { time: "4:00 PM", title: "Easter egg trail · Wray Castle", desc: "National Trust · Chocolate prizes · All ages", for: "kids", rating: 4.6, price: "£5" },
    { time: "5:30 PM", title: "Low Wood Bay Spa", desc: "Lake views · Adults only · Book by 2 PM", for: "adults", rating: 4.7, price: "£45pp" },
    { time: "7:30 PM", title: "Dinner at The Drunken Duck", desc: "4.8★ · Award-winning · Kids eat free", for: "all", rating: 4.8, price: "£££" },
  ],
  3: [
    { time: "9:00 AM", title: "Checkout Windermere Hotel", desc: "Pack up · 40 min drive to Keswick via Grasmere", for: "all", rating: null, price: null },
    { time: "10:30 AM", title: "Grasmere Gingerbread Shop", desc: "4.9★ · Famous since 1854 · Must try", for: "all", rating: 4.9, price: "£" },
    { time: "11:00 AM", title: "Dove Cottage · Wordsworth Museum", desc: "Interactive exhibits · Good for all ages", for: "all", rating: 4.5, price: "£12" },
    { time: "1:00 PM", title: "Lunch at The Lamb Inn", desc: "4.4★ · Hearty pub food · Garden seating", for: "all", rating: 4.4, price: "££" },
    { time: "3:00 PM", title: "Arrive Keswick · Check in cottage", desc: "3 bedrooms · Garden · Self-catering", for: "all", rating: null, price: null },
    { time: "4:30 PM", title: "Derwentwater lakeside walk", desc: "Easy flat path · Pram friendly · 1 hr", for: "all", rating: 4.8, price: "Free" },
    { time: "7:00 PM", title: "Cook at cottage", desc: "Booth's supermarket 5 min walk · Local sausages", for: "all", rating: null, price: "£" },
  ],
  4: [
    { time: "9:00 AM", title: "Breakfast at cottage", desc: "Self-catering · Local eggs and bread from Booth's", for: "all", rating: null, price: null },
    { time: "10:30 AM", title: "Keswick Launch boat trip", desc: "50 min round lake · Runs every 30 min", for: "all", rating: 4.6, price: "£13.50", needsBooking: true },
    { time: "12:00 PM", title: "Puzzling Place", desc: "Optical illusions museum · Kids love it", for: "kids", rating: 4.7, price: "£6" },
    { time: "12:00 PM", title: "Keswick Brewing Company", desc: "Tasting flight · Local ales", for: "adults", rating: 4.5, price: "£8" },
    { time: "1:30 PM", title: "Lunch at Fellpack", desc: "4.6★ · Burritos & bowls · Quick & casual", for: "all", rating: 4.6, price: "£" },
    { time: "3:00 PM", title: "Whinlatter Forest · Go Ape Junior", desc: "Ages 6+ · Tree-top adventure · 2 hrs", for: "kids", rating: 4.7, price: "£22" },
    { time: "3:00 PM", title: "Castlerigg Stone Circle", desc: "3,000 year old stone circle · Free · 10 min drive", for: "adults", rating: 4.9, price: "Free" },
    { time: "7:00 PM", title: "Dinner at The Pheasant Inn", desc: "4.6★ · Country pub · Roasts · Dog friendly", for: "all", rating: 4.6, price: "£££" },
  ],
  5: [
    { time: "9:00 AM", title: "Pack up cottage", desc: "Checkout · Load car · Final EV charge", for: "all", rating: null, price: null },
    { time: "10:00 AM", title: "Catbells family hike", desc: "Moderate · 1.5 hrs · Spectacular views", for: "adults", rating: 4.9, price: "Free" },
    { time: "10:00 AM", title: "Keswick Pencil Museum", desc: "Interactive · World's largest pencil!", for: "kids", rating: 4.3, price: "£5.50" },
    { time: "12:30 PM", title: "Final lunch at Morrels", desc: "4.7★ · Bistro · Seasonal menu", for: "all", rating: 4.7, price: "££" },
    { time: "2:00 PM", title: "Drive home to Manchester", desc: "~1.5 hrs · Stop at Tebay Services (EV charger)", for: "all", rating: null, price: null },
  ],
};

const POLLS = [
  { id: 1, q: "Where should we eat dinner tonight?", status: "active", ends: "Tonight", by: "You", votes: 5,
    options: [
      { text: "The Drunken Duck — steaks, kids free", pct: 60, voters: ["You", "JM", "SP"], voted: true },
      { text: "The Unicorn — pub grills, playground", pct: 20, voters: ["RK"] },
      { text: "Lake Road Kitchen — Nordic, upscale", pct: 20, voters: ["LT"] },
    ]},
  { id: 2, q: "Day 3: Keswick or stay in Ambleside?", status: "active", ends: "Tomorrow 9 AM", by: "James M.", votes: 4,
    options: [
      { text: "Move to Keswick — Derwentwater, new area", pct: 75, voters: ["You", "JM", "SP"], voted: true },
      { text: "Stay Ambleside — explore more locally", pct: 25, voters: ["RK"] },
    ]},
  { id: 3, q: "Morning activity: hike or boat?", status: "closed", ends: "Yesterday", by: "You", votes: 5,
    options: [
      { text: "Loughrigg Fell hike", pct: 80, voters: ["You", "JM", "SP", "RK"], voted: true },
      { text: "Windermere cruise", pct: 20, voters: ["LT"] },
    ]},
];

const MEMORIES = [
  { day: 2, label: "Day 2 — Ambleside", count: 8, photos: [
    { label: "Fell view", color: "#5A8C6E" }, { label: "Lake", color: "#5A7EA0" },
    { label: "Lunch", color: "#A08060" }, { label: "Ella playing", color: "#7EA060" },
    { label: "Boat trip", color: "#4A8BA0" }, { label: "Ice cream", color: "#A04A8B" },
    { label: "Pub dinner", color: "#8A7348" }, { label: "Sunset", color: "#486A8A" },
  ]},
  { day: 1, label: "Day 1 — Windermere", count: 4, photos: [
    { label: "Arrival", color: "#48788A" }, { label: "Hotel", color: "#8A4868" },
    { label: "Garden", color: "#688A48" }, { label: "First walk", color: "#8A7848" },
  ]},
];

// ─── Shared Styles ───
const css = {
  btn: { display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: T.rs, border: `.5px solid ${T.border}`, background: T.s, fontFamily: T.font, fontSize: 13, cursor: "pointer", color: T.t1, transition: "all .15s", fontWeight: 500, outline: "none" },
  btnP: { background: T.a, color: "#fff", borderColor: T.ad },
  btnSm: { padding: "5px 12px", fontSize: 12 },
  chip: { padding: "6px 14px", borderRadius: 24, fontSize: 12, border: `.5px solid ${T.border}`, background: T.s, cursor: "pointer", transition: "all .15s", userSelect: "none", fontFamily: T.font },
  chipActive: { background: T.al, borderColor: T.a, color: T.ad },
  card: { background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.r, padding: "16px 18px", marginBottom: 10, boxShadow: T.shadow, transition: "all .2s" },
  tag: (bg, color) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 500, background: bg, color, marginRight: 5, marginBottom: 3 }),
  avatar: (bg, size = 32) => ({ width: size, height: size, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.37, fontWeight: 500, color: "#fff", background: bg, flexShrink: 0 }),
  sectionTitle: { fontSize: 12, fontWeight: 600, color: T.t3, margin: "20px 0 10px", textTransform: "uppercase", letterSpacing: 0.8 },
};

// ─── Components ───
const Avatar = ({ bg, label, size = 32, style = {} }) => (
  <div style={{ ...css.avatar(bg, size), ...style }}>{label}</div>
);

const Tag = ({ bg, color, children }) => (
  <span style={css.tag(bg, color)}>{children}</span>
);

const GroupTag = ({ type, children }) => {
  const map = { all: [T.al, T.ad], adults: [T.blueL, T.blue], older: [T.pinkL, T.pink], younger: [T.coralL, T.coral], kids: [T.pinkL, T.pink] };
  const [bg, c] = map[type] || map.all;
  return <span style={{ ...css.tag(bg, c), fontSize: 10, padding: "2px 8px" }}>{children}</span>;
};

// ─── Location Suggestions Database ───
const LOCATION_SUGGESTIONS = [
  // UK
  "London", "Manchester", "Birmingham", "Edinburgh", "Glasgow", "Liverpool", "Bristol", "Leeds", "Sheffield", "Newcastle",
  "Cambridge", "Oxford", "Bath", "Brighton", "York", "Cardiff", "Belfast", "Nottingham", "Southampton", "Leicester",
  "Windermere", "Ambleside", "Keswick", "Grasmere", "Lake District", "Cotswolds", "Peak District", "Cornwall", "Devon", "Dorset",
  "Welwyn Garden City", "St Albans", "Hertford", "Hatfield", "Stevenage", "Watford", "Hitchin", "Letchworth",
  "Inverness", "Aberdeen", "St Andrews", "Isle of Skye", "Snowdonia", "Jersey",
  // Europe
  "Paris", "Amsterdam", "Barcelona", "Rome", "Berlin", "Prague", "Vienna", "Lisbon", "Dublin", "Zurich",
  "Madrid", "Seville", "Valencia", "Malaga", "Florence", "Venice", "Milan", "Naples", "Amalfi Coast",
  "Nice", "Lyon", "Bordeaux", "Marseille", "Munich", "Hamburg", "Cologne", "Brussels", "Bruges",
  "Copenhagen", "Stockholm", "Oslo", "Helsinki", "Reykjavik", "Budapest", "Krakow", "Warsaw",
  "Athens", "Santorini", "Mykonos", "Crete", "Dubrovnik", "Split", "Istanbul", "Bucharest",
  "Tallinn", "Riga", "Ljubljana", "Salzburg", "Innsbruck", "Geneva", "Lucerne", "Interlaken",
  // Americas
  "New York", "Los Angeles", "San Francisco", "Chicago", "Miami", "Boston", "Washington DC", "Seattle",
  "Las Vegas", "New Orleans", "Austin", "Nashville", "Denver", "Portland", "San Diego", "Honolulu",
  "Toronto", "Vancouver", "Montreal", "Quebec City", "Banff", "Whistler",
  "Mexico City", "Cancun", "Tulum", "Playa del Carmen",
  "Rio de Janeiro", "São Paulo", "Buenos Aires", "Lima", "Bogota", "Cartagena", "Medellín",
  "Santiago", "Cusco", "Machu Picchu", "Galápagos Islands",
  // Asia
  "Tokyo", "Kyoto", "Osaka", "Hiroshima", "Nara", "Sapporo",
  "Bangkok", "Chiang Mai", "Phuket", "Krabi", "Koh Samui",
  "Singapore", "Kuala Lumpur", "Penang", "Langkawi",
  "Bali", "Jakarta", "Yogyakarta", "Ubud",
  "Ho Chi Minh City", "Hanoi", "Da Nang", "Hoi An",
  "Seoul", "Busan", "Jeju Island",
  "Beijing", "Shanghai", "Hong Kong", "Taipei", "Macau", "Guilin", "Xi'an", "Chengdu",
  "Delhi", "Mumbai", "Jaipur", "Goa", "Kerala", "Udaipur", "Agra", "Rishikesh", "Varanasi",
  "Colombo", "Kandy", "Ella", "Mirissa",
  "Kathmandu", "Pokhara",
  // Middle East
  "Dubai", "Abu Dhabi", "Doha", "Muscat", "Amman", "Petra", "Tel Aviv", "Jerusalem",
  // Africa
  "Cape Town", "Johannesburg", "Marrakech", "Fez", "Cairo", "Luxor", "Nairobi", "Zanzibar",
  "Accra", "Lagos", "Victoria Falls", "Serengeti", "Kruger National Park", "Mauritius", "Seychelles",
  // Oceania
  "Sydney", "Melbourne", "Brisbane", "Perth", "Gold Coast", "Cairns", "Byron Bay", "Tasmania",
  "Auckland", "Queenstown", "Rotorua", "Wellington", "Christchurch", "Milford Sound",
  "Fiji", "Bora Bora", "Tahiti",
  // Maldives & Islands
  "Maldives", "Sri Lanka", "Madagascar", "Azores", "Canary Islands", "Madeira", "Majorca", "Ibiza", "Sardinia", "Sicily",
  // Regions
  "Scotland", "Wales", "Northern Ireland", "England", "UK", "France", "Spain", "Italy", "Germany", "Portugal",
  "Swiss Alps", "French Riviera", "Amalfi Coast", "Tuscany", "Provence", "Patagonia", "Amazon Rainforest",
];

// ─── Activity Suggestions by Location ───
const ACTIVITY_SUGGESTIONS = {
  default: {
    adults: ["Light hikes", "Spas & wellness", "Boat trips", "Museums", "Wine tasting", "Photography tours", "Cycling", "Local markets"],
    olderKids: ["Adventure parks", "Climbing walls", "Zip lining", "Kayaking", "Mountain biking", "Interactive museums", "Bike hire"],
    youngerKids: ["Playgrounds", "Animal farms", "Soft play", "Story trails", "Mini golf", "Beach activities", "Nature walks"],
  },
};

// ─── Dynamic Accommodation Generator (location-aware) ───
const ACCOM_TEMPLATES = [
  { suffix: "Boutique Hotel", type: "Hotel", baseTags: ["Pool", "Spa", "Restaurant"], baseRating: 4.7, price: "£££" },
  { suffix: "Lodge & Suites", type: "Lodge", baseTags: ["Garden", "Bar", "Parking"], baseRating: 4.5, price: "££" },
  { suffix: "Country Cottage", type: "Cottage", baseTags: ["3 beds", "Fireplace", "Pet friendly"], baseRating: 4.8, price: "££" },
  { suffix: "B&B", type: "B&B", baseTags: ["Breakfast", "Central", "Parking"], baseRating: 4.6, price: "£" },
  { suffix: "Retreat & Spa", type: "Hotel", baseTags: ["Hot tub", "Wellness", "Fine dining"], baseRating: 4.9, price: "£££" },
  { suffix: "Serviced Apartment", type: "Apartment", baseTags: ["Self-catering", "WiFi", "Kitchen"], baseRating: 4.3, price: "££" },
  { suffix: "Manor House", type: "Hotel", baseTags: ["4 rooms", "Breakfast", "EV charger"], baseRating: 4.6, price: "£££" },
  { suffix: "Glamping Pod", type: "Glamping", baseTags: ["Unique", "Nature", "Stargazing"], baseRating: 4.7, price: "££" },
  { suffix: "Inn", type: "Inn", baseTags: ["Pub", "Traditional", "Dog friendly"], baseRating: 4.4, price: "£" },
  { suffix: "Guest House", type: "Guest House", baseTags: ["Homely", "Garden", "Breakfast"], baseRating: 4.5, price: "£" },
];

function getRegion(places) {
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
  return "uk";
}

const REGION_ACCOM_TEMPLATES = {
  japan: [
    { suffix: "Ryokan", type: "Traditional Inn", baseTags: ["Tatami", "Onsen", "Kaiseki dinner"], baseRating: 4.8, price: "£££" },
    { suffix: "Capsule Hotel", type: "Capsule", baseTags: ["Central", "Modern", "Budget"], baseRating: 4.2, price: "£" },
    { suffix: "Business Hotel", type: "Hotel", baseTags: ["Clean", "Convenient", "Wi-Fi"], baseRating: 4.3, price: "££" },
    { suffix: "Boutique Hotel", type: "Hotel", baseTags: ["Design", "Rooftop bar", "City view"], baseRating: 4.7, price: "£££" },
    { suffix: "Guest House", type: "Guesthouse", baseTags: ["Local area", "Shared kitchen", "Friendly"], baseRating: 4.5, price: "£" },
    { suffix: "Luxury Resort", type: "Resort", baseTags: ["Spa", "Garden", "Fine dining"], baseRating: 4.9, price: "££££" },
  ],
  france: [
    { suffix: "Boutique Hôtel", type: "Boutique Hotel", baseTags: ["Charming", "Central", "Breakfast"], baseRating: 4.6, price: "£££" },
    { suffix: "Chambre d'Hôtes", type: "B&B", baseTags: ["Homely", "Local host", "Garden"], baseRating: 4.7, price: "££" },
    { suffix: "Auberge", type: "Inn", baseTags: ["Restaurant", "Countryside", "Character"], baseRating: 4.5, price: "££" },
    { suffix: "Aparthotel", type: "Apartment", baseTags: ["Kitchen", "Self-catering", "Spacious"], baseRating: 4.4, price: "££" },
    { suffix: "Luxury Palace", type: "Luxury Hotel", baseTags: ["5-star", "Spa", "Concierge"], baseRating: 4.9, price: "££££" },
  ],
  spain: [
    { suffix: "Parador", type: "Historic Hotel", baseTags: ["Heritage", "Restaurant", "Views"], baseRating: 4.7, price: "£££" },
    { suffix: "Hostal", type: "Guesthouse", baseTags: ["Budget", "Central", "Friendly"], baseRating: 4.2, price: "£" },
    { suffix: "Boutique Hotel", type: "Boutique", baseTags: ["Design", "Rooftop terrace", "Pool"], baseRating: 4.6, price: "£££" },
    { suffix: "Apartamento", type: "Apartment", baseTags: ["Kitchen", "Local area", "Balcony"], baseRating: 4.4, price: "££" },
    { suffix: "Casa Rural", type: "Country House", baseTags: ["Rural", "Pool", "Peaceful"], baseRating: 4.5, price: "££" },
  ],
  italy: [
    { suffix: "Albergo", type: "Hotel", baseTags: ["Central", "Breakfast", "Terrace"], baseRating: 4.5, price: "££" },
    { suffix: "Agriturismo", type: "Farm Stay", baseTags: ["Countryside", "Local food", "Pool"], baseRating: 4.7, price: "££" },
    { suffix: "Pensione", type: "Guesthouse", baseTags: ["Family-run", "Budget", "Charming"], baseRating: 4.3, price: "£" },
    { suffix: "Boutique Hotel", type: "Boutique", baseTags: ["Design", "Historic building", "Restaurant"], baseRating: 4.8, price: "£££" },
    { suffix: "Palazzo", type: "Luxury", baseTags: ["Heritage", "Spa", "Fine dining"], baseRating: 4.9, price: "££££" },
  ],
  usa: [
    { suffix: "Downtown Hotel", type: "Hotel", baseTags: ["Central", "Gym", "Business"], baseRating: 4.4, price: "£££" },
    { suffix: "Boutique Hotel", type: "Boutique", baseTags: ["Design", "Rooftop", "Bar"], baseRating: 4.7, price: "£££" },
    { suffix: "Motel", type: "Motel", baseTags: ["Road trip", "Parking", "Budget"], baseRating: 3.8, price: "£" },
    { suffix: "Airbnb Apartment", type: "Apartment", baseTags: ["Kitchen", "Local area", "Flexible"], baseRating: 4.5, price: "££" },
    { suffix: "Resort & Spa", type: "Resort", baseTags: ["Pool", "Spa", "Restaurant"], baseRating: 4.8, price: "££££" },
  ],
  thailand: [
    { suffix: "Beach Resort", type: "Resort", baseTags: ["Beachfront", "Pool", "Spa"], baseRating: 4.7, price: "££" },
    { suffix: "Boutique Hotel", type: "Boutique", baseTags: ["Design", "Rooftop", "Central"], baseRating: 4.6, price: "££" },
    { suffix: "Guest House", type: "Guesthouse", baseTags: ["Budget", "Friendly", "Local area"], baseRating: 4.3, price: "£" },
    { suffix: "Hostel", type: "Hostel", baseTags: ["Social", "Dorm", "Bar"], baseRating: 4.1, price: "£" },
    { suffix: "Luxury Villa", type: "Villa", baseTags: ["Private pool", "Staff", "Ocean view"], baseRating: 4.9, price: "££££" },
  ],
  uae: [
    { suffix: "Luxury Hotel", type: "Hotel", baseTags: ["5-star", "Pool", "Spa"], baseRating: 4.8, price: "££££" },
    { suffix: "Beach Resort", type: "Resort", baseTags: ["Private beach", "All-inclusive", "Water sports"], baseRating: 4.7, price: "££££" },
    { suffix: "Aparthotel", type: "Apartment", baseTags: ["Kitchen", "City view", "Gym"], baseRating: 4.5, price: "£££" },
    { suffix: "Budget Hotel", type: "Hotel", baseTags: ["Clean", "Metro access", "Wi-Fi"], baseRating: 4.2, price: "££" },
  ],
  maldives: [
    { suffix: "Water Villa", type: "Villa", baseTags: ["Overwater", "Private deck", "Snorkeling"], baseRating: 4.9, price: "££££" },
    { suffix: "Beach Bungalow", type: "Bungalow", baseTags: ["Beachfront", "Sunrise view", "Reef access"], baseRating: 4.8, price: "££££" },
    { suffix: "Guest House", type: "Guesthouse", baseTags: ["Local island", "Budget", "Diving"], baseRating: 4.4, price: "££" },
    { suffix: "All-Inclusive Resort", type: "Resort", baseTags: ["Spa", "Fine dining", "Excursions"], baseRating: 4.9, price: "£££££" },
  ],
};

function generateLocalAccommodations(places) {
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

// ─── Reusable Form Components (outside main component to prevent remount on state changes) ───
function ControlledField({ label, type = "text", value, onChange, placeholder, style: wrapStyle, min, max }) {
  const inputStyle = { width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none" };
  return (
    <div style={{ marginBottom: 14, ...wrapStyle }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>{label}</label>
      {type === "textarea" ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} min={min} max={max} style={inputStyle} />
      )}
    </div>
  );
}

function TabBar({ active, onNav }) {
  const tabs = [
    { id: "trip", label: "Timeline", screen: "trip" },
    { id: "chat", label: "Chat", screen: "chat" },
    { id: "explore", label: "Explore", screen: "explore" },
    { id: "memories", label: "Memories", screen: "memories" },
    { id: "settings", label: "Settings", screen: "settings" },
  ];
  if (active === "home") {
    return (
      <div style={{ display: "flex", background: T.s, borderTop: `.5px solid ${T.border}`, flexShrink: 0 }}>
        {[["home", "Trips"], ["explore", "Explore"], ["settings", "Settings"]].map(([id, label]) => (
          <button key={id} onClick={() => onNav(id)} style={{ flex: 1, padding: "10px 0 8px", textAlign: "center", fontSize: 11, color: active === id ? T.a : T.t3, cursor: "pointer", border: "none", background: "none", fontFamily: T.font, fontWeight: 500 }}>{label}</button>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", background: T.s, borderTop: `.5px solid ${T.border}`, flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onNav(t.screen)} style={{ flex: 1, padding: "10px 0 8px", textAlign: "center", fontSize: 11, color: active === t.id ? T.a : T.t3, cursor: "pointer", border: "none", background: "none", fontFamily: T.font, fontWeight: 500 }}>{t.label}</button>
      ))}
    </div>
  );
}

// ─── Main App ───
export default function WanderlyApp() {
  const [screen, setScreen] = useState("home");
  const [wizStep, setWizStep] = useState(0);
  const [selectedDay, setSelectedDay] = useState(1);
  const [expandedItem, setExpandedItem] = useState(null);
  const [photos, setPhotos] = useState(MEMORIES);
  const [videoState, setVideoState] = useState("idle");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatDayInit, setChatDayInit] = useState(null);
  const [bookingStates, setBookingStates] = useState({});
  const chatRef = useRef(null);
  const photoInputRef = useRef(null);
  const reelTimerRef = useRef(null);
  const [chatInput, setChatInput] = useState("");
  const [pollData, setPollData] = useState(POLLS);
  const [createdTrips, setCreatedTrips] = useState([]);
  const [selectedCreatedTrip, setSelectedCreatedTrip] = useState(null);
  const [editingTimelineIdx, setEditingTimelineIdx] = useState(null);
  const [editingTripId, setEditingTripId] = useState(null);
  const [tripChatInput, setTripChatInput] = useState("");
  const [tripChatMessages, setTripChatMessages] = useState([]);
  const [settingsToggles, setSettingsToggles] = useState(() => {
    const s = {}; Object.keys(CONNECTORS).forEach(k => s[k] = true);
    ["booking","ev","traffic","video","poll","checkout"].forEach(k => s["n_"+k] = true);
    return s;
  });

  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [videoSettings, setVideoSettings] = useState(new Set(["Music overlay", "AI narration", "Date stamps"]));
  const [reelPlaying, setReelPlaying] = useState(false);
  const [reelIndex, setReelIndex] = useState(0);
  const [reelPaused, setReelPaused] = useState(false);

  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [joinShareCode, setJoinShareCode] = useState("");

  // ─── New Trip Wizard State ───
  const [wizTrip, setWizTrip] = useState({ name: "", brief: "", start: "", end: "", places: [], travel: new Set(), budget: "", startLocation: "" });
  const [wizTravellers, setWizTravellers] = useState({ adults: [{ name: "You", email: "", isLead: true }], olderKids: [], youngerKids: [] });
  const [wizStays, setWizStays] = useState([]);
  const [wizPrefs, setWizPrefs] = useState({ food: new Set(), adultActs: new Set(), olderActs: new Set(), youngerActs: new Set(), instructions: "" });
  const [staySearch, setStaySearch] = useState("");
  const [staySearchOpen, setStaySearchOpen] = useState(false);
  const [placeInput, setPlaceInput] = useState("");
  const [placeSuggestionsOpen, setPlaceSuggestionsOpen] = useState(false);
  const [foodSearch, setFoodSearch] = useState("");
  const [adultActSearch, setAdultActSearch] = useState("");
  const [olderActSearch, setOlderActSearch] = useState("");
  const [youngerActSearch, setYoungerActSearch] = useState("");
  const [lastChatTopic, setLastChatTopic] = useState("");
  const [chatFlowStep, setChatFlowStep] = useState(null); // null | "ask_start" | "ask_pickups" | "ask_time" | "route_shown" | "ask_home" | "ask_departure_time" | "departure_shown"
  const [chatFlowData, setChatFlowData] = useState({});
  const [toast, setToast] = useState(null);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('wanderly_welcomed'));
  const [showDemo, setShowDemo] = useState(false);
  const [demoSlide, setDemoSlide] = useState(0);
  const [demoTick, setDemoTick] = useState(0);
  const [demoPaused, setDemoPaused] = useState(false);
  const [demoInteracted, setDemoInteracted] = useState({});
  const demoTimerRef = useRef(null);
  const demoTickRef = useRef(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const resetWizard = useCallback(() => {
    setWizTrip({ name: "", brief: "", start: "", end: "", places: [], travel: new Set(), budget: "", startLocation: "" });
    setWizTravellers({ adults: [{ name: "You", email: "", isLead: true }], olderKids: [], youngerKids: [] });
    setWizStays([]);
    setWizPrefs({ food: new Set(), adultActs: new Set(), olderActs: new Set(), youngerActs: new Set(), instructions: "" });
    setStaySearch("");
    setStaySearchOpen(false);
    setPlaceInput("");
    setPlaceSuggestionsOpen(false);
    setFoodSearch("");
    setAdultActSearch("");
    setOlderActSearch("");
    setYoungerActSearch("");
    setWizStep(0);
  }, []);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Check for share code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setScreen('joinPreview');
      setJoinShareCode(joinCode);
    }
  }, []);

  // Trip Reel auto-advance timer
  useEffect(() => {
    if (reelPlaying && !reelPaused && uploadedPhotos.length > 0) {
      reelTimerRef.current = setInterval(() => {
        setReelIndex(prev => {
          if (prev >= uploadedPhotos.length - 1) {
            setReelPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 4000);
    }
    return () => { if (reelTimerRef.current) clearInterval(reelTimerRef.current); };
  }, [reelPlaying, reelPaused, uploadedPhotos.length]);

  // Demo animation tick — drives all animations
  useEffect(() => {
    if (showDemo && !demoPaused) {
      demoTickRef.current = setInterval(() => setDemoTick(t => t + 1), 220);
    }
    return () => { if (demoTickRef.current) clearInterval(demoTickRef.current); };
  }, [showDemo, demoPaused]);

  // Demo auto-advance slides (ticks at 220ms each)
  const DEMO_SLIDE_DURATIONS = [52, 62, 40, 58, 48, 48, 48, 42, 44, 999];
  useEffect(() => {
    if (!showDemo) return;
    const dur = DEMO_SLIDE_DURATIONS[demoSlide] || 50;
    if (demoTick >= dur && demoSlide < 9) {
      setDemoSlide(s => s + 1);
      setDemoTick(0);
    }
  }, [showDemo, demoTick, demoSlide]);

  // Reset tick on slide change
  useEffect(() => { setDemoTick(0); }, [demoSlide]);

  const signInWithGoogle = async () => {
    setAuthError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) setAuthError(error.message);
  };

  const signInWithEmail = async () => {
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    if (error) setAuthError(error.message);
  };

  const signUpWithEmail = async () => {
    setAuthError("");
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
      options: { data: { full_name: authName || authEmail.split("@")[0] } }
    });
    if (error) setAuthError(error.message);
    else setAuthError("Check your email for a confirmation link!");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("home");
  };

  // Load trips from Supabase
  const loadTripsFromDB = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const { data: trips, error } = await supabase
        .from('trips')
        .select('*, trip_travellers(*), trip_stays(*), trip_preferences(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (trips && trips.length > 0) {
        const mapped = trips.map(t => ({
          id: t.id,
          name: t.name,
          brief: t.brief,
          start: t.start_date,
          end: t.end_date,
          places: t.places || [],
          travel: t.travel_modes || [],
          status: t.status,
          shareCode: t.share_code,
          travellers: {
            adults: (t.trip_travellers || []).filter(tr => tr.role === 'lead' || tr.role === 'adult').map(tr => ({
              name: tr.name, email: tr.email || "", isLead: tr.role === 'lead', dbId: tr.id, isClaimed: tr.is_claimed
            })),
            olderKids: (t.trip_travellers || []).filter(tr => tr.role === 'child_older').map(tr => ({
              name: tr.name, age: tr.age || 10, dbId: tr.id
            })),
            youngerKids: (t.trip_travellers || []).filter(tr => tr.role === 'child_younger').map(tr => ({
              name: tr.name, age: tr.age || 5, dbId: tr.id
            })),
          },
          stays: (t.trip_stays || []).map(s => ({
            name: s.name, type: s.type, tags: s.tags || [], rating: s.rating, price: s.price, location: s.location, dbId: s.id
          })),
          stayNames: (t.trip_stays || []).map(s => s.name),
          prefs: t.trip_preferences && t.trip_preferences.length > 0 ? {
            food: t.trip_preferences[0].food_prefs || [],
            adultActs: t.trip_preferences[0].adult_activities || [],
            olderActs: t.trip_preferences[0].older_kid_activities || [],
            youngerActs: t.trip_preferences[0].younger_kid_activities || [],
            instructions: t.trip_preferences[0].instructions || "",
            activities: [...(t.trip_preferences[0].adult_activities || []), ...(t.trip_preferences[0].older_kid_activities || []), ...(t.trip_preferences[0].younger_kid_activities || [])],
          } : { food: [], adultActs: [], olderActs: [], youngerActs: [], instructions: "", activities: [] },
          createdAt: t.created_at,
          dbId: t.id,
          year: t.start_date ? new Date(t.start_date).getFullYear() : new Date().getFullYear(),
          timeline: [],
        }));
        setCreatedTrips(mapped);
      }
    } catch (err) {
      console.error('Error loading trips:', err);
      showToast("Failed to save — check connection", "error");
    }
    setSyncing(false);
  }, [user, showToast]);

  // Save trip to Supabase
  const saveTripToDB = async (tripData) => {
    if (!user || user.id === 'demo') return tripData;

    try {
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert({
          name: tripData.name,
          brief: tripData.brief,
          start_date: tripData.rawStart || null,
          end_date: tripData.rawEnd || null,
          places: tripData.places,
          travel_modes: Array.from(tripData.travel || []),
          status: 'draft',
          lead_user_id: user.id,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      const travellerRows = [];
      if (tripData.travellers?.adults) {
        tripData.travellers.adults.forEach(a => {
          travellerRows.push({
            trip_id: trip.id,
            user_id: a.isLead ? user.id : null,
            name: a.name || 'Adult',
            email: a.email || null,
            role: a.isLead ? 'lead' : 'adult',
            is_claimed: a.isLead,
          });
        });
      }
      if (tripData.travellers?.olderKids) {
        tripData.travellers.olderKids.forEach(c => {
          travellerRows.push({
            trip_id: trip.id,
            name: c.name || 'Child',
            role: 'child_older',
            age: c.age,
          });
        });
      }
      if (tripData.travellers?.youngerKids) {
        tripData.travellers.youngerKids.forEach(c => {
          travellerRows.push({
            trip_id: trip.id,
            name: c.name || 'Child',
            role: 'child_younger',
            age: c.age,
          });
        });
      }
      if (travellerRows.length > 0) {
        await supabase.from('trip_travellers').insert(travellerRows);
      }

      if (tripData.stays && tripData.stays.length > 0) {
        const stayRows = tripData.stays.map(s => ({
          trip_id: trip.id,
          name: s.name,
          type: s.type,
          tags: s.tags || [],
          rating: s.rating,
          price: s.price,
          location: s.location,
        }));
        await supabase.from('trip_stays').insert(stayRows);
      }

      if (tripData.prefs) {
        await supabase.from('trip_preferences').insert({
          trip_id: trip.id,
          food_prefs: Array.from(tripData.prefs.food || []),
          adult_activities: Array.from(tripData.prefs.adultActs || tripData.prefs.activities || []),
          older_kid_activities: Array.from(tripData.prefs.olderActs || []),
          younger_kid_activities: Array.from(tripData.prefs.youngerActs || []),
          instructions: tripData.prefs.instructions || "",
        });
      }

      return { ...tripData, id: trip.id, shareCode: trip.share_code, dbId: trip.id };
    } catch (err) {
      console.error('Error saving trip:', err);
      showToast("Failed to save — check connection", "error");
      return tripData;
    }
  };

  // Update trip status in Supabase
  const updateTripStatusInDB = async (tripId, status) => {
    if (!user || user.id === 'demo' || !tripId) return;
    try {
      await supabase.from('trips').update({ status, updated_at: new Date().toISOString() }).eq('id', tripId);
    } catch (err) {
      console.error('Error updating trip status:', err);
    }
  };

  // Look up trip by share code
  const lookupTripByShareCode = async (code) => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*, trip_travellers(*), trip_stays(*), trip_preferences(*)')
        .eq('share_code', code.toUpperCase())
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error looking up trip:', err);
      return null;
    }
  };

  // Join trip as traveller
  const joinTripAsTraveller = async (tripId, travellerId, userName) => {
    if (!user || user.id === 'demo') return false;
    try {
      await supabase.from('trip_travellers')
        .update({ user_id: user.id, is_claimed: true, name: userName, joined_at: new Date().toISOString() })
        .eq('id', travellerId);
      return true;
    } catch (err) {
      console.error('Error joining trip:', err);
      return false;
    }
  };

  // Load trips when user logs in
  useEffect(() => {
    if (user && user.id !== 'demo') {
      loadTripsFromDB();
    }
  }, [user, loadTripsFromDB]);

  const createTrip = () => {
    if (wizTrip.name.trim().length < 2) {
      alert("Please enter a trip name (at least 2 characters)");
      return;
    }
    const name = wizTrip.name.trim();
    const formatDate = (d) => { if (!d) return ""; const dt = new Date(d); return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
    const tripData = {
      name,
      brief: wizTrip.brief,
      start: formatDate(wizTrip.start),
      end: formatDate(wizTrip.end),
      rawStart: wizTrip.start,
      rawEnd: wizTrip.end,
      year: wizTrip.start ? new Date(wizTrip.start).getFullYear() : new Date().getFullYear(),
      places: [...wizTrip.places],
      travel: [...wizTrip.travel],
      budget: wizTrip.budget,
      startLocation: wizTrip.startLocation,
      travellers: { adults: wizTravellers.adults.map(a => ({ ...a })), olderKids: wizTravellers.olderKids.map(c => ({ ...c })), youngerKids: wizTravellers.youngerKids.map(c => ({ ...c })) },
      stays: [...wizStays],
      stayNames: wizStays.map(s => s.name || s),
      prefs: { food: [...wizPrefs.food], activities: [...wizPrefs.adultActs, ...wizPrefs.olderActs, ...wizPrefs.youngerActs] },
    };
    if (editingTripId) {
      // Update existing trip, preserve status and timeline
      setCreatedTrips(prev => prev.map(t => {
        if (t.id !== editingTripId) return t;
        const updated = { ...t, ...tripData };
        // Regenerate timeline if live
        if (t.status === "live") updated.timeline = generateTimeline(updated);
        return updated;
      }));
      const updatedTrip = { ...createdTrips.find(t => t.id === editingTripId), ...tripData };
      setSelectedCreatedTrip(updatedTrip);
      setEditingTripId(null);
      navigate("createdTrip");
    } else {
      const newTrip = { id: Date.now(), ...tripData, status: "new", timeline: [], shareCode: Math.random().toString(36).substring(2, 8).toUpperCase() };
      setCreatedTrips(prev => [newTrip, ...prev]);
      // Save to Supabase
      if (user && user.id !== 'demo') {
        saveTripToDB(newTrip).then(savedTrip => {
          if (savedTrip.dbId) {
            setCreatedTrips(prev => prev.map(t => t.id === newTrip.id ? { ...t, dbId: savedTrip.dbId, shareCode: savedTrip.shareCode } : t));
            showToast("Saved to cloud", "success");
          }
        }).catch(() => {
          showToast("Failed to save — check connection", "error");
        });
      }
      setEditingTripId(null);
      showToast("Trip created!");
      navigate("home");
    }
  };

  const deleteCreatedTrip = (id) => {
    const trip = createdTrips.find(t => t.id === id);
    if (!window.confirm("Remove '" + (trip?.name || "this trip") + "'? This cannot be undone.")) return;
    setCreatedTrips(prev => prev.filter(t => t.id !== id));
    showToast("Trip removed");
  };

  const generateTimeline = (trip) => {
    const items = [];
    const loc = trip.places[0] || "your destination";
    const stayName = trip.stayNames[0] || "accommodation";
    const food = trip.prefs.food.length > 0 ? trip.prefs.food.join(" + ") : "Local cuisine";
    const activity = trip.prefs.activities.length > 0 ? trip.prefs.activities[0] : "Explore the area";
    const travelMode = trip.travel[0] || "Travel";
    items.push({ time: "9:00 AM", title: `Arrive ${loc}`, desc: `${travelMode} · Check in at ${stayName}`, group: "Everyone", color: T.a });
    items.push({ time: "11:00 AM", title: activity, desc: `${loc} · Guided experience`, group: "Everyone", color: T.blue });
    items.push({ time: "12:30 PM", title: `Lunch — ${food}`, desc: `Local restaurant · ${food}`, group: "Everyone", color: T.coral });
    items.push({ time: "2:30 PM", title: `Explore ${loc}`, desc: trip.prefs.activities.length > 1 ? trip.prefs.activities[1] : "Walking tour & sightseeing", group: "Everyone", color: T.blue });
    items.push({ time: "5:00 PM", title: `Return to ${stayName}`, desc: "Relax & freshen up", group: "Everyone", color: T.t3 });
    items.push({ time: "7:00 PM", title: "Dinner", desc: `${food} · Restaurant TBC`, group: "Everyone", color: T.coral });
    return items;
  };

  const makeTripLive = (id) => {
    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== id) return { ...t, status: t.status === "live" ? "new" : t.status };
      updateTripStatusInDB(t.dbId || t.id, 'live');
      return { ...t, status: "live", timeline: [] };
    }));
  };

  const viewCreatedTrip = (trip) => {
    setSelectedCreatedTrip(trip);
    setEditingTimelineIdx(null);
    setTripChatMessages([]);
    setTripChatInput("");
    navigate("createdTrip");
  };

  const updateTimelineItem = (tripId, idx, field, value) => {
    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const timeline = t.timeline.map((item, i) => i === idx ? { ...item, [field]: value } : item);
      return { ...t, timeline };
    }));
  };

  const deleteTimelineItem = (tripId, idx) => {
    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      return { ...t, timeline: t.timeline.filter((_, i) => i !== idx) };
    }));
    setEditingTimelineIdx(null);
  };

  const addTimelineItem = (tripId) => {
    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const newItem = { time: "12:00 PM", title: "New activity", desc: "Tap to edit details", group: "Everyone", color: T.blue };
      return { ...t, timeline: [...t.timeline, newItem] };
    }));
  };

  const handleTripChat = (tripId) => {
    const msg = tripChatInput.trim();
    if (!msg) return;
    setTripChatMessages(prev => [...prev, { role: "user", text: msg }]);
    setTripChatInput("");
    const trip = createdTrips.find(t => t.id === tripId);
    const loc = trip?.places[0] || "your destination";
    // Simple AI-like responses based on keywords
    setTimeout(() => {
      let reply = "";
      const lower = msg.toLowerCase();
      if (lower.includes("restaurant") || lower.includes("food") || lower.includes("eat") || lower.includes("lunch") || lower.includes("dinner")) {
        reply = `Great question! For ${loc}, I'd recommend checking local restaurant guides. I've updated the dinner slot to "Restaurant research needed." You can edit any timeline item by tapping the ✏️ icon next to it.`;
      } else if (lower.includes("earlier") || lower.includes("later") || lower.includes("time") || lower.includes("move")) {
        reply = `You can adjust timings by tapping the ✏️ edit icon on any timeline item and changing the time. Would you like me to suggest an alternative schedule?`;
      } else if (lower.includes("add") || lower.includes("include") || lower.includes("more")) {
        reply = `I've added a new activity slot to your timeline. Tap the ✏️ icon to customize it with your preferred activity for ${loc}.`;
        addTimelineItem(tripId);
      } else if (lower.includes("remove") || lower.includes("delete") || lower.includes("cancel")) {
        reply = `You can remove any activity by tapping the ✏️ icon and then the 🗑️ delete button. Which activity would you like to remove?`;
      } else {
        reply = `Thanks for the input! You can refine your ${loc} itinerary by:\n• Tapping ✏️ on any timeline item to edit it\n• Using the "+ Add activity" button for new items\n• Telling me what you'd like to change`;
      }
      setTripChatMessages(prev => [...prev, { role: "ai", text: reply }]);
    }, 800);
  };

  const navigate = useCallback((s) => setScreen(s), []);

  // ─── Day-Aware Chat Greeting ───
  const buildDayGreeting = useCallback((dayNum) => {
    const day = DAYS[dayNum - 1];
    const items = TIMELINE[dayNum] || [];
    const totalDays = DAYS.length;
    const isFirstDay = dayNum === 1;
    const isLastDay = dayNum === totalDays;
    const { temp, cond, icon } = day.weather;
    const loc = day.location;
    const bookingsNeeded = items.filter(it => it.needsBooking).map(it => `${it.title} (${it.price})`);
    const activePolls = POLLS.filter(p => p.status === "active");

    if (isFirstDay) {
      const stay = TRIP.stays[0];
      const travelMode = TRIP.travelMode || "car";
      const modeIcon = travelMode.toLowerCase().includes("ev") ? "🔋" : travelMode.toLowerCase().includes("flight") ? "✈️" : travelMode.toLowerCase().includes("train") ? "🚆" : "🚗";
      if (TRIP.startLocation) {
        // Start location known — go straight to route suggestion
        setChatFlowStep("ask_pickups");
        setChatFlowData({ startLocation: TRIP.startLocation });
        return `${modeIcon} **Travel day — heading to ${loc}!**\n\n**From:** ${TRIP.startLocation}\n**To:** ${stay ? stay.name : loc}\n**Mode:** ${travelMode}\n**Weather at destination:** ${temp}°C ${icon} ${cond}\n\nAnyone to pick up along the way?`;
      } else {
        // Need to ask for start location
        setChatFlowStep("ask_start");
        setChatFlowData({});
        return `${modeIcon} **Travel day — heading to ${loc}!**\n\n**Staying at:** ${stay ? stay.name + " (" + stay.tags.join(", ") + ")" : loc}\n**Mode:** ${travelMode}\n**Weather at destination:** ${temp}°C ${icon} ${cond}\n\nWhere are you starting from? Enter your postcode or city so I can plan your route.`;
      }
    }

    if (isLastDay) {
      const stay = TRIP.stays[TRIP.stays.length - 1];
      const travelMode = TRIP.travelMode || "car";
      const modeIcon = travelMode.toLowerCase().includes("ev") ? "🔋" : travelMode.toLowerCase().includes("flight") ? "✈️" : travelMode.toLowerCase().includes("train") ? "🚆" : "🚗";
      if (TRIP.startLocation) {
        // Home location known — skip ask_home, go to departure time
        setChatFlowStep("ask_departure_time");
        setChatFlowData({ homeLocation: TRIP.startLocation });
        return `🏠 **Final day — heading back to ${TRIP.startLocation}!**\n\n${modeIcon} **From:** ${stay ? stay.name + ", " : ""}${loc}\n**To:** ${TRIP.startLocation}\n**Mode:** ${travelMode}\n**Weather:** ${temp}°C ${icon} ${cond}\n\nWhat time would you like to leave?`;
      } else {
        setChatFlowStep("ask_home");
        setChatFlowData({});
        return `🏠 **Final day — time to head home!**\n\n**From:** ${stay ? stay.name + ", " : ""}${loc}\n**Weather:** ${temp}°C ${icon} ${cond}\n\nWhere are you heading home to? I'll plan your departure with the best stops.`;
      }
    }

    // Middle days — activity-focused, anchored to current stay
    setChatFlowStep(null);
    setChatFlowData({});
    // Find which stay covers this day
    let currentStay = null;
    let nightsSoFar = 0;
    for (const stay of TRIP.stays) {
      if (dayNum >= nightsSoFar + 1 && dayNum <= nightsSoFar + stay.nights) {
        currentStay = stay;
        break;
      }
      nightsSoFar += stay.nights;
    }

    const adultItems = items.filter(it => it.for === "adults");
    const kidItems = items.filter(it => it.for === "kids");
    const allItems = items.filter(it => it.for === "all");

    let msg = `Good morning! Day ${dayNum} in **${loc}** · ${temp}°C ${icon} ${cond}\n\n`;
    if (currentStay) {
      msg += `🏨 Your base today: **${currentStay.name}** (${currentStay.type})\n`;
      if (currentStay.tags.length) msg += `${currentStay.tags.join(" · ")}\n`;
      msg += `\n`;
    }

    if (adultItems.length && kidItems.length) {
      msg += `I've split activities today:\n**Adults:** ${adultItems.map(it => it.title).join(", ")}\n**Kids:** ${kidItems.map(it => it.title).join(", ")}\n`;
      const meetup = allItems.find(it => it.title.toLowerCase().includes("lunch"));
      if (meetup) msg += `Everyone meets at **${meetup.title.replace("Lunch at ", "")}** for lunch.\n`;
    } else {
      const highlights = items.slice(0, 3).map(it => `${it.time} — ${it.title}`).join("\n");
      if (highlights) msg += highlights + "\n";
    }
    if (bookingsNeeded.length) msg += `\n📋 **Needs confirmation:** ${bookingsNeeded.join(", ")}`;
    if (activePolls.length) msg += `\n🗳️ ${activePolls.length} active poll${activePolls.length > 1 ? "s" : ""} — cast your vote!`;
    return msg;
  }, []);

  // Initialize chat greeting when entering chat or switching days
  useEffect(() => {
    if (screen === "chat" && chatDayInit !== selectedDay) {
      const greeting = buildDayGreeting(selectedDay);
      if (chatDayInit === null) {
        setChatMessages([{ role: "ai", text: greeting }]);
      } else {
        setChatMessages(prev => [...prev, { role: "ai", text: `— Switching to Day ${selectedDay} —\n\n${greeting}` }]);
      }
      setChatDayInit(selectedDay);
    }
  }, [screen, selectedDay, chatDayInit, buildDayGreeting]);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [chatMessages]);

  // ─── Screen: Home (render function, not component) ───
  const renderHomeScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px 20px 12px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <h1 style={{ fontFamily: T.fontD, fontSize: 24, fontWeight: 400, color: T.t1 }}>Wanderly</h1>
          <span style={{ fontSize: 11, color: T.t3, fontWeight: 500, letterSpacing: 0.5 }}>TRAVEL CONCIERGE</span>
        </div>
        <button style={{ ...css.btn, ...css.btnP, ...css.btnSm }} onClick={() => { resetWizard(); navigate("create"); }}>+ New trip</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <p style={{ fontSize: 13, color: T.t3, marginBottom: 16 }}>Your upcoming adventures</p>

        {createdTrips.map(trip => (
          <div key={trip.id} style={{ ...css.card, position: "relative", overflow: "hidden", marginBottom: 12, cursor: "pointer" }} onClick={() => viewCreatedTrip(trip)}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: `radial-gradient(circle at 100% 0%, ${trip.status === "live" ? T.al : T.blueL} 0%, transparent 70%)`, pointerEvents: "none" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <h3 style={{ fontFamily: T.fontD, fontSize: 18, fontWeight: 400 }}>{trip.name}</h3>
                <p style={{ fontSize: 12, color: T.t2 }}>{trip.start && trip.end ? `${trip.start} – ${trip.end} ${trip.year}` : "Dates TBC"}</p>
              </div>
              {trip.status === "live" ? <Tag bg={T.al} color={T.ad}>Live</Tag> : <Tag bg={T.blueL} color={T.blue}>New</Tag>}
            </div>
            {trip.brief && <p style={{ fontSize: 12, color: T.t3, marginBottom: 8 }}>{trip.brief}</p>}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
              {trip.places.map(p => <Tag key={p} bg={T.purpleL} color={T.purple}>{p}</Tag>)}
              {trip.travel.map(t => <Tag key={t} bg={T.blueL} color={T.blue}>{t}</Tag>)}
              {trip.travellers.adults.length > 0 && <Tag bg={T.coralL} color={T.coral}>{trip.travellers.adults.length} adult{trip.travellers.adults.length > 1 ? "s" : ""}</Tag>}
              {trip.travellers.olderKids.length > 0 && <Tag bg={T.pinkL} color={T.pink}>{trip.travellers.olderKids.length} older kid{trip.travellers.olderKids.length > 1 ? "s" : ""}</Tag>}
              {trip.travellers.youngerKids.length > 0 && <Tag bg={T.pinkL} color={T.pink}>{trip.travellers.youngerKids.length} younger kid{trip.travellers.youngerKids.length > 1 ? "s" : ""}</Tag>}
              {trip.stayNames.length > 0 && <Tag bg={T.amberL} color={T.amber}>{trip.stayNames.length} stay{trip.stayNames.length > 1 ? "s" : ""}</Tag>}
              {trip.budget && <Tag bg={T.greenL} color={T.green}>{trip.budget}</Tag>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {trip.status !== "live" && <button onClick={e => { e.stopPropagation(); makeTripLive(trip.id); }} style={{ ...css.btn, ...css.btnP, ...css.btnSm, fontSize: 11 }}>🚀 Activate trip</button>}
              <button onClick={e => { e.stopPropagation(); deleteCreatedTrip(trip.id); }} style={{ ...css.btn, ...css.btnSm, fontSize: 11, color: T.red }}>Remove</button>
            </div>
          </div>
        ))}

        <div style={{ ...css.card, cursor: "pointer", position: "relative", overflow: "hidden" }} onClick={() => { setSelectedDay(1); navigate("trip"); }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: `radial-gradient(circle at 100% 0%, ${T.al} 0%, transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <h3 style={{ fontFamily: T.fontD, fontSize: 18, fontWeight: 400 }}>{TRIP.name}</h3>
              <p style={{ fontSize: 12, color: T.t2 }}>{TRIP.start} - {TRIP.end} {TRIP.year}</p>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Tag bg={T.amberL} color={T.amber}>Demo</Tag>
              <Tag bg={T.al} color={T.ad}>Live</Tag>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontSize: 11, color: T.t3, fontStyle: "italic" }}>Sample trip — tap to explore</p>
            <button onClick={e => { e.stopPropagation(); setShowDemo(true); setDemoSlide(0); }} style={{ ...css.btn, ...css.btnSm, fontSize: 10, padding: "4px 10px", gap: 4 }}>▶ Watch demo</button>
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
            <Tag bg={T.blueL} color={T.blue}>EV road trip</Tag>
            <Tag bg={T.coralL} color={T.coral}>Mixed diet</Tag>
            <Tag bg={T.pinkL} color={T.pink}>2 kids</Tag>
            <Tag bg={T.purpleL} color={T.purple}>2 stays</Tag>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex" }}>
              {[["You", T.a], ["JM", T.coral], ["SP", T.blue], ["+1", T.amber]].map(([l, c], i) => (
                <Avatar key={i} bg={c} label={l} size={28} style={{ marginLeft: i ? -6 : 0, border: `2px solid ${T.s}` }} />
              ))}
            </div>
            <span style={{ fontSize: 12, color: T.t3 }}>4 adults · 2 children</span>
          </div>
        </div>
        <div style={{ ...css.card, border: `1.5px dashed ${T.border}`, background: "none", textAlign: "center", padding: "36px 20px", cursor: "pointer", boxShadow: "none" }} onClick={() => { resetWizard(); navigate("create"); }}>
          <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}>+</div>
          <p style={{ fontSize: 14, fontWeight: 500, color: T.t2 }}>Plan your next adventure</p>
          <p style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>Create from scratch or use a template</p>
        </div>

        <div style={{ ...css.card, marginTop: 16, background: T.al, borderColor: T.a }}>
          <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: T.ad }}>Powered by intelligent routing</p>
              <p style={{ fontSize: 12, color: T.t2, marginTop: 2 }}>Wanderly automatically connects to 18 travel services — maps, weather, bookings, EV chargers, and more — based on your trip needs.</p>
            </div>
          </div>
        </div>
      </div>
      <TabBar active="home" onNav={navigate} />
    </div>
  );

  // ─── Screen: Create (render function) ───
  const wizSteps = ["Details", "Travellers", "Stays", "Preferences"];
  const renderCreateScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => { if (editingTripId) { setEditingTripId(null); navigate("createdTrip"); } else navigate("home"); }}>Cancel</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>{editingTripId ? "Edit trip" : "New trip"}</h2>
        <span style={{ fontSize: 11, color: T.t3 }}>Step {wizStep + 1} of 4</span>
      </div>
      <div style={{ display: "flex", gap: 4, padding: "10px 20px", background: T.s, borderBottom: `.5px solid ${T.border}` }}>
        {wizSteps.map((step, i) => (
          <div key={i} onClick={() => { if (i <= wizStep) setWizStep(i); }}
            style={{ flex: 1, height: 4, borderRadius: 2, background: i <= wizStep ? T.a : T.s3, cursor: i <= wizStep ? "pointer" : "default", transition: "background .2s" }} />
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 2 }}>{wizSteps[wizStep]}</h3>
        <p style={{ fontSize: 12, color: T.t3, marginBottom: 16 }}>
          {["Name, dates, and destinations", "Add your travel group", "Where you're staying", "Food, activities, and instructions"][wizStep]}
        </p>
        {wizStep === 0 && renderWizDetails()}
        {wizStep === 1 && renderWizTravellers()}
        {wizStep === 2 && renderWizStays()}
        {wizStep === 3 && renderWizPrefs()}
      </div>
      <div style={{ display: "flex", gap: 10, padding: "12px 20px", background: T.s, borderTop: `.5px solid ${T.border}` }}>
        {wizStep > 0 && <button style={{ ...css.btn, flex: 1, justifyContent: "center" }} onClick={() => setWizStep(wizStep - 1)}>Back</button>}
        <button style={{ ...css.btn, ...css.btnP, flex: 1, justifyContent: "center" }} onClick={() => wizStep < 3 ? setWizStep(wizStep + 1) : createTrip()}>
          {wizStep < 3 ? `Next: ${wizSteps[wizStep + 1]}` : editingTripId ? "Save changes" : "Create trip"}
        </button>
      </div>
    </div>
  );

  // ─── Wizard Step: Details (render function, not component) ───
  const renderWizDetails = () => {
    const addPlace = (p) => {
      const place = (p || placeInput).trim();
      if (!place) { setPlaceInput(""); setPlaceSuggestionsOpen(false); return; }
      if (wizTrip.places.some(existing => existing.toLowerCase() === place.toLowerCase())) {
        showToast("'" + place + "' already added", "error");
        setPlaceInput("");
        setPlaceSuggestionsOpen(false);
        return;
      }
      setWizTrip(prev => ({ ...prev, places: [...prev.places, place] }));
      setPlaceInput("");
      setPlaceSuggestionsOpen(false);
    };
    const removePlace = (place) => setWizTrip(prev => ({ ...prev, places: prev.places.filter(p => p !== place) }));
    const travelOpts = ["Flight", "EV vehicle", "Non-EV vehicle", "Train", "Walking", "Bicycle"];
    const filteredPlaces = placeInput.trim().length > 0
      ? LOCATION_SUGGESTIONS.filter(loc =>
          loc.toLowerCase().includes(placeInput.trim().toLowerCase()) && !wizTrip.places.includes(loc)
        ).slice(0, 8)
      : [];
    return (
      <>
        <ControlledField label="Trip name" value={wizTrip.name} onChange={v => setWizTrip(prev => ({ ...prev, name: v }))} placeholder="e.g. Easter Lake District" />
        <ControlledField label="Brief" type="textarea" value={wizTrip.brief} onChange={v => setWizTrip(prev => ({ ...prev, brief: v }))} placeholder="Describe your trip — who's going, what kind of experience you want..." />
        <div style={{ display: "flex", gap: 10 }}>
          <ControlledField label="Start date" type="date" value={wizTrip.start} onChange={v => setWizTrip(prev => ({ ...prev, start: v }))} style={{ flex: 1 }} />
          <ControlledField label="End date" type="date" value={wizTrip.end} onChange={v => setWizTrip(prev => ({ ...prev, end: v }))} style={{ flex: 1 }} min={wizTrip.start || undefined} />
        </div>
        {!wizTrip.start && (
          <p style={{ fontSize: 12, color: T.t3, marginBottom: 14, fontStyle: "italic" }}>{"💡 Adding dates helps generate a better itinerary"}</p>
        )}
        <div style={{ marginBottom: 14, position: "relative" }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>Locations visiting</label>
          {wizTrip.places.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
              {wizTrip.places.map(p => (
                <span key={p} style={{ ...css.chip, ...css.chipActive, paddingRight: 8 }}>{p} <span onClick={() => removePlace(p)} style={{ opacity: 0.5, cursor: "pointer", marginLeft: 3 }}>×</span></span>
              ))}
            </div>
          )}
          <input value={placeInput}
            onChange={e => { setPlaceInput(e.target.value); setPlaceSuggestionsOpen(true); }}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addPlace(); } }}
            onFocus={() => { if (placeInput.trim()) setPlaceSuggestionsOpen(true); }}
            onBlur={() => setTimeout(() => setPlaceSuggestionsOpen(false), 200)}
            style={{ width: "100%", padding: "9px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none" }}
            placeholder="Search locations — e.g. London, UK, Lake District..." />
          {placeSuggestionsOpen && filteredPlaces.length > 0 && (
            <div style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 20, background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.rs, boxShadow: "0 4px 16px rgba(0,0,0,.1)", maxHeight: 200, overflowY: "auto", marginTop: 2 }}>
              {filteredPlaces.map(loc => (
                <div key={loc} onMouseDown={e => e.preventDefault()} onClick={() => addPlace(loc)}
                  style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", borderBottom: `.5px solid ${T.border}`, fontFamily: T.font, transition: "background .1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.s2}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  📍 {loc}
                </div>
              ))}
            </div>
          )}
          {placeSuggestionsOpen && placeInput.trim().length > 0 && filteredPlaces.length === 0 && (
            <div style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 20, background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.rs, boxShadow: "0 4px 16px rgba(0,0,0,.1)", marginTop: 2 }}>
              <div onMouseDown={e => e.preventDefault()} onClick={() => addPlace()}
                style={{ padding: "9px 12px", fontSize: 13, cursor: "pointer", fontFamily: T.font, color: T.a }}
                onMouseEnter={e => e.currentTarget.style.background = T.s2}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                + Add "{placeInput.trim()}" as custom location
              </div>
            </div>
          )}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>Mode of travel</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {travelOpts.map(o => (
              <span key={o} onClick={() => setWizTrip(prev => { const s = new Set(prev.travel); s.has(o) ? s.delete(o) : s.add(o); return { ...prev, travel: s }; })}
                style={{ ...css.chip, ...(wizTrip.travel.has(o) ? css.chipActive : {}) }}>{o}</span>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>Starting from</label>
          <ControlledField value={wizTrip.startLocation} onChange={v => setWizTrip(prev => ({ ...prev, startLocation: v }))}
            placeholder="Postcode or city — e.g. Manchester, M1 2AB"
            style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none" }} />
          <p style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>Helps plan your Day 1 route and departure time</p>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>Budget per person</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {["Budget", "Mid-range", "Luxury", "No limit"].map(o => (
              <span key={o} onClick={() => setWizTrip(prev => ({ ...prev, budget: o }))}
                style={{ ...css.chip, ...(wizTrip.budget === o ? css.chipActive : {}), cursor: "pointer" }}>{o}</span>
            ))}
          </div>
        </div>
      </>
    );
  };

  // ─── Wizard Step: Travellers (render function) ───
  const renderWizTravellers = () => {
    const addAdult = () => {
      setWizTravellers(prev => ({ ...prev, adults: [...prev.adults, { name: "", email: "", isLead: false }] }));
    };
    const updateAdult = (idx, field, val) => {
      setWizTravellers(prev => ({ ...prev, adults: prev.adults.map((a, i) => i === idx ? { ...a, [field]: val } : a) }));
    };
    const removeAdult = (idx) => {
      setWizTravellers(prev => ({ ...prev, adults: prev.adults.filter((_, i) => i !== idx) }));
    };
    const addChild = (group) => {
      setWizTravellers(prev => ({ ...prev, [group]: [...prev[group], { name: "", age: group === "olderKids" ? 10 : 5 }] }));
    };
    const updateChild = (group, idx, field, val) => {
      setWizTravellers(prev => ({ ...prev, [group]: prev[group].map((c, i) => i === idx ? { ...c, [field]: val } : c) }));
    };
    const removeChild = (group, idx) => {
      setWizTravellers(prev => ({ ...prev, [group]: prev[group].filter((_, i) => i !== idx) }));
    };
    const getInitials = (name) => {
      if (!name) return "?";
      const parts = name.trim().split(/\s+/);
      return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
    };
    const adultColors = [T.a, T.coral, T.blue, T.amber, T.purple, T.pink];
    return (
      <>
        <div style={{ background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.r, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.blueL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧑</div>
              <div><h4 style={{ fontSize: 14, fontWeight: 500 }}>Adults</h4><p style={{ fontSize: 12, color: T.t2 }}>Ages 15+</p></div>
            </div>
            <button style={{ ...css.btn, ...css.btnSm }} onClick={addAdult}>+ Add</button>
          </div>
          <div style={{ padding: "0 14px 10px", borderTop: `.5px solid ${T.border}` }}>
            {wizTravellers.adults.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < wizTravellers.adults.length - 1 ? `.5px solid ${T.border}` : "none" }}>
                <Avatar bg={adultColors[i % adultColors.length]} label={getInitials(a.name)} size={32} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input value={a.name} onChange={e => updateAdult(i, "name", e.target.value)} placeholder={a.isLead ? "Your name" : "Name"}
                      style={{ flex: 1, padding: "6px 10px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 13, background: T.s2, outline: "none" }} />
                    {a.isLead && <span style={{ ...css.tag(T.al, T.ad), fontSize: 9, padding: "2px 6px", whiteSpace: "nowrap" }}>Lead</span>}
                  </div>
                  <input value={a.email} onChange={e => updateAdult(i, "email", e.target.value)} placeholder="Email for invite link"
                    style={{ padding: "5px 10px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 12, background: T.s2, outline: "none", color: T.t2 }} />
                </div>
                {!a.isLead && <span onClick={() => removeAdult(i)} style={{ cursor: "pointer", color: T.red, fontSize: 16, flexShrink: 0 }}>×</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.r, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.pinkL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧒</div>
              <div><h4 style={{ fontSize: 14, fontWeight: 500 }}>Children 8-14</h4><p style={{ fontSize: 12, color: T.t2 }}>Older kids</p></div>
            </div>
            <button style={{ ...css.btn, ...css.btnSm }} onClick={() => addChild("olderKids")}>+ Add</button>
          </div>
          {wizTravellers.olderKids.length > 0 && (
            <div style={{ padding: "0 14px 10px", borderTop: `.5px solid ${T.border}` }}>
              {wizTravellers.olderKids.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                  <Avatar bg={T.pink} label={c.name ? c.name[0].toUpperCase() : "?"} size={28} />
                  <input value={c.name} onChange={e => updateChild("olderKids", i, "name", e.target.value)} placeholder="Name"
                    style={{ flex: 1, padding: "6px 10px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 13, background: T.s2, outline: "none" }} />
                  <select value={c.age} onChange={e => updateChild("olderKids", i, "age", +e.target.value)}
                    style={{ padding: "6px 8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 12, background: T.s, outline: "none", width: 56 }}>
                    {[8,9,10,11,12,13,14].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <span onClick={() => removeChild("olderKids", i)} style={{ cursor: "pointer", color: T.red, fontSize: 16 }}>×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.r, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.coralL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧒</div>
              <div><h4 style={{ fontSize: 14, fontWeight: 500 }}>Children 3-7</h4><p style={{ fontSize: 12, color: T.t2 }}>Younger kids</p></div>
            </div>
            <button style={{ ...css.btn, ...css.btnSm }} onClick={() => addChild("youngerKids")}>+ Add</button>
          </div>
          {wizTravellers.youngerKids.length > 0 && (
            <div style={{ padding: "0 14px 10px", borderTop: `.5px solid ${T.border}` }}>
              {wizTravellers.youngerKids.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                  <Avatar bg={T.coral} label={c.name ? c.name[0].toUpperCase() : "?"} size={28} />
                  <input value={c.name} onChange={e => updateChild("youngerKids", i, "name", e.target.value)} placeholder="Name"
                    style={{ flex: 1, padding: "6px 10px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 13, background: T.s2, outline: "none" }} />
                  <select value={c.age} onChange={e => updateChild("youngerKids", i, "age", +e.target.value)}
                    style={{ padding: "6px 8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 12, background: T.s, outline: "none", width: 56 }}>
                    {[3,4,5,6,7].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <span onClick={() => removeChild("youngerKids", i)} style={{ cursor: "pointer", color: T.red, fontSize: 16 }}>×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "10px 14px", background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.r, alignItems: "center" }}>
          {wizTravellers.adults.map((a, i) => (
            <Avatar key={`a-${i}`} bg={adultColors[i % adultColors.length]} label={getInitials(a.name)} size={28} style={{ border: `2px solid ${T.s}` }} />
          ))}
          {wizTravellers.olderKids.map((c, i) => (
            <Avatar key={`ok-${i}`} bg={T.pink} label={c.name ? c.name[0].toUpperCase() : "?"} size={28} style={{ border: `2px solid ${T.s}` }} />
          ))}
          {wizTravellers.youngerKids.map((c, i) => (
            <Avatar key={`yk-${i}`} bg={T.coral} label={c.name ? c.name[0].toUpperCase() : "?"} size={28} style={{ border: `2px solid ${T.s}` }} />
          ))}
          <span style={{ fontSize: 12, color: T.t3, marginLeft: 4 }}>
            {wizTravellers.adults.length} adult{wizTravellers.adults.length !== 1 ? "s" : ""}
            {wizTravellers.olderKids.length > 0 ? ` · ${wizTravellers.olderKids.length} child (8-14)` : ""}
            {wizTravellers.youngerKids.length > 0 ? ` · ${wizTravellers.youngerKids.length} child (3-7)` : ""}
          </span>
        </div>
      </>
    );
  };

  // ─── Wizard Step: Stays (location-aware, sorted by rating) ───
  const renderWizStays = () => {
    const localAccom = generateLocalAccommodations(wizTrip.places);
    const locationName = wizTrip.places.length > 0 ? wizTrip.places.join(", ") : "";

    const filteredAccom = staySearch.trim()
      ? localAccom.filter(a => a.name.toLowerCase().includes(staySearch.toLowerCase()) || a.type.toLowerCase().includes(staySearch.toLowerCase()) || a.tags.some(t => t.toLowerCase().includes(staySearch.toLowerCase())))
      : localAccom.slice(0, 6);

    const addStay = (accom) => {
      setWizStays(prev => [...prev, { ...accom, checkIn: wizTrip.start || "", checkOut: wizTrip.end || "" }]);
      setStaySearch("");
      setStaySearchOpen(false);
    };

    const removeStay = (idx) => setWizStays(prev => prev.filter((_, i) => i !== idx));

    const updateStayDate = (idx, field, val) => {
      setWizStays(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
    };

    const openLiveSearch = () => {
      const query = staySearch.trim() || (locationName ? `hotels near ${locationName}` : "hotels");
      window.open(`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(query)}`, "_blank");
    };

    const openGoogleSearch = () => {
      const query = staySearch.trim() || (locationName ? `accommodation near ${locationName}` : "accommodation");
      window.open(`https://www.google.com/travel/hotels?q=${encodeURIComponent(query)}`, "_blank");
    };

    return (
      <>
        {wizStays.length === 0 && !staySearchOpen && (
          <div style={{ textAlign: "center", padding: "20px 10px", color: T.t3, fontSize: 13 }} onClick={() => setStaySearchOpen(true)}>
            <p style={{ marginBottom: 4 }}>No accommodations added yet.</p>
            <p style={{ fontSize: 12 }}>{wizTrip.places.length > 0
              ? `Showing suggestions near ${locationName}. Search or browse live options.`
              : "Add locations in Step 1 to get localised suggestions."}</p>
          </div>
        )}
        {wizStays.length === 0 && !staySearchOpen && filteredAccom.length > 0 && (
          <div style={{ ...css.card, padding: 12 }}>
            <p style={{ fontSize: 12, color: T.t3, marginBottom: 8 }}>Suggested accommodations:</p>
            {filteredAccom.map((a, i) => (
              <div key={i} onClick={() => addStay(a)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", cursor: "pointer", borderRadius: T.rs, border: `.5px solid ${T.border}`, marginBottom: 6, background: T.s, transition: "background .15s" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: T.purpleL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🏨</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</p>
                  <p style={{ fontSize: 11, color: T.t3 }}>{a.type} · {a.tags.slice(0, 2).join(" · ")} {a.price && `· ${a.price}`} · ★{a.rating}</p>
                </div>
                <span style={{ fontSize: 11, color: T.a, fontWeight: 500 }}>+ Add</span>
              </div>
            ))}
          </div>
        )}
        {wizStays.map((s, i) => (
          <div key={i} style={css.card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</h4>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {s.rating && <span style={{ fontSize: 11, color: T.amber }}>{"★".repeat(Math.floor(s.rating))} {s.rating}</span>}
                  {s.location && <span style={{ fontSize: 10, color: T.t3 }}>· {s.location}</span>}
                </div>
              </div>
              <button style={{ ...css.btn, ...css.btnSm, fontSize: 11, color: T.red }} onClick={() => removeStay(i)}>Remove</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 10, color: T.t3, marginBottom: 3 }}>Check-in</label>
                <input type="date" value={s.checkIn} min={wizTrip.start || undefined} max={wizTrip.end || undefined}
                  onChange={e => updateStayDate(i, "checkIn", e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 10, color: T.t3, marginBottom: 3 }}>Check-out</label>
                <input type="date" value={s.checkOut} min={s.checkIn || wizTrip.start || undefined} max={wizTrip.end || undefined}
                  onChange={e => updateStayDate(i, "checkOut", e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Tag bg={T.purpleL} color={T.purple}>{s.type}</Tag>
              {s.tags.map(t => <Tag key={t} bg={T.purpleL} color={T.purple}>{t}</Tag>)}
              {s.price && <Tag bg={T.amberL} color={T.amber}>{s.price}</Tag>}
            </div>
          </div>
        ))}

        {staySearchOpen ? (
          <div style={{ ...css.card, padding: 12 }}>
            <input value={staySearch} onChange={e => setStaySearch(e.target.value)} autoFocus
              style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s2, outline: "none", marginBottom: 8 }}
              placeholder={locationName ? `Search stays near ${locationName}...` : "Search hotels, cottages, B&Bs..."} />
            {wizTrip.places.length === 0 && !staySearch.trim() && (
              <div style={{ padding: "8px 10px", background: T.amberL, borderRadius: T.rs, fontSize: 12, color: T.amber, marginBottom: 8 }}>
                Add locations in Step 1 to get localised suggestions.
              </div>
            )}
            {filteredAccom.length === 0 && staySearch.trim() && (
              <div style={{ padding: 8 }}>
                <p style={{ fontSize: 12, color: T.t3, marginBottom: 8, textAlign: "center" }}>No local matches for "{staySearch}".</p>
                <div onClick={() => addStay({ name: staySearch.trim(), type: "Custom", tags: ["User added"], rating: null, price: null })}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", cursor: "pointer", borderRadius: T.rs, border: `1.5px solid ${T.a}`, marginBottom: 8, background: T.al, transition: "background .15s" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: T.a, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, color: "#fff" }}>+</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500 }}>Add "{staySearch.trim()}"</p>
                    <p style={{ fontSize: 11, color: T.t3 }}>Add as custom accommodation</p>
                  </div>
                  <span style={{ fontSize: 11, color: T.a, fontWeight: 500 }}>+ Add</span>
                </div>
                <button onClick={() => {
                  const q = locationName ? `${staySearch.trim()} near ${locationName}` : staySearch.trim();
                  window.open(`https://www.google.com/search?q=${encodeURIComponent(q + " accommodation")}`, "_blank");
                }} style={{ ...css.btn, ...css.btnSm, fontSize: 11, color: T.a, margin: "0 auto", display: "block" }}>🔍 Search Google for "{staySearch.trim()}"</button>
              </div>
            )}
            {filteredAccom.map((a, i) => (
              <div key={i} onClick={() => addStay(a)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", cursor: "pointer", borderRadius: T.rs, border: `.5px solid ${T.border}`, marginBottom: 6, background: T.s, transition: "background .15s" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: T.purpleL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🏨</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{a.name}</p>
                  <p style={{ fontSize: 11, color: T.t3 }}>{a.type} · {a.tags.slice(0, 2).join(" · ")} {a.price && `· ${a.price}`} · ★{a.rating}</p>
                </div>
                <span style={{ fontSize: 11, color: T.a, fontWeight: 500 }}>+ Add</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button onClick={openLiveSearch} style={{ ...css.btn, ...css.btnP, ...css.btnSm, flex: 1, justifyContent: "center", fontSize: 11 }}>
                {staySearch.trim() ? `Booking.com: "${staySearch.trim()}"` : locationName ? `Booking.com: ${locationName}` : "Search Booking.com"}
              </button>
              <button onClick={openGoogleSearch} style={{ ...css.btn, ...css.btnSm, flex: 1, justifyContent: "center", fontSize: 11 }}>
                {staySearch.trim() ? `Google: "${staySearch.trim()}"` : locationName ? `Google: ${locationName}` : "Google Hotels"}
              </button>
            </div>
            <button onClick={() => { setStaySearchOpen(false); setStaySearch(""); }} style={{ ...css.btn, ...css.btnSm, width: "100%", justifyContent: "center", marginTop: 6 }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setStaySearchOpen(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, border: `1.5px dashed ${T.border}`, borderRadius: T.r, color: T.t3, fontSize: 13, cursor: "pointer", background: "none", width: "100%", fontFamily: T.font }}>+ Add accommodation</button>
        )}

        {!wizTrip.start && !wizTrip.end && wizStays.length > 0 && (
          <div style={{ marginTop: 8, padding: "8px 12px", background: T.amberL, borderRadius: T.rs, fontSize: 12, color: T.amber }}>
            Set trip dates in Step 1 to constrain accommodation dates.
          </div>
        )}
      </>
    );
  };

  // ─── Wizard Step: Preferences (render function) ───
  const REGION_SUGGESTIONS = {
    japan: { food: ["Sushi", "Ramen", "Tempura", "Matcha", "Izakaya", "Wagyu beef", "Soba noodles"], activities: ["Temples & shrines", "Onsen bathing", "Cherry blossom viewing", "Anime district", "Tea ceremony", "Bullet train ride", "Sumo wrestling"] },
    france: { food: ["Croissants", "Coq au vin", "Crêpes", "Cheese tasting", "Wine pairing", "Patisserie tour"], activities: ["Wine region tour", "Art galleries", "River cruise", "Château visit", "Market browsing", "Cooking class"] },
    spain: { food: ["Tapas", "Paella", "Churros", "Jamón ibérico", "Sangria", "Pintxos"], activities: ["Flamenco show", "Beach day", "Siesta culture", "Gothic Quarter walk", "Football match", "Tapas crawl"] },
    italy: { food: ["Pizza", "Gelato", "Pasta making", "Espresso culture", "Truffle hunting", "Aperitivo"], activities: ["Colosseum visit", "Gondola ride", "Vineyard tour", "Vespa rental", "Art renaissance tour", "Cooking class"] },
    thailand: { food: ["Pad Thai", "Tom Yum", "Street food tour", "Mango sticky rice", "Night market food"], activities: ["Temple tour", "Thai massage", "Island hopping", "Night market", "Elephant sanctuary", "Muay Thai"] },
    usa: { food: ["Burgers", "BBQ", "Food truck tour", "Brunch culture", "Craft beer", "Diner breakfast"], activities: ["Road trip stops", "National parks", "Broadway show", "Sports game", "Shopping district", "Rooftop bars"] },
  };

  const renderWizPrefs = () => {
    const region = wizTrip.places.length > 0 ? getRegion(wizTrip.places) : null;
    const regionSugg = region && REGION_SUGGESTIONS[region] ? REGION_SUGGESTIONS[region] : null;
    const regionLabel = region ? region.charAt(0).toUpperCase() + region.slice(1) : "";
    const allFoodOpts = regionSugg ? [...regionSugg.food, "Vegetarian", "Non-veg", "Local cuisine", "Kid-friendly menus", "Vegan", "Halal", "Gluten-free", "Pescatarian", "Dairy-free", "Nut-free", "Organic", "Street food"] : ["Vegetarian", "Non-veg", "Local cuisine", "Kid-friendly menus", "Vegan", "Halal", "Gluten-free", "Pescatarian", "Dairy-free", "Nut-free", "Organic", "Street food"];
    const adultActsWithRegion = regionSugg ? [...regionSugg.activities, ...ACTIVITY_SUGGESTIONS.default.adults] : ACTIVITY_SUGGESTIONS.default.adults;
    const suggestions = { ...ACTIVITY_SUGGESTIONS.default, adults: adultActsWithRegion };

    const togglePref = (key, item) => {
      setWizPrefs(prev => { const s = new Set(prev[key]); s.has(item) ? s.delete(item) : s.add(item); return { ...prev, [key]: s }; });
    };

    const addCustomPref = (key, val, clearFn) => {
      if (val.trim()) { setWizPrefs(prev => { const s = new Set(prev[key]); s.add(val.trim()); return { ...prev, [key]: s }; }); clearFn(""); }
    };

    const filterOpts = (opts, search, selected) => {
      const all = [...new Set([...opts, ...selected])];
      return search.trim() ? all.filter(o => o.toLowerCase().includes(search.toLowerCase())) : all;
    };

    const renderPrefSection = (label, key, allOpts, searchVal, setSearchVal, placeholder) => (
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>{label}</label>
        <input value={searchVal} onChange={e => setSearchVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") addCustomPref(key, searchVal, setSearchVal); }}
          style={{ width: "100%", padding: "8px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 12, background: T.s2, outline: "none", marginBottom: 6 }}
          placeholder={placeholder} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {filterOpts(allOpts, searchVal, wizPrefs[key]).map(o => (
            <span key={o} onClick={() => togglePref(key, o)} style={{ ...css.chip, ...(wizPrefs[key].has(o) ? css.chipActive : {}) }}>{o}</span>
          ))}
          {searchVal.trim() && !allOpts.includes(searchVal.trim()) && !wizPrefs[key].has(searchVal.trim()) && (
            <span onClick={() => addCustomPref(key, searchVal, setSearchVal)} style={{ ...css.chip, borderStyle: "dashed", color: T.a }}>+ Add "{searchVal.trim()}"</span>
          )}
        </div>
      </div>
    );

    return (
      <>
        {regionSugg && <p style={{ fontSize: 11, color: T.a, fontWeight: 500, marginBottom: 8 }}>{"🌍"} Showing suggestions popular in {regionLabel}</p>}
        {renderPrefSection("Food preferences", "food", allFoodOpts, foodSearch, setFoodSearch, "Search or type a food preference...")}
        {renderPrefSection("Activities — Adults", "adultActs", suggestions.adults, adultActSearch, setAdultActSearch, "Search or add an activity...")}
        {wizTravellers.olderKids.length > 0 && renderPrefSection("Activities — Children 8-14", "olderActs", suggestions.olderKids, olderActSearch, setOlderActSearch, "Search or add a kids activity...")}
        {wizTravellers.youngerKids.length > 0 && renderPrefSection("Activities — Children 3-7", "youngerActs", suggestions.youngerKids, youngerActSearch, setYoungerActSearch, "Search or add a kids activity...")}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>Special instructions</label>
          <textarea value={wizPrefs.instructions} onChange={e => setWizPrefs(prev => ({ ...prev, instructions: e.target.value }))}
            placeholder="e.g. Dog-friendly places. Top-rated pubs for dinners. Avoid steep trails. Kids get restless after 2 hrs — plan short, fun stops."
            style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none", resize: "vertical", minHeight: 60 }} />
          <p style={{ fontSize: 11, color: T.t3, marginTop: 4, fontStyle: "italic" }}>Tip: Mention dietary needs, accessibility requirements, pace preferences, or must-visit spots.</p>
        </div>
      </>
    );
  };

  // ─── Screen: Trip Dashboard ───
  const renderTripScreen = () => {
    const day = DAYS[selectedDay - 1];
    const items = TIMELINE[selectedDay] || [];
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Hero */}
        <div style={{ padding: "20px 20px 16px", background: `linear-gradient(135deg, ${T.a} 0%, ${T.ad} 100%)`, color: "#fff", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
            <div>
              <h1 style={{ fontFamily: T.fontD, fontSize: 22, fontWeight: 400, marginBottom: 2 }}>{TRIP.name}</h1>
              <p style={{ fontSize: 13, opacity: 0.8 }}>{TRIP.start} - {TRIP.end} {TRIP.year}</p>
            </div>
            <button style={{ ...css.btn, ...css.btnSm, background: "rgba(255,255,255,.15)", borderColor: "rgba(255,255,255,.25)", color: "#fff" }} onClick={() => navigate("home")}>Back</button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            {[["Day", `${day.day} of 5`], ["Location", day.location], ["Weather", `${day.weather.temp}°C ${day.weather.icon}`]].map(([l, v]) => (
              <div key={l} style={{ flex: 1, background: "rgba(255,255,255,.12)", borderRadius: T.rs, padding: "7px 10px" }}>
                <div style={{ fontSize: 9, opacity: 0.65, textTransform: "uppercase", letterSpacing: .5 }}>{l}</div>
                <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px 20px 20px" }}>
          {/* Day Picker */}
          <div style={{ display: "flex", gap: 6, padding: "8px 0", overflowX: "auto" }}>
            {DAYS.map(d => (
              <button key={d.day} onClick={() => { setSelectedDay(d.day); setExpandedItem(null); }}
                style={{ ...css.chip, ...(selectedDay === d.day ? { background: T.a, color: "#fff", borderColor: T.ad } : {}), minWidth: 56, textAlign: "center", padding: "8px 12px", flexShrink: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 12 }}>Day {d.day}</div>
                <div style={{ fontSize: 10, opacity: 0.7 }}>{d.date}</div>
              </button>
            ))}
          </div>

          {/* Map */}
          <div style={{ height: 160, background: T.s2, borderRadius: T.r, marginBottom: 12, position: "relative", overflow: "hidden", border: `.5px solid ${T.border}` }}>
            <div style={{ width: "100%", height: "100%", background: "linear-gradient(170deg, #D4E8D0, #E2EDDA 40%, #D8E4CF 70%, #C9DBC3)" }}>
              <svg style={{ position: "absolute", width: "100%", height: "100%" }} viewBox="0 0 400 160">
                <path d="M60,130 Q100,100 140,85 Q180,70 220,55 Q270,40 320,30" fill="none" stroke={T.a} strokeWidth="2.5" strokeDasharray="6 4" opacity=".5" />
              </svg>
              {[["W", 50, 120, T.a], ["A", 130, 76, T.blue], ["G", 210, 48, T.purple], ["K", 310, 24, T.coral]].map(([l, x, y, c]) => (
                <div key={l} style={{ position: "absolute", left: x, top: y, ...css.avatar(c, 26), border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,.15)", zIndex: 2 }}>{l}</div>
              ))}
              <div style={{ position: "absolute", left: 170, top: 90, ...css.avatar(T.amber, 20), fontSize: 10, border: "2px solid #fff" }}>⚡</div>
            </div>
            <div onClick={() => window.open(`https://www.google.com/maps/search/${day.location}+Lake+District`, "_blank")} style={{ position: "absolute", bottom: 8, right: 8, ...css.btn, ...css.btnSm, background: "rgba(255,255,255,.9)", fontSize: 10, padding: "4px 8px", cursor: "pointer" }}>
              Open map ↗
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={css.sectionTitle}>Timeline</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("vote")}>Polls</button>
              <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("share")}>Share</button>
            </div>
          </div>

          {/* Timeline */}
          <div style={{ position: "relative", paddingLeft: 20 }}>
            <div style={{ position: "absolute", left: 5, top: 8, bottom: 8, width: 1.5, background: T.border }} />
            {items.map((item, i) => (
              <TimelineItem key={`${selectedDay}-${i}`} item={item} index={i} expanded={expandedItem === i}
                onToggle={() => setExpandedItem(expandedItem === i ? null : i)}
                bookingState={bookingStates[`${selectedDay}-${i}`]}
                onBook={() => setBookingStates(prev => ({ ...prev, [`${selectedDay}-${i}`]: { status: "booked", cost: "" } }))}
                onSkip={() => setBookingStates(prev => ({ ...prev, [`${selectedDay}-${i}`]: { status: "skipped" } }))}
                onCostUpdate={(cost) => setBookingStates(prev => ({ ...prev, [`${selectedDay}-${i}`]: { ...prev[`${selectedDay}-${i}`], cost } }))} />
            ))}
          </div>

          {/* Stay card */}
          {TRIP.stays.map((s, i) => (
            selectedDay <= 2 && i === 0 || selectedDay > 2 && i === 1 ? (
              <div key={i} style={{ ...css.card, background: T.purpleL, borderColor: T.purple, marginTop: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "start" }}>
                  <span style={{ fontSize: 16 }}>🏠</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: T.purple }}>Tonight's stay</p>
                    <p style={{ fontSize: 12, color: T.t2 }}>{s.name} · {s.tags.join(" · ")}</p>
                  </div>
                </div>
              </div>
            ) : null
          ))}

          {/* Alert */}
          {selectedDay === 2 && (
            <div style={{ ...css.card, background: T.amberL, borderColor: T.amber, marginTop: 6 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "start" }}>
                <span style={{ fontSize: 14 }}>⚠️</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: T.amber }}>A591 partial closure</p>
                  <p style={{ fontSize: 12, color: T.t2 }}>Diversion via A592 adds 8 min. Route auto-updated.</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <TabBar active="trip" onNav={navigate} />
      </div>
    );
  };

  const TimelineItem = ({ item, index, expanded, onToggle, bookingState, onBook, onSkip, onCostUpdate }) => {
    const forMap = { all: "Everyone", adults: "Adults", kids: "Max & Ella", older: "Max (12)", younger: "Ella (8)" };
    return (
      <div style={{ position: "relative", marginBottom: 12, cursor: "pointer" }} onClick={onToggle}>
        <div style={{ position: "absolute", left: -18, top: 6, width: 8, height: 8, borderRadius: "50%", background: index < 3 ? T.a : T.s2, border: `2px solid ${index < 3 ? T.al : T.border}` }} />
        <div style={{ fontSize: 11, color: T.t3 }}>{item.time}</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{item.title}</div>
        <div style={{ fontSize: 12, color: T.t2 }}>{item.desc}</div>
        {item.for && <div style={{ marginTop: 3 }}><GroupTag type={item.for}>{forMap[item.for]}</GroupTag></div>}

        {/* Booking status tracking */}
        {item.needsBooking && !bookingState && (
          <div style={{ padding: 10, background: T.amberL, border: `.5px solid ${T.amber}`, borderRadius: T.rs, marginTop: 6 }}
            onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 12, color: T.amber, marginBottom: 8 }}><strong>Action needed:</strong> {item.price}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button style={{ ...css.btn, ...css.btnSm, fontSize: 11, color: T.blue }} onClick={() => window.open(`https://www.google.com/search?q=book+${encodeURIComponent(item.title)}`, "_blank")}>Book externally ↗</button>
              <button style={{ ...css.btn, ...css.btnSm, ...css.btnP, fontSize: 11 }} onClick={onBook}>Mark as booked</button>
              <button style={{ ...css.btn, ...css.btnSm, fontSize: 11 }} onClick={onSkip}>Skip</button>
            </div>
          </div>
        )}
        {item.needsBooking && bookingState?.status === "booked" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: T.al, borderRadius: T.rs, marginTop: 6 }} onClick={e => e.stopPropagation()}>
            <span style={{ fontSize: 12, color: T.ad, fontWeight: 500 }}>✓ Booked — marked by you</span>
            <input placeholder="£ Cost" value={bookingState.cost || ""} onChange={e => onCostUpdate(e.target.value)}
              style={{ width: 80, padding: "4px 8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none" }} />
          </div>
        )}
        {item.needsBooking && bookingState?.status === "skipped" && (
          <div style={{ padding: "6px 10px", background: T.s2, borderRadius: T.rs, marginTop: 6, fontSize: 12, color: T.t3 }}>
            Skipped
          </div>
        )}

        {/* Expanded detail */}
        {expanded && (
          <div style={{ ...css.card, marginTop: 8, animation: "none" }} onClick={e => e.stopPropagation()}>
            <p style={{ fontSize: 14, fontWeight: 500 }}>{item.title}</p>
            <p style={{ fontSize: 12, color: T.t2, marginTop: 2 }}>{item.desc}</p>
            {item.rating && <p style={{ fontSize: 12, color: T.amber, marginTop: 4 }}>{"★".repeat(Math.floor(item.rating))} {item.rating}</p>}
            {item.price && <p style={{ fontSize: 12, color: T.t2, marginTop: 2 }}>Price: {item.price}</p>}
            <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
              <button style={{ ...css.btn, ...css.btnSm, ...css.btnP }} onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(item.title)}+Lake+District`, "_blank")}>Navigate</button>
              <button style={{ ...css.btn, ...css.btnSm }} onClick={() => alert(`Calling ${item.title}...`)}>Call</button>
              <button style={{ ...css.btn, ...css.btnSm }} onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(item.title)}+reviews`, "_blank")}>Reviews</button>
              <button style={{ ...css.btn, ...css.btnSm }} onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(item.title)}+menu`, "_blank")}>Menu</button>
              <button style={{ ...css.btn, ...css.btnSm, color: T.red }} onClick={() => alert(`${item.title} removed from itinerary.`)}>Remove</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Screen: Chat ───
  const renderChatScreen = () => {
    const chatDay = DAYS[selectedDay - 1];
    const chatLoc = chatDay.location;
    const chatItems = TIMELINE[selectedDay] || [];

    const aiResponsePatterns = [
      { keywords: ["ev", "charger", "charge", "charging", "electric", "plug"], response: "3 chargers near Ambleside:\n\n1. **Rydal Road** — 50kW CCS, 3 min walk, 2 available\n2. **Tesla Supercharger** — 8 stalls, 8 min drive\n3. **Pod Point, Co-op** — 7kW, 2 min walk\n\nShall I add a charging stop to your itinerary?" },
      { keywords: ["restaurant", "food", "eating", "dinner", "lunch", "breakfast", "cafe", "dining", "hungry", "meal"], response: "For your group near Ambleside:\n\n**The Drunken Duck** — 4.8★, 12 min. Steaks + veggie, kids free before 6 PM.\n\n**Fellinis** — 4.6★, 3 min walk. Veggie-focused, children's menu.\n\n**The Unicorn** — 4.4★, 5 min. Pub grills, playground out back.\n\nWant me to add any of these to your itinerary?" },
      { keywords: ["kid", "kids", "child", "children", "activities", "play", "playground", "fun", "game", "toddler", "family"], response: "**Max (12):**\n- Brockhole Adventure Park — nets, zip wire\n- Climbing Wall — indoor, ages 6+\n\n**Ella (8):**\n- Brockhole soft play — free\n- Trotters Animal Farm — pony rides\n\n**Both:** Easter egg trail at Wray Castle, 4 PM today.\n\nShall I add any to the timeline?" },
      { keywords: ["poll", "vote", "survey", "decide", "choose", "pick", "opinion"], response: "I'll set up a poll! Some options:\n\n1. **Tomorrow's activity** — Hike vs boat vs rest day\n2. **Dinner choice** — Pick from 3 restaurants\n3. **Custom question** — Write your own\n\nWhich one would you like to create?" },
      { keywords: ["weather", "rain", "sun", "forecast", "temperature", "cold", "warm", "wind"], response: "**Ambleside forecast:**\n\n🌤 Today: 12°C, cloudy, wind 8 mph. Dry until 4 PM, light rain 5-7 PM.\n☀️ Tomorrow: 14°C, partly sunny, perfect for outdoor activities.\n🌧 Day after: 10°C, rain expected from noon.\n\nOutdoor morning is best today. Easter trail at 4 PM should still be dry. Spa or climbing wall as rain backup." },
      { keywords: ["swim", "swimming", "pool", "water park", "lido", "lake swim"], response: "Swimming options near Ambleside:\n\n1. **Lake Windermere** — Wild swimming at Millerground (free, scenic). Water temp ~12°C.\n2. **Ambleside Swimming Pool** — Indoor heated, £6/adult, £3.50/child. Open 7am-9pm.\n3. **Brockhole Aqua Park** — Inflatable course on the lake! £15/person, ages 6+. Book ahead.\n4. **Low Wood Bay Spa** — Infinity pool + lake access. Day pass £45.\n\nShall I add any of these to your itinerary?" },
      { keywords: ["hike", "hiking", "walk", "walking", "trail", "trek", "mountain", "fell", "climb"], response: "Walks near Ambleside:\n\n🟢 **Easy:** Loughrigg Tarn circular — 1.5 miles, flat, great for kids\n🟡 **Medium:** Stock Ghyll Force waterfall — 2 miles, rocky but rewarding\n🔴 **Hard:** Helvellyn via Striding Edge — 8 miles, adults only, spectacular\n\n**Best for your group:** Loughrigg Tarn in the morning when it's dry. Want me to add it?" },
      { keywords: ["boat", "cruise", "ferry", "sail", "windermere", "lake"], response: "Boat trips on Windermere:\n\n⛵ **Windermere Lake Cruises** — 45 min, £12/adult, £6/child. Departs hourly from Ambleside pier.\n🚤 **Private rowing boat hire** — £20/hour, seats 4. Great for families.\n🛥️ **Cross-lake ferry** — Bowness to Far Sawrey, £7 return. Visit Beatrix Potter's house.\n\nThe 11 AM cruise has the best views. Book?" },
      { keywords: ["spa", "relax", "massage", "wellness", "pamper"], response: "Spa options near Ambleside:\n\n💆 **Low Wood Bay Spa** — 4.5★, lakeside infinity pool + treatments. Day pass £45.\n🧖 **The Samling Hotel Spa** — 4.8★, luxury. Half day from £80.\n♨️ **Ambleside Salutation Hotel** — 4.2★, small spa + pool. £25 day pass.\n\nPerfect for the rainy afternoon. Want me to book a slot?" },
      { keywords: ["shop", "shopping", "buy", "market", "souvenir", "gift"], response: "Shopping in the area:\n\n🛍 **Ambleside village** — Indie shops, outdoor gear, fudge shop, art galleries\n🏪 **Keswick Market** — Saturdays, local produce & crafts\n🎁 **World of Beatrix Potter** — Gift shop in Bowness, kids will love it\n🧀 **Hawkshead Relish** — Award-winning chutneys, great gifts\n\nAmbleside shops are walkable from your stay." },
      { keywords: ["budget", "cost", "spend", "money", "expensive", "cheap", "price"], response: "**Trip budget estimate:**\n\n🏠 Accommodation: ~£180/night × 4 = **£720**\n🍽 Food (family of 6): ~£80/day × 5 = **£400**\n🎫 Activities: ~£150 total\n⛽ EV charging: ~£30 total\n\n**Estimated total: ~£1,300**\n\nWant me to track actual costs as you go?" },
      { keywords: ["park", "parking", "car park", "where to park"], response: "Parking near Ambleside:\n\n🅿️ **Rydal Road car park** — £8/day, closest to town, has EV chargers\n🅿️ **Miller Ground** — Free after 6 PM, lakeside\n🅿️ **White Platts** — £6/day, 5 min walk to centre\n\n⚡ EV tip: Rydal Road has 50kW chargers, charge while you explore!" },
      { keywords: ["cancel", "change", "reschedule", "move", "swap", "edit", "modify", "update"], response: "Sure! What would you like to change?\n\n1. **Swap an activity** — Replace something in the timeline\n2. **Move a time slot** — Shift an activity earlier or later\n3. **Cancel a booking** — Remove a booked item\n4. **Add something new** — Insert a new activity\n\nJust tell me what to adjust and I'll update the itinerary." },
      { keywords: ["help", "what can", "how do", "explain", "guide"], response: "Here's what I can help with:\n\n🗺 **Plan** — Suggest activities, restaurants, routes\n📅 **Schedule** — Add, move, or remove timeline items\n⛅ **Weather** — Real-time forecasts and backup plans\n⚡ **EV** — Find chargers along your route\n🗳 **Polls** — Create group votes for decisions\n💰 **Budget** — Track trip spending\n📍 **Navigate** — Directions to any location\n\nJust ask in plain English!" },
      { keywords: ["thank", "thanks", "cheers", "great", "perfect", "awesome", "brilliant"], response: "You're welcome! 😊 Enjoy your Lake District adventure. I'm here whenever you need anything — just ask!" },
      { keywords: ["morning", "today", "plan for today", "what's next", "itinerary", "schedule"], response: "**Today's plan:**\n\n🕙 10:30 — Arrive Windermere, check in\n🕧 11:30 — Lake Windermere walk\n🕐 1:00 — Lunch at Francine's (veggie + non-veg)\n🕖 7:00 — Dinner at The Angel Inn\n\n⛅ Weather looks good until 4 PM. Want to adjust anything?" },
      { keywords: ["emergency", "hospital", "doctor", "pharmacy", "medical", "urgent", "police"], response: "**Emergency contacts:**\n\n🚑 **999** — Emergency services\n🏥 **Ambleside Health Centre** — 015394 32693, Mon-Fri 8am-6pm\n💊 **Ambleside Pharmacy** — 015394 33594, closes 5:30 PM\n🏥 **Nearest A&E** — Westmorland General, Kendal (20 min drive)\n🚔 **Non-emergency police** — 101\n\nStay safe out there!" },
    ];

    // Context-aware follow-up responses based on last AI message topic
    const followUpResponses = {
      poll: [
        { keywords: ["1", "tomorrow", "activity", "hike", "boat", "rest"], response: "**Poll created!** 🗳\n\n**Tomorrow's activity:**\n- 🥾 Hike around Loughrigg Tarn\n- ⛵ Boat cruise on Windermere\n- 😴 Rest day at the hotel\n\nI've shared it with all travellers. Voting closes tonight at 9 PM. You can check results in the **Polls** tab." },
        { keywords: ["2", "dinner", "restaurant", "food"], response: "**Poll created!** 🗳\n\n**Dinner choice for tonight:**\n- 🍽 The Drunken Duck (steaks + veggie)\n- 🥗 Fellinis (veggie-focused)\n- 🍺 The Unicorn (pub grills + playground)\n\nShared with all travellers. Voting closes at 5 PM so we can book!" },
        { keywords: ["3", "custom", "question", "write", "own", "add"], response: "Sure! Type your custom poll question and I'll create it.\n\nExample: **\"Should we extend the trip by one day?\"**\n\nYou can add 2-5 options for people to vote on." },
      ],
      restaurant: [
        { keywords: ["1", "first", "drunken", "duck", "steak"], response: "Great choice! **The Drunken Duck** it is.\n\n📞 I'd recommend calling ahead: 015394 36347\n⏰ Best to book for 6:30 PM (kids eat free before 6 PM)\n📍 12 min drive from Ambleside\n\nShall I add it to tonight's timeline?" },
        { keywords: ["2", "second", "fellini", "veggie"], response: "Nice pick! **Fellinis** is lovely.\n\n📍 3 min walk from the town centre\n🥗 Great veggie options + children's menu\n⏰ No booking needed, but can get busy after 7 PM\n\nShall I add it to tonight's timeline?" },
        { keywords: ["3", "third", "unicorn", "pub"], response: "**The Unicorn** — great for the kids with the playground!\n\n📍 5 min walk\n🍺 Pub grills, good portions\n🎪 Playground out back keeps kids busy\n\nShall I add it to tonight's timeline?" },
        { keywords: ["yes", "add", "please", "sure", "ok", "yeah"], response: "Added to your timeline! ✅\n\n🕖 **7:00 PM — Dinner** has been updated on today's itinerary. All travellers will see the change.\n\nDon't forget to check if you need to book ahead!" },
      ],
      charger: [
        { keywords: ["1", "first", "rydal"], response: "**Rydal Road charger** — good choice, it's the fastest!\n\n⚡ 50kW CCS connector\n📍 3 min walk to town while charging\n💰 ~£8 for a full charge\n⏱ About 45 min to 80%\n\nI've added a charging stop to your timeline." },
        { keywords: ["yes", "add", "sure", "please"], response: "Added a charging stop to your itinerary! ⚡\n\nI've scheduled it for when you arrive — charge while you check in. You'll find the charger at Rydal Road, 3 min walk from town." },
      ],
      swimming: [
        { keywords: ["1", "lake", "wild", "windermere"], response: "**Wild swimming at Millerground** — great choice!\n\n📍 10 min walk from Ambleside centre\n🌡 Water temp ~12°C — brrr but refreshing!\n🏊 Best in morning when it's calmer\n⚠️ Supervision needed for kids\n\nShall I add it to tomorrow's morning slot?" },
        { keywords: ["2", "pool", "indoor", "ambleside"], response: "**Ambleside Swimming Pool** — perfect for the family!\n\n📍 5 min walk from town\n💰 £6/adult, £3.50/child\n⏰ Open 7am-9pm\n🏊 Heated indoor pool, family sessions available\n\nWant me to add a swim session to the itinerary?" },
        { keywords: ["3", "aqua", "inflatable", "brockhole"], response: "**Brockhole Aqua Park** — the kids will love this!\n\n📍 At Brockhole visitor centre\n💰 £15/person, ages 6+\n⏰ Sessions run hourly, book ahead\n🎉 Inflatable obstacle course on the lake!\n\nShall I book a session and add it to the timeline?" },
        { keywords: ["yes", "add", "sure", "please", "book"], response: "Added to your itinerary! 🏊\n\nI've blocked out a 2-hour slot. Remember to bring towels and a change of clothes!" },
      ],
      walk: [
        { keywords: ["1", "easy", "loughrigg", "tarn", "green"], response: "**Loughrigg Tarn** — lovely choice for the family!\n\n📍 Short drive from Ambleside\n📏 1.5 miles circular, mostly flat\n👶 Pushchair-friendly in dry weather\n📸 Beautiful reflections for photos\n\nBest in the morning — shall I add it to tomorrow?" },
        { keywords: ["2", "medium", "waterfall", "stock", "ghyll"], response: "**Stock Ghyll Force waterfall** — worth the rocky scramble!\n\n📍 Starts right in Ambleside\n📏 2 miles round trip\n⚠️ Rocky path — good shoes needed, hold little ones' hands\n💧 Spectacular after rain\n\nShall I add it to the timeline?" },
        { keywords: ["yes", "add", "sure", "please"], response: "Added to your itinerary! 🥾\n\nI've scheduled it for the morning when the weather's best. Don't forget walking shoes and waterproofs!" },
      ],
      generic: [
        { keywords: ["yes", "ok", "sure", "please", "yeah", "do it", "go ahead"], response: "Done! ✅ I've updated your itinerary. You can see the changes on the **Timeline** tab.\n\nAnything else you'd like to adjust?" },
        { keywords: ["no", "nah", "not now", "later", "nevermind", "cancel"], response: "No problem! Let me know if you change your mind or want to explore other options. 😊" },
      ],
    };

    const getLastAiTopic = () => {
      const aiMsgs = chatMessages.filter(m => m.role === "ai");
      if (aiMsgs.length === 0) return null;
      const last = aiMsgs[aiMsgs.length - 1].text.toLowerCase();
      if (last.includes("poll") && (last.includes("which one") || last.includes("options"))) return "poll";
      if (last.includes("drunken duck") || last.includes("fellini") || last.includes("unicorn")) return "restaurant";
      if (last.includes("charger") || last.includes("charging")) return "charger";
      if (last.includes("swimming") || last.includes("aqua park") || last.includes("pool")) return "swimming";
      if (last.includes("loughrigg") || last.includes("stock ghyll") || last.includes("helvellyn") || last.includes("walks near")) return "walk";
      if (last.includes("shall i") || last.includes("want me to") || last.includes("would you like")) return "generic";
      return null;
    };

    // Topic-based follow-up responses for when lastChatTopic is set but no keyword/context match
    const topicFollowUpDefaults = {
      poll: "Great choice! I've created a poll for your group. You can find it in the Polls section. Want to set a deadline for voting?",
      restaurant: "I can add any of those restaurants to your itinerary. Just say which one, or I can suggest more options nearby.",
      ev: "Want me to add a charging stop to your itinerary? I can schedule it at the most convenient time.",
      charger: "Want me to add a charging stop to your itinerary? I can schedule it at the most convenient time.",
      activity: "I can add that to your itinerary. Would you like it for a specific day?",
      kids: "I can add that to your itinerary. Would you like it for a specific day?",
      weather: "I can adjust your itinerary based on the weather. Want me to suggest indoor alternatives for rainy days?",
      booking: "I can help with that booking. Would you like me to open the booking page, or mark it as confirmed?",
      swimming: "I can add that to your itinerary. Would you like it for a specific day?",
      walk: "I can add that to your itinerary. Would you like it for a specific day?",
      generic: "Done! I've updated your itinerary. You can see the changes on the **Timeline** tab.\n\nAnything else you'd like to adjust?",
    };

    const findResponse = (msg) => {
      const lower = msg.toLowerCase();
      const stay = TRIP.stays[0];
      const lastStay = TRIP.stays[TRIP.stays.length - 1];
      const travelMode = TRIP.travelMode || "car";
      const isEV = travelMode.toLowerCase().includes("ev");

      // ─── Conversational Flow Handler ───
      if (chatFlowStep === "ask_start") {
        // User is providing their start location
        const startLoc = msg.trim();
        setChatFlowData(prev => ({ ...prev, startLocation: startLoc }));
        setChatFlowStep("ask_pickups");
        return `Got it — starting from **${startLoc}**.\n\nAnyone to pick up along the way, or heading straight to **${stay ? stay.name : chatLoc}**?`;
      }

      if (chatFlowStep === "ask_pickups") {
        const noPickup = /no|nah|none|straight|direct|just us|heading straight|nope/.test(lower);
        const hasPickup = /yes|pick|stop|collect|get someone|picking/.test(lower);
        if (hasPickup) {
          setChatFlowStep("ask_pickup_detail");
          return "Where do you need to pick someone up? Enter the location or postcode.";
        }
        // No pickup or any other response — proceed to time
        setChatFlowStep("ask_time");
        const startLoc = chatFlowData.startLocation || TRIP.startLocation || "your location";
        return `No stops — straight to **${chatLoc}**.\n\nWhat time would you like to depart from ${startLoc}?`;
      }

      if (chatFlowStep === "ask_pickup_detail") {
        const pickupLoc = msg.trim();
        setChatFlowData(prev => ({ ...prev, pickups: [...(prev.pickups || []), pickupLoc] }));
        setChatFlowStep("ask_more_pickups");
        return `Added pickup at **${pickupLoc}**. Any more stops, or shall I plan the route?`;
      }

      if (chatFlowStep === "ask_more_pickups") {
        const done = /no|done|that's it|plan|route|go|nope|let's go/.test(lower);
        if (!done && lower.length > 3) {
          // Another pickup
          const pickupLoc = msg.trim();
          setChatFlowData(prev => ({ ...prev, pickups: [...(prev.pickups || []), pickupLoc] }));
          return `Added **${pickupLoc}**. Any more, or shall I plan the route?`;
        }
        setChatFlowStep("ask_time");
        const startLoc = chatFlowData.startLocation || TRIP.startLocation || "your location";
        const pickups = chatFlowData.pickups || [];
        return `Route planned with ${pickups.length} pickup${pickups.length > 1 ? "s" : ""}: ${pickups.map(p => `**${p}**`).join(" → ")}.\n\nWhat time would you like to depart from ${startLoc}?`;
      }

      if (chatFlowStep === "ask_time") {
        const startLoc = chatFlowData.startLocation || TRIP.startLocation || "your location";
        const pickups = chatFlowData.pickups || [];
        const departTime = msg.trim();
        setChatFlowStep("route_shown");
        setChatFlowData(prev => ({ ...prev, departTime }));

        // Build route summary
        const routeStops = [startLoc, ...pickups];
        const routePath = routeStops.map(s => `**${s}**`).join(" → ");
        const evSection = isEV ? `\n\n⚡ **EV charging stops:**\n• Tebay Services — 50kW CCS, farm shop while you wait\n• ${chatLoc === "Windermere" ? "Booths Windermere" : "Killington Lake"} — 50kW backup` : "";
        const stayInfo = stay ? `\n\n🏨 **Check-in:** ${stay.name}\n${stay.tags.map(t => `• ${t}`).join("\n")}` : "";

        return `🗺️ **Your Day 1 route:**\n\n${routePath} → **${chatLoc}**\n\n🕐 **Depart:** ${departTime}\n🕐 **Estimated arrival:** ~2 hours after departure\n\n**Recommended stops:**\n1. **Tebay Services** — best motorway services in UK, farm shop + cafe${pickups.length > 0 ? "\n2. Pickup" + (pickups.length > 1 ? "s" : "") + " at " + pickups.join(", ") : ""}${evSection}${stayInfo}\n\n**After arrival:**\n• Settle in and charge up${isEV ? " (EV)" : ""}\n• Lunch at a local spot\n• Gentle afternoon walk to ease into the trip\n\nLooks good? Or want to adjust the departure time?`;
      }

      if (chatFlowStep === "route_shown") {
        if (/looks good|perfect|great|yes|ok|sure|thanks|awesome/.test(lower)) {
          setChatFlowStep(null);
          return "Brilliant! Your Day 1 route is all set. 🎉\n\nSwitch to **Timeline** to see your full itinerary, or ask me anything about today's plan.";
        }
        if (/adjust|change|earlier|later|different/.test(lower)) {
          setChatFlowStep("ask_time");
          return "No problem — what departure time works better?";
        }
        setChatFlowStep(null); // Exit flow on any other message
      }

      // ─── Last Day Flow ───
      if (chatFlowStep === "ask_home") {
        const homeLoc = msg.trim();
        setChatFlowData(prev => ({ ...prev, homeLocation: homeLoc }));
        setChatFlowStep("ask_departure_time");
        return `Heading home to **${homeLoc}**. What time do you need to be back, or when would you like to leave **${chatLoc}**?`;
      }

      if (chatFlowStep === "ask_departure_time") {
        const depTime = msg.trim();
        const homeLoc = chatFlowData.homeLocation || "home";
        setChatFlowStep("departure_shown");
        setChatFlowData(prev => ({ ...prev, departTime: depTime }));
        const evSection = isEV ? `\n\n⚡ **EV charging:** Tebay Services has 50kW CCS — perfect for a 30-min top-up while you grab a coffee.` : "";

        return `🗺️ **Your journey home:**\n\n**${lastStay ? lastStay.name + ", " : ""}${chatLoc}** → **${homeLoc}**\n\n🕐 **Departure:** ${depTime}\n\n**Suggested stops:**\n1. **Tebay Services** — 30 min south, amazing farm shop + cafe\n2. **Rheged Centre** — near Penrith, food hall + playground (great for kids)\n3. **Penrith Castle** — free, quick 15-min stretch${evSection}\n\n**Before you go:**\n• Final checkout from ${lastStay ? lastStay.name : "accommodation"}\n• Last lunch in ${chatLoc}? Try **${chatItems.find(it => it.title.toLowerCase().includes("lunch"))?.title.replace("Final lunch at ", "") || "a local spot"}**\n\nLooks good, or want to adjust?`;
      }

      if (chatFlowStep === "departure_shown") {
        if (/looks good|perfect|great|yes|ok|sure|thanks|awesome/.test(lower)) {
          setChatFlowStep(null);
          return "All sorted! Safe travels home. 🏠\n\nCheck your **Timeline** for the full day, or ask me anything.";
        }
        if (/adjust|change|earlier|later|different/.test(lower)) {
          setChatFlowStep("ask_departure_time");
          return "What time works better for leaving?";
        }
        setChatFlowStep(null);
      }

      // Day-specific quick action responses
      const dayQuickResponses = {
        "Route plan": selectedDay === 1
          ? `**Getting to ${chatLoc}:**\n\nPopular routes from major cities:\n• **Manchester** — 1h 40m via M6/A591\n• **London** — 4h 30m via M6\n• **Birmingham** — 3h via M6\n\n**Recommended stops:**\n1. **Tebay Services** — best motorway services in the UK, local farm shop, EV chargers\n2. **Lancaster Services** — halfway point, Costa + M&S\n\n**EV charging en route:** Rapid chargers at Tebay (50kW), Lancaster (150kW), Killington Lake (50kW)\n\nWhat's your starting location? I can give you a tailored route.`
          : `**Route for Day ${selectedDay}:** ${chatItems[0]?.desc || "Check your timeline for today's route."}`,
        "Stops en route": selectedDay === DAYS.length
          ? `**Stops on your way home from ${chatLoc}:**\n\n1. **Tebay Services** — 30 min south, farm shop + EV chargers (50kW)\n2. **Rheged Centre** — 25 min, cinema + food hall + playground\n3. **Penrith Castle** — free, quick 20 min stop\n\nWhere are you heading home to? I'll plan the best stops.`
          : `Nearby stops from ${chatLoc}:\n\n1. **${chatLoc === "Windermere" ? "Orrest Head viewpoint" : chatLoc === "Keswick" ? "Castlerigg Stone Circle" : "Rydal Water"}** — scenic, free, 10 min\n2. **Local shops** in ${chatLoc} town centre\n3. **Lakeside cafe** for a quick break`,
        "Today's plan": (() => {
          const summary = chatItems.map(it => `**${it.time}** — ${it.title}${it.for !== "all" ? ` (${it.for})` : ""}`).join("\n");
          return `Here's your full Day ${selectedDay} in **${chatLoc}**:\n\n${summary}`;
        })(),
        "Bookings": (() => {
          const bookable = chatItems.filter(it => it.needsBooking);
          if (!bookable.length) return `No bookings needed for Day ${selectedDay} — you're all set! 🎉`;
          return `**Bookings needed for Day ${selectedDay}:**\n\n${bookable.map(it => `📋 **${it.title}** — ${it.price}\n   ${it.desc}`).join("\n\n")}\n\nWant me to help with any of these?`;
        })(),
      };

      // Check day-specific quick actions first
      if (dayQuickResponses[msg]) {
        setLastChatTopic("generic");
        return dayQuickResponses[msg];
      }

      // First check exact matches (for quick-tap buttons)
      const exactMap = { "EV chargers": 0, "Restaurants": 1, "Kids activities": 2, "Create poll": 3, "Weather": 4 };
      if (exactMap[msg] !== undefined) {
        // Set topic based on exact match
        const topicMap = { "EV chargers": "ev", "Restaurants": "restaurant", "Kids activities": "kids", "Create poll": "poll", "Weather": "weather" };
        setLastChatTopic(topicMap[msg] || "");
        return aiResponsePatterns[exactMap[msg]].response;
      }

      // Check for context-aware follow-ups based on previous AI response
      const topic = getLastAiTopic() || lastChatTopic;
      if (topic && followUpResponses[topic]) {
        const words = lower.split(/\s+/);
        for (const fu of followUpResponses[topic]) {
          const fuScore = fu.keywords.filter(kw => words.some(w => w === kw || w.startsWith(kw))).length;
          if (fuScore > 0) return fu.response;
        }
      }

      // Then do keyword matching with word boundaries — score each pattern
      const words = lower.split(/\s+/);
      let bestMatch = null;
      let bestScore = 0;
      let matchedTopic = "";
      for (const pattern of aiResponsePatterns) {
        let score = 0;
        for (const kw of pattern.keywords) {
          // Multi-word keywords: use includes
          if (kw.includes(" ")) { if (lower.includes(kw)) score += 2; }
          // Single-word keywords: match whole words only (prevents "eat" matching inside "create")
          else if (words.some(w => w === kw || w.startsWith(kw) || w.endsWith(kw + "s") || w === kw + "s" || w === kw + "ing" || w === kw + "er" || w === kw + "ed")) score += 1;
        }
        if (score > bestScore) {
          bestScore = score;
          bestMatch = pattern;
          // Determine topic from matched keywords
          if (pattern.keywords.some(k => ["poll", "vote", "survey"].includes(k))) matchedTopic = "poll";
          else if (pattern.keywords.some(k => ["restaurant", "food", "dinner", "lunch", "breakfast"].includes(k))) matchedTopic = "restaurant";
          else if (pattern.keywords.some(k => ["ev", "charger", "charge", "charging"].includes(k))) matchedTopic = "ev";
          else if (pattern.keywords.some(k => ["kid", "kids", "child", "children"].includes(k))) matchedTopic = "kids";
          else if (pattern.keywords.some(k => ["weather", "rain", "forecast"].includes(k))) matchedTopic = "weather";
          else if (pattern.keywords.some(k => ["cancel", "change", "reschedule", "modify"].includes(k))) matchedTopic = "booking";
          else if (pattern.keywords.some(k => ["swim", "swimming", "pool"].includes(k))) matchedTopic = "swimming";
          else if (pattern.keywords.some(k => ["hike", "walk", "trail"].includes(k))) matchedTopic = "walk";
          else matchedTopic = "generic";
        }
      }
      if (bestMatch && bestScore > 0) {
        setLastChatTopic(matchedTopic);
        return bestMatch.response;
      }

      // Handle number responses ("1", "2", "3") and common follow-ups using lastChatTopic
      const effectiveTopic = topic || lastChatTopic;
      if (effectiveTopic && topicFollowUpDefaults[effectiveTopic]) {
        // Check if this looks like a follow-up (short message, number, or common follow-up words)
        const isFollowUp = /^[1-9]$/.test(lower.trim()) ||
          ["yes", "no", "ok", "sure", "please", "yeah", "nah", "option", "custom", "add", "do it", "go ahead"].some(w => lower.includes(w));
        if (isFollowUp) {
          // Try followUpResponses first for numbered responses
          if (effectiveTopic && followUpResponses[effectiveTopic]) {
            for (const fu of followUpResponses[effectiveTopic]) {
              const fuScore = fu.keywords.filter(kw => words.some(w => w === kw || w.startsWith(kw))).length;
              if (fuScore > 0) return fu.response;
            }
          }
          return topicFollowUpDefaults[effectiveTopic];
        }
      }

      // Smart fallback based on message length and content
      if (lower.includes("?")) return `Great question! Let me look into that for your Lake District trip.\n\nBased on your group (4 adults + 2 children) near Ambleside, I'd suggest checking the **Explore** tab for curated options, or try asking about:\n\n• Restaurants & food\n• Activities for kids or adults\n• Weather & planning\n• Boats, hikes, or attractions\n• Budget & costs`;
      return `I'm not sure about that specific request yet, but I'm getting smarter! Here's what I can help with right now:\n\n🍽️ **Restaurants** — 'find restaurants' or 'dinner options'\n⚡ **EV charging** — 'nearest chargers'\n🎯 **Activities** — 'things to do' or 'kids activities'\n🌦️ **Weather** — 'weather forecast'\n📊 **Polls** — 'create a poll'\n💰 **Budget** — 'trip cost' or 'budget'\n🚗 **Transport** — 'parking' or 'directions'\n\nTry asking about any of these!`;
    };

    const sendMessage = (text) => {
      const msg = text || chatInput;
      if (!msg.trim()) return;
      setChatInput("");
      setChatMessages(prev => [...prev, { role: "user", text: msg }]);
      setTimeout(() => {
        const response = findResponse(msg.trim());
        setChatMessages(prev => [...prev, { role: "ai", text: response }]);
      }, 800);
    };

    // Day-aware quick action chips — adapt to conversation flow
    const isFirstDay = selectedDay === 1;
    const isLastDay = selectedDay === DAYS.length;
    const getQuickActions = () => {
      if (chatFlowStep === "ask_start") return ["Manchester", "London", "Birmingham", "Enter postcode"];
      if (chatFlowStep === "ask_pickups") return ["No, heading straight there", "Yes, add a stop"];
      if (chatFlowStep === "ask_pickup_detail") return [];
      if (chatFlowStep === "ask_more_pickups") return ["No more, plan the route", "Add another stop"];
      if (chatFlowStep === "ask_time") return ["7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM"];
      if (chatFlowStep === "route_shown" || chatFlowStep === "departure_shown") return ["Looks good!", "Adjust time", "EV chargers", "Weather"];
      if (chatFlowStep === "ask_home") return ["Manchester", "London", "Birmingham", "Enter postcode"];
      if (chatFlowStep === "ask_departure_time") return ["9:00 AM", "10:00 AM", "11:00 AM", "After lunch"];
      if (isFirstDay) return ["Route plan", "EV chargers", "Stops en route", "Weather", "Today's plan"];
      if (isLastDay) return ["Stops en route", "Route plan", "EV chargers", "Today's plan", "Weather"];
      return ["Today's plan", "Restaurants", "Kids activities", "EV chargers", "Bookings", "Create poll", "Weather"];
    };
    const quickActions = getQuickActions();

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ background: T.s, borderBottom: `.5px solid ${T.border}` }}>
          <div style={{ padding: "14px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("trip")}>Back</button>
            <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Trip chat</h2>
            <div style={{ display: "flex" }}>
              {[["You", T.a], ["JM", T.coral], ["SP", T.blue]].map(([l, c], i) => (
                <Avatar key={i} bg={c} label={l} size={24} style={{ marginLeft: i ? -4 : 0, border: `1.5px solid ${T.s}` }} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, padding: "0 20px 10px", overflowX: "auto" }}>
            {DAYS.map(d => (
              <button key={d.day} onClick={() => setSelectedDay(d.day)}
                style={{ ...css.chip, flexShrink: 0, fontSize: 11, padding: "4px 10px",
                  ...(selectedDay === d.day ? { background: T.a, color: "#fff", borderColor: T.ad } : {}) }}>
                Day {d.day} · {d.location}
              </button>
            ))}
          </div>
        </div>
        <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {chatMessages.map((m, i) => (
            <div key={i} style={{ marginBottom: 12, maxWidth: "85%", ...(m.role === "user" ? { marginLeft: "auto" } : {}) }}>
              {m.role === "ai" && <div style={{ fontSize: 11, color: T.t3, marginBottom: 3 }}>Wanderly</div>}
              <div style={{
                padding: "10px 14px", fontSize: 14, lineHeight: 1.5,
                ...(m.role === "user"
                  ? { background: T.a, color: "#fff", borderRadius: "16px 16px 4px 16px" }
                  : { background: T.s, border: `.5px solid ${T.border}`, borderRadius: "16px 16px 16px 4px" }),
              }} dangerouslySetInnerHTML={{ __html: m.text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>") }} />
            </div>
          ))}
        </div>
        <div style={{ padding: "0 20px" }}>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "6px 0" }}>
            {quickActions.map(p => (
              <button key={p} style={{ ...css.chip, flexShrink: 0, fontSize: 12 }} onClick={() => sendMessage(p)}>{p}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: "10px 20px", background: T.s, borderTop: `.5px solid ${T.border}` }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
              style={{ flex: 1, padding: "10px 14px", border: `.5px solid ${T.border}`, borderRadius: 20, fontFamily: T.font, fontSize: 14, background: T.s2, outline: "none" }}
              placeholder="Ask anything about your trip..." />
            <button onClick={() => sendMessage()} style={{ width: 36, height: 36, borderRadius: "50%", background: T.a, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
            </button>
          </div>
        </div>
        <TabBar active="chat" onNav={navigate} />
      </div>
    );
  };

  // ─── Screen: Polls ───
  const renderVoteScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("trip")}>Back</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Group polls</h2>
        <button style={{ ...css.btn, ...css.btnSm, ...css.btnP }} onClick={() => alert("Create a new poll for your travel group!")}>+ New</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {pollData.map(poll => (
          <div key={poll.id} style={{ ...css.card, opacity: poll.status === "closed" ? 0.6 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <Tag bg={poll.status === "active" ? T.al : T.s2} color={poll.status === "active" ? T.ad : T.t3}>
                {poll.status === "active" ? "Active" : "Closed"}
              </Tag>
              <span style={{ fontSize: 11, color: T.t3 }}>{poll.ends}</span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>{poll.q}</p>
            {poll.options.map((opt, i) => (
              <div key={i} onClick={() => {
                if (poll.status === "closed") return;
                setPollData(prev => prev.map(p => p.id === poll.id ? { ...p, options: p.options.map((o, j) => j === i ? { ...o, voted: !o.voted, pct: Math.min(100, o.pct + (o.voted ? -10 : 10)), voters: o.voted ? o.voters.filter(v => v !== "You") : [...(o.voters||[]), "You"] } : o) } : p));
              }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: `.5px solid ${opt.voted ? T.a : T.border}`, borderRadius: T.rs, marginBottom: 6, cursor: poll.status === "closed" ? "default" : "pointer", position: "relative", overflow: "hidden", background: opt.voted ? T.al : T.s }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${opt.pct}%`, background: T.al, borderRadius: T.rs, zIndex: 0 }} />
                <span style={{ position: "relative", zIndex: 1, fontSize: 13, flex: 1 }}>{opt.text}</span>
                <div style={{ display: "flex", position: "relative", zIndex: 1 }}>
                  {opt.voters?.slice(0, 3).map((v, j) => {
                    const cols = { You: T.a, JM: T.coral, SP: T.blue, RK: T.amber, LT: T.purple };
                    return <Avatar key={j} bg={cols[v] || T.t3} label={v.slice(0, 2)} size={20} style={{ marginLeft: j ? -4 : 0, border: `1.5px solid ${T.s}` }} />;
                  })}
                </div>
                <span style={{ position: "relative", zIndex: 1, fontSize: 12, fontWeight: 500, color: T.a, minWidth: 28, textAlign: "right" }}>{opt.pct}%</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: T.t3 }}>
              <span>{poll.votes} votes · by {poll.by}</span>
            </div>
          </div>
        ))}
      </div>
      <TabBar active="trip" onNav={navigate} />
    </div>
  );

  // ─── Screen: Memories ───
  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const newPhotos = files.map(f => ({ id: Date.now() + "_" + Math.random().toString(36).slice(2, 8), url: URL.createObjectURL(f), name: f.name, day: "Untagged", liked: false, caption: "", uploadDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) }));
    setUploadedPhotos(prev => [...prev, ...newPhotos]);
    e.target.value = "";
  };
  const renderMemoriesScreen = () => {
    const totalPhotos = uploadedPhotos.length;
    const likedCount = uploadedPhotos.filter(p => p.liked).length;
    const daysWithPhotos = new Set(uploadedPhotos.filter(p => p.day !== "Untagged").map(p => p.day)).size;
    const untaggedPhotos = uploadedPhotos.filter(p => p.day === "Untagged");
    const dayGroups = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5"];
    const taggedByDay = {};
    dayGroups.forEach(d => { taggedByDay[d] = uploadedPhotos.filter(p => p.day === d); });

    const renderPhotoThumb = (p, idx) => (
      <div key={idx} style={{ aspectRatio: "1", borderRadius: T.rs, overflow: "hidden", cursor: "pointer", position: "relative", border: p.liked ? `2px solid ${T.red}` : "none" }} onClick={() => setViewingPhoto(p)}>
        <img src={p.url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <span style={{ position: "absolute", bottom: 2, left: 4, color: "#fff", fontSize: 9, fontWeight: 500, textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>{p.name.length > 12 ? p.name.slice(0, 12) + "..." : p.name}</span>
        <span onClick={(e) => { e.stopPropagation(); setUploadedPhotos(prev => prev.map(ph => ph.id === p.id ? { ...ph, liked: !ph.liked } : ph)); }} style={{ position: "absolute", top: 4, left: 4, fontSize: 14, cursor: "pointer", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.4))" }}>{p.liked ? "\u2764\uFE0F" : "\uD83E\uDD0D"}</span>
        <span onClick={(e) => { e.stopPropagation(); setUploadedPhotos(prev => prev.filter(ph => ph.id !== p.id)); }} style={{ position: "absolute", top: 2, right: 4, fontSize: 14, cursor: "pointer", color: "#fff", fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,.6)", lineHeight: 1 }}>&times;</span>
      </div>
    );

    const renderUploadBox = () => (
      <div onClick={() => photoInputRef.current?.click()} style={{ aspectRatio: "1", borderRadius: T.rs, border: `1.5px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 24, color: T.t3 }}>+</div>
    );

    return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <input type="file" accept="image/*" multiple ref={photoInputRef} style={{ display: "none" }} onChange={handlePhotoUpload} />
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("trip")}>Back</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Memories</h2>
        <button style={{ ...css.btn, ...css.btnSm, ...css.btnP }} onClick={() => photoInputRef.current?.click()}>Upload</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {/* Trip Stats Banner */}
        <div style={{ ...css.card, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: T.t2 }}>{"\uD83D\uDCF8"} {totalPhotos} photo{totalPhotos !== 1 ? "s" : ""}</span>
          <span style={{ fontSize: 13, color: T.t3 }}>&middot;</span>
          <span style={{ fontSize: 13, color: T.t2 }}>{"\u2764\uFE0F"} {likedCount} favourite{likedCount !== 1 ? "s" : ""}</span>
          <span style={{ fontSize: 13, color: T.t3 }}>&middot;</span>
          <span style={{ fontSize: 13, color: T.t2 }}>{"\uD83D\uDCC5"} {daysWithPhotos} day{daysWithPhotos !== 1 ? "s" : ""}</span>
        </div>

        {/* AI Video */}
        <div style={{ ...css.card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ height: 180, background: `linear-gradient(135deg, ${T.ad}, ${T.a}, #085041)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            {videoState === "generating" ? (
              <>
                <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(255,255,255,.2)", borderTopColor: "#fff", animation: "spin .8s linear infinite" }} />
                <p style={{ fontSize: 13, marginTop: 10, opacity: .8 }}>Generating highlights...</p>
              </>
            ) : (
              <>
                <button onClick={() => {
                    if (uploadedPhotos.length > 0) {
                      setReelIndex(0);
                      setReelPaused(false);
                      setReelPlaying(true);
                    } else {
                      alert("Upload some photos first!");
                    }
                  }}
                  style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,.2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                </button>
                <p style={{ fontSize: 13, marginTop: 10, opacity: .8 }}>
                  {uploadedPhotos.length === 0 ? "Upload photos to create your reel" : "Play trip highlight reel"}
                </p>
              </>
            )}
          </div>
          <div style={{ padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500 }}>Easter Lake District 2026</p>
                <p style={{ fontSize: 12, color: T.t2 }}>Auto-generated from {totalPhotos} photos</p>
              </div>
              <button style={{ ...css.btn, ...css.btnSm }}>Share</button>
            </div>
            <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
              <Tag bg={T.blueL} color={T.blue}>30 sec</Tag>
              <Tag bg={T.purpleL} color={T.purple}>Music + transitions</Tag>
              <Tag bg={T.al} color={T.ad}>AI narration</Tag>
            </div>
          </div>
        </div>

        {/* Day-grouped photos */}
        {dayGroups.map(dayLabel => {
          const dayPhotos = taggedByDay[dayLabel];
          return (
            <div key={dayLabel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={css.sectionTitle}>{dayLabel}</div>
                <span style={{ fontSize: 12, color: T.t3 }}>{dayPhotos.length} photo{dayPhotos.length !== 1 ? "s" : ""}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 16 }}>
                {dayPhotos.length > 0 ? (
                  <>
                    {dayPhotos.map((p, i) => renderPhotoThumb(p, i))}
                    {renderUploadBox()}
                  </>
                ) : (
                  renderUploadBox()
                )}
              </div>
            </div>
          );
        })}

        {/* Untagged / Your Uploads */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={css.sectionTitle}>Your Uploads</div>
            <span style={{ fontSize: 12, color: T.t3 }}>{untaggedPhotos.length} photo{untaggedPhotos.length !== 1 ? "s" : ""}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 16 }}>
            {untaggedPhotos.length > 0 ? (
              <>
                {untaggedPhotos.map((p, i) => renderPhotoThumb(p, i))}
                {renderUploadBox()}
              </>
            ) : (
              renderUploadBox()
            )}
          </div>
        </div>

        <div style={{ ...css.card, textAlign: "center", padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>AI video settings</p>
          <p style={{ fontSize: 12, color: T.t2, marginBottom: 12 }}>Customise your highlight reel</p>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {["Music overlay", "AI narration", "Date stamps", "Slow-mo", "Boomerangs"].map((o) => (
              <span key={o} onClick={() => setVideoSettings(prev => { const next = new Set(prev); if (next.has(o)) next.delete(o); else next.add(o); return next; })} style={{ ...css.chip, ...(videoSettings.has(o) ? css.chipActive : {}), cursor: "pointer" }}>{o}</span>
            ))}
          </div>
        </div>
      </div>
      <TabBar active="memories" onNav={navigate} />
    </div>
    );
  };

  // ─── Screen: Share ───
  const renderShareScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("trip")}>Back</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Share trip</h2>
        <div />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <p style={{ fontSize: 14, color: T.t2, marginBottom: 14 }}>Invite friends via link. They'll see timeline, chat, polls, and memories.</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: T.s2, borderRadius: T.rs, fontSize: 13, color: T.t2, marginBottom: 16 }}>
          <code style={{ flex: 1, fontFamily: T.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>wanderly.app/trip/easter-ld-2026</code>
          <button style={{ ...css.btn, ...css.btnSm }} onClick={() => { navigator.clipboard?.writeText("https://wanderly.app/trip/easter-ld-2026"); alert("Link copied!"); }}>Copy</button>
        </div>
        {[["You", T.a, "Lead traveller", "Admin"], ["James M. + Ella (8)", T.coral, "Joined 2 days ago"], ["Sarah P. + Max (12)", T.blue, "Joined yesterday"], ["Raj K.", T.amber, "Joined yesterday"]].map(([name, color, sub, badge], i) => (
          <div key={i} style={{ ...css.card, display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar bg={color} label={name.slice(0, 2)} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 500 }}>{name}</p>
              <p style={{ fontSize: 12, color: T.t3 }}>{sub}</p>
            </div>
            {badge && <Tag bg={T.al} color={T.ad}>{badge}</Tag>}
          </div>
        ))}
      </div>
      <TabBar active="trip" onNav={navigate} />
    </div>
  );

  // ─── Screen: Explore ───
  const renderExploreScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("trip")}>Back</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Explore nearby</h2>
        <span style={{ fontSize: 12, color: T.t3 }}>Ambleside</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <div style={{ height: 160, background: T.s2, borderRadius: T.r, marginBottom: 12, position: "relative", overflow: "hidden", border: `.5px solid ${T.border}` }}>
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(170deg, #D4E8D0, #E2EDDA 40%, #C9DBC3)" }}>
            <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", ...css.avatar(T.blue, 28), border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,.15)" }}>You</div>
            {[["🍽️", "28%", "30%", T.coral], ["🎢", "68%", "22%", T.pink], ["⚡", "75%", "58%", T.a], ["⛰️", "18%", "60%", T.purple]].map(([icon, l, t, c], i) => (
              <div key={i} style={{ position: "absolute", left: l, top: t, ...css.avatar(c, 22), fontSize: 11, border: "2px solid #fff" }}>{icon}</div>
            ))}
          </div>
        </div>
        {[
          { title: "The Drunken Duck", sub: "4.8★ · 12 min drive", tags: [["Steaks", T.coralL, T.coral], ["Kids free", T.coralL, T.coral]], icon: "🍽️", bg: T.coralL },
          { title: "Brockhole Adventure", sub: "4.8★ · 8 min drive", tags: [["Ages 3-14", T.pinkL, T.pink], ["Free", T.pinkL, T.pink]], icon: "🎢", bg: T.pinkL },
          { title: "Rydal Road Charger", sub: "50kW · 2 available · 3 min", tags: [["EV charging", T.al, T.ad]], icon: "⚡", bg: T.al },
          { title: "Stock Ghyll Force", sub: "4.9★ · 5 min walk", tags: [["Waterfall", T.blueL, T.blue], ["Light hike", T.blueL, T.blue]], icon: "⛰️", bg: T.blueL },
        ].map((p, i) => (
          <div key={i} onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(p.title)}+Lake+District`, "_blank")} style={{ ...css.card, display: "flex", gap: 12, cursor: "pointer" }}>
            <div style={{ width: 52, height: 52, borderRadius: T.rs, background: p.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{p.icon}</div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 500 }}>{p.title}</h4>
              <p style={{ fontSize: 12, color: T.t2, marginBottom: 4 }}>{p.sub}</p>
              <div>{p.tags.map(([t, bg, c]) => <Tag key={t} bg={bg} color={c}>{t}</Tag>)}</div>
            </div>
          </div>
        ))}
      </div>
      <TabBar active="explore" onNav={navigate} />
    </div>
  );

  // ─── Screen: Settings ───
  const renderSettingsScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("trip")}>Back</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Settings</h2>
        <div />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {/* User Profile */}
        {user && (
          <div style={{ ...css.card, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: T.a, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 16 }}>
                {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{user.user_metadata?.full_name || user.email?.split("@")[0] || "Guest"}</p>
                <p style={{ fontSize: 12, color: T.t2 }}>{user.email || "Demo mode"}</p>
              </div>
            </div>
            {user.id !== 'demo' && (
              <div style={{ display: "flex", gap: 6 }}>
                <Tag bg={T.al} color={T.ad}>Synced to cloud</Tag>
                {syncing && <Tag bg={T.amberL} color={T.amber}>Syncing...</Tag>}
              </div>
            )}
            <button onClick={signOut} style={{ ...css.btn, ...css.btnSm, marginTop: 10, color: T.red }}>Sign out</button>
          </div>
        )}
        <div style={css.sectionTitle}>Food preferences</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {["Vegetarian", "Non-veg", "Local cuisine", "Kid-friendly"].map(o => (
            <span key={o} style={{ ...css.chip, ...css.chipActive }}>{o}</span>
          ))}
        </div>
        <div style={css.sectionTitle}>Connectors &amp; integrations</div>
        <p style={{ fontSize: 12, color: T.t3, marginBottom: 8 }}>Wanderly uses intelligent routing to connect the right services automatically. Toggle individual connectors on/off.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
          {Object.entries(CONNECTORS).map(([key, c]) => (
            <div key={key} onClick={() => setSettingsToggles(prev => ({ ...prev, [key]: !prev[key] }))}
              style={{ background: settingsToggles[key] ? T.s : T.s2, border: `.5px solid ${settingsToggles[key] ? T.a : T.border}`, borderRadius: T.rs, padding: "10px 8px", textAlign: "center", fontSize: 11, color: settingsToggles[key] ? T.t1 : T.t3, cursor: "pointer", transition: "all .15s", opacity: settingsToggles[key] ? 1 : 0.5 }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
              <div style={{ fontWeight: 500, fontSize: 10, lineHeight: 1.3 }}>{c.name.split(" / ")[0]}</div>
              <div style={{ fontSize: 9, color: settingsToggles[key] ? T.a : T.t3, marginTop: 2 }}>{settingsToggles[key] ? "Active" : "Off"}</div>
            </div>
          ))}
        </div>
        <div style={css.sectionTitle}>Notifications</div>
        {[["Booking confirmations","n_booking"], ["EV charger alerts","n_ev"], ["Traffic & closures","n_traffic"], ["Daily video generation","n_video"], ["Poll reminders","n_poll"], ["Checkout reminders","n_checkout"]].map(([n, nk]) => (
          <div key={nk} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `.5px solid ${T.border}` }}>
            <span style={{ fontSize: 14 }}>{n}</span>
            <div onClick={() => setSettingsToggles(prev => ({ ...prev, [nk]: !prev[nk] }))} style={{ width: 40, height: 22, borderRadius: 11, background: settingsToggles[nk] ? T.a : T.s3, position: "relative", cursor: "pointer", transition: "background .2s" }}>
              <div style={{ position: "absolute", top: 2, left: settingsToggles[nk] ? 20 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)", transition: "left .2s" }} />
            </div>
          </div>
        ))}
      </div>
      <TabBar active="settings" onNav={navigate} />
    </div>
  );

  // ─── Screen: Created Trip Detail ───
  const renderCreatedTripScreen = () => {
    const trip = createdTrips.find(t => t.id === selectedCreatedTrip?.id) || selectedCreatedTrip;
    if (!trip) return <div style={{ padding: 40, textAlign: "center" }}>Trip not found. <button onClick={() => navigate("home")} style={css.btn}>Go home</button></div>;
    const isLive = trip.status === "live";
    const totalTravellers = trip.travellers.adults.length + trip.travellers.olderKids.length + trip.travellers.youngerKids.length;
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ background: isLive ? T.ad : T.blue, color: "#fff", padding: "20px 20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <button style={{ ...css.btn, ...css.btnSm, background: "rgba(255,255,255,.15)", borderColor: "rgba(255,255,255,.25)", color: "#fff" }} onClick={() => navigate("home")}>← Back</button>
            {isLive ? <Tag bg="rgba(255,255,255,0.2)" color="#fff">🟢 Live</Tag> : <Tag bg="rgba(255,255,255,0.2)" color="#fff">New</Tag>}
          </div>
          <h2 style={{ fontFamily: T.fontD, fontSize: 22, fontWeight: 400 }}>{trip.name}</h2>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <p style={{ fontSize: 12, opacity: 0.8 }}>{trip.start && trip.end ? `${trip.start} – ${trip.end} ${trip.year}` : "Dates TBC"}</p>
            <button onClick={() => { /* pre-fill wizard with this trip's data and navigate to edit */
              setWizTrip({ name: trip.name, brief: trip.brief || "", start: trip.rawStart || "", end: trip.rawEnd || "", places: [...trip.places], travel: new Set(trip.travel), budget: trip.budget || "" });
              setWizTravellers({ adults: trip.travellers.adults.map(a => ({ ...a })), olderKids: trip.travellers.olderKids.map(c => ({ ...c })), youngerKids: trip.travellers.youngerKids.map(c => ({ ...c })) });
              setWizStays(trip.stays || []);
              setWizPrefs({ food: new Set(trip.prefs.food), adultActs: new Set(trip.prefs.activities), olderActs: new Set(), youngerActs: new Set(), instructions: "" });
              setWizStep(0);
              setEditingTripId(trip.id);
              navigate("create");
            }} style={{ ...css.btn, ...css.btnSm, color: "#fff", opacity: 0.8, fontSize: 11 }}>✏️ Edit details</button>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4, padding: "10px 20px", background: T.s, borderBottom: `.5px solid ${T.border}` }}>
          {[{ icon: "📍", label: trip.places.join(", ") || "No locations" }, { icon: "👥", label: `${totalTravellers} traveller${totalTravellers > 1 ? "s" : ""}` }, { icon: "🏨", label: `${trip.stayNames.length} stay${trip.stayNames.length !== 1 ? "s" : ""}` }].map((item, i) => (
            <div key={i} style={{ flex: 1, background: T.s2, borderRadius: T.rs, padding: "8px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 14 }}>{item.icon}</div>
              <div style={{ fontSize: 10, color: T.t2, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {isLive && trip.shareCode && (
            <div style={{ ...css.card, marginBottom: 16, borderColor: T.a }}>
              <div style={css.sectionTitle}>Share & Invite</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: T.s2, borderRadius: T.rs, fontSize: 12, color: T.t2, marginBottom: 10 }}>
                <code style={{ flex: 1, fontFamily: T.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{`${window.location.origin}?join=${trip.shareCode}`}</code>
                <button style={{ ...css.btn, ...css.btnSm, fontSize: 11 }} onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}?join=${trip.shareCode}`); }}>Copy link</button>
              </div>
              {trip.travellers.adults.map((a, i) => {
                const adultColors = [T.a, T.coral, T.blue, T.amber, T.purple, T.pink];
                const getInit = (n) => { if (!n) return "?"; const p = n.trim().split(/\s+/); return p.length > 1 ? (p[0][0] + p[1][0]).toUpperCase() : n.slice(0, 2).toUpperCase(); };
                const status = a.isLead ? "Organiser ✓" : a.email ? "Invite sent" : "Share link to join";
                const statusColor = a.isLead ? T.ad : a.email ? T.blue : T.t3;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < trip.travellers.adults.length - 1 ? `.5px solid ${T.border}` : "none" }}>
                    <Avatar bg={adultColors[i % adultColors.length]} label={getInit(a.name)} size={28} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 500 }}>{a.name || `Adult ${i + 1}`}</p>
                      <p style={{ fontSize: 11, color: statusColor }}>{status}</p>
                    </div>
                    {!a.isLead && !a.email && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <input placeholder="Email" style={{ width: 110, padding: "4px 8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s2, outline: "none" }} />
                        <button style={{ ...css.btn, ...css.btnSm, fontSize: 10, color: T.a }}>Send invite</button>
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={() => { setSelectedCreatedTrip(trip); navigate("joinPreview"); }} style={{ ...css.btn, ...css.btnSm, width: "100%", justifyContent: "center", marginTop: 10, fontSize: 11 }}>Preview join page</button>
            </div>
          )}

          {!isLive && (
            <div style={{ ...css.card, background: T.al, borderColor: T.a, marginBottom: 16, textAlign: "center", padding: "20px 16px" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🚀</div>
              <h3 style={{ fontSize: 15, fontWeight: 500, marginBottom: 6, color: T.ad }}>Ready to go live?</h3>
              <p style={{ fontSize: 12, color: T.t2, marginBottom: 12 }}>Wanderly will generate your day-by-day itinerary, connect travel services, and start monitoring weather & bookings.</p>
              <button onClick={() => makeTripLive(trip.id)} style={{ ...css.btn, ...css.btnP, justifyContent: "center", width: "100%", padding: "12px 16px", fontSize: 14 }}>🚀 Activate trip</button>
            </div>
          )}

          {isLive && trip.timeline.length === 0 && (
            <>
              <div style={{ ...css.card, textAlign: "center", padding: 24, marginTop: 12, background: T.al, borderColor: T.a }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{"✨"}</div>
                <p style={{ fontSize: 14, fontWeight: 500, color: T.ad, marginBottom: 4 }}>Your itinerary is being prepared</p>
                <p style={{ fontSize: 12, color: T.t2, lineHeight: 1.5 }}>Chat with Wanderly AI to refine your plans, or add activities manually.</p>
                <button onClick={() => navigate("chat")} style={{ ...css.btn, ...css.btnP, ...css.btnSm, marginTop: 12 }}>Chat with AI</button>
              </div>
              <button onClick={() => addTimelineItem(trip.id)} style={{ ...css.btn, ...css.btnSm, fontSize: 11, color: T.a, marginTop: 8, width: "100%", justifyContent: "center" }}>+ Add activity</button>
            </>
          )}
          {isLive && trip.timeline.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={css.sectionTitle}>Day 1 Itinerary</div>
                <button onClick={() => addTimelineItem(trip.id)} style={{ ...css.btn, ...css.btnSm, fontSize: 11, color: T.a }}>+ Add activity</button>
              </div>
              {trip.timeline.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: editingTimelineIdx === i ? 8 : 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 14 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                    {i < trip.timeline.length - 1 && <div style={{ width: 1.5, flex: 1, background: T.border, marginTop: 4 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: 4 }}>
                    {editingTimelineIdx === i ? (
                      <div style={{ ...css.card, padding: 10, marginBottom: 4 }}>
                        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                          <input value={item.time} onChange={e => updateTimelineItem(trip.id, i, "time", e.target.value)}
                            style={{ width: 90, padding: "5px 8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none" }} placeholder="Time" />
                          <input value={item.title} onChange={e => updateTimelineItem(trip.id, i, "title", e.target.value)}
                            style={{ flex: 1, padding: "5px 8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none" }} placeholder="Title" />
                        </div>
                        <input value={item.desc} onChange={e => updateTimelineItem(trip.id, i, "desc", e.target.value)}
                          style={{ width: "100%", padding: "5px 8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none", marginBottom: 6 }} placeholder="Description" />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setEditingTimelineIdx(null)} style={{ ...css.btn, ...css.btnP, ...css.btnSm, fontSize: 10 }}>✓ Done</button>
                          <button onClick={() => deleteTimelineItem(trip.id, i)} style={{ ...css.btn, ...css.btnSm, fontSize: 10, color: T.red }}>🗑️ Delete</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 11, color: T.t3, marginBottom: 2 }}>{item.time}</p>
                          <p style={{ fontSize: 14, fontWeight: 500 }}>{item.title}</p>
                          <p style={{ fontSize: 12, color: T.t2, marginTop: 2 }}>{item.desc}</p>
                          <Tag bg={T.al} color={T.ad}>{item.group}</Tag>
                        </div>
                        <button onClick={() => setEditingTimelineIdx(i)} style={{ ...css.btn, ...css.btnSm, fontSize: 12, padding: "2px 6px", opacity: 0.5 }}>✏️</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div style={{ ...css.card, marginTop: 8, padding: 12 }}>
                <div style={css.sectionTitle}>Refine with AI</div>
                <div style={{ maxHeight: 150, overflowY: "auto", marginBottom: 8 }}>
                  {tripChatMessages.length === 0 && (
                    <p style={{ fontSize: 12, color: T.t3, textAlign: "center", padding: "8px 0" }}>Ask Wanderly to adjust your itinerary — change times, add activities, find restaurants, and more.</p>
                  )}
                  {tripChatMessages.map((msg, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 6 }}>
                      <div style={{ maxWidth: "85%", padding: "8px 10px", borderRadius: 12, fontSize: 12, lineHeight: 1.4, background: msg.role === "user" ? T.a : T.s2, color: msg.role === "user" ? "#fff" : T.t1, whiteSpace: "pre-line" }}>{msg.text}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <input value={tripChatInput} onChange={e => setTripChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleTripChat(trip.id)}
                    style={{ flex: 1, padding: "8px 10px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 12, background: T.s, outline: "none" }}
                    placeholder="e.g. Add a museum visit in the afternoon..." />
                  <button onClick={() => handleTripChat(trip.id)} style={{ ...css.btn, ...css.btnP, ...css.btnSm, fontSize: 11 }}>Send</button>
                </div>
              </div>
            </>
          )}

          {trip.brief && (
            <div style={{ marginTop: 12 }}>
              <div style={css.sectionTitle}>Trip brief</div>
              <p style={{ fontSize: 13, color: T.t2, lineHeight: 1.5 }}>{trip.brief}</p>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={css.sectionTitle}>Details</div>
            <div style={css.card}>
              {trip.places.length > 0 && <div style={{ marginBottom: 10 }}><label style={{ fontSize: 11, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Locations</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{trip.places.map(p => <Tag key={p} bg={T.purpleL} color={T.purple}>{p}</Tag>)}</div></div>}
              {trip.travel.length > 0 && <div style={{ marginBottom: 10 }}><label style={{ fontSize: 11, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Travel</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{trip.travel.map(t => <Tag key={t} bg={T.blueL} color={T.blue}>{t}</Tag>)}</div></div>}
              {trip.stayNames.length > 0 && <div style={{ marginBottom: 10 }}><label style={{ fontSize: 11, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Accommodation</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{trip.stayNames.map(s => <Tag key={s} bg={T.amberL} color={T.amber}>{s}</Tag>)}</div></div>}
              {trip.prefs.food.length > 0 && <div style={{ marginBottom: 10 }}><label style={{ fontSize: 11, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Food</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{trip.prefs.food.map(f => <Tag key={f} bg={T.coralL} color={T.coral}>{f}</Tag>)}</div></div>}
              {trip.prefs.activities.length > 0 && <div><label style={{ fontSize: 11, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Activities</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{trip.prefs.activities.map(a => <Tag key={a} bg={T.blueL} color={T.blue}>{a}</Tag>)}</div></div>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {!isLive && <button onClick={() => makeTripLive(trip.id)} style={{ ...css.btn, ...css.btnP, flex: 1, justifyContent: "center" }}>🚀 Activate trip</button>}
            <button onClick={() => { deleteCreatedTrip(trip.id); navigate("home"); }} style={{ ...css.btn, flex: isLive ? 0 : 1, justifyContent: "center", color: T.red }}>Remove trip</button>
          </div>
        </div>
      </div>
    );
  };

  // ─── Screen: Join Preview ───
  const [joinedSlot, setJoinedSlot] = useState(null);
  const renderJoinPreviewScreen = () => {
    const trip = createdTrips.find(t => t.id === selectedCreatedTrip?.id) || selectedCreatedTrip;
    if (!trip) return <div style={{ padding: 40, textAlign: "center" }}>Trip not found. <button onClick={() => navigate("home")} style={css.btn}>Go home</button></div>;
    const adultColors = [T.a, T.coral, T.blue, T.amber, T.purple, T.pink];
    const getInit = (n) => { if (!n) return "?"; const p = n.trim().split(/\s+/); return p.length > 1 ? (p[0][0] + p[1][0]).toUpperCase() : n.slice(0, 2).toUpperCase(); };
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button style={{ ...css.btn, ...css.btnSm }} onClick={() => { setJoinedSlot(null); navigate("createdTrip"); }}>Back</button>
          <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Join preview</h2>
          <div />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          <div style={{ textAlign: "center", marginBottom: 20, padding: "20px 16px", background: T.al, borderRadius: T.r }}>
            <p style={{ fontSize: 11, color: T.t3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>You have been invited to</p>
            <h3 style={{ fontFamily: T.fontD, fontSize: 22, fontWeight: 400, marginBottom: 4 }}>{trip.name}</h3>
            <p style={{ fontSize: 13, color: T.t2 }}>{trip.start && trip.end ? `${trip.start} – ${trip.end} ${trip.year}` : "Dates TBC"}</p>
            {trip.places.length > 0 && (
              <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
                {trip.places.map(p => <Tag key={p} bg={T.purpleL} color={T.purple}>{p}</Tag>)}
              </div>
            )}
          </div>

          <div style={css.sectionTitle}>Join as:</div>
          {trip.travellers.adults.filter(a => !a.isLead).map((a, i) => {
            const realIdx = i + 1;
            const slotName = a.name || `Adult ${realIdx + 1}`;
            const isJoined = joinedSlot === realIdx;
            return (
              <div key={realIdx} style={{ ...css.card, display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar bg={adultColors[realIdx % adultColors.length]} label={getInit(slotName)} size={32} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{slotName}</p>
                  <p style={{ fontSize: 11, color: T.t3 }}>Unclaimed slot</p>
                </div>
                {isJoined ? (
                  <Tag bg={T.al} color={T.ad}>Joined ✓</Tag>
                ) : (
                  <button onClick={() => setJoinedSlot(realIdx)} style={{ ...css.btn, ...css.btnP, ...css.btnSm, fontSize: 11 }}>Join</button>
                )}
              </div>
            );
          })}
          {trip.travellers.adults.filter(a => !a.isLead).length === 0 && (
            <p style={{ fontSize: 13, color: T.t3, textAlign: "center", padding: 16 }}>No unclaimed adult slots available.</p>
          )}

          {joinedSlot !== null && (
            <div style={{ ...css.card, background: T.al, borderColor: T.a, textAlign: "center", marginTop: 12, padding: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: T.ad }}>Welcome to {trip.name}!</p>
              <p style={{ fontSize: 12, color: T.t2, marginTop: 4 }}>You have joined this trip successfully. The organiser will be notified.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Auth Screen ───
  const renderAuthScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <h1 style={{ fontFamily: T.fontD, fontSize: 32, fontWeight: 400, color: T.t1, marginBottom: 4 }}>Wanderly</h1>
        <p style={{ fontSize: 13, color: T.t2, marginBottom: 30 }}>Your travel concierge</p>

        <div style={{ width: "100%", maxWidth: 340 }}>
          {/* Google Sign-in */}
          <button onClick={signInWithGoogle}
            style={{ ...css.btn, width: "100%", padding: "12px 16px", marginBottom: 16, justifyContent: "center", gap: 10, background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.r, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontSize: 12, color: T.t3 }}>or</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>

          {/* Email auth */}
          {authScreen === "signup" && (
            <div style={{ marginBottom: 10 }}>
              <input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Your name"
                style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
            </div>
          )}
          <input value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Email" type="email"
            style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
          <input value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Password" type="password"
            style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none", marginBottom: 12, boxSizing: "border-box" }} />

          <button onClick={authScreen === "signup" ? signUpWithEmail : signInWithEmail}
            style={{ ...css.btn, ...css.btnP, width: "100%", padding: "12px 16px", justifyContent: "center", fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 10 }}>
            {authScreen === "signup" ? "Create account" : "Sign in"}
          </button>

          {authError && (
            <p style={{ fontSize: 12, color: authError.includes("Check your email") ? T.a : T.red, textAlign: "center", marginBottom: 8 }}>{authError}</p>
          )}

          <p style={{ fontSize: 12, color: T.t2, textAlign: "center" }}>
            {authScreen === "signup" ? "Already have an account? " : "Don't have an account? "}
            <span onClick={() => { setAuthScreen(authScreen === "signup" ? "login" : "signup"); setAuthError(""); }}
              style={{ color: T.a, cursor: "pointer", fontWeight: 500 }}>
              {authScreen === "signup" ? "Sign in" : "Sign up"}
            </span>
          </p>

          {/* Skip login for demo */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `.5px solid ${T.border}`, textAlign: "center" }}>
            <button onClick={() => { setUser({ id: 'demo', email: 'demo@wanderly.app' }); setAuthLoading(false); }}
              style={{ ...css.btn, fontSize: 12, color: T.t3, cursor: "pointer", margin: "0 auto" }}>
              Skip — explore as guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Render ───
  const phoneStyle = { maxWidth: 430, margin: "0 auto", height: 900, background: T.bg, borderRadius: 22, border: `.5px solid ${T.border}`, overflow: "hidden", fontFamily: T.font, color: T.t1, boxShadow: "0 8px 40px rgba(0,0,0,0.08)" };

  if (authLoading) {
    return (
      <div style={phoneStyle}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;1,400&family=Instrument+Serif&display=swap');@keyframes spin{to{transform:rotate(360deg)}}@keyframes kb1{from{transform:scale(1)}to{transform:scale(1.15)}}@keyframes kb2{from{transform:scale(1.15)}to{transform:scale(1)}}@keyframes kb3{from{transform:scale(1) translateX(0)}to{transform:scale(1.1) translateX(-3%)}}@keyframes kb4{from{transform:scale(1.1) translateY(-2%)}to{transform:scale(1) translateY(0)}}@keyframes reelFadeIn{from{opacity:0}to{opacity:1}}@keyframes reelProgress{from{width:0%}to{width:100%}}@keyframes demoPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}@keyframes demoSlideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes demoPulse{0%,100%{opacity:.3}50%{opacity:1}}@keyframes demoBounce{0%{transform:translateY(-16px);opacity:0}65%{transform:translateY(3px)}100%{transform:translateY(0);opacity:1}}@keyframes demoType{from{width:0}to{width:100%}}@keyframes demoGrow{from{width:0%}to{width:var(--target-width)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.08);border-radius:4px}`}</style>
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontFamily: T.fontD, fontSize: 24, fontWeight: 400 }}>Wanderly</h1>
            <p style={{ fontSize: 12, color: T.t2, marginTop: 4 }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={phoneStyle}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;1,400&family=Instrument+Serif&display=swap');@keyframes spin{to{transform:rotate(360deg)}}@keyframes kb1{from{transform:scale(1)}to{transform:scale(1.15)}}@keyframes kb2{from{transform:scale(1.15)}to{transform:scale(1)}}@keyframes kb3{from{transform:scale(1) translateX(0)}to{transform:scale(1.1) translateX(-3%)}}@keyframes kb4{from{transform:scale(1.1) translateY(-2%)}to{transform:scale(1) translateY(0)}}@keyframes reelFadeIn{from{opacity:0}to{opacity:1}}@keyframes reelProgress{from{width:0%}to{width:100%}}@keyframes demoPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}@keyframes demoSlideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes demoPulse{0%,100%{opacity:.3}50%{opacity:1}}@keyframes demoBounce{0%{transform:translateY(-16px);opacity:0}65%{transform:translateY(3px)}100%{transform:translateY(0);opacity:1}}@keyframes demoType{from{width:0}to{width:100%}}@keyframes demoGrow{from{width:0%}to{width:var(--target-width)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.08);border-radius:4px}`}</style>
        <div style={{ height: "100%" }}>
          {renderAuthScreen()}
        </div>
      </div>
    );
  }

  return (
    <div style={phoneStyle}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;1,400&family=Instrument+Serif&display=swap');@keyframes spin{to{transform:rotate(360deg)}}@keyframes kb1{from{transform:scale(1)}to{transform:scale(1.15)}}@keyframes kb2{from{transform:scale(1.15)}to{transform:scale(1)}}@keyframes kb3{from{transform:scale(1) translateX(0)}to{transform:scale(1.1) translateX(-3%)}}@keyframes kb4{from{transform:scale(1.1) translateY(-2%)}to{transform:scale(1) translateY(0)}}@keyframes reelFadeIn{from{opacity:0}to{opacity:1}}@keyframes reelProgress{from{width:0%}to{width:100%}}@keyframes demoPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}@keyframes demoSlideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes demoPulse{0%,100%{opacity:.3}50%{opacity:1}}@keyframes demoBounce{0%{transform:translateY(-16px);opacity:0}65%{transform:translateY(3px)}100%{transform:translateY(0);opacity:1}}@keyframes demoType{from{width:0}to{width:100%}}@keyframes demoGrow{from{width:0%}to{width:var(--target-width)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.08);border-radius:4px}`}</style>
      <div style={{ height: "100%" }}>
        {screen === "home" && renderHomeScreen()}
        {screen === "create" && renderCreateScreen()}
        {screen === "createdTrip" && renderCreatedTripScreen()}
        {screen === "trip" && renderTripScreen()}
        {screen === "chat" && renderChatScreen()}
        {screen === "vote" && renderVoteScreen()}
        {screen === "memories" && renderMemoriesScreen()}
        {screen === "share" && renderShareScreen()}
        {screen === "explore" && renderExploreScreen()}
        {screen === "settings" && renderSettingsScreen()}
        {screen === "joinPreview" && renderJoinPreviewScreen()}
      </div>
      {/* Trip Reel Overlay */}
      {reelPlaying && uploadedPhotos.length > 0 && (() => {
        const photo = uploadedPhotos[reelIndex] || uploadedPhotos[0];
        const kbAnimations = ["kb1", "kb2", "kb3", "kb4"];
        const kbOrigins = ["top left", "center", "bottom right", "top right"];
        const kbAnim = kbAnimations[reelIndex % 4];
        const kbOrigin = kbOrigins[reelIndex % 4];
        const likedCount = uploadedPhotos.filter(p => p.liked).length;
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", display: "flex", flexDirection: "column", fontFamily: T.font }}>
            {/* Progress bars */}
            <div style={{ display: "flex", gap: 3, padding: "12px 8px 8px", zIndex: 2 }}>
              {uploadedPhotos.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 2.5, borderRadius: 2, overflow: "hidden", background: "rgba(255,255,255,0.3)" }}>
                  <div style={{
                    height: "100%",
                    borderRadius: 2,
                    background: "#fff",
                    width: i < reelIndex ? "100%" : i === reelIndex ? "0%" : "0%",
                    ...(i === reelIndex && !reelPaused ? { animation: "reelProgress 4s linear forwards" } : {}),
                    ...(i === reelIndex && reelPaused ? { width: "50%" } : {}),
                  }} />
                </div>
              ))}
            </div>
            {/* Close button */}
            <button onClick={() => setReelPlaying(false)} style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", zIndex: 3, lineHeight: 1, padding: 4 }}>&times;</button>
            {/* Photo with Ken Burns */}
            <div key={reelIndex} style={{ flex: 1, overflow: "hidden", position: "relative", animation: "reelFadeIn 0.5s ease-in" }}>
              <img
                src={photo.url}
                alt={photo.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  animation: `${kbAnim} 4s ease-in-out forwards`,
                  transformOrigin: kbOrigin,
                }}
              />
              {/* Pause indicator */}
              {reelPaused && (
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 48, color: "rgba(255,255,255,0.8)", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>⏸️</div>
              )}
              {/* Bottom overlay gradient */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(transparent, rgba(0,0,0,0.7))", pointerEvents: "none" }} />
              {/* Day badge + caption */}
              <div style={{ position: "absolute", bottom: 60, left: 16, right: 16, zIndex: 2 }}>
                <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 12, background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 12, fontWeight: 500, marginBottom: 8 }}>📍 {photo.day || "Untagged"}</span>
                {photo.caption && <p style={{ color: "#fff", fontSize: 15, fontWeight: 500, marginBottom: 4, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{photo.caption}</p>}
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{photo.name}</p>
              </div>
              {/* Stats */}
              <div style={{ position: "absolute", bottom: 24, left: 16, zIndex: 2 }}>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>❤️ {likedCount} photo{likedCount !== 1 ? "s" : ""} liked</span>
              </div>
              {/* Touch zones */}
              <div style={{ position: "absolute", inset: 0, display: "flex", zIndex: 1 }}>
                {/* Left third - previous */}
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => {
                  if (reelIndex > 0) {
                    if (reelTimerRef.current) clearInterval(reelTimerRef.current);
                    setReelIndex(prev => prev - 1);
                    setReelPaused(false);
                  }
                }} />
                {/* Center third - pause/play */}
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setReelPaused(prev => !prev)} />
                {/* Right third - next */}
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => {
                  if (reelTimerRef.current) clearInterval(reelTimerRef.current);
                  if (reelIndex < uploadedPhotos.length - 1) {
                    setReelIndex(prev => prev + 1);
                    setReelPaused(false);
                  } else {
                    setReelPlaying(false);
                  }
                }} />
              </div>
            </div>
          </div>
        );
      })()}
      {showWelcome && screen === "home" && createdTrips.length === 0 && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9997, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.s, borderRadius: T.r, padding: 28, maxWidth: 340, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{"🌍"}</div>
            <h2 style={{ fontFamily: T.fontD, fontSize: 22, fontWeight: 400, marginBottom: 8 }}>Welcome to Wanderly</h2>
            <p style={{ fontSize: 13, color: T.t2, marginBottom: 20, lineHeight: 1.5 }}>Your AI travel concierge. Plan trips, invite friends, and create memories together.</p>
            <button onClick={() => { setShowWelcome(false); localStorage.setItem('wanderly_welcomed', 'true'); setScreen("create"); setWizStep(0); resetWizard(); }}
              style={{ ...css.btn, ...css.btnP, width: "100%", padding: "12px 16px", justifyContent: "center", fontSize: 14, fontWeight: 500, marginBottom: 10 }}>
              Create my first trip
            </button>
            <button onClick={() => { setShowWelcome(false); localStorage.setItem('wanderly_welcomed', 'true'); setShowDemo(true); setDemoSlide(0); }}
              style={{ ...css.btn, width: "100%", padding: "12px 16px", justifyContent: "center", fontSize: 13, color: T.t2 }}>
              Explore the demo first
            </button>
          </div>
        </div>
      )}
      {showDemo && (() => {
        const t = demoTick;
        const s = demoSlide;
        const total = 10;
        const isLast = s === total - 1;
        // Helper: typewriter text (reveals chars based on tick)
        const typeText = (text, startTick, speed = 2) => {
          const elapsed = Math.max(0, t - startTick);
          const chars = Math.min(text.length, Math.floor(elapsed / speed));
          return text.substring(0, chars) + (chars < text.length ? "│" : "");
        };
        // Helper: show element after tick
        const show = (afterTick) => t >= afterTick;
        // Helpers: return animation only during animation window, then stable static style to prevent flicker
        const popIn = (delay) => {
          if (t < delay) return { opacity: 0, transform: "scale(0)" };
          if (t < delay + 4) return { animation: "demoPop .6s cubic-bezier(.34,1.56,.64,1) forwards" };
          return { opacity: 1, transform: "scale(1)" };
        };
        const slideUp = (delay) => {
          if (t < delay) return { opacity: 0, transform: "translateY(16px)" };
          if (t < delay + 4) return { animation: "demoSlideUp .55s ease-out forwards" };
          return { opacity: 1, transform: "translateY(0)" };
        };
        const bounceIn = (delay) => {
          if (t < delay) return { opacity: 0, transform: "translateY(-16px)" };
          if (t < delay + 4) return { animation: "demoBounce .65s ease-out forwards" };
          return { opacity: 1, transform: "translateY(0)" };
        };
        // Typing indicator dots
        const TypingDots = () => (
          <div style={{ display: "flex", gap: 4, padding: "8px 12px", background: T.s2, borderRadius: 12, width: "fit-content" }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: 3, background: T.t3, animation: `demoPulse 1s ease ${i * .25}s infinite` }} />)}
          </div>
        );
        // Chat bubble component
        const ChatBubble = ({ text, isUser, delay, typing }) => {
          if (!show(delay)) return null;
          if (typing && t < delay + 8) return <div style={{ alignSelf: isUser ? "flex-end" : "flex-start", ...slideUp(delay) }}><TypingDots /></div>;
          return (
            <div style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: 14, fontSize: 12, lineHeight: 1.5, alignSelf: isUser ? "flex-end" : "flex-start",
              background: isUser ? T.a : T.s2, color: isUser ? "#fff" : T.t, ...slideUp(delay + (typing ? 8 : 0)) }}>
              {text}
            </div>
          );
        };

        // ─── SLIDE RENDERERS ───
        const renderSlide = () => {
          switch (s) {
            // ─── Slide 0: Narrative intro ───
            case 0: return (
              <div style={{ textAlign: "center", maxWidth: 340 }}>
                <div style={{ fontSize: 48, marginBottom: 16, ...popIn(2) }}>👨‍👩‍👧‍👦</div>
                <p style={{ fontFamily: T.fontD, fontSize: 22, color: "#fff", marginBottom: 8, ...slideUp(5) }}>
                  Meet the Johnsons
                </p>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,.7)", lineHeight: 1.6, ...slideUp(8) }}>
                  4 adults, 2 kids, 1 EV, and a dream Easter trip to the Lake District.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20, ...slideUp(14) }}>
                  {[["You", T.a], ["James", T.coral], ["Sarah", T.blue], ["+1", T.amber]].map(([n, c], i) => (
                    <div key={i} style={{ ...popIn(16 + i * 4) }}>
                      <div style={{ width: 44, height: 44, borderRadius: 22, background: c, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 600, margin: "0 auto 4px" }}>{n[0]}</div>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>{n}</span>
                    </div>
                  ))}
                </div>
                {show(32) && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
                    {[{e:"👦",n:"Max, 12"},{e:"👧",n:"Ella, 8"}].map((k, i) => (
                      <div key={i} style={{ padding: "6px 14px", borderRadius: 10, background: "rgba(255,255,255,.08)", ...popIn(34 + i * 5) }}>
                        <span style={{ fontSize: 16 }}>{k.e}</span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginLeft: 6 }}>{k.n}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );

            // ─── Slide 1: Trip creation with typing ───
            case 1: return (
              <div style={{ width: "100%", maxWidth: 320 }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 12, textAlign: "center", ...slideUp(0) }}>Step 1 · Name your trip</p>
                <div style={{ background: T.s, borderRadius: 14, padding: 16, textAlign: "left" }}>
                  <div style={{ background: T.s2, borderRadius: 8, padding: 12, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, color: T.t3 }}>Trip name</span>
                    <p style={{ fontSize: 14, fontWeight: 500, marginTop: 2, fontFamily: T.font, color: t < 3 ? T.t3 : T.t }}>{t < 3 ? "│" : typeText("Easter Lake District", 3, 2)}</p>
                  </div>
                  {show(45) && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 10, ...slideUp(45) }}>
                      <div style={{ flex: 1, background: T.s2, borderRadius: 8, padding: 10 }}>
                        <span style={{ fontSize: 10, color: T.t3 }}>Start</span>
                        <p style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>3 Apr 2026</p>
                      </div>
                      <div style={{ flex: 1, background: T.s2, borderRadius: 8, padding: 10 }}>
                        <span style={{ fontSize: 10, color: T.t3 }}>End</span>
                        <p style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>7 Apr 2026</p>
                      </div>
                    </div>
                  )}
                  {show(50) && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {["Windermere", "Ambleside", "Keswick", "Grasmere"].map((p, i) => (
                        show(52 + i * 3) && <span key={p} style={{ ...css.chip, ...css.chipActive, fontSize: 11, padding: "4px 10px", ...popIn(52 + i * 3) }}>{p}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );

            // ─── Slide 2: Stays slide in ───
            case 2: return (
              <div style={{ width: "100%", maxWidth: 320 }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 12, textAlign: "center", ...slideUp(0) }}>Step 2 · Where are you staying?</p>
                <div style={{ background: T.s, borderRadius: 14, padding: 16, textAlign: "left" }}>
                  {show(4) && (
                    <div style={{ background: T.s2, borderRadius: 8, padding: 10, marginBottom: 6, display: "flex", alignItems: "center", gap: 8, ...slideUp(4) }}>
                      <span style={{ fontSize: 16 }}>🔍</span>
                      <span style={{ fontSize: 12, color: T.t3 }}>{typeText("Windermere hotels...", 6, 1.5)}</span>
                    </div>
                  )}
                  {[
                    { name: "Windermere Boutique Hotel", dates: "3-5 Apr", type: "Hotel", tags: ["2 rooms", "Breakfast", "EV charger"], delay: 14 },
                    { name: "Keswick Lakeside Cottage", dates: "5-7 Apr", type: "Cottage", tags: ["3 beds", "Garden", "Dog friendly"], delay: 20 },
                  ].map((stay, i) => (
                    show(stay.delay) && <div key={i} style={{ background: T.s2, borderRadius: 8, padding: 12, marginBottom: 6, ...slideUp(stay.delay) }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{stay.name}</span>
                        <span style={{ fontSize: 9, color: T.amber, background: T.amberL, padding: "2px 8px", borderRadius: 8 }}>{stay.type}</span>
                      </div>
                      <span style={{ fontSize: 10, color: T.t3 }}>{stay.dates}</span>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                        {stay.tags.map((tag, j) => show(stay.delay + 3 + j * 2) && <span key={tag} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 8, background: T.al, color: T.ad, ...popIn(stay.delay + 3 + j * 2) }}>{tag}</span>)}
                      </div>
                    </div>
                  ))}
                  {show(28) && <div style={{ textAlign: "center", marginTop: 4, ...popIn(28) }}><span style={{ fontSize: 10, color: T.ad }}>✓ 2 stays added</span></div>}
                </div>
              </div>
            );

            // ─── Slide 3: Day 1 chat conversation ───
            case 3: return (
              <div style={{ width: "100%", maxWidth: 320 }}>
                <div style={{ background: T.ad, borderRadius: "14px 14px 0 0", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>Chat with AI</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.15)", padding: "2px 8px", borderRadius: 8 }}>Day 1 · 3 Apr</span>
                </div>
                <div style={{ background: T.s, borderRadius: "0 0 14px 14px", padding: 12, display: "flex", flexDirection: "column", gap: 8, minHeight: 240 }}>
                  <ChatBubble delay={2} typing text={<span>🔋 <b>Travel day — heading to Windermere!</b><br/><br/><b>From:</b> Manchester<br/><b>To:</b> Windermere Boutique Hotel<br/><b>Mode:</b> EV vehicle<br/><br/>Anyone to pick up along the way?</span>} />
                  <ChatBubble delay={16} isUser text="No, heading straight there" />
                  <ChatBubble delay={20} typing text="Great! What time would you like to leave?" />
                  {show(30) && (
                    <div style={{ display: "flex", gap: 6, ...slideUp(30) }}>
                      {["8:00 AM", "9:00 AM", "10:00 AM"].map((time, i) => (
                        <span key={time} style={{ ...css.chip, fontSize: 10, padding: "5px 12px",
                          ...(demoInteracted.time === time ? css.chipActive : (i === 0 && !demoInteracted.time) ? {} : {}),
                          cursor: "pointer", ...popIn(32 + i * 2) }}
                          onClick={e => { e.stopPropagation(); setDemoInteracted(p => ({...p, time})); setDemoPaused(true); setTimeout(() => setDemoPaused(false), 1500); }}>
                          {time}
                        </span>
                      ))}
                    </div>
                  )}
                  {(demoInteracted.time || show(40)) && (
                    <ChatBubble delay={demoInteracted.time ? 0 : 40} typing text={
                      <span>🗺️ <b>Your route is ready!</b><br/>Manchester → M6 → A591<br/>⚡ EV stop: Lancaster Services (50kW)<br/>⏱️ ~1.5 hrs with breaks<br/>📍 Arrive ~{demoInteracted.time === "9:00 AM" ? "10:30 AM" : demoInteracted.time === "10:00 AM" ? "11:30 AM" : "9:30 AM"}</span>
                    } />
                  )}
                </div>
              </div>
            );

            // ─── Slide 4: Activity day with animated schedule ───
            case 4: return (
              <div style={{ width: "100%", maxWidth: 320 }}>
                <div style={{ background: T.ad, borderRadius: "14px 14px 0 0", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>Chat with AI</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.15)", padding: "2px 8px", borderRadius: 8 }}>Day 2 · 4 Apr</span>
                </div>
                <div style={{ background: T.s, borderRadius: "0 0 14px 14px", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <ChatBubble delay={2} typing text={<span>Good morning! Day 2 in <b>Ambleside</b> · 12°C ☁️</span>} />
                  {show(12) && (
                    <div style={{ background: T.amberL, borderRadius: 8, padding: "6px 10px", fontSize: 11, ...slideUp(12) }}>
                      🏨 Your base: <b>Windermere Boutique Hotel</b>
                    </div>
                  )}
                  {show(16) && (
                    <div style={{ display: "flex", gap: 6, ...slideUp(16) }}>
                      <div style={{ flex: 1, background: T.blueL, borderRadius: 8, padding: 8, ...slideUp(16) }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: T.blue, marginBottom: 4 }}>Adults</p>
                        {["🥾 Loughrigg Fell", "💆 Low Wood Spa"].map((a, i) => show(20 + i * 4) && <p key={i} style={{ fontSize: 10, marginBottom: 2, ...slideUp(20 + i * 4) }}>{a}</p>)}
                      </div>
                      <div style={{ flex: 1, background: T.pinkL, borderRadius: 8, padding: 8, ...slideUp(18) }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: T.pink, marginBottom: 4 }}>Kids</p>
                        {["🎢 Brockhole Park", "🥚 Easter egg trail"].map((a, i) => show(22 + i * 4) && <p key={i} style={{ fontSize: 10, marginBottom: 2, ...slideUp(22 + i * 4) }}>{a}</p>)}
                      </div>
                    </div>
                  )}
                  {show(32) && (
                    <div style={{ fontSize: 11, color: T.ad, textAlign: "center", padding: 6, background: T.al, borderRadius: 8, ...popIn(32) }}>
                      🍽️ Everyone meets at <b>Fellinis</b> for lunch — 12:30 PM
                    </div>
                  )}
                </div>
              </div>
            );

            // ─── Slide 5: Last day departure ───
            case 5: return (
              <div style={{ width: "100%", maxWidth: 320 }}>
                <div style={{ background: T.ad, borderRadius: "14px 14px 0 0", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>Chat with AI</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.15)", padding: "2px 8px", borderRadius: 8 }}>Day 5 · 7 Apr</span>
                </div>
                <div style={{ background: T.s, borderRadius: "0 0 14px 14px", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <ChatBubble delay={2} typing text={<span>🏠 <b>Time to head home!</b><br/><br/><b>From:</b> Keswick Lakeside Cottage<br/><b>To:</b> Manchester<br/><br/>When do you want to set off?</span>} />
                  {show(18) && (
                    <div style={{ display: "flex", gap: 6, ...slideUp(18) }}>
                      {["10:00 AM", "After lunch"].map((opt, i) => (
                        <span key={opt} style={{ ...css.chip, fontSize: 10, padding: "5px 12px", cursor: "pointer", ...popIn(20 + i * 3),
                          ...(demoInteracted.depart === opt ? css.chipActive : {}) }}
                          onClick={e => { e.stopPropagation(); setDemoInteracted(p => ({...p, depart: opt})); setDemoPaused(true); setTimeout(() => setDemoPaused(false), 1500); }}>
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}
                  {(demoInteracted.depart || show(30)) && (
                    <ChatBubble delay={demoInteracted.depart ? 0 : 30} typing text={
                      <span>🗺️ <b>Route planned!</b><br/>Keswick → A66 → M6 → Manchester<br/>⚡ EV: Tebay Services<br/>☕ Stop: Rheged Centre (playground!)<br/>📍 Home by ~{demoInteracted.depart === "After lunch" ? "5:00 PM" : "1:30 PM"}</span>
                    } />
                  )}
                </div>
              </div>
            );

            // ─── Slide 6: Interactive poll ───
            case 6: {
              const pollVote = demoInteracted.poll;
              const opts = [
                { text: "The Drunken Duck", desc: "steaks · kids free", base: 2 },
                { text: "The Unicorn", desc: "pub grills · playground", base: 1 },
                { text: "Lake Road Kitchen", desc: "Nordic · upscale", base: 1 },
              ];
              const totalVotes = 4 + (pollVote !== undefined ? 1 : 0);
              const getVotes = (i) => {
                let v = opts[i].base;
                if (pollVote === i) v++;
                return v;
              };
              return (
                <div style={{ width: "100%", maxWidth: 320 }}>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 12, textAlign: "center", ...slideUp(0) }}>Group decision time</p>
                  <div style={{ background: T.s, borderRadius: 14, padding: 16, textAlign: "left" }}>
                    <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, ...slideUp(3) }}>🗳️ Where should we eat dinner?</p>
                    <p style={{ fontSize: 10, color: T.t3, marginBottom: 12, ...slideUp(5) }}>4 travellers · {pollVote !== undefined ? "You voted!" : "Tap to vote"}</p>
                    {opts.map((o, i) => {
                      const pct = Math.round(getVotes(i) / totalVotes * 100);
                      const voted = pollVote === i;
                      return show(8 + i * 4) && (
                        <div key={i} style={{ marginBottom: 8, position: "relative", borderRadius: 10, overflow: "hidden",
                          border: `1.5px solid ${voted ? T.a : T.border}`, cursor: pollVote === undefined ? "pointer" : "default", ...slideUp(8 + i * 4) }}
                          onClick={e => { if (pollVote !== undefined) return; e.stopPropagation(); setDemoInteracted(p => ({...p, poll: i})); setDemoPaused(true); setTimeout(() => setDemoPaused(false), 2000); }}>
                          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pollVote !== undefined ? `${pct}%` : "0%",
                            background: voted ? T.al : T.s2, transition: "width 1s ease" }} />
                          <div style={{ position: "relative", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <span style={{ fontSize: 12, fontWeight: voted ? 600 : 400 }}>{voted ? "✓ " : ""}{o.text}</span>
                              <span style={{ fontSize: 10, color: T.t3, marginLeft: 6 }}>{o.desc}</span>
                            </div>
                            {pollVote !== undefined && <span style={{ fontSize: 12, fontWeight: 600, color: voted ? T.ad : T.t3 }}>{pct}%</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // ─── Slide 7: Photos flying in ───
            case 7: {
              const photos = [
                { label: "Fell view", color: "#5A8C6E" }, { label: "Lake", color: "#5A7EA0" },
                { label: "Lunch", color: "#A08060" }, { label: "Ella playing", color: "#7EA060" },
                { label: "Boat trip", color: "#4A8BA0" }, { label: "Ice cream", color: "#A04A8B" },
                { label: "Pub dinner", color: "#8A7348" }, { label: "Sunset", color: "#C87040" },
              ];
              return (
                <div style={{ width: "100%", maxWidth: 320 }}>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 12, textAlign: "center", ...slideUp(0) }}>Day 2 memories · Ambleside</p>
                  <div style={{ background: T.s, borderRadius: 14, padding: 14, textAlign: "left" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5 }}>
                      {photos.map((p, i) => (
                        <div key={i} style={{ aspectRatio: "1", borderRadius: 8, background: show(4 + i * 3) ? p.color : T.s2,
                          display: "flex", alignItems: "flex-end", padding: 4, transition: "background .5s ease",
                          ...(show(4 + i * 3) ? bounceIn(4 + i * 3) : { opacity: .2 }) }}>
                          {show(4 + i * 3) && <span style={{ fontSize: 8, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,.5)" }}>{p.label}</span>}
                        </div>
                      ))}
                    </div>
                    {show(30) && (
                      <div style={{ textAlign: "center", marginTop: 10, ...popIn(30) }}>
                        <span style={{ fontSize: 11, color: T.ad }}>📸 {Math.min(8, Math.max(0, Math.floor((t - 4) / 3)))} photos added</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // ─── Slide 8: AI highlights reel ───
            case 8: {
              const reelPhotos = ["#5A8C6E", "#5A7EA0", "#A08060", "#4A8BA0", "#C87040"];
              const activeReel = Math.min(reelPhotos.length - 1, Math.floor(t / 7));
              return (
                <div style={{ width: "100%", maxWidth: 320 }}>
                  <div style={{ background: "#1a1a1a", borderRadius: 14, padding: 16, textAlign: "center", color: "#fff", overflow: "hidden" }}>
                    <div style={{ display: "flex", gap: 3, marginBottom: 14 }}>
                      {reelPhotos.map((_, i) => (
                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,.15)", overflow: "hidden" }}>
                          <div style={{ height: "100%", background: T.a, width: i < activeReel ? "100%" : i === activeReel ? `${(t % 7) / 7 * 100}%` : "0%", transition: "width .12s linear" }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ width: "100%", aspectRatio: "16/10", borderRadius: 8, background: reelPhotos[activeReel], marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .5s ease", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", bottom: 8, left: 10, fontSize: 10, color: "rgba(255,255,255,.7)" }}>
                        {["Loughrigg Fell", "Windermere Lake", "Lunch at Fellinis", "Boat trip", "Sunset"][activeReel]}
                      </div>
                      <div style={{ position: "absolute", top: 8, right: 10, fontSize: 9, color: "rgba(255,255,255,.5)", background: "rgba(0,0,0,.3)", padding: "2px 6px", borderRadius: 4 }}>
                        Day {[2,2,2,3,4][activeReel]}
                      </div>
                    </div>
                    <p style={{ fontFamily: T.fontD, fontSize: 16, marginBottom: 4, ...slideUp(2) }}>Easter Lake District 2026</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,.5)", marginBottom: 10 }}>AI-curated highlights · 8 photos</p>
                    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                      {["🎵 Music", "🎙️ Narration", "📅 Dates"].map((s, i) => (
                        <span key={s} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 8, background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.6)", ...popIn(4 + i * 3) }}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            // ─── Slide 9: CTA ───
            case 9: return (
              <div style={{ textAlign: "center", maxWidth: 340 }}>
                <div style={{ fontSize: 56, marginBottom: 16, ...popIn(2) }}>🌍</div>
                <h2 style={{ fontFamily: T.fontD, fontSize: 26, color: "#fff", marginBottom: 8, ...slideUp(5) }}>Your adventure awaits</h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.6, marginBottom: 24, ...slideUp(8) }}>
                  Wanderly connects maps, weather, bookings, EV chargers, and AI — so you can focus on making memories.
                </p>
                {show(14) && (
                  <button onClick={e => { e.stopPropagation(); setShowDemo(false); setScreen("create"); setWizStep(0); resetWizard(); }}
                    style={{ ...css.btn, ...css.btnP, width: "100%", padding: "14px 16px", justifyContent: "center", fontSize: 15, fontWeight: 500, marginBottom: 10, ...slideUp(14) }}>
                    Create my first trip
                  </button>
                )}
                {show(18) && (
                  <button onClick={e => { e.stopPropagation(); setShowDemo(false); }}
                    style={{ ...css.btn, width: "100%", padding: "12px 16px", justifyContent: "center", fontSize: 13, color: "rgba(255,255,255,.5)", border: "1px solid rgba(255,255,255,.15)", ...slideUp(18) }}>
                    Explore the demo trip
                  </button>
                )}
              </div>
            );

            default: return null;
          }
        };

        // Narrative captions per slide
        const captions = [
          "This is their story...",
          "First, name the trip and pick destinations",
          "Then find the perfect places to stay",
          "Day 1 — the AI plans the whole drive",
          "Activity days — split plans for everyone",
          "Last day — route home with pit stops",
          "Big decisions? Let the group vote",
          "Every moment, captured and catalogued",
          "The AI turns your photos into a highlight reel",
          "",
        ];

        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "linear-gradient(180deg, #0D2818 0%, #1A3C2A 50%, #0D2818 100%)", display: "flex", flexDirection: "column", fontFamily: T.font, overflow: "hidden" }}
            onClick={e => {
              if (isLast) return;
              const x = e.clientX;
              const w = window.innerWidth;
              if (x < w * 0.25) { setDemoSlide(Math.max(0, s - 1)); }
              else if (x > w * 0.75) { setDemoSlide(Math.min(total - 1, s + 1)); }
            }}>
            {/* Progress bar */}
            <div style={{ display: "flex", gap: 3, padding: "12px 16px 0", flexShrink: 0 }}>
              {Array.from({length: total}).map((_, i) => {
                const dur = DEMO_SLIDE_DURATIONS[i] || 50;
                return (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,.15)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, background: i < s ? "rgba(255,255,255,.8)" : i === s ? T.a : "transparent",
                      width: i < s ? "100%" : i === s ? `${Math.min(100, (t / dur) * 100)}%` : "0%", transition: i === s ? "width .12s linear" : "none" }} />
                  </div>
                );
              })}
            </div>
            {/* Top bar: Skip + pause */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px 0", flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{s + 1} / {total}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={e => { e.stopPropagation(); setDemoPaused(p => !p); }}
                  style={{ background: "rgba(255,255,255,.1)", border: "none", color: "rgba(255,255,255,.7)", fontSize: 11, padding: "4px 12px", borderRadius: 12, cursor: "pointer", fontFamily: T.font }}>
                  {demoPaused ? "▶ Play" : "❚❚ Pause"}
                </button>
                <button onClick={e => { e.stopPropagation(); setShowDemo(false); setDemoPaused(false); setDemoInteracted({}); }}
                  style={{ background: "rgba(255,255,255,.1)", border: "none", color: "rgba(255,255,255,.7)", fontSize: 11, padding: "4px 12px", borderRadius: 12, cursor: "pointer", fontFamily: T.font }}>
                  Skip
                </button>
              </div>
            </div>
            {/* Slide content */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", overflow: "hidden" }} key={`slide-${s}`}>
              {renderSlide()}
            </div>
            {/* Bottom caption */}
            {captions[s] && (
              <div style={{ textAlign: "center", padding: "12px 24px 24px", flexShrink: 0 }}>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", fontStyle: "italic" }}>{captions[s]}</p>
              </div>
            )}
          </div>
        );
      })()}
      {toast && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 9998, padding: "10px 20px", borderRadius: 20, background: toast.type === "error" ? T.red : T.ad, color: "#fff", fontSize: 13, fontFamily: T.font, boxShadow: "0 4px 12px rgba(0,0,0,.15)", animation: "reelFadeIn .3s ease" }}>
          {toast.type === "success" ? "✓ " : "⚠ "}{toast.message}
        </div>
      )}
      {viewingPhoto && (() => {
        const photo = viewingPhoto;
        return (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", flexDirection: "column", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px" }}>
              <button onClick={() => setViewingPhoto(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 16px", gap: 12 }}>
              <img src={photo.url} alt={photo.name} style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: T.rs }} />
              <div style={{ width: "100%", maxWidth: 400 }}>
                <p style={{ color: "#fff", fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{photo.name}</p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginBottom: 10 }}>Uploaded {photo.uploadDate || "—"}</p>
                <input
                  type="text"
                  value={photo.caption || ""}
                  placeholder="Add a caption..."
                  onChange={(e) => {
                    const val = e.target.value;
                    setUploadedPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, caption: val } : p));
                    setViewingPhoto(prev => ({ ...prev, caption: val }));
                  }}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: T.rs, border: `.5px solid rgba(255,255,255,0.2)`, background: "rgba(255,255,255,0.1)", color: "#fff", fontFamily: T.font, fontSize: 13, outline: "none", marginBottom: 10 }}
                />
                <div style={{ marginBottom: 12 }}>
                  <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, display: "block", marginBottom: 4 }}>Assign to day</label>
                  <select
                    value={photo.day || "Untagged"}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUploadedPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, day: val } : p));
                      setViewingPhoto(prev => ({ ...prev, day: val }));
                    }}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: T.rs, border: `.5px solid rgba(255,255,255,0.2)`, background: "rgba(255,255,255,0.15)", color: "#fff", fontFamily: T.font, fontSize: 13, outline: "none" }}
                  >
                    <option value="Untagged" style={{ color: "#000" }}>Untagged</option>
                    <option value="Day 1" style={{ color: "#000" }}>Day 1</option>
                    <option value="Day 2" style={{ color: "#000" }}>Day 2</option>
                    <option value="Day 3" style={{ color: "#000" }}>Day 3</option>
                    <option value="Day 4" style={{ color: "#000" }}>Day 4</option>
                    <option value="Day 5" style={{ color: "#000" }}>Day 5</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button
                    onClick={() => {
                      setUploadedPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, liked: !p.liked } : p));
                      setViewingPhoto(prev => ({ ...prev, liked: !prev.liked }));
                    }}
                    style={{ ...css.btn, background: photo.liked ? T.redL : "rgba(255,255,255,0.1)", color: photo.liked ? T.red : "#fff", borderColor: photo.liked ? T.red : "rgba(255,255,255,0.2)" }}
                  >
                    {photo.liked ? "\u2764\uFE0F Liked" : "\uD83E\uDD0D Like"}
                  </button>
                  <button
                    onClick={() => {
                      setUploadedPhotos(prev => prev.filter(p => p.id !== photo.id));
                      setViewingPhoto(null);
                    }}
                    style={{ ...css.btn, background: "rgba(217,62,62,0.15)", color: T.red, borderColor: T.red }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
