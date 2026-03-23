import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from '@supabase/supabase-js';

// ─── Supabase Client ───
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
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
  btn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: T.rs, border: `.5px solid ${T.border}`, background: T.s, fontFamily: T.font, fontSize: 13, cursor: "pointer", color: T.t1, transition: "all .15s", fontWeight: 500, outline: "none", minHeight: 44 },
  btnP: { background: T.a, color: "#fff", borderColor: T.ad },
  btnSm: { padding: "6px 14px", fontSize: 12, minHeight: 36 },
  chip: { padding: "8px 16px", borderRadius: 24, fontSize: 12, border: `.5px solid ${T.border}`, background: T.s, cursor: "pointer", transition: "all .15s", userSelect: "none", fontFamily: T.font, minHeight: 40 },
  chipActive: { background: T.al, borderColor: T.a, color: T.ad },
  card: { background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.r, padding: 16, marginBottom: 8, boxShadow: T.shadow, transition: "all .2s" },
  tag: (bg, color) => ({ display: "inline-block", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 500, background: bg, color, marginRight: 4, marginBottom: 4 }),
  avatar: (bg, size = 32) => ({ width: size, height: size, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.37, fontWeight: 500, color: "#fff", background: bg, flexShrink: 0 }),
  sectionTitle: { fontSize: 12, fontWeight: 600, color: T.t3, margin: "24px 0 8px", textTransform: "uppercase", letterSpacing: 0.8 },
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

const Collapsible = ({ title, icon, defaultOpen = false, sectionKey, expandedSections, setExpandedSections, count, children }) => {
  const isOpen = expandedSections[sectionKey] !== undefined ? expandedSections[sectionKey] : defaultOpen;
  const toggle = () => setExpandedSections(prev => ({ ...prev, [sectionKey]: !isOpen }));
  return (
    <div style={{ marginTop: 16 }}>
      <div className="w-expand" onClick={toggle} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderRadius: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
          <span style={{ fontSize: 12, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: 0.8 }}>{title}</span>
          {count !== undefined && <span style={{ fontSize: 10, color: T.t3, background: T.s2, padding: "2px 8px", borderRadius: 12 }}>{count}</span>}
        </div>
        <span style={{ fontSize: 12, color: T.t3, transition: "transform .2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
      </div>
      <div style={{ maxHeight: isOpen ? 1000 : 0, overflow: "hidden", transition: "max-height .3s ease" }}>
        {children}
      </div>
    </div>
  );
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
  if (/edinburgh|glasgow|inverness|aberdeen|isle of skye|skye|highlands|loch ness|stirling|dundee|fort william|oban|st andrews/.test(all)) return "scotland";
  if (/london|manchester|birmingham|liverpool|bristol|oxford|cambridge|york|bath|brighton|cornwall|lake district|cotswolds|leeds|newcastle|nottingham|sheffield/.test(all)) return "england";
  return "uk";
}

// ─── Travel Time Estimates (driving hours between common UK/EU city pairs) ───
const TRAVEL_TIMES = {
  // UK driving times (hours) — keys are "from|to" lowercase, sorted alphabetically
  "london|edinburgh": 7, "london|manchester": 4, "london|birmingham": 2.5, "london|glasgow": 7,
  "london|liverpool": 4.5, "london|bristol": 2, "london|york": 3.5, "london|bath": 2.5,
  "london|oxford": 1.5, "london|cambridge": 1.5, "london|brighton": 1.5, "london|cornwall": 5,
  "london|lake district": 5, "london|inverness": 9, "london|isle of skye": 10.5,
  "manchester|edinburgh": 3.5, "manchester|glasgow": 3.5, "manchester|liverpool": 1,
  "manchester|birmingham": 1.5, "manchester|lake district": 1.5, "manchester|york": 1.5,
  "manchester|inverness": 6.5, "manchester|isle of skye": 8,
  "edinburgh|glasgow": 1, "edinburgh|inverness": 3, "edinburgh|isle of skye": 5,
  "edinburgh|aberdeen": 2.5, "edinburgh|st andrews": 1.5, "edinburgh|stirling": 1,
  "edinburgh|fort william": 3, "edinburgh|oban": 3, "edinburgh|dundee": 1.5,
  "edinburgh|loch ness": 3.5, "edinburgh|york": 4, "edinburgh|lake district": 3,
  "glasgow|inverness": 3.5, "glasgow|isle of skye": 5, "glasgow|oban": 2.5,
  "glasgow|fort william": 2.5, "glasgow|aberdeen": 2.5, "glasgow|stirling": 0.75,
  "inverness|isle of skye": 2.5, "inverness|fort william": 1.5, "inverness|loch ness": 0.5,
  "inverness|aberdeen": 2.5, "inverness|oban": 3,
  "birmingham|manchester": 1.5, "birmingham|bristol": 1.5, "birmingham|liverpool": 1.5,
  "birmingham|york": 2.5, "birmingham|oxford": 1, "birmingham|cambridge": 2,
  "liverpool|manchester": 1, "liverpool|lake district": 1.5, "liverpool|york": 2,
  "bristol|bath": 0.25, "bristol|cornwall": 3, "bristol|oxford": 1.5,
  "york|lake district": 2, "york|newcastle": 1.5, "york|leeds": 0.75,
  // EU common routes
  "paris|lyon": 4.5, "paris|nice": 8, "paris|marseille": 7.5, "paris|bordeaux": 6,
  "rome|florence": 3, "rome|naples": 2.5, "rome|venice": 5, "rome|milan": 5.5,
  "florence|venice": 2.5, "florence|milan": 3, "florence|pisa": 1.5,
  "barcelona|madrid": 6, "barcelona|valencia": 3.5, "barcelona|seville": 10,
  "madrid|seville": 5.5, "madrid|valencia": 3.5,
  "amsterdam|brussels": 2, "amsterdam|paris": 5, "amsterdam|berlin": 6.5,
  "berlin|munich": 6, "berlin|hamburg": 3, "berlin|prague": 3.5,
  "munich|vienna": 4, "munich|zurich": 3.5, "munich|salzburg": 1.5,
  "zurich|geneva": 3, "zurich|milan": 3.5,
};

function estimateTravelHours(from, to) {
  if (!from || !to) return 2;
  const a = from.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  const b = to.toLowerCase().replace(/[^a-z\s]/g, "").trim();
  if (a === b) return 0;
  // Try direct lookup both ways
  const key1 = `${a}|${b}`, key2 = `${b}|${a}`;
  if (TRAVEL_TIMES[key1]) return TRAVEL_TIMES[key1];
  if (TRAVEL_TIMES[key2]) return TRAVEL_TIMES[key2];
  // Try partial match (e.g. "AL7 3FD" won't match, but "london" in key might)
  for (const [k, v] of Object.entries(TRAVEL_TIMES)) {
    const [ka, kb] = k.split("|");
    if ((a.includes(ka) || ka.includes(a)) && (b.includes(kb) || kb.includes(b))) return v;
    if ((a.includes(kb) || kb.includes(a)) && (b.includes(ka) || ka.includes(b))) return v;
  }
  // Fallback: estimate from UK postcode → assume southern/central England, rough distances
  const isPostcode = /^[a-z]{1,2}\d/.test(a) || /^[a-z]{1,2}\d/.test(b);
  if (isPostcode) {
    // Check if destination is in Scotland/North
    const scottish = /edinburgh|glasgow|inverness|aberdeen|dundee|stirling|fort william|oban|isle of skye|skye|loch ness|highlands|st andrews/;
    const northern = /manchester|liverpool|leeds|york|newcastle|lake district|sheffield/;
    const midlands = /birmingham|nottingham|leicester|coventry/;
    const dest = scottish.test(b) ? 7 : northern.test(b) ? 4 : midlands.test(b) ? 2.5 : scottish.test(a) ? 7 : northern.test(a) ? 4 : midlands.test(a) ? 2.5 : 3;
    return dest;
  }
  return 3; // generic fallback
}

// ─── Location-specific activity pools ───
const LOCATION_ACTIVITIES = {
  edinburgh: { morning: ["Royal Mile walking tour", "Edinburgh Castle visit", "Arthur's Seat hike", "Holyrood Palace tour", "Scottish National Museum"], afternoon: ["Grassmarket & Victoria St stroll", "Calton Hill viewpoint", "Dean Village walk", "Camera Obscura", "Princes Street Gardens"], dinner: ["Haggis & whisky tasting at The Witchery", "Scottish seafood at Ondine", "Gastropub on Royal Mile", "Fine dining on George Street", "Cosy pub with live folk music"], kids: ["Edinburgh Zoo — pandas & penguins", "Dynamic Earth — interactive science", "Camera Obscura & World of Illusions", "Royal Mile treasure hunt", "Princes Street Gardens playground"] },
  glasgow: { morning: ["Kelvingrove Art Gallery", "Glasgow Cathedral visit", "Riverside Museum", "George Square walking tour", "Buchanan Street shopping"], afternoon: ["West End & Ashton Lane", "Botanic Gardens", "Street art tour", "The Necropolis walk", "Science Centre"], dinner: ["Italian on Byres Road", "Merchant City gastropub", "Finnieston seafood restaurant", "Curry Mile on Gibson Street", "Rooftop bar & dinner"], kids: ["Glasgow Science Centre — hands-on exhibits", "Riverside Museum — ship & transport play", "Kelvingrove Museum dinosaur gallery", "Botanic Gardens & Kibble Palace", "Victoria Park splash play"] },
  inverness: { morning: ["Loch Ness boat cruise", "Urquhart Castle ruins", "Culloden Battlefield visit", "Inverness Castle viewpoint", "Ness Islands walk"], afternoon: ["Dolphin watching at Chanonry Point", "Cawdor Castle & gardens", "Highland wildlife safari", "Clava Cairns ancient site", "Victorian Market browsing"], dinner: ["Scottish seafood on the riverside", "Highland game restaurant", "Traditional inn with real ales", "Whisky tasting dinner", "Farm-to-table bistro"], kids: ["Loch Ness Exhibition Centre", "Highland Wildlife Park — wolves & polar bears", "Nairn beach & East Beach playground", "Ness Islands wobbly bridges walk", "Chanonry Point dolphin spotting"] },
  "isle of skye": { morning: ["Old Man of Storr hike", "Fairy Pools walk", "Dunvegan Castle visit", "Quiraing ridge walk", "Neist Point lighthouse"], afternoon: ["Talisker Distillery tour", "Fairy Glen exploration", "Portree harbour & coloured houses", "Dinosaur footprints at An Corran", "Sligachan Bridge & Cuillin views"], dinner: ["Fresh seafood at Scorrybreac, Portree", "Oyster shed at Carbost", "Highland venison at Dulse & Brose", "Cosy B&B supper", "Fish & chips at The Chippy, Portree"], kids: ["Dinosaur footprints at An Corran beach", "Fairy Glen magical landscape walk", "Fairy Pools paddling & rock hopping", "Portree harbour coloured houses walk", "Wildlife spotting — eagles & seals"] },
  "loch ness": { morning: ["Loch Ness boat cruise", "Urquhart Castle visit", "Great Glen Way walk", "Drumnadrochit exhibition"], afternoon: ["Falls of Foyers walk", "Fort Augustus locks & canal", "Loch Ness Centre visit", "South Loch Ness trail"], dinner: ["Lochside pub dinner", "Scottish lamb at local inn", "Whisky & haggis evening", "Cosy Highland restaurant"], kids: ["Loch Ness Centre — Nessie exhibition", "Fort Augustus canal locks exploration", "Urquhart Castle ruins adventure", "Falls of Foyers short walk"] },
  london: { morning: ["Tower of London visit", "British Museum tour", "Buckingham Palace & St James's Park", "Borough Market food tour", "Westminster walking tour"], afternoon: ["South Bank & Tate Modern", "Camden Market & Regent's Canal", "Covent Garden & West End", "Hyde Park & Kensington Gardens", "Greenwich & Cutty Sark"], dinner: ["Soho restaurant district", "Brick Lane curry house", "Rooftop dining with city views", "Thames-side gastropub", "Chinatown feast"], kids: ["Natural History Museum — dinosaurs", "Science Museum — interactive galleries", "London Zoo in Regent's Park", "Diana Memorial Playground, Kensington", "HMS Belfast & Tower Bridge"] },
  manchester: { morning: ["Manchester Art Gallery", "John Rylands Library", "Northern Quarter walk", "Science & Industry Museum", "Old Trafford tour"], afternoon: ["Canal Street & Gay Village", "Chetham's Library", "Ancoats coffee & street art", "Piccadilly Gardens & shopping", "Media City & The Lowry"], dinner: ["Curry Mile on Wilmslow Road", "Northern Quarter craft beer & pizza", "Spinningfields fine dining", "Traditional pub supper", "Deansgate bar & grill"], kids: ["Science & Industry Museum — hands-on", "LEGOLAND Discovery Centre", "Chill Factore — indoor snow slope", "Old Trafford stadium tour", "Heaton Park playground & tram museum"] },
  york: { morning: ["York Minster visit", "Shambles walking tour", "Clifford's Tower", "JORVIK Viking Centre", "City walls walk"], afternoon: ["Betty's Tea Room", "National Railway Museum", "York Chocolate Story", "Merchant Adventurers' Hall", "River Ouse boat cruise"], dinner: ["Medieval banquet experience", "Riverside gastropub", "Yorkshire pudding wrap", "Fine dining on Fossgate", "Traditional ale house"], kids: ["JORVIK Viking Centre — interactive", "National Railway Museum — trains", "York Chocolate Story — make your own", "York Dungeon — spooky history", "Rowntree Park adventure playground"] },
  bath: { morning: ["Roman Baths visit", "Royal Crescent & Circus walk", "Thermae Bath Spa", "Bath Abbey tour", "Pulteney Bridge & weir"], afternoon: ["Prior Park landscape garden", "Jane Austen Centre", "Bath Skyline walk", "Artisan market browsing", "Assembly Rooms & Fashion Museum"], dinner: ["Georgian-era restaurant", "Bath ale house", "Sally Lunn's historic eating house", "Fine dining on Milsom Street", "Canal-side pub"], kids: ["Roman Baths — audio trail for kids", "Victoria Park adventure playground", "Bath Skyline easy loop walk", "Alice Park paddling pool", "Bath Boating Station rowing"] },
  "lake district": { morning: ["Windermere boat cruise", "Helvellyn summit hike", "Castlerigg Stone Circle", "Beatrix Potter's Hill Top", "Aira Force waterfall walk"], afternoon: ["Grasmere gingerbread & Wordsworth's Dove Cottage", "Keswick pencil museum", "Ambleside village stroll", "Tarn Hows circular walk", "Honister Slate Mine"], dinner: ["Lakeside inn with fell views", "Cumberland sausage pub dinner", "Ambleside gastropub", "Farm-to-fork restaurant", "Cosy fireside supper"], kids: ["Windermere boat cruise & islands", "Beatrix Potter World, Bowness", "Brockhole adventure playground & zip wire", "Wray Castle — National Trust explorer trail", "Keswick pencil museum & craft workshop"] },
  cornwall: { morning: ["St Ives beaches & galleries", "Eden Project visit", "Tintagel Castle ruins", "Land's End walk", "Minack Theatre cliffside"], afternoon: ["Padstow harbour & Rick Stein's", "Coastal path walk", "Falmouth maritime museum", "St Michael's Mount", "Cream tea at a harbour café"], dinner: ["Cornish pasty & seafood", "Fish & chips by the harbour", "Seafood restaurant Padstow", "Pub with sea views", "Cream tea & supper"], kids: ["Eden Project — rainforest biome", "Flambards theme park", "Newquay Zoo", "Rock pool exploring at low tide", "Lappa Valley steam railway"] },
  paris: { morning: ["Eiffel Tower & Champ de Mars", "Louvre Museum visit", "Montmartre & Sacré-Cœur", "Notre-Dame & Île de la Cité", "Musée d'Orsay"], afternoon: ["Seine river cruise", "Le Marais walk", "Luxembourg Gardens", "Champs-Élysées & Arc de Triomphe", "Saint-Germain-des-Prés cafés"], dinner: ["Bistro in Le Marais", "Michelin-starred tasting menu", "Crêperie in Montparnasse", "Wine bar & charcuterie", "Brasserie on Boulevard Saint-Germain"], kids: ["Jardin du Luxembourg puppet show & boats", "Cité des Sciences — interactive museum", "Disneyland Paris (day trip)", "Seine river cruise — open-top boat", "Jardin d'Acclimatation fun park"] },
  rome: { morning: ["Colosseum & Roman Forum", "Vatican Museums & Sistine Chapel", "Trevi Fountain & Pantheon", "Spanish Steps walking tour", "Borghese Gallery"], afternoon: ["Trastevere neighbourhood walk", "Villa Borghese gardens", "Appian Way & catacombs", "Piazza Navona & gelato", "Campo de' Fiori market"], dinner: ["Pasta in Trastevere", "Pizza al taglio in Testaccio", "Aperitivo in Monti", "Rooftop restaurant near Pantheon", "Roman trattoria"], kids: ["Gladiator school experience", "Villa Borghese gardens & bike rental", "Gelato tasting tour", "Explora Children's Museum", "Catacomb torch-light tour"] },
  florence: { morning: ["Uffizi Gallery", "Duomo & Brunelleschi's Dome climb", "Ponte Vecchio walk", "Accademia (David)", "San Lorenzo Market"], afternoon: ["Boboli Gardens", "Piazzale Michelangelo sunset viewpoint", "Oltrarno artisan workshops", "Leather market shopping", "Santa Croce basilica"], dinner: ["Bistecca Fiorentina at local trattoria", "Wine bar in Santo Spirito", "Tuscan ribollita & pappa al pomodoro", "Enoteca wine tasting dinner", "Rooftop aperitivo"], kids: ["Gelato making class", "Boboli Gardens maze & grotto", "Palazzo Vecchio secret passages tour", "Leonardo da Vinci Museum — interactive", "Piazzale Michelangelo picnic & views"] },
  barcelona: { morning: ["Sagrada Familia visit", "Park Güell", "Gothic Quarter walk", "La Boqueria market", "Casa Batlló"], afternoon: ["Barceloneta beach", "Montjuïc cable car & castle", "El Born neighbourhood", "Picasso Museum", "Las Ramblas stroll"], dinner: ["Tapas crawl in El Born", "Paella by the beach", "Pintxos in Gràcia", "Rooftop cocktails & dinner", "Seafood at Barceloneta"], kids: ["Barcelona Aquarium", "Tibidabo amusement park", "Barceloneta beach & sandcastles", "CosmoCaixa science museum", "Park Güell — Gaudí's mosaic playground"] },
  amsterdam: { morning: ["Anne Frank House", "Rijksmuseum", "Van Gogh Museum", "Canal ring walking tour", "Jordaan neighbourhood"], afternoon: ["Vondelpark picnic", "Albert Cuyp Market", "NDSM Wharf art district", "Heineken Experience", "Bike ride along canals"], dinner: ["Indonesian rijsttafel", "Brown café pub dinner", "Waterfront restaurant", "Pancake house", "De Pijp neighbourhood dinner"], kids: ["NEMO Science Museum — rooftop water play", "Vondelpark playground & paddle pool", "Artis Zoo", "Canal boat tour", "Pancake house lunch"] },
};

function getLocationActivities(place) {
  const key = place.toLowerCase();
  if (LOCATION_ACTIVITIES[key]) return LOCATION_ACTIVITIES[key];
  // Partial match
  for (const [k, v] of Object.entries(LOCATION_ACTIVITIES)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return null;
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

// ─── Expense Categories ───
const EXPENSE_CATEGORIES = [
  { key: 'food', label: 'Food & Drink', icon: '\uD83C\uDF7D\uFE0F', color: '#D85A30' },
  { key: 'travel', label: 'Travel', icon: '\uD83D\uDE97', color: '#2E7CC9' },
  { key: 'charging', label: 'Charging', icon: '\u26A1', color: '#1B8F6A' },
  { key: 'entertainment', label: 'Entertainment', icon: '\uD83C\uDFAD', color: '#7B6FD6' },
  { key: 'accommodation', label: 'Accommodation', icon: '\uD83C\uDFE8', color: '#B87215' },
  { key: 'activities', label: 'Activities', icon: '\uD83C\uDFAF', color: '#CF4D78' },
  { key: 'other', label: 'Other', icon: '\uD83D\uDCE6', color: '#6B7280' },
];
const getCatInfo = (key) => EXPENSE_CATEGORIES.find(c => c.key === key) || EXPENSE_CATEGORIES[6];

// ─── Google Maps Integration ───
const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY || "";
let mapsLoaded = false;
let mapsLoadPromise = null;

function loadGoogleMaps() {
  if (mapsLoaded && window.google?.maps) return Promise.resolve();
  if (mapsLoadPromise) return mapsLoadPromise;
  mapsLoadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) { mapsLoaded = true; resolve(); return; }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,marker&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => { mapsLoaded = true; resolve(); };
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return mapsLoadPromise;
}

// Decode Google polyline encoding
function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

// Trip Map Component — embedded Google Map with route + pins
function TripMap({ places, routePolyline, height, onDirectionsLoaded, travelMode: travelModeProp }) {
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const markersRef = React.useRef([]);
  const polylineRef = React.useRef(null);
  const rendererRef = React.useRef(null);
  const callbackRef = React.useRef(onDirectionsLoaded);
  const renderedPlacesKey = React.useRef("");
  const [mapReady, setMapReady] = React.useState(false);
  const [mapError, setMapError] = React.useState(null);

  // Keep callback ref up to date without triggering re-renders
  callbackRef.current = onDirectionsLoaded;

  // Stable places key to detect actual changes (includes travel mode)
  const placesKey = (places || []).join("|") + "|" + (travelModeProp || "driving");

  // Load Google Maps API
  React.useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapReady(true))
      .catch(() => setMapError("Maps failed to load"));
  }, []);

  // Initialize map
  React.useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    if (mapInstanceRef.current) return;

    const map = new window.google.maps.Map(mapRef.current, {
      zoom: 7,
      center: { lat: 54.5, lng: -3.0 },
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      styles: [
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
      ],
    });
    mapInstanceRef.current = map;
  }, [mapReady]);

  // Add markers and route — only when places actually change
  React.useEffect(() => {
    if (!mapInstanceRef.current || !places || places.length === 0) return;
    if (renderedPlacesKey.current === placesKey) return; // already rendered these places
    renderedPlacesKey.current = placesKey;

    const map = mapInstanceRef.current;
    const google = window.google;

    // Clear old markers, polylines, and direction renderers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
    if (rendererRef.current) { rendererRef.current.setMap(null); rendererRef.current = null; }

    const bounds = new google.maps.LatLngBounds();
    const geocoder = new google.maps.Geocoder();

    // Check if last place is same as first (return trip)
    const isReturnTrip = places.length > 2 && places[0].toLowerCase().trim() === places[places.length - 1].toLowerCase().trim();
    // If return trip, skip the duplicate last marker (Directions will handle the route back)
    const markerPlaces = isReturnTrip ? places.slice(0, -1) : places;

    const geocodePromises = markerPlaces.map((place, i) =>
      new Promise((resolve) => {
        geocoder.geocode({ address: place }, (results, status) => {
          if (status === "OK" && results[0]) {
            const pos = results[0].geometry.location;
            const isStart = i === 0;
            const isEnd = i === markerPlaces.length - 1;
            const pinColor = isStart ? "#1B8F6A" : isEnd ? "#D85A30" : "#2E7CC9";
            const stopLabel = isStart ? "Start" : isEnd ? (isReturnTrip ? "Last stop" : "End") : `Stop ${i + 1}`;
            const marker = new google.maps.Marker({
              position: pos, map, title: place,
              label: { text: `${i + 1}`, color: "#fff", fontWeight: "600", fontSize: "11px" },
              icon: {
                path: google.maps.SymbolPath.CIRCLE, scale: 14,
                fillColor: pinColor,
                fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2,
              },
            });
            const info = new google.maps.InfoWindow({ content: `<div style="font-family:DM Sans,sans-serif;padding:2px 4px"><b>${place}</b><br><span style="font-size:11px;color:#666">${stopLabel}</span></div>` });
            marker.addListener("click", () => info.open(map, marker));
            markersRef.current.push(marker);
            bounds.extend(pos);
            resolve({ place, location: { lat: pos.lat(), lng: pos.lng() } });
          } else {
            resolve(null);
          }
        });
      })
    );

    Promise.all(geocodePromises).then((resolved) => {
      const validLocations = resolved.filter(Boolean);
      if (validLocations.length > 1) {
        map.fitBounds(bounds, { top: 30, bottom: 30, left: 30, right: 30 });

        // For return trips, the destination is the start (loop back)
        const dirOrigin = validLocations[0].place;
        const dirDestination = isReturnTrip ? validLocations[0].place : validLocations[validLocations.length - 1].place;
        const dirWaypoints = isReturnTrip
          ? validLocations.slice(1).map(l => ({ location: l.place, stopover: true }))
          : validLocations.slice(1, -1).map(l => ({ location: l.place, stopover: true }));

        // Map user travel mode to Google Directions TravelMode
        const gmTravelMode = (() => {
          const m = (travelModeProp || "").toLowerCase();
          if (/train|rail|transit|bus|public/.test(m)) return google.maps.TravelMode.TRANSIT;
          if (/walk|hiking|foot/.test(m)) return google.maps.TravelMode.WALKING;
          if (/bicy|bike|cycling/.test(m)) return google.maps.TravelMode.BICYCLING;
          return google.maps.TravelMode.DRIVING; // Car, EV, Non-EV, Flight all use driving for road route
        })();

        const directionsService = new google.maps.DirectionsService();
        directionsService.route({
          origin: dirOrigin,
          destination: dirDestination,
          waypoints: gmTravelMode === google.maps.TravelMode.TRANSIT ? [] : dirWaypoints, // Transit doesn't support waypoints
          travelMode: gmTravelMode,
          optimizeWaypoints: false,
        }, (result, status) => {
          if (status === "OK") {
            // Use DirectionsRenderer for a single clean route line (no duplicates)
            const renderer = new google.maps.DirectionsRenderer({
              map,
              directions: result,
              suppressMarkers: true, // we draw our own numbered markers
              polylineOptions: { strokeColor: "#1B8F6A", strokeOpacity: 0.8, strokeWeight: 4 },
            });
            rendererRef.current = renderer;

            if (callbackRef.current) {
              const legs = result.routes[0].legs;
              const totalDist = legs.reduce((s, l) => s + l.distance.value, 0);
              const totalDur = legs.reduce((s, l) => s + l.duration.value, 0);
              callbackRef.current({
                legs: legs.map(l => ({ start: l.start_address, end: l.end_address, distance: l.distance.text, duration: l.duration.text })),
                totalDistance: (totalDist / 1609.34).toFixed(1) + " mi",
                totalDuration: Math.floor(totalDur / 3600) + " hr " + Math.round((totalDur % 3600) / 60) + " min",
              });
            }
          }
        });
      } else if (validLocations.length === 1) {
        map.setCenter(bounds.getCenter());
        map.setZoom(12);
      }
    });

    // Cleanup only on unmount — do NOT reset renderedPlacesKey on every dependency change
    // (resetting it causes the route to be drawn twice when the effect re-fires)
  }, [mapReady, placesKey]);

  // Cleanup on unmount only
  React.useEffect(() => {
    return () => {
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
      if (rendererRef.current) { rendererRef.current.setMap(null); rendererRef.current = null; }
      renderedPlacesKey.current = "";
    };
  }, []);

  if (mapError) {
    return (
      <div style={{ height: height || 200, background: T.s2, borderRadius: T.rs, display: "flex", alignItems: "center", justifyContent: "center", color: T.t3, fontSize: 12 }}>
        🗺️ Map unavailable
      </div>
    );
  }

  return (
    <div style={{ position: "relative", borderRadius: T.rs, overflow: "hidden", border: `.5px solid ${T.border}` }}>
      <div ref={mapRef} style={{ width: "100%", height: height || 200 }} />
      {!mapReady && (
        <div style={{ position: "absolute", inset: 0, background: T.s2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: T.t3 }}>
          Loading map...
        </div>
      )}
    </div>
  );
}

// ─── Reusable Form Components (outside main component to prevent remount on state changes) ───
// ─── Sanitise HTML to prevent XSS in chat ───
function sanitizeForHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function renderChatHtml(text, linkColor) {
  const safe = sanitizeForHtml(text);
  return safe
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, `<a href="$2" target="_blank" rel="noopener" style="color:${linkColor || "#1B8F6A"};text-decoration:underline;font-weight:500">$1</a>`)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br/>");
}

function ControlledField({ label, type = "text", value, onChange, placeholder, style: wrapStyle, min, max, onKeyDown }) {
  const inputStyle = { width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none" };
  const dateRef = useRef(null);
  return (
    <div style={{ marginBottom: 14, ...wrapStyle }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>{label}</label>
      {type === "textarea" ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} onKeyDown={onKeyDown} style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} />
      ) : type === "date" ? (
        <div onClick={() => dateRef.current?.showPicker?.()} style={{ cursor: "pointer" }}>
          <input ref={dateRef} type="date" value={value} onChange={e => onChange(e.target.value)} min={min} max={max}
            placeholder={placeholder || "Select date"}
            style={{ ...inputStyle, cursor: "pointer", minHeight: 44, colorScheme: "light" }} />
        </div>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} min={min} max={max} onKeyDown={onKeyDown} style={{ ...inputStyle, minHeight: 44 }} />
      )}
    </div>
  );
}

function TabBar({ active, onNav }) {
  const tabStyle = (isActive) => ({ flex: 1, padding: "12px 0", minHeight: 48, textAlign: "center", fontSize: 11, color: isActive ? T.a : T.t3, cursor: "pointer", border: "none", background: "none", fontFamily: T.font, fontWeight: isActive ? 600 : 500, transition: "all .15s", borderTop: isActive ? `2px solid ${T.a}` : "2px solid transparent" });
  const tabs = [
    { id: "trip", label: "Timeline", screen: "trip" },
    { id: "chat", label: "Chat", screen: "chat" },
    { id: "explore", label: "Explore", screen: "explore" },
    { id: "memories", label: "Memories", screen: "memories" },
    { id: "settings", label: "Settings", screen: "settings" },
  ];
  if (active === "home") {
    return (
      <nav role="navigation" aria-label="Main navigation" style={{ display: "flex", background: T.s, borderTop: `.5px solid ${T.border}`, flexShrink: 0 }}>
        {[["home", "Trips"], ["explore", "Explore"], ["settings", "Settings"]].map(([id, label]) => (
          <button key={id} className="w-tab" onClick={() => onNav(id)} style={tabStyle(active === id)} aria-label={label} aria-current={active === id ? "page" : undefined}>{label}</button>
        ))}
      </nav>
    );
  }
  return (
    <nav role="navigation" aria-label="Trip navigation" style={{ display: "flex", background: T.s, borderTop: `.5px solid ${T.border}`, flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.id} className="w-tab" onClick={() => onNav(t.screen)} style={tabStyle(active === t.id)} aria-label={t.label} aria-current={active === t.id ? "page" : undefined}>{t.label}</button>
      ))}
    </nav>
  );
}

// ─── Main App ───
export default function TripWithMeApp() {
  const [screen, setScreen] = useState("home");
  const [wizStep, setWizStep] = useState(0);
  const [selectedDay, setSelectedDay] = useState(1);
  const [expandedItem, setExpandedItem] = useState(null);
  const [photos, setPhotos] = useState(MEMORIES);
  const [videoState, setVideoState] = useState("idle");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatAddDayPicker, setChatAddDayPicker] = useState(null);
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
  const [expandedSections, setExpandedSections] = useState({});
  const [tripChatInput, setTripChatInput] = useState("");
  const [tripChatMessages, setTripChatMessages] = useState([]);
  const tripChatEndRef = useRef(null);
  const [tripDetailTab, setTripDetailTab] = useState("itinerary");
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationPrefs, setActivationPrefs] = useState({ startTime: "08:00", dayOnePace: "balanced", notes: "", stopovers: [] });
  const [pendingActivationTripId, setPendingActivationTripId] = useState(null);
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
  const [reelStyle, setReelStyle] = useState("cinematic"); // "cinematic" | "slideshow" | "energetic"
  const [tripDirections, setTripDirections] = useState(null);
  const [showMap, setShowMap] = useState(true);

  // ─── Expense Tracking State ───
  const [expenses, setExpenses] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('food');
  const [expensePaidBy, setExpensePaidBy] = useState('');
  const [expenseSplitMethod, setExpenseSplitMethod] = useState('equal');
  const [expenseParticipants, setExpenseParticipants] = useState([]);
  const [expenseCustomSplits, setExpenseCustomSplits] = useState({});
  const [showSettlement, setShowSettlement] = useState(false);

  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
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
  const [chatTyping, setChatTyping] = useState(false);
  const [tripChatTyping, setTripChatTyping] = useState(false);
  const [chatFlowStep, setChatFlowStep] = useState(null); // null | "ask_start" | "ask_pickups" | "ask_time" | "route_shown" | "ask_home" | "ask_departure_time" | "departure_shown"
  const [chatFlowData, setChatFlowData] = useState({});
  const [toast, setToast] = useState(null);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('twm_welcomed'));
  const [showDemo, setShowDemo] = useState(false);
  const [demoSlide, setDemoSlide] = useState(0);
  const [demoTick, setDemoTick] = useState(0);
  const [demoPaused, setDemoPaused] = useState(false);
  const [demoInteracted, setDemoInteracted] = useState({});
  const demoTimerRef = useRef(null);
  const demoTickRef = useRef(null);

  // Auto-scroll trip chat to bottom when messages change
  useEffect(() => {
    if (tripChatEndRef.current) tripChatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [tripChatMessages, tripChatTyping]);

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

  // Check for share code in URL and fetch trip data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setJoinShareCode(joinCode);
      // Fetch trip by share code from Supabase
      lookupTripByShareCode(joinCode).then(data => {
        if (data) {
          const mapped = {
            id: data.id, dbId: data.id, name: data.name, brief: data.brief,
            start: data.start_date, end: data.end_date, rawStart: data.start_date, rawEnd: data.end_date,
            places: data.places || [], travel: data.travel_modes || [], status: data.status,
            shareCode: data.share_code,
            year: data.start_date ? new Date(data.start_date).getFullYear() : new Date().getFullYear(),
            travellers: {
              adults: (data.trip_travellers || []).filter(tr => tr.role === 'lead' || tr.role === 'adult').map(tr => ({
                name: tr.name, email: tr.email || "", isLead: tr.role === 'lead', dbId: tr.id, isClaimed: tr.is_claimed
              })),
              olderKids: (data.trip_travellers || []).filter(tr => tr.role === 'child_older').map(tr => ({ name: tr.name, age: tr.age || 10, dbId: tr.id })),
              youngerKids: (data.trip_travellers || []).filter(tr => tr.role === 'child_younger').map(tr => ({ name: tr.name, age: tr.age || 5, dbId: tr.id })),
            },
            stays: (data.trip_stays || []).map(s => ({ name: s.name, type: s.type, tags: s.tags || [], rating: s.rating, price: s.price, location: s.location, checkIn: s.check_in, checkOut: s.check_out, cost: s.cost ? String(s.cost) : "", bookingRef: s.booking_ref || "", address: s.address || "", dbId: s.id })),
            stayNames: (data.trip_stays || []).map(s => s.name),
            prefs: data.trip_preferences?.[0] ? {
              food: data.trip_preferences[0].food_prefs || [], adultActs: data.trip_preferences[0].adult_activities || [],
              olderActs: data.trip_preferences[0].older_kid_activities || [], youngerActs: data.trip_preferences[0].younger_kid_activities || [],
              instructions: data.trip_preferences[0].instructions || "",
              activities: [...(data.trip_preferences[0].adult_activities || []), ...(data.trip_preferences[0].older_kid_activities || []), ...(data.trip_preferences[0].younger_kid_activities || [])],
            } : { food: [], adultActs: [], olderActs: [], youngerActs: [], instructions: "", activities: [] },
            timeline: [],
          };
          setSelectedCreatedTrip(mapped);
          setScreen('joinPreview');
        } else {
          setScreen('joinPreview');
        }
      });
    }
  }, []);

  // ─── Real-time Sync — Supabase Realtime subscriptions ───
  useEffect(() => {
    if (!user || user.id === 'demo') return;

    const channel = supabase.channel('trip-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new) {
          const updated = payload.new;
          setCreatedTrips(prev => prev.map(t => {
            if (t.dbId === updated.id) {
              return { ...t, name: updated.name || t.name, status: updated.status || t.status,
                start: updated.start_date || t.start, end: updated.end_date || t.end,
                places: updated.places || t.places, travel: updated.travel_modes || t.travel };
            }
            return t;
          }));
          // Update selected trip if it's the one being viewed
          setSelectedCreatedTrip(prev => {
            if (prev?.dbId === updated.id) {
              return { ...prev, name: updated.name || prev.name, status: updated.status || prev.status,
                start: updated.start_date || prev.start, end: updated.end_date || prev.end,
                places: updated.places || prev.places, travel: updated.travel_modes || prev.travel };
            }
            return prev;
          });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_travellers' }, (payload) => {
        if (payload.new) {
          const newTraveller = payload.new;
          setCreatedTrips(prev => prev.map(t => {
            if (t.dbId === newTraveller.trip_id) {
              const role = newTraveller.role;
              const entry = { name: newTraveller.name, dbId: newTraveller.id, email: newTraveller.email || "" };
              const travellers = { ...t.travellers };
              if (role === 'lead' || role === 'adult') {
                travellers.adults = [...(travellers.adults || []), { ...entry, isLead: role === 'lead', isClaimed: newTraveller.is_claimed }];
              } else if (role === 'child_older') {
                travellers.olderKids = [...(travellers.olderKids || []), { ...entry, age: newTraveller.age || 10 }];
              } else if (role === 'child_younger') {
                travellers.youngerKids = [...(travellers.youngerKids || []), { ...entry, age: newTraveller.age || 5 }];
              }
              return { ...t, travellers };
            }
            return t;
          }));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trip_travellers' }, (payload) => {
        if (payload.new?.is_claimed) {
          // A co-traveller claimed their slot — show a toast
          showToast(`${payload.new.name || "Someone"} joined the trip!`);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ─── Chat Persistence: Load messages from Supabase ───
  const loadTripMessages = async (tripDbId) => {
    if (!tripDbId) return;
    try {
      const { data } = await supabase.from('messages').select('*').eq('trip_id', tripDbId).order('created_at', { ascending: true });
      if (data && data.length > 0) {
        setTripChatMessages(data.map(m => ({ id: m.id, role: m.sender_role || 'user', text: m.text, senderName: m.sender_name })));
      }
    } catch (e) { /* messages table may not exist yet — silent fail */ }
  };
  const saveChatMessage = async (tripDbId, role, text, senderName) => {
    if (!tripDbId) return;
    try {
      await supabase.from('messages').insert({ trip_id: tripDbId, sender_role: role, text, sender_name: senderName || (role === 'ai' ? 'Trip With Me AI' : 'You') });
    } catch (e) { /* silent fail if table doesn't exist */ }
  };

  // ─── Expense Functions ───
  const getExpenseParticipantDefaults = (trip) => {
    // Default: all adults (one per family, kids aren't expense participants)
    return (trip?.travellers?.adults || []).map(a => a.name).filter(Boolean);
  };

  const loadExpenses = async (tripDbId) => {
    if (!tripDbId) return;
    try {
      const { data } = await supabase.from('expenses').select('*, expense_splits(*)').eq('trip_id', tripDbId).order('created_at', { ascending: false });
      setExpenses((data || []).map(e => ({ ...e, splits: e.expense_splits || [] })));
    } catch (e) { setExpenses([]); }
  };

  const loadTripPhotos = async (tripId) => {
    if (!tripId) return;
    try {
      const { data } = await supabase.from('trip_photos').select('*').eq('trip_id', tripId).order('sort_order', { ascending: true });
      if (data && data.length > 0) {
        setUploadedPhotos(data.map(p => ({
          id: p.id, url: p.file_url, name: p.file_name, day: p.day_tag || "Untagged",
          liked: p.liked || false, caption: p.caption || "", sortOrder: p.sort_order || 0,
          filePath: p.file_path, uploadDate: new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        })));
      }
    } catch (e) { /* table may not exist */ }
  };

  const updatePhotoInSupabase = async (photoId, updates) => {
    try { await supabase.from('trip_photos').update(updates).eq('id', photoId); } catch (e) { /* ignore */ }
  };

  const deletePhotoFromSupabase = async (photo) => {
    try {
      if (photo.filePath) await supabase.storage.from('trip-photos').remove([photo.filePath]);
      await supabase.from('trip_photos').delete().eq('id', photo.id);
    } catch (e) { /* ignore */ }
  };

  const resetExpenseForm = () => {
    setExpenseDesc(''); setExpenseAmount(''); setExpenseCategory('food');
    setExpensePaidBy(''); setExpenseSplitMethod('equal'); setExpenseParticipants([]);
    setExpenseCustomSplits({}); setShowAddExpense(false); setEditingExpense(null);
  };

  const saveExpense = async (trip) => {
    const amount = parseFloat(expenseAmount);
    if (!expenseDesc.trim() || isNaN(amount) || amount <= 0 || !expensePaidBy || expenseParticipants.length === 0) {
      showToast("Fill in all fields", "error"); return;
    }
    const tripDbId = trip.dbId || trip.id;
    let splits;
    const selected = expenseParticipants;
    if (expenseSplitMethod === 'equal') {
      const share = Math.round((amount / selected.length) * 100) / 100;
      splits = selected.map((name, i) => ({
        participant_name: name,
        share_amount: i === selected.length - 1 ? Math.round((amount - share * (selected.length - 1)) * 100) / 100 : share,
      }));
    } else if (expenseSplitMethod === 'percentage') {
      const totalPct = selected.reduce((s, n) => s + (parseFloat(expenseCustomSplits[n]) || 0), 0);
      if (Math.abs(totalPct - 100) > 0.5) { showToast("Percentages must add up to 100%", "error"); return; }
      splits = selected.map(name => ({
        participant_name: name,
        share_amount: Math.round(amount * (parseFloat(expenseCustomSplits[name]) || 0) / 100 * 100) / 100,
        share_percentage: parseFloat(expenseCustomSplits[name]) || 0,
      }));
    } else {
      const totalCustom = selected.reduce((s, n) => s + (parseFloat(expenseCustomSplits[n]) || 0), 0);
      if (Math.abs(totalCustom - amount) > 0.01) { showToast(`Custom amounts must add up to \u00A3${amount.toFixed(2)}`, "error"); return; }
      splits = selected.map(name => ({
        participant_name: name,
        share_amount: parseFloat(expenseCustomSplits[name]) || 0,
      }));
    }
    if (editingExpense) {
      // Update existing — update local state first (optimistic)
      const updatedExpense = { ...editingExpense, description: expenseDesc.trim(), amount, category: expenseCategory, paid_by: expensePaidBy, split_method: expenseSplitMethod, updated_at: new Date().toISOString(), splits };
      setExpenses(prev => prev.map(e => e.id === editingExpense.id ? updatedExpense : e));
      try {
        await supabase.from('expense_splits').delete().eq('expense_id', editingExpense.id);
        await supabase.from('expenses').update({
          description: expenseDesc.trim(), amount, category: expenseCategory,
          paid_by: expensePaidBy, split_method: expenseSplitMethod, updated_at: new Date().toISOString(),
        }).eq('id', editingExpense.id);
        await supabase.from('expense_splits').insert(splits.map(s => ({ expense_id: editingExpense.id, ...s })));
      } catch (e) { /* local state already updated */ }
      showToast("Expense updated");
    } else {
      // Add new — add to local state first (optimistic), then try Supabase
      const localExpense = {
        id: `local_${Date.now()}`, trip_id: tripDbId, description: expenseDesc.trim(), amount, category: expenseCategory,
        paid_by: expensePaidBy, split_method: expenseSplitMethod, created_at: new Date().toISOString(),
        created_by: user?.user_metadata?.full_name || user?.email || 'You', splits,
      };
      setExpenses(prev => [localExpense, ...prev]);
      try {
        const { data: exp } = await supabase.from('expenses').insert({
          trip_id: tripDbId, description: expenseDesc.trim(), amount, category: expenseCategory,
          paid_by: expensePaidBy, split_method: expenseSplitMethod,
          created_by: user?.user_metadata?.full_name || user?.email || 'You',
        }).select().single();
        if (exp) {
          await supabase.from('expense_splits').insert(splits.map(s => ({ expense_id: exp.id, ...s })));
          // Replace local placeholder with server data
          setExpenses(prev => prev.map(e => e.id === localExpense.id ? { ...exp, splits: splits.map(s => ({ expense_id: exp.id, ...s })) } : e));
        }
      } catch (e) { /* local state already has the expense */ }
      showToast("Expense added");
    }
    resetExpenseForm();
  };

  const deleteExpense = async (expenseId, tripDbId) => {
    try {
      await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
      await supabase.from('expenses').delete().eq('id', expenseId);
      showToast("Expense removed");
      loadExpenses(tripDbId);
    } catch (e) { showToast("Failed to delete", "error"); }
  };

  const calculateSettlement = (expensesList) => {
    const balances = {};
    expensesList.forEach(exp => {
      balances[exp.paid_by] = (balances[exp.paid_by] || 0) + exp.amount;
      (exp.splits || []).forEach(s => {
        balances[s.participant_name] = (balances[s.participant_name] || 0) - s.share_amount;
      });
    });
    const creditors = [], debtors = [];
    Object.entries(balances).forEach(([name, bal]) => {
      if (bal > 0.01) creditors.push({ name, amount: bal });
      else if (bal < -0.01) debtors.push({ name, amount: -bal });
    });
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
    const settlements = [];
    let ci = 0, di = 0;
    while (ci < creditors.length && di < debtors.length) {
      const amt = Math.min(creditors[ci].amount, debtors[di].amount);
      if (amt > 0.01) settlements.push({ from: debtors[di].name, to: creditors[ci].name, amount: Math.round(amt * 100) / 100 });
      creditors[ci].amount -= amt; debtors[di].amount -= amt;
      if (creditors[ci].amount < 0.01) ci++;
      if (debtors[di].amount < 0.01) di++;
    }
    return settlements;
  };

  const getCategoryBreakdown = (expensesList) => {
    const byCategory = {};
    expensesList.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
    const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
    return Object.entries(byCategory).map(([cat, amount]) => ({
      ...getCatInfo(cat), amount, percentage: total > 0 ? (amount / total) * 100 : 0,
    })).sort((a, b) => b.amount - a.amount);
  };

  // Trip Reel auto-advance timer
  useEffect(() => {
    if (reelPlaying && !reelPaused && uploadedPhotos.length > 0) {
      const baseDuration = reelStyle === "energetic" ? 2000 : reelStyle === "slideshow" ? 3000 : 4000;
      const reelDuration = videoSettings.has("Slow-mo") ? baseDuration * 1.5 : baseDuration;
      reelTimerRef.current = setInterval(() => {
        setReelIndex(prev => {
          if (prev >= uploadedPhotos.length - 1) {
            setReelPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, reelDuration);
    }
    return () => { if (reelTimerRef.current) clearInterval(reelTimerRef.current); };
  }, [reelPlaying, reelPaused, uploadedPhotos.length, reelStyle, videoSettings]);

  // Demo animation tick — drives all animations
  useEffect(() => {
    if (showDemo && !demoPaused) {
      demoTickRef.current = setInterval(() => setDemoTick(t => t + 1), 220);
    }
    return () => { if (demoTickRef.current) clearInterval(demoTickRef.current); };
  }, [showDemo, demoPaused]);

  // Demo auto-advance slides (ticks at 220ms each)
  const DEMO_SLIDE_DURATIONS = [62, 56, 54, 72, 58, 62, 58, 56, 54, 999];
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
            name: s.name, type: s.type, tags: s.tags || [], rating: s.rating, price: s.price, location: s.location, checkIn: s.check_in, checkOut: s.check_out, cost: s.cost ? String(s.cost) : "", bookingRef: s.booking_ref || "", address: s.address || "", dbId: s.id
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
          check_in: s.checkIn || null,
          check_out: s.checkOut || null,
          cost: s.cost ? parseFloat(s.cost) : null,
          booking_ref: s.bookingRef || null,
          address: s.address || null,
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

  const buildTripSummary = (trip) => {
    const parts = [];
    // Smart numDays: prefer stay date span if available
    let numDays = null;
    const stays = trip.stays || [];
    if (stays.length > 0) {
      const checkIns = stays.map(s => s.checkIn).filter(Boolean).sort();
      const checkOuts = stays.map(s => s.checkOut).filter(Boolean).sort();
      if (checkIns.length > 0 && checkOuts.length > 0) {
        const stayStart = checkIns[0];
        const stayEnd = checkOuts[checkOuts.length - 1];
        const stayDays = Math.max(1, Math.round((new Date(stayEnd + "T12:00:00") - new Date(stayStart + "T12:00:00")) / 86400000) + 1);
        const rawDays = trip.rawStart && trip.rawEnd ? Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1) : null;
        if (rawDays && stayDays < rawDays && stayDays <= 30) {
          numDays = stayDays;
        } else {
          numDays = rawDays;
        }
      }
    }
    if (!numDays) {
      numDays = trip.rawStart && trip.rawEnd ? Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1) : null;
    }
    if (numDays && trip.places?.length > 0) parts.push(`${numDays}-day trip to ${trip.places.join(", ")}`);
    if (trip.travel?.length > 0) parts.push(`travelling by ${trip.travel.join(" + ").toLowerCase()}`);
    if (trip.startLocation) parts.push(`starting from ${trip.startLocation}`);
    const na = trip.travellers?.adults?.length || 0, nok = trip.travellers?.olderKids?.length || 0, nyk = trip.travellers?.youngerKids?.length || 0;
    const gp = [];
    if (na > 0) gp.push(`${na} adult${na > 1 ? "s" : ""}`);
    if (nok > 0) gp.push(`${nok} older kid${nok > 1 ? "s" : ""} (${trip.travellers.olderKids.map(k => `${k.name || "child"}, ${k.age}`).join("; ")})`);
    if (nyk > 0) gp.push(`${nyk} younger kid${nyk > 1 ? "s" : ""} (${trip.travellers.youngerKids.map(k => `${k.name || "child"}, ${k.age}`).join("; ")})`);
    if (gp.length) parts.push(`group: ${gp.join(", ")}`);
    if (trip.budget) parts.push(`${trip.budget.toLowerCase()} budget`);
    if (trip.prefs?.food?.length > 0) parts.push(`food preferences: ${trip.prefs.food.join(", ")}`);
    if (trip.prefs?.adultActs?.length > 0) parts.push(`adult activities: ${trip.prefs.adultActs.join(", ")}`);
    if (trip.prefs?.olderActs?.length > 0) parts.push(`older kids activities: ${trip.prefs.olderActs.join(", ")}`);
    if (trip.prefs?.youngerActs?.length > 0) parts.push(`younger kids activities: ${trip.prefs.youngerActs.join(", ")}`);
    if (trip.stayNames?.length > 0) parts.push(`staying at ${trip.stayNames.join(", ")}`);
    const allKids = [...(trip.travellers?.olderKids || []), ...(trip.travellers?.youngerKids || [])];
    if (allKids.length > 0) {
      const ages = allKids.map(k => parseInt(k.age) || 0);
      const youngest = Math.min(...ages);
      if (youngest <= 5) parts.push("young children in group — plan short activity blocks and rest breaks");
      else if (youngest <= 10) parts.push("children in group — mix family-friendly with adult activities");
    }
    if (trip.prefs?.instructions) parts.push(trip.prefs.instructions);
    return parts.join(". ") + (parts.length ? "." : "");
  };

  const createTrip = async () => {
    if (wizTrip.name.trim().length < 2) {
      alert("Please enter a trip name (at least 2 characters)");
      return;
    }
    setSaving(true);
    const name = wizTrip.name.trim();
    const formatDate = (d) => { if (!d) return ""; const dt = new Date(d + "T12:00:00"); return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
    // Smart dates: if stays exist and their span is shorter than entered dates, use stay dates
    let effectiveStart = wizTrip.start;
    let effectiveEnd = wizTrip.end;
    if (wizStays.length > 0 && !wizTrip.start && !wizTrip.end) {
      const cis = wizStays.map(s => s.checkIn).filter(Boolean).sort();
      const cos = wizStays.map(s => s.checkOut).filter(Boolean).sort();
      if (cis.length > 0 && cos.length > 0) {
        effectiveStart = cis[0];
        effectiveEnd = cos[cos.length - 1];
      }
    }
    const tripData = {
      name,
      brief: wizTrip.brief,
      start: formatDate(effectiveStart),
      end: formatDate(effectiveEnd),
      rawStart: effectiveStart,
      rawEnd: effectiveEnd,
      year: effectiveStart ? new Date(effectiveStart + "T12:00:00").getFullYear() : new Date().getFullYear(),
      places: [...wizTrip.places],
      travel: [...wizTrip.travel],
      budget: wizTrip.budget,
      startLocation: wizTrip.startLocation,
      travellers: { adults: wizTravellers.adults.map(a => ({ ...a })), olderKids: wizTravellers.olderKids.map(c => ({ ...c })), youngerKids: wizTravellers.youngerKids.map(c => ({ ...c })) },
      stays: [...wizStays],
      stayNames: wizStays.map(s => s.name || s),
      prefs: { food: [...wizPrefs.food], activities: [...wizPrefs.adultActs, ...wizPrefs.olderActs, ...wizPrefs.youngerActs], adultActs: [...wizPrefs.adultActs], olderActs: [...wizPrefs.olderActs], youngerActs: [...wizPrefs.youngerActs], instructions: wizPrefs.instructions || "" },
    };
    tripData.summary = buildTripSummary(tripData);
    if (editingTripId) {
      // Update existing trip, preserve status and timeline
      setCreatedTrips(prev => prev.map(t => {
        if (t.id !== editingTripId) return t;
        const updated = { ...t, ...tripData };
        // Regenerate timeline if live
        if (t.status === "live") updated.timeline = generateMultiDayTimeline(updated);
        return updated;
      }));
      const updatedTrip = { ...createdTrips.find(t => t.id === editingTripId), ...tripData };
      setSelectedCreatedTrip(updatedTrip);
      setEditingTripId(null);
      setSaving(false);
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
      setSaving(false);
      showToast("Trip created!");
      setSelectedCreatedTrip(newTrip);
      navigate("createdTrip");
    }
  };

  const deleteCreatedTrip = async (id) => {
    const trip = createdTrips.find(t => t.id === id);
    if (!window.confirm("Remove '" + (trip?.name || "this trip") + "'? This cannot be undone.")) return;
    // Sync deletion to Supabase if user is authenticated and trip has a DB ID
    if (user && user.id !== 'demo' && trip?.dbId) {
      try {
        await supabase.from('trip_preferences').delete().eq('trip_id', trip.dbId);
        await supabase.from('trip_stays').delete().eq('trip_id', trip.dbId);
        await supabase.from('trip_travellers').delete().eq('trip_id', trip.dbId);
        await supabase.from('trips').delete().eq('id', trip.dbId);
      } catch (err) {
        console.error('Error deleting trip from DB:', err);
        showToast("Failed to delete from cloud", "error");
      }
    }
    setCreatedTrips(prev => prev.filter(t => t.id !== id));
    showToast("Trip removed");
  };

  const generateTimeline = (trip) => {
    const items = [];
    const loc = trip.places[0] || "your destination";
    const stayName = trip.stayNames[0] || "accommodation";
    const food = trip.prefs.food.length > 0 ? trip.prefs.food : ["Local cuisine"];
    const foodLabel = food.join(" + ");
    const travelMode = trip.travel[0] || "Travel";
    const adultActs = trip.prefs.adultActs || [];
    const olderActs = trip.prefs.olderActs || [];
    const youngerActs = trip.prefs.youngerActs || [];
    const kidActs = [...new Set([...olderActs, ...youngerActs])];
    const allKids = [...(trip.travellers?.olderKids || []), ...(trip.travellers?.youngerKids || [])];
    const hasKids = allKids.length > 0;
    const budgetTier = { "Budget": { label: "budget-friendly", price: "£" }, "Mid-range": { label: "mid-range", price: "££" }, "Luxury": { label: "upscale", price: "£££" }, "No limit": { label: "top-rated", price: "££££" } }[trip.budget] || { label: "local", price: "££" };
    const ctx = (trip.summary || "") + " " + (trip.prefs.instructions || "");
    const ctxLower = ctx.toLowerCase();

    // Parse instruction keywords for modifiers
    const wantsDogFriendly = /dog|pet/.test(ctxLower);
    const wantsAccessible = /accessible|wheelchair|mobility|pushchair|buggy|pram/.test(ctxLower);
    const wantsLateStart = /late start|sleep in|no rush|relaxed morning/.test(ctxLower);
    const wantsShortBlocks = /short.*block|short.*activit|restless|young child|toddler/.test(ctxLower);
    const wantsAvoidSteep = /avoid.*steep|no.*steep|gentle|easy.*walk|flat/.test(ctxLower);
    const wantsPubs = /pub|pubs|tavern|inn/.test(ctxLower);

    // Timing modifiers
    const arriveTime = wantsLateStart ? "11:00 AM" : "9:00 AM";
    const morningTime = wantsLateStart ? "12:00 PM" : "10:30 AM";
    const lunchTime = wantsLateStart ? "1:30 PM" : "12:30 PM";
    const afternoonTime = wantsLateStart ? "3:00 PM" : "2:30 PM";
    const returnTime = "5:00 PM";
    const dinnerTime = "7:00 PM";

    // Tag builder
    const tags = (base) => {
      const t = [base];
      if (wantsDogFriendly) t.push("🐕 Dog-friendly");
      if (wantsAccessible) t.push("♿ Accessible");
      return t.join(" · ");
    };

    // Arrival
    const arriveDesc = trip.startLocation ? `${travelMode} from ${trip.startLocation} · Check in at ${stayName}` : `${travelMode} · Check in at ${stayName}`;
    items.push({ time: arriveTime, title: `Arrive ${loc}`, desc: arriveDesc, group: "Everyone", color: T.a });

    // Morning activity
    let morningAct = adultActs[0] || "Explore the area";
    if (wantsAvoidSteep && /hik|trail|climb|trek/.test(morningAct.toLowerCase())) morningAct = "Gentle walking tour";
    const morningDesc = tags(`${loc} · ${budgetTier.label}`);
    if (hasKids && kidActs.length > 0) {
      items.push({ time: morningTime, title: morningAct, desc: morningDesc, group: "Adults", color: T.blue });
      items.push({ time: morningTime, title: kidActs[0], desc: tags(`${loc} · Family-friendly`), group: "Kids", color: T.pink });
    } else {
      items.push({ time: morningTime, title: morningAct, desc: morningDesc, group: "Everyone", color: T.blue });
    }

    // Rest break for young kids
    if (wantsShortBlocks && hasKids) {
      const youngest = allKids.map(k => `${k.name || "child"}`).join(" & ");
      items.push({ time: wantsLateStart ? "1:00 PM" : "11:45 AM", title: `Rest break`, desc: `Snack stop for ${youngest} · Keep energy up`, group: "Kids", color: T.amber });
    }

    // Lunch
    const lunchDesc = wantsPubs ? `${budgetTier.label} pub · ${budgetTier.price}` : `${budgetTier.label} restaurant · ${budgetTier.price}`;
    const dietaryTags = [];
    if (food.some(f => /vegetarian|vegan/i.test(f))) dietaryTags.push("🥬 Veggie options");
    if (food.some(f => /halal/i.test(f))) dietaryTags.push("Halal");
    if (food.some(f => /gluten/i.test(f))) dietaryTags.push("GF options");
    if (hasKids && food.some(f => /kid/i.test(f))) dietaryTags.push("Kids menu");
    const lunchExtra = dietaryTags.length > 0 ? ` · ${dietaryTags.join(", ")}` : "";
    items.push({ time: lunchTime, title: `Lunch — ${foodLabel}`, desc: `${lunchDesc}${lunchExtra}${wantsDogFriendly ? " · 🐕 Dog-friendly" : ""}`, group: "Everyone", color: T.coral });

    // Afternoon activity
    let afternoonAdult = adultActs[1] || "Walking tour & sightseeing";
    if (wantsAvoidSteep && /hik|trail|climb|trek/.test(afternoonAdult.toLowerCase())) afternoonAdult = "Scenic drive & viewpoints";
    if (hasKids && kidActs.length > 1) {
      items.push({ time: afternoonTime, title: afternoonAdult, desc: tags(`${loc} · Afternoon`), group: "Adults", color: T.blue });
      items.push({ time: afternoonTime, title: kidActs[1] || "Playground & free time", desc: tags(`${loc} · Fun for kids`), group: "Kids", color: T.pink });
    } else if (hasKids && wantsShortBlocks) {
      items.push({ time: afternoonTime, title: afternoonAdult, desc: tags(`${loc} · Short session (1hr)`), group: "Everyone", color: T.blue });
      items.push({ time: "3:30 PM", title: "Free time & play", desc: `Let kids recharge · ${stayName} area`, group: "Everyone", color: T.pink });
    } else {
      items.push({ time: afternoonTime, title: afternoonAdult, desc: tags(`${loc} · Afternoon`), group: "Everyone", color: T.blue });
    }

    // Return + Dinner
    items.push({ time: returnTime, title: `Return to ${stayName}`, desc: "Relax & freshen up", group: "Everyone", color: T.t3 });
    const dinnerDesc = wantsPubs ? `${foodLabel} · ${budgetTier.label} pub · ${budgetTier.price}` : `${foodLabel} · ${budgetTier.label} · ${budgetTier.price}`;
    items.push({ time: dinnerTime, title: wantsPubs ? "Dinner at local pub" : "Dinner", desc: `${dinnerDesc}${wantsDogFriendly ? " · 🐕 Dog-friendly" : ""}${lunchExtra}`, group: "Everyone", color: T.coral });

    return items;
  };

  // Multi-day timeline: returns { 1: [...], 2: [...], ... }
  const generateMultiDayTimeline = (trip) => {
    // Smart numDays: prefer stay date span if stays indicate shorter trip
    let numDays = 1;
    const stays = trip.stays || [];
    if (stays.length > 0) {
      const checkIns = stays.map(s => s.checkIn).filter(Boolean).sort();
      const checkOuts = stays.map(s => s.checkOut).filter(Boolean).sort();
      if (checkIns.length > 0 && checkOuts.length > 0) {
        const stayStart = checkIns[0];
        const stayEnd = checkOuts[checkOuts.length - 1];
        const stayDays = Math.max(1, Math.round((new Date(stayEnd + "T12:00:00") - new Date(stayStart + "T12:00:00")) / 86400000) + 1);
        const rawDays = trip.rawStart && trip.rawEnd ? Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1) : null;
        if (rawDays && stayDays < rawDays && stayDays <= 30) {
          numDays = stayDays;
        } else {
          numDays = rawDays || stayDays;
        }
      }
    }
    if (numDays <= 1 && trip.rawStart && trip.rawEnd) {
      numDays = Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1);
    }
    const food = trip.prefs.food.length > 0 ? trip.prefs.food : ["Local cuisine"];
    const foodLabel = food.join(" + ");
    const travelMode = trip.travel[0] || "Travel";
    const allKids = [...(trip.travellers?.olderKids || []), ...(trip.travellers?.youngerKids || [])];
    const hasKids = allKids.length > 0;
    const budgetTier = { "Budget": { label: "budget-friendly", price: "£" }, "Mid-range": { label: "mid-range", price: "££" }, "Luxury": { label: "upscale", price: "£££" }, "No limit": { label: "top-rated", price: "££££" } }[trip.budget] || { label: "local", price: "££" };
    const ctx = (trip.summary || "") + " " + (trip.prefs.instructions || "");
    const ctxLower = ctx.toLowerCase();
    const wantsDogFriendly = /dog|pet/.test(ctxLower);
    const wantsAccessible = /accessible|wheelchair|mobility|pushchair|buggy|pram/.test(ctxLower);
    const wantsPubs = /pub|pubs|tavern|inn/.test(ctxLower);
    const wantsAvoidSteep = /avoid.*steep|no.*steep|gentle|easy.*walk|flat/.test(ctxLower);
    const prefs = trip.activationPrefs || {};
    const startHour = prefs.startTime ? parseInt(prefs.startTime.split(":")[0]) : 8;
    const startMin = prefs.startTime ? parseInt(prefs.startTime.split(":")[1] || "0") : 0;
    const isPacked = prefs.dayOnePace === "packed";
    const isRelaxed = prefs.dayOnePace === "relaxed";
    const isEV = trip.travel?.some(m => /ev/i.test(m));
    const enabledStops = (prefs.stopovers || []).filter(s => s.enabled);
    const tags = (base) => { const t = [base]; if (wantsDogFriendly) t.push("🐕 Dog-friendly"); if (wantsAccessible) t.push("♿ Accessible"); return t.join(" · "); };
    const fmtTime = (h, m = 0) => { const hh = Math.floor(h); const mm = m || Math.round((h - hh) * 60); const suffix = hh >= 12 ? "PM" : "AM"; const hr = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh; return `${hr}:${mm.toString().padStart(2, "0")} ${suffix}`; };

    // ─── BUILD DAY-TO-PLACE MAP ───
    // 3 patterns:
    //   A) Multiple stays → road trip: each day mapped to its stay's location
    //   B) 1 stay + multiple places → base camp: day trips from accommodation
    //   C) No stays → spread places evenly across days
    const sortedStays = [...(trip.stays || [])].filter(s => s.checkIn && s.location).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    const tripStartDate = trip.rawStart ? new Date(trip.rawStart + "T12:00:00") : new Date();
    const places = trip.places || [];

    // Detect unique stay locations
    const uniqueStayLocations = [...new Set(sortedStays.map(s => s.location.toLowerCase().trim()))];
    const isBaseCamp = sortedStays.length >= 1 && uniqueStayLocations.length === 1 && places.length > 1;

    const dayMap = {};
    if (isBaseCamp) {
      // ─── BASE CAMP PATTERN ───
      // Single accommodation, multiple places to visit as day trips
      // Day 1: Travel to base + explore base location
      // Middle days: Day trips to other places (return to base each night)
      // Last day: Explore base or return journey
      const baseStay = sortedStays[0];
      const baseLoc = baseStay.location;
      const baseStayName = baseStay.name;
      // Places to visit as day trips (exclude the base location itself)
      const dayTripPlaces = places.filter(p => p.toLowerCase().trim() !== baseLoc.toLowerCase().trim());
      // All places including base for activity generation
      const allVisitPlaces = [baseLoc, ...dayTripPlaces];

      for (let d = 1; d <= numDays; d++) {
        const isFirst = d === 1;
        const isLast = d === numDays;
        let dayPlace, isDayTrip = false;

        if (isFirst) {
          // Day 1: arrive at base, explore base location
          dayPlace = baseLoc;
        } else if (isLast) {
          // Last day: base location (pack up + return journey)
          dayPlace = baseLoc;
        } else {
          // Middle days: cycle through day trip destinations
          const dtIdx = (d - 2) % Math.max(1, dayTripPlaces.length);
          if (dayTripPlaces.length > 0) {
            dayPlace = dayTripPlaces[dtIdx];
            isDayTrip = true;
          } else {
            dayPlace = baseLoc; // No other places, stay at base
          }
        }

        const prevDay = dayMap[d - 1];
        dayMap[d] = {
          place: dayPlace,
          stayName: baseStayName,
          prevPlace: prevDay ? prevDay.place : null,
          isTransit: false, // Not moving accommodation
          isBaseCamp: true,
          isDayTrip,
          baseLoc,
          baseStayName,
        };
      }
    } else if (sortedStays.length > 1) {
      // ─── ROAD TRIP PATTERN ───
      // Multiple stays: each day mapped to the covering stay's location
      for (let d = 1; d <= numDays; d++) {
        const dayDateStr = new Date(tripStartDate.getTime() + (d - 1) * 86400000).toISOString().split("T")[0];
        let matchedStay = sortedStays.find(s => s.checkIn <= dayDateStr && s.checkOut > dayDateStr);
        if (!matchedStay) matchedStay = sortedStays.find(s => s.checkIn === dayDateStr);
        if (!matchedStay && d === 1) matchedStay = sortedStays[0];
        if (!matchedStay) {
          matchedStay = sortedStays.reduce((best, s) => {
            const diff = Math.abs(new Date(s.checkIn + "T12:00:00") - new Date(dayDateStr + "T12:00:00"));
            return (!best || diff < best.diff) ? { ...s, diff } : best;
          }, null);
        }
        const place = matchedStay?.location || places[0] || "your destination";
        const stayName = matchedStay?.name || "accommodation";
        const prevDay = dayMap[d - 1];
        const prevPlace = prevDay ? prevDay.place : null;
        const isTransit = prevPlace && prevPlace.toLowerCase() !== place.toLowerCase();
        dayMap[d] = { place, stayName, prevPlace, isTransit };
      }
    } else if (places.length > 0) {
      // ─── NO STAYS: spread locations evenly across days ───
      // e.g. 3 places over 5 days → Edinburgh(2), Inverness(2), Isle of Skye(1)
      const daysPerPlace = Math.floor(numDays / places.length);
      const extraDays = numDays % places.length;
      let dayIdx = 1;
      for (let p = 0; p < places.length; p++) {
        const daysForThis = daysPerPlace + (p < extraDays ? 1 : 0);
        for (let dd = 0; dd < daysForThis; dd++) {
          const prevDay = dayMap[dayIdx - 1];
          const prevPlace = prevDay ? prevDay.place : null;
          const isTransit = prevPlace && prevPlace.toLowerCase() !== places[p].toLowerCase();
          dayMap[dayIdx] = { place: places[p], stayName: `accommodation in ${places[p]}`, prevPlace, isTransit };
          dayIdx++;
        }
      }
    } else {
      // No places at all — fallback
      for (let d = 1; d <= numDays; d++) {
        dayMap[d] = { place: "your destination", stayName: "accommodation", prevPlace: null, isTransit: false };
      }
    }

    // ─── ACTIVITY & DINNER BUILDERS ───
    const getLocPools = (loc) => {
      const locActs = getLocationActivities(loc);
      if (locActs) return locActs;
      return {
        morning: [`Explore ${loc}`, `Walking tour of ${loc}`, `Local market in ${loc}`, "Scenic viewpoint", "Cultural tour"],
        afternoon: [`${loc} sightseeing walk`, "Shopping & souvenirs", "Museum visit", "Garden walk", "Photography walk"],
        dinner: wantsPubs ? [`Local pub in ${loc}`, "Pub supper", "Gastropub dinner"] : [`Dinner in ${loc}`, "Evening meal", "Dinner out"],
        kids: [`${loc} playground`, `Nature walk in ${loc}`, "Soft play", "Family activity"],
      };
    };

    const buildDinnerTitle = (loc, dayIdx) => {
      const locActs = getLocationActivities(loc);
      if (locActs?.dinner?.length > 0) return locActs.dinner[dayIdx % locActs.dinner.length];
      if (food.length > 0 && food[0] !== "Local cuisine") {
        const cuisine = food[dayIdx % food.length];
        return `${cuisine} ${wantsPubs ? "pub" : "restaurant"} in ${loc}`;
      }
      return wantsPubs ? "Dinner at local pub" : `Dinner in ${loc}`;
    };

    const pickAct = (pool, dayIdx, avoid) => {
      if (!pool || pool.length === 0) return null;
      let act = pool[dayIdx % pool.length];
      if (avoid && avoid.test(act.toLowerCase())) {
        act = pool.find(a => !avoid.test(a.toLowerCase())) || act;
      }
      return act;
    };
    const steepTest = wantsAvoidSteep ? /hik|trail|climb|trek|summit|ridge/ : null;

    // ─── GENERATE EACH DAY ───
    const days = {};
    // Track which activities we've used per location to avoid repeats
    const usedActIdx = {};
    const nextActIdx = (loc, pool) => {
      const key = loc + pool;
      usedActIdx[key] = (usedActIdx[key] || 0) + 1;
      return usedActIdx[key] - 1;
    };

    for (let d = 1; d <= numDays; d++) {
      const items = [];
      const isFirst = d === 1;
      const isLast = d === numDays;
      const { place: loc, stayName, prevPlace, isTransit } = dayMap[d];
      const locPools = getLocPools(loc);
      const kidPool = locPools.kids || [`Family activity in ${loc}`, "Nature walk", "Playground"];

      if (isFirst) {
        // ── Day 1: Journey + arrival ──
        const travelHrs = estimateTravelHours(trip.startLocation || "", loc);
        const evTime = isEV ? (enabledStops.filter(s => s.type === "ev_charge" && s.enabled).length * 0.5) : 0;
        const totalTravelHrs = travelHrs + evTime;
        const arrivalHour = Math.min(Math.floor(startHour + startMin / 60 + totalTravelHrs), 22);
        const arrivalMin = Math.round((totalTravelHrs % 1) * 60);
        const remainingHours = 22 - arrivalHour;

        if (trip.startLocation) {
          const tLabel = travelHrs >= 1 ? `~${Math.round(travelHrs * 10) / 10} hrs` : `~${Math.round(travelHrs * 60)} min`;
          items.push({ time: fmtTime(startHour, startMin), title: `Depart ${trip.startLocation}`, desc: `${travelMode} · ${tLabel} to ${loc}${isEV ? " · Full charge before departure" : ""}`, group: "Everyone", color: T.a });
        }

        // Stopovers
        const midHour = startHour + Math.floor(travelHrs / 2);
        const firstLegStops = enabledStops.filter(s => s.desc && s.desc.includes(trip.startLocation) && s.desc.includes(loc));
        firstLegStops.filter(s => s.type === "ev_charge").forEach((stop, si) => {
          items.push({ time: fmtTime(Math.max(Math.min(midHour + si, arrivalHour - 1), startHour + 1)), title: `⚡ Charge & Refresh`, desc: `${stop.desc} · ~30 min rapid charge · Grab coffee & snacks while charging`, group: "Everyone", color: T.amber, evSearch: { from: trip.startLocation, to: loc } });
        });
        firstLegStops.filter(s => s.type === "rest").forEach((stop, si) => {
          items.push({ time: fmtTime(Math.max(Math.min(midHour + si, arrivalHour - 1), startHour + 1)), title: `☕ Rest stop`, desc: `${stop.desc} · Quick break`, group: "Everyone", color: T.amber });
        });

        items.push({ time: fmtTime(arrivalHour, arrivalMin), title: `Arrive ${loc}`, desc: `Check in at ${stayName} · Drop bags, freshen up`, group: "Everyone", color: T.a });

        // Afternoon activities based on remaining time + pace
        if (!isRelaxed && remainingHours >= 2) {
          const exploreHr = Math.min(arrivalHour + 1, 18);
          const idx = nextActIdx(loc, "m");
          const act = pickAct(locPools.morning, idx, steepTest) || `Explore ${loc}`;
          items.push({ time: fmtTime(exploreHr), title: act, desc: tags(`${loc} · ${budgetTier.label}`), group: hasKids ? "Adults" : "Everyone", color: T.blue });
          if (hasKids) {
            const kidAct = pickAct(kidPool, nextActIdx(loc, "k"), null) || `Family time in ${loc}`;
            items.push({ time: fmtTime(exploreHr), title: kidAct, desc: tags(`${loc} · Family-friendly`), group: "Kids", color: T.pink });
          }
          if (isPacked && remainingHours >= 4) {
            const lunchHr = Math.min(exploreHr + 2, 15);
            items.push({ time: fmtTime(lunchHr), title: `Lunch — ${foodLabel}`, desc: `${budgetTier.label} ${wantsPubs ? "pub" : "restaurant"} · ${budgetTier.price}`, group: "Everyone", color: T.coral });
            if (remainingHours >= 6) {
              const pmAct = pickAct(locPools.afternoon, nextActIdx(loc, "a"), steepTest) || `Stroll around ${loc}`;
              items.push({ time: fmtTime(Math.min(lunchHr + 2, 17)), title: pmAct, desc: tags(`${loc} · Afternoon`), group: "Everyone", color: T.blue });
            }
          }
        } else if (isRelaxed && remainingHours >= 3) {
          items.push({ time: fmtTime(Math.min(arrivalHour + 1, 18)), title: `Gentle stroll around ${loc}`, desc: tags(`Take it easy after the journey`), group: "Everyone", color: T.blue });
        }

        const dinnerHr = Math.max(arrivalHour + 2, 18);
        items.push({ time: fmtTime(Math.min(dinnerHr, 20)), title: buildDinnerTitle(loc, 0), desc: `${foodLabel} · ${budgetTier.label} · ${budgetTier.price}${wantsDogFriendly ? " · 🐕 Dog-friendly" : ""}`, group: "Everyone", color: T.coral });

      } else if (isLast && numDays > 1) {
        // ── Last day: Departure ──
        // For base camp: depart from base location, not the last day-trip place
        const dayInfo = dayMap[d];
        const departureLoc = dayInfo.isBaseCamp ? dayInfo.baseLoc : loc;
        const departureStay = dayInfo.isBaseCamp ? dayInfo.baseStayName : stayName;
        const returnHrs = estimateTravelHours(departureLoc, trip.startLocation || "");
        const rLabel = returnHrs >= 1 ? `~${Math.round(returnHrs * 10) / 10} hrs` : `~${Math.round(returnHrs * 60)} min`;
        items.push({ time: fmtTime(8), title: "Breakfast", desc: departureStay, group: "Everyone", color: T.coral });
        items.push({ time: fmtTime(9, 30), title: "Check out & pack", desc: `${departureStay} · Bags ready`, group: "Everyone", color: T.t3 });
        const lastAct = pickAct(locPools.morning, nextActIdx(departureLoc, "m"), steepTest) || `Farewell stroll in ${departureLoc}`;
        items.push({ time: fmtTime(10), title: lastAct, desc: tags(`${departureLoc} · Final morning`), group: "Everyone", color: T.blue });
        if (hasKids) {
          const kidAct = pickAct(kidPool, nextActIdx(departureLoc, "k"), null);
          if (kidAct) items.push({ time: fmtTime(10), title: kidAct, desc: tags(`${departureLoc} · Last day fun`), group: "Kids", color: T.pink });
        }
        items.push({ time: fmtTime(12), title: "Lunch & depart", desc: `${foodLabel} · ${budgetTier.price} · Then ${travelMode.toLowerCase()} home (${rLabel})`, group: "Everyone", color: T.coral });
        if (trip.startLocation) {
          items.push({ time: fmtTime(14), title: `🚗 ${travelMode} home`, desc: `${departureLoc} → ${trip.startLocation} · ${rLabel}${isEV ? " · Plan charging stop" : ""}`, group: "Everyone", color: T.a });
          if (isEV) {
            items.push({ time: fmtTime(14 + Math.floor(returnHrs / 2)), title: `⚡ Charge & Lunch Stop`, desc: `Service station en route · ~30 min rapid charge · Grab a meal while charging`, group: "Everyone", color: T.amber, evSearch: { from: departureLoc, to: trip.startLocation } });
          }
          const arriveHomeHr = Math.min(14 + Math.ceil(returnHrs) + (isEV ? 1 : 0), 23);
          items.push({ time: fmtTime(arriveHomeHr), title: `🏠 Arrive home`, desc: `Back in ${trip.startLocation} · Trip complete! Unpack & rest`, group: "Everyone", color: "#1B8F6A" });
        }

      } else {
        // ── Middle day: base camp day trip, transit, or full exploration ──
        const dayInfo = dayMap[d];

        if (dayInfo.isDayTrip && dayInfo.baseLoc) {
          // ── BASE CAMP DAY TRIP ──
          // Drive from base → visit place → drive back to base
          const legHrs = estimateTravelHours(dayInfo.baseLoc, loc);
          const legLabel = legHrs >= 1 ? `~${Math.round(legHrs * 10) / 10} hrs` : `~${Math.round(legHrs * 60)} min`;
          const departHr = startHour;

          items.push({ time: fmtTime(departHr), title: "Breakfast", desc: dayInfo.baseStayName, group: "Everyone", color: T.coral });
          items.push({ time: fmtTime(departHr + 1), title: `🚗 Day trip to ${loc}`, desc: `${dayInfo.baseLoc} → ${loc} · ${legLabel}${isEV ? " · Check charge level" : ""}`, group: "Everyone", color: T.a });

          if (isEV && legHrs >= 1.5) {
            const evHr = departHr + 1 + Math.floor(legHrs / 2);
            items.push({ time: fmtTime(evHr), title: `⚡ Charge & Coffee Stop`, desc: `En route to ${loc} · ~30 min rapid charge`, group: "Everyone", color: T.amber, evSearch: { from: dayInfo.baseLoc, to: loc } });
          }

          const arriveHr = Math.min(Math.floor(departHr + 1 + legHrs + (isEV && legHrs >= 1.5 ? 0.5 : 0)), 13);
          items.push({ time: fmtTime(arriveHr), title: `Arrive ${loc}`, desc: `Day trip — exploring ${loc}`, group: "Everyone", color: T.a });

          // Activities at the day trip destination
          const mIdx = nextActIdx(loc, "m");
          const morningAct = pickAct(locPools.morning, mIdx, steepTest) || `Explore ${loc}`;
          items.push({ time: fmtTime(Math.min(arriveHr + 0.5, 12)), title: morningAct, desc: tags(`${loc} · ${budgetTier.label}`), group: hasKids ? "Adults" : "Everyone", color: T.blue });
          if (hasKids) {
            const kidAct = pickAct(kidPool, nextActIdx(loc, "k"), null) || `Family time in ${loc}`;
            items.push({ time: fmtTime(Math.min(arriveHr + 0.5, 12)), title: kidAct, desc: tags(`${loc} · Family-friendly`), group: "Kids", color: T.pink });
          }

          items.push({ time: fmtTime(13), title: `Lunch in ${loc}`, desc: `${foodLabel} · ${budgetTier.label} · ${budgetTier.price}`, group: "Everyone", color: T.coral });

          const pmAct = pickAct(locPools.afternoon, nextActIdx(loc, "a"), steepTest) || `Afternoon in ${loc}`;
          items.push({ time: fmtTime(14, 30), title: pmAct, desc: tags(`${loc} · Afternoon`), group: hasKids ? "Adults" : "Everyone", color: T.blue });
          if (hasKids) {
            const kidPmAct = pickAct(kidPool, nextActIdx(loc, "k"), null) || "Free play";
            items.push({ time: fmtTime(14, 30), title: kidPmAct, desc: tags(`${loc} · Fun for kids`), group: "Kids", color: T.pink });
          }

          // Return to base
          const returnDepartHr = 16;
          items.push({ time: fmtTime(returnDepartHr), title: `🚗 Return to ${dayInfo.baseLoc}`, desc: `${loc} → ${dayInfo.baseLoc} · ${legLabel}`, group: "Everyone", color: T.a });
          if (isEV && legHrs >= 1.5) {
            items.push({ time: fmtTime(returnDepartHr + Math.floor(legHrs / 2)), title: `⚡ Charge & Refresh`, desc: `En route back · ~30 min rapid charge`, group: "Everyone", color: T.amber, evSearch: { from: loc, to: dayInfo.baseLoc } });
          }
          const returnArriveHr = Math.min(Math.floor(returnDepartHr + legHrs + (isEV && legHrs >= 1.5 ? 0.5 : 0)), 20);
          items.push({ time: fmtTime(returnArriveHr), title: `Back at ${dayInfo.baseStayName}`, desc: `Freshen up · Relax`, group: "Everyone", color: T.t3 });

        } else if (isTransit) {
          // ── Transit day: move to new location + explore afternoon ──
          const legHrs = estimateTravelHours(prevPlace, loc);
          const legLabel = legHrs >= 1 ? `~${Math.round(legHrs * 10) / 10} hrs` : `~${Math.round(legHrs * 60)} min`;
          const prevStay = dayMap[d - 1]?.stayName || "accommodation";
          items.push({ time: fmtTime(8), title: "Breakfast & check out", desc: `${prevStay} · Pack up & say goodbye to ${prevPlace}`, group: "Everyone", color: T.coral });
          items.push({ time: fmtTime(9, 30), title: `${travelMode} to ${loc}`, desc: `${prevPlace} → ${loc} · ${legLabel}${isEV ? " · Check charge level" : ""}`, group: "Everyone", color: T.a });
          if (isEV && legHrs >= 2) {
            const evHr = Math.min(9 + Math.floor(legHrs / 2), 13);
            items.push({ time: fmtTime(evHr, 30), title: `⚡ Charge & Coffee Stop`, desc: `Service station en route to ${loc} · ~30 min rapid charge · Stretch & refresh`, group: "Everyone", color: T.amber, evSearch: { from: prevPlace, to: loc } });
          }
          const arriveHr = Math.min(Math.floor(9.5 + legHrs + (isEV && legHrs >= 2 ? 0.5 : 0)), 16);
          items.push({ time: fmtTime(arriveHr), title: `Arrive ${loc}`, desc: `Check in at ${stayName} · Settle in`, group: "Everyone", color: T.a });

          // Afternoon in new location
          const freeHr = Math.min(arriveHr + 1, 15);
          const pmAct = pickAct(locPools.afternoon, nextActIdx(loc, "a"), steepTest) || `Explore ${loc}`;
          items.push({ time: fmtTime(freeHr), title: pmAct, desc: tags(`${loc} · First impressions`), group: hasKids ? "Adults" : "Everyone", color: T.blue });
          if (hasKids) {
            const kidAct = pickAct(kidPool, nextActIdx(loc, "k"), null) || `Family time in ${loc}`;
            items.push({ time: fmtTime(freeHr), title: kidAct, desc: tags(`${loc} · Family-friendly`), group: "Kids", color: T.pink });
          }
        } else {
          // ── Full day in same location ──
          items.push({ time: fmtTime(8), title: "Breakfast", desc: stayName, group: "Everyone", color: T.coral });
          const mIdx = nextActIdx(loc, "m");
          const morningAct = pickAct(locPools.morning, mIdx, steepTest) || `Explore ${loc}`;
          if (hasKids) {
            items.push({ time: fmtTime(10), title: morningAct, desc: tags(`${loc} · ${budgetTier.label}`), group: "Adults", color: T.blue });
            const kidAct = pickAct(kidPool, nextActIdx(loc, "k"), null) || `Family time in ${loc}`;
            items.push({ time: fmtTime(10), title: kidAct, desc: tags(`${loc} · Family-friendly`), group: "Kids", color: T.pink });
          } else {
            items.push({ time: fmtTime(10), title: morningAct, desc: tags(`${loc} · ${budgetTier.label}`), group: "Everyone", color: T.blue });
          }
          items.push({ time: fmtTime(12, 30), title: `Lunch — ${foodLabel}`, desc: `${budgetTier.label} ${wantsPubs ? "pub" : "restaurant"} · ${budgetTier.price}${wantsDogFriendly ? " · 🐕 Dog-friendly" : ""}`, group: "Everyone", color: T.coral });
          const pmAct = pickAct(locPools.afternoon, nextActIdx(loc, "a"), steepTest) || "Afternoon activity";
          if (hasKids) {
            items.push({ time: fmtTime(14, 30), title: pmAct, desc: tags(`${loc} · Afternoon`), group: "Adults", color: T.blue });
            const kidPmAct = pickAct(kidPool, nextActIdx(loc, "k"), null) || "Free play";
            items.push({ time: fmtTime(14, 30), title: kidPmAct, desc: tags(`${loc} · Fun for kids`), group: "Kids", color: T.pink });
          } else {
            items.push({ time: fmtTime(14, 30), title: pmAct, desc: tags(`${loc} · Afternoon`), group: "Everyone", color: T.blue });
          }
          items.push({ time: fmtTime(17), title: `Return to ${stayName}`, desc: "Relax & freshen up", group: "Everyone", color: T.t3 });
        }

        items.push({ time: fmtTime(19), title: buildDinnerTitle(loc, d - 1), desc: `${foodLabel} · ${budgetTier.label} · ${budgetTier.price}${wantsDogFriendly ? " · 🐕 Dog-friendly" : ""}`, group: "Everyone", color: T.coral });
      }

      days[d] = items;
    }
    return days;
  };

  const generateAndSetTimeline = async (id) => {
    const trip = createdTrips.find(t => t.id === id);
    if (!trip) return;
    const timeline = generateMultiDayTimeline(trip);

    // Enrich EV charging stops with real locations from Places API
    const evItems = [];
    Object.entries(timeline).forEach(([day, items]) => {
      items.forEach((item, idx) => {
        if (item.evSearch) evItems.push({ day: parseInt(day), idx, from: item.evSearch.from, to: item.evSearch.to });
      });
    });

    if (evItems.length > 0) {
      try {
        const enriched = await Promise.all(evItems.map(async (ev) => {
          const query = `EV charging station with cafe between ${ev.from} and ${ev.to}`;
          const res = await fetch("/api/places", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, type: "electric_vehicle_charging_station" }),
          });
          const data = await res.json();
          if (res.ok && data.places?.length > 0) {
            const station = data.places[0];
            return { ...ev, station };
          }
          return ev;
        }));

        enriched.forEach(ev => {
          if (ev.station) {
            const s = ev.station;
            const rating = s.rating ? ` · ${s.rating}★` : "";
            timeline[ev.day][ev.idx].title = `⚡ ${s.name}`;
            timeline[ev.day][ev.idx].desc = `${s.address} · Rapid charge ~30 min · Grab food & coffee while charging${rating}`;
          }
        });
      } catch (e) { /* Places API unavailable — keep generic descriptions */ }
    }

    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== id) return t;
      return { ...t, timeline };
    }));
    showToast("Itinerary generated!");
  };

  // Smart route ordering: use stay check-in dates to order places logically
  const getSmartRouteOrder = (trip) => {
    const places = trip?.places || [];
    const stays = trip?.stays || [];
    if (places.length <= 1 || stays.length === 0) return places;
    // Build a map of place → earliest check-in date from stays
    const placeCheckIn = {};
    stays.forEach(s => {
      if (s.location && s.checkIn) {
        const loc = s.location.toLowerCase();
        const existing = placeCheckIn[loc];
        if (!existing || s.checkIn < existing) placeCheckIn[loc] = s.checkIn;
      }
    });
    // Sort places by their stay check-in date; places without stays go last
    const sorted = [...places].sort((a, b) => {
      const dateA = placeCheckIn[a.toLowerCase()];
      const dateB = placeCheckIn[b.toLowerCase()];
      if (dateA && dateB) return dateA.localeCompare(dateB);
      if (dateA) return -1;
      if (dateB) return 1;
      return 0;
    });
    return sorted;
  };

  // Build the FULL route from stays (includes locations not in trip.places)
  // Returns ordered unique locations derived from stays sorted by check-in
  const getFullRouteFromStays = (trip) => {
    const stays = trip?.stays || [];
    if (stays.length === 0) return trip?.places || [];
    // Sort stays by check-in date
    const sorted = [...stays].filter(s => s.checkIn && s.location).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    if (sorted.length === 0) return trip?.places || [];
    // Extract unique locations in order
    const seen = new Set();
    const route = [];
    sorted.forEach(s => {
      const loc = s.location;
      const key = loc.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        route.push(loc);
      }
    });
    // Also include any trip.places not covered by stays (append at end)
    (trip?.places || []).forEach(p => {
      if (!seen.has(p.toLowerCase())) {
        seen.add(p.toLowerCase());
        route.push(p);
      }
    });
    return route;
  };

  const makeTripLive = (id) => {
    const trip = createdTrips.find(t => t.id === id);
    const isEV = trip?.travel?.some(m => /ev/i.test(m));
    const places = getSmartRouteOrder(trip);
    const startLoc = trip?.startLocation || "";
    // Build smart stopovers: midpoint charging for EV, scenic break for others
    const autoStops = [];
    if (places.length > 0 && startLoc) {
      if (isEV) {
        autoStops.push({ type: "ev_charge", label: `EV charge & refreshments`, desc: `Service station between ${startLoc} and ${places[0]}`, time: "~1.5 hrs into journey", enabled: true, combineMeal: true });
      } else {
        autoStops.push({ type: "rest", label: "Rest & coffee stop", desc: `Between ${startLoc} and ${places[0]}`, time: "~1.5 hrs into journey", enabled: true, combineMeal: false });
      }
    }
    // If multi-place trip, suggest stops between places
    for (let i = 0; i < places.length - 1; i++) {
      if (isEV) {
        autoStops.push({ type: "ev_charge", label: `EV charge & refreshments`, desc: `Service station between ${places[i]} and ${places[i + 1]}`, time: "En route", enabled: true, combineMeal: true });
      }
    }
    setPendingActivationTripId(id);
    setActivationPrefs({ startTime: "08:00", dayOnePace: "balanced", notes: "", stopovers: autoStops });
    setShowActivationModal(true);
  };

  const confirmActivation = async () => {
    const id = pendingActivationTripId;
    if (!id) return;
    const trip = createdTrips.find(t => t.id === id);
    if (!trip) return;

    updateTripStatusInDB(trip.dbId || trip.id, 'live');
    const updated = { ...trip, status: "live", activationPrefs: { ...activationPrefs } };
    updated.timeline = generateMultiDayTimeline(updated);

    // Enrich EV charging stops with real locations
    const evItems = [];
    Object.entries(updated.timeline).forEach(([day, items]) => {
      items.forEach((item, idx) => {
        if (item.evSearch) evItems.push({ day: parseInt(day), idx, from: item.evSearch.from, to: item.evSearch.to });
      });
    });
    if (evItems.length > 0) {
      try {
        const enriched = await Promise.all(evItems.map(async (ev) => {
          const query = `EV charging station with cafe between ${ev.from} and ${ev.to}`;
          const res = await fetch("/api/places", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, type: "electric_vehicle_charging_station" }),
          });
          const data = await res.json();
          if (res.ok && data.places?.length > 0) return { ...ev, station: data.places[0] };
          return ev;
        }));
        enriched.forEach(ev => {
          if (ev.station) {
            const s = ev.station;
            const rating = s.rating ? ` · ${s.rating}★` : "";
            updated.timeline[ev.day][ev.idx].title = `⚡ ${s.name}`;
            updated.timeline[ev.day][ev.idx].desc = `${s.address} · Rapid charge ~30 min · Grab food & coffee while charging${rating}`;
          }
        });
      } catch (e) { /* fallback to generic */ }
    }

    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== id) return { ...t, status: t.status === "live" ? "new" : t.status };
      return updated;
    }));
    setShowActivationModal(false);
    setPendingActivationTripId(null);
    setSelectedDay(1);
    setTripDetailTab("itinerary");
    // Navigate to trip detail
    setSelectedCreatedTrip(updated);
    setEditingTimelineIdx(null);
    setTripChatMessages([]);
    setTripChatInput("");
    loadTripMessages(updated.dbId);
    loadExpenses(updated.dbId);
    loadTripPhotos(updated.dbId);
    navigate("createdTrip");
    // Chat nudge — delayed so the user sees the itinerary first
    setTimeout(() => {
      showToast("Want to refine this itinerary? Switch to the Chat tab and tell me what to change!");
    }, 1500);
  };

  const viewCreatedTrip = (trip) => {
    setSelectedCreatedTrip(trip);
    setEditingTimelineIdx(null);
    setTripChatMessages([]);
    setTripChatInput("");
    setTripDetailTab("itinerary");
    setSelectedDay(1);
    loadTripMessages(trip.dbId);
    loadExpenses(trip.dbId);
    loadTripPhotos(trip.dbId);
    navigate("createdTrip");
  };

  const updateTimelineItem = (tripId, idx, field, value) => {
    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const tl = t.timeline || {};
      const dayItems = (tl[selectedDay] || []).map((item, i) => i === idx ? { ...item, [field]: value } : item);
      return { ...t, timeline: { ...tl, [selectedDay]: dayItems } };
    }));
  };

  const deleteTimelineItem = (tripId, idx) => {
    const trip = createdTrips.find(t => t.id === tripId);
    const item = trip?.timeline?.[selectedDay]?.[idx];
    if (!window.confirm(`Remove "${item?.title || "this item"}" from Day ${selectedDay}?`)) return;
    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const tl = t.timeline || {};
      return { ...t, timeline: { ...tl, [selectedDay]: (tl[selectedDay] || []).filter((_, i) => i !== idx) } };
    }));
    setEditingTimelineIdx(null);
    showToast("Item removed");
  };

  const moveTimelineItem = (tripId, idx, direction) => {
    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const tl = t.timeline || {};
      const items = [...(tl[selectedDay] || [])];
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= items.length) return t;
      [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
      return { ...t, timeline: { ...tl, [selectedDay]: items } };
    }));
    setEditingTimelineIdx(null);
  };

  const addTimelineItem = (tripId) => {
    let newIdx = 0;
    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const tl = t.timeline || {};
      const existing = tl[selectedDay] || [];
      newIdx = existing.length;
      const newItem = { time: "12:00 PM", title: "New activity", desc: "Tap to edit details", group: "Everyone", color: T.blue };
      return { ...t, timeline: { ...tl, [selectedDay]: [...existing, newItem] } };
    }));
    // Open the new item for editing and scroll to it
    setEditingTimelineIdx(newIdx);
    setTimeout(() => {
      const el = document.querySelector(`[data-timeline-idx="${newIdx}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // Helper: get items for current day from timeline (supports both old array and new day-keyed format)
  const getDayItems = (timeline, day) => {
    if (!timeline) return [];
    if (Array.isArray(timeline)) return day === 1 ? timeline : [];
    return timeline[day] || [];
  };

  const getNumDays = (trip) => {
    if (!trip.timeline) return 0;
    if (Array.isArray(trip.timeline)) return trip.timeline.length > 0 ? 1 : 0;
    return Object.keys(trip.timeline).length;
  };

  const hasTimeline = (trip) => {
    if (!trip.timeline) return false;
    if (Array.isArray(trip.timeline)) return trip.timeline.length > 0;
    return Object.keys(trip.timeline).length > 0 && Object.values(trip.timeline).some(d => d.length > 0);
  };

  const handleTripChat = async (tripId) => {
    const msg = tripChatInput.trim();
    if (!msg) return;
    setTripChatMessages(prev => [...prev, { role: "user", text: msg }]);
    setTripChatInput("");
    setTripChatTyping(true);
    const trip = createdTrips.find(t => t.id === tripId);
    saveChatMessage(trip?.dbId, 'user', msg, user?.user_metadata?.full_name || user?.email || 'You');
    const loc = trip?.places?.join(", ") || "your destination";
    // Determine current location based on selected day + stays (not always first place)
    const currentDayLoc = (() => {
      const stays = trip?.stays || [];
      if (stays.length > 0 && trip?.rawStart) {
        const sorted = [...stays].filter(s => s.checkIn && s.location).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
        const tripStart = new Date(trip.rawStart + "T12:00:00");
        const dayDateStr = new Date(tripStart.getTime() + (selectedDay - 1) * 86400000).toISOString().split("T")[0];
        let matched = sorted.find(s => s.checkIn <= dayDateStr && s.checkOut > dayDateStr);
        if (!matched) matched = sorted.find(s => s.checkIn === dayDateStr);
        if (!matched && selectedDay === 1) matched = sorted[0];
        if (matched?.location) return matched.location;
      }
      // Fallback: cycle through places by day
      const places = trip?.places || [];
      if (places.length > 0) return places[(selectedDay - 1) % places.length];
      return "your destination";
    })();
    const firstLoc = currentDayLoc;
    const budget = trip?.budget || "";
    const summary = trip?.summary || buildTripSummary(trip || {});
    const instructions = trip?.prefs?.instructions || "";
    const allKids = [...(trip?.travellers?.olderKids || []), ...(trip?.travellers?.youngerKids || [])];
    const hasKids = allKids.length > 0;
    const kidNames = allKids.map(k => `${k.name} (${k.age})`).join(", ");
    const budgetLabel = { "Budget": "budget-friendly", "Mid-range": "mid-range", "Luxury": "upscale", "No limit": "top-rated" }[budget] || "local";
    const foodPref = trip?.prefs?.food?.length > 0 ? trip.prefs.food.join(", ") : "local cuisine";
    const ctxLower = summary.toLowerCase();
    const wantsDog = /dog|pet/.test(ctxLower);
    const wantsAccessible = /accessible|wheelchair|mobility/.test(ctxLower);
    const wantsPubs = /pub|pubs|tavern/.test(ctxLower);

    // Keep context line short — don't dump full summary into every message
    const placesStr = trip?.places?.join(", ") || "your trip";
    const contextLine = "";
    const lower = msg.toLowerCase();

    // ── EV charger queries — always use current GPS location + Places API ──
    if (/ev|charger|charging|charge point|charge station/i.test(lower) && !/add|schedule|time/.test(lower)) {
      setTripChatMessages(prev => [...prev, { role: "ai", text: "📍 Finding EV chargers near you..." }]);
      const handleEvResults = async (lat, lng, locLabel) => {
        try {
          // If we have GPS coords, use nearby search (location + type, no query)
          // If no GPS, use text search with location name in query (no type filter)
          const body = lat && lng
            ? { location: { lat, lng }, type: "electric_vehicle_charging_station", radius: 15000 }
            : { query: `EV charging stations near ${firstLoc}`, radius: 15000 };
          const res = await fetch("/api/places", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (res.ok && data.places?.length > 0) {
            const chargers = data.places.slice(0, 5);
            const list = chargers.map((p, i) => {
              const stars = p.rating ? ` · ${p.rating}★` : "";
              const status = p.openNow === true ? " · Open now" : p.openNow === false ? " · Closed" : "";
              const mapLink = `https://www.google.com/maps/place/?q=place_id:${p.placeId}`;
              return `${i + 1}. **${p.name}**${stars}${status}\n   ${p.address}\n   [Navigate in Maps](${mapLink})`;
            }).join("\n\n");
            return `⚡ **EV Chargers near ${locLabel}:**\n\n${list}\n\n💡 **Tips:**\n• Check connector type (CCS/CHAdeMO/Type 2) before heading there\n• Rapid chargers (50kW+) get you to 80% in ~30 min\n• Use Zap-Map app for real-time availability`;
          }
        } catch (e) { /* fallback below */ }
        return `⚡ I couldn't find chargers via search. Try [Zap-Map](https://www.zap-map.com/live/) or [Open Charge Map](https://openchargemap.org/) for real-time EV charger availability near ${locLabel}.`;
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const reply = await handleEvResults(pos.coords.latitude, pos.coords.longitude, "your location");
            setTripChatTyping(false);
            setTripChatMessages(prev => {
              const updated = [...prev];
              const idx = updated.findLastIndex(m => m.text === "📍 Finding EV chargers near you...");
              if (idx >= 0) updated[idx] = { role: "ai", text: reply };
              else updated.push({ role: "ai", text: reply });
              return updated;
            });
          },
          async () => {
            // Location denied — search near trip destination instead
            const reply = await handleEvResults(null, null, firstLoc);
            setTripChatTyping(false);
            setTripChatMessages(prev => {
              const updated = [...prev];
              const idx = updated.findLastIndex(m => m.text === "📍 Finding EV chargers near you...");
              if (idx >= 0) updated[idx] = { role: "ai", text: reply };
              else updated.push({ role: "ai", text: reply });
              return updated;
            });
          },
          { enableHighAccuracy: false, timeout: 8000 }
        );
      } else {
        const reply = await handleEvResults(null, null, firstLoc);
        setTripChatTyping(false);
        setTripChatMessages(prev => {
          const updated = [...prev];
          const idx = updated.findLastIndex(m => m.text === "📍 Finding EV chargers near you...");
          if (idx >= 0) updated[idx] = { role: "ai", text: reply };
          else updated.push({ role: "ai", text: reply });
          return updated;
        });
      }
      return; // Handled — don't fall through to Claude API
    }

    // ── "Nearby" queries (restaurants, food, cafes, activities, petrol) — use GPS + Places API ──
    const isNearbyQuery = /nearby|nearest|near me|near here|around me|close by|closest/i.test(lower);
    const isPlaceQuery = /restaurant|food|eat|dining|cafe|coffee|pub|bar|pizza|burger|takeaway|lunch|dinner|breakfast|brunch|supermarket|petrol|fuel|pharmacy|hospital|atm/i.test(lower);
    if (isNearbyQuery || (isPlaceQuery && isNearbyQuery)) {
      // Determine search type from the query
      const searchType = /cafe|coffee/i.test(lower) ? "cafe"
        : /pub|bar/i.test(lower) ? "bar"
        : /supermarket|grocery/i.test(lower) ? "supermarket"
        : /petrol|fuel|gas station/i.test(lower) ? "gas_station"
        : /pharmacy|chemist/i.test(lower) ? "pharmacy"
        : /hospital|a&e|emergency/i.test(lower) ? "hospital"
        : /atm|cash/i.test(lower) ? "atm"
        : "restaurant";
      const searchLabel = searchType === "gas_station" ? "petrol stations" : searchType + "s";
      const searchIcon = /cafe|coffee/i.test(lower) ? "☕" : /pub|bar/i.test(lower) ? "🍺" : /supermarket/i.test(lower) ? "🛒" : /petrol|fuel|gas/i.test(lower) ? "⛽" : "🍽️";

      setTripChatMessages(prev => [...prev, { role: "ai", text: `📍 Finding ${searchLabel} near you...` }]);

      const handleNearbyResults = async (lat, lng, locLabel) => {
        try {
          const body = lat && lng
            ? { location: { lat, lng }, type: searchType, radius: 5000 }
            : { query: `${searchType} near ${firstLoc}`, radius: 5000 };
          const res = await fetch("/api/places", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (res.ok && data.places?.length > 0) {
            const results = data.places.slice(0, 6);
            const list = results.map((p, i) => {
              const stars = p.rating ? ` · ${p.rating}★` : "";
              const price = p.priceLevel || "";
              const status = p.openNow === true ? " · **Open now**" : p.openNow === false ? " · Closed" : "";
              const mapLink = `https://www.google.com/maps/place/?q=place_id:${p.placeId}`;
              return `${i + 1}. **${p.name}** ${price}${stars}${status}\n   ${p.address}\n   [Navigate in Maps](${mapLink})`;
            }).join("\n\n");
            return `${searchIcon} **${searchLabel.charAt(0).toUpperCase() + searchLabel.slice(1)} near ${locLabel}:**\n\n${list}\n\n💡 *Say "Add [name] to Day ${selectedDay}" to include in your itinerary*`;
          }
        } catch (e) { /* fallback below */ }
        return `${searchIcon} Couldn't find ${searchLabel} via search. Try [Google Maps](https://www.google.com/maps/search/${encodeURIComponent(searchType + " near me")}) for real-time results near you.`;
      };

      const updateNearbyChat = (reply) => {
        setTripChatTyping(false);
        setTripChatMessages(prev => {
          const updated = [...prev];
          const idx = updated.findLastIndex(m => m.text.includes(`Finding ${searchLabel} near you`));
          if (idx >= 0) updated[idx] = { role: "ai", text: reply };
          else updated.push({ role: "ai", text: reply });
          return updated;
        });
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => updateNearbyChat(await handleNearbyResults(pos.coords.latitude, pos.coords.longitude, "your location")),
          async () => updateNearbyChat(await handleNearbyResults(null, null, firstLoc)),
          { enableHighAccuracy: false, timeout: 8000 }
        );
      } else {
        handleNearbyResults(null, null, firstLoc).then(updateNearbyChat);
      }
      return;
    }

    // Try Claude API first for richer, context-aware responses
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          tripContext: {
            tripName: trip?.name,
            dates: trip?.start && trip?.end ? `${trip.start} – ${trip.end}` : null,
            places: trip?.places,
            travelMode: trip?.travel?.join(", "),
            travellers: trip?.travellers,
            stays: trip?.stays,
            prefs: trip?.prefs,
            budget,
            currentLocation: firstLoc,
            currentDay: selectedDay,
          },
          chatHistory: tripChatMessages.slice(-8),
        }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setTripChatTyping(false);
        setTripChatMessages(prev => [...prev, { role: "ai", text: data.reply }]);
        saveChatMessage(trip?.dbId, 'ai', data.reply);
        return;
      }
    } catch (e) { /* API unavailable — fall back to local */ }

    // Local fallback
    setTimeout(async () => {
      let reply = "";
      const lower = msg.toLowerCase();
      if (lower.includes("restaurant") || lower.includes("food") || lower.includes("eat") || lower.includes("lunch") || lower.includes("dinner") || lower.includes("nearby")) {
        // Use Places API for real restaurant search — always try GPS first
        const extras = [];
        if (wantsDog) extras.push("🐕 dog-friendly");
        if (wantsAccessible) extras.push("♿ accessible");
        if (hasKids) extras.push("👧 kids' menus");
        const filterStr = extras.length > 0 ? `\nFiltering for: ${extras.join(", ")}` : "";
        const searchQuery = `${budgetLabel} ${foodPref} restaurants ${hasKids ? "family friendly" : ""} in ${firstLoc}`;

        // Always try GPS first for restaurant searches — traveller might be en route
        const doPlacesSearch = async (gpsLat, gpsLng) => {
          const body = { query: searchQuery, type: "restaurant" };
          if (gpsLat && gpsLng) { body.location = { lat: gpsLat, lng: gpsLng }; body.radius = 5000; }
          const placesRes = await fetch("/api/places", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          return placesRes;
        };

        // Try Places API — always attempt GPS first, fall back to location name
        try {
          let placesRes;
          let usedGps = false;
          if (navigator.geolocation) {
            try {
              const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }));
              placesRes = await doPlacesSearch(pos.coords.latitude, pos.coords.longitude);
              usedGps = true;
            } catch (gpsErr) {
              placesRes = await doPlacesSearch(null, null);
            }
          } else {
            placesRes = await doPlacesSearch(null, null);
          }
          const placesData = await placesRes.json();
          if (placesRes.ok && placesData.places?.length > 0) {
            const top5 = placesData.places.slice(0, 5);
            const placesList = top5.map((p, i) => {
              const stars = p.rating ? `${p.rating}★` : "";
              const price = p.priceLevel || "";
              const status = p.openNow === true ? "Open now" : p.openNow === false ? "Closed" : "";
              const mapLink = `https://www.google.com/maps/place/?q=place_id:${p.placeId}`;
              return `${i + 1}. **${p.name}** ${stars} ${price}\n   ${p.address}${status ? ` · ${status}` : ""}\n   [View on Maps](${mapLink})`;
            }).join("\n\n");

            const locNote = usedGps ? "your current location" : firstLoc;
            reply = `🍽️ **Top restaurants near ${locNote}** (Day ${selectedDay}, ${foodPref}):${filterStr}\n\n${placesList}\n\n📍 *Results based on ${usedGps ? "your GPS location" : "trip destination"}*\n\n💡 Say **"Add [name] to Day ${selectedDay}"** to plug it into your itinerary!`;
            setTripChatTyping(false);
            setTripChatMessages(prev => [...prev, { role: "ai", text: reply }]);
            return;
          }
        } catch (e) { /* Places API unavailable — use static fallback */ }

        reply = `For ${budgetLabel} dining in ${firstLoc} (${foodPref}):${filterStr}\n\n🍽️ I'd suggest ${budgetLabel} ${wantsPubs ? "pubs & gastropubs" : "restaurants"} with ${foodPref} options.${hasKids ? `\n👧 With ${kidNames}, look for family-friendly spots.` : ""}\n\nTap ✏️ on any meal to update.`;
      } else if (lower.includes("earlier") || lower.includes("later") || lower.includes("time") || lower.includes("move")) {
        reply = `${contextLine}Tap ✏️ on any timeline item to adjust times.`;
        if (hasKids) {
          const youngest = Math.min(...allKids.map(k => parseInt(k.age) || 10));
          reply += youngest <= 7 ? `\n\n💡 With young kids (${kidNames}), I'd recommend:\n• Dinner by 5:30 PM\n• Rest breaks every 2 hours\n• Late starts if mornings are tough` : `\n\n💡 With ${kidNames}, earlier dinner (6 PM) works well.`;
        }
      } else if (lower.includes("add") || lower.includes("include") || lower.includes("plug")) {
        // Check if user wants to add a specific item (e.g., "add Oink to day 2")
        const dayMatch = lower.match(/day\s*(\d+)/);
        const targetDay = dayMatch ? parseInt(dayMatch[1]) : selectedDay;
        // Extract what to add — text after "add"/"include"/"plug"
        const addMatch = msg.match(/(?:add|include|plug(?:\s*in)?)\s+(.+?)(?:\s+(?:to|into|on|for)\s+day\s*\d+)?$/i);
        const itemTitle = addMatch ? addMatch[1].trim().replace(/(?:to|into|on|for)\s+day\s*\d+$/i, '').trim() : null;
        if (itemTitle && itemTitle.length > 2) {
          // Add a specific named item to the specified day
          const newItem = { time: "12:00 PM", title: itemTitle, desc: `${firstLoc} · Added via chat`, group: "Everyone", color: T.blue };
          setCreatedTrips(prev => prev.map(t => {
            if (t.id !== tripId) return t;
            const tl = t.timeline || {};
            return { ...t, timeline: { ...tl, [targetDay]: [...(tl[targetDay] || []), newItem] } };
          }));
          reply = `✅ Added **${itemTitle}** to **Day ${targetDay}** in ${firstLoc}. Switch to the Itinerary tab to see it — tap ✏️ to adjust the time.`;
        } else {
          addTimelineItem(tripId);
          reply = `${contextLine}Added a new activity slot for ${firstLoc}.`;
          if (hasKids) reply += `\n\n👧 Tip: Split adult/kid activities — ${kidNames} might enjoy something different!`;
          if (wantsDog) reply += `\n🐕 Remember: check venue is dog-friendly before booking.`;
          reply += `\n\nTap ✏️ to customise.`;
        }
      } else if (lower.includes("remove") || lower.includes("delete") || lower.includes("cancel")) {
        reply = `Tap ✏️ on any item, then 🗑️ to remove it. Which activity would you like to remove?`;
      } else if (lower.includes("budget") || lower.includes("cost") || lower.includes("spend") || lower.includes("price")) {
        reply = `${contextLine}Your **${budget || "unspecified"}** budget shapes all recommendations:\n• 🍽️ ${budgetLabel} restaurants (${foodPref})\n• 🎯 ${budgetLabel} activities\n• 🏨 Stays: ${trip?.stayNames?.join(", ") || "not set"}\n\nTrack actual costs by marking items as "Booked" and entering the price.`;
      } else if (lower.includes("summary") || lower.includes("plan") || lower.includes("overview")) {
        reply = `${contextLine}All itinerary items above are tailored to this context. Ask me about restaurants, activities, timing, or budget — I'll factor in everything.`;
      } else if (lower.includes("regenerate") || lower.includes("refresh") || lower.includes("redo")) {
        generateAndSetTimeline(tripId);
        reply = `${contextLine}Done! I've regenerated your itinerary based on all your preferences. The timeline above is updated.`;
      } else {
        reply = `${contextLine}I'm using all of the above to personalise your ${firstLoc} trip. Ask me about:\n• 🍽️ Restaurants & food\n• ⏰ Timing adjustments\n• 🎯 Activities to add\n• 💰 Budget & costs\n• 🔄 Regenerate itinerary`;
      }
      setTripChatTyping(false);
      setTripChatMessages(prev => [...prev, { role: "ai", text: reply }]);
      saveChatMessage(trip?.dbId, 'ai', reply);
    }, Math.min(2500, Math.max(800, 1200)));
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
          <h1 style={{ fontFamily: T.fontD, fontSize: 24, fontWeight: 400, color: T.t1 }}>Trip With Me</h1>
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
              {trip.status !== "live" && <button onClick={e => { e.stopPropagation(); makeTripLive(trip.id); }} style={{ ...css.btn, ...css.btnP, ...css.btnSm, fontSize: 12 }}>Activate trip</button>}
              <button onClick={e => { e.stopPropagation(); if (window.confirm(`Remove "${trip.name}"? This cannot be undone.`)) deleteCreatedTrip(trip.id); }}
                style={{ ...css.btn, ...css.btnSm, fontSize: 12, color: T.red, borderColor: "rgba(200,50,50,.2)" }}>Remove</button>
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
              <p style={{ fontSize: 12, color: T.t2, marginTop: 2 }}>Trip With Me automatically connects to 18 travel services — maps, weather, bookings, EV chargers, and more — based on your trip needs.</p>
            </div>
          </div>
        </div>
      </div>
      <TabBar active="home" onNav={navigate} />
    </div>
  );

  // ─── Screen: Create (render function) ───
  const wizSteps = ["Details", "Travellers", "Stays", "Preferences", "Review"];
  const renderCreateScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => { if (editingTripId) { setEditingTripId(null); navigate("createdTrip"); } else navigate("home"); }}>Cancel</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>{editingTripId ? "Edit trip" : "New trip"}</h2>
        <span style={{ fontSize: 11, color: T.t3 }}>Step {wizStep + 1} of 5</span>
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
          {["Name, dates, and destinations", "Add your travel group", "Where you're staying", "Food and activities", "Review your trip summary"][wizStep]}
        </p>
        {wizStep === 0 && renderWizDetails()}
        {wizStep === 1 && renderWizTravellers()}
        {wizStep === 2 && renderWizStays()}
        {wizStep === 3 && renderWizPrefs()}
        {wizStep === 4 && renderWizReview()}
      </div>
      <div style={{ display: "flex", gap: 8, padding: "16px 24px", background: T.s, borderTop: `.5px solid ${T.border}` }}>
        {wizStep > 0 && <button className="w-btn" style={{ ...css.btn, flex: 1, justifyContent: "center" }} onClick={() => setWizStep(wizStep - 1)}>Back</button>}
        <button className="w-btn w-btnP" style={{ ...css.btn, ...css.btnP, flex: 1, justifyContent: "center" }} onClick={() => {
          // Date validation on step 0
          if (wizStep === 0) {
            if (wizTrip.start && wizTrip.end) {
              if (wizTrip.end < wizTrip.start) { alert("End date must be after start date."); return; }
              const days = Math.round((new Date(wizTrip.end + "T12:00:00") - new Date(wizTrip.start + "T12:00:00")) / 86400000) + 1;
              if (days > 30) { alert(`Trip is ${days} days — max 30 days supported. Please adjust dates.`); return; }
            }
            if (wizTrip.start && wizTrip.start < new Date().toISOString().split("T")[0]) {
              // Allow past dates but warn
            }
          }
          // Stay date validation on step 2
          if (wizStep === 2 && wizStays.length > 0) {
            for (const s of wizStays) {
              if (s.checkIn && s.checkOut && s.checkOut <= s.checkIn) { alert(`"${s.name}" — check-out must be after check-in.`); return; }
              if (wizTrip.start && s.checkIn && s.checkIn < wizTrip.start) { alert(`"${s.name}" check-in (${s.checkIn}) is before trip start.`); return; }
            }
          }
          wizStep < 4 ? setWizStep(wizStep + 1) : createTrip();
        }}>
          {wizStep < 4 ? `Next: ${wizSteps[wizStep + 1]}` : editingTripId ? "Save changes" : "Create trip"}
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
            onKeyDown={e => { if (e.key === "Enter" || e.key === "Tab") { if (placeInput.trim()) { e.preventDefault(); addPlace(); } } }}
            onFocus={() => { if (placeInput.trim()) setPlaceSuggestionsOpen(true); }}
            onBlur={() => setTimeout(() => setPlaceSuggestionsOpen(false), 200)}
            style={{ width: "100%", padding: "9px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none", minHeight: 44 }}
            placeholder="Search locations — type and press Enter or Tab to add" />
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

  // ─── Wizard Step: Stays (Places API search + manual entry) ───
  const [stayPlacesResults, setStayPlacesResults] = useState([]);
  const [staySearching, setStaySearching] = useState(false);
  const staySearchTimeout = React.useRef(null);

  const searchAccommodations = async (query) => {
    if (!query.trim()) { setStayPlacesResults([]); return; }
    setStaySearching(true);
    try {
      const locationName = wizTrip.places.length > 0 ? wizTrip.places[0] : "";
      const searchQuery = locationName ? `${query} near ${locationName}` : query;
      const res = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, type: "lodging" }),
      });
      if (res.ok) {
        const data = await res.json();
        setStayPlacesResults((data.places || data.results || []).slice(0, 6));
      }
    } catch { /* ignore */ }
    setStaySearching(false);
  };

  const handleStaySearchChange = (val) => {
    setStaySearch(val);
    clearTimeout(staySearchTimeout.current);
    if (val.trim().length >= 3) {
      staySearchTimeout.current = setTimeout(() => searchAccommodations(val), 500);
    } else {
      setStayPlacesResults([]);
    }
  };

  const renderWizStays = () => {
    const locationName = wizTrip.places.length > 0 ? wizTrip.places.join(", ") : "";

    const addStay = (accom) => {
      const lastStay = wizStays.length > 0 ? wizStays[wizStays.length - 1] : null;
      const defaultCheckIn = (lastStay?.checkOut) || wizTrip.start || "";
      let defaultCheckOut = wizTrip.end || "";
      if (!defaultCheckOut && defaultCheckIn) {
        try {
          const d = new Date(defaultCheckIn + "T12:00:00");
          d.setDate(d.getDate() + 1);
          defaultCheckOut = d.toISOString().split("T")[0];
        } catch { defaultCheckOut = ""; }
      }
      setWizStays(prev => [...prev, { ...accom, checkIn: defaultCheckIn, checkOut: defaultCheckOut, bookingRef: "", cost: "", confirmationLink: "" }]);
      setStaySearch("");
      setStaySearchOpen(false);
      setStayPlacesResults([]);
    };

    const removeStay = (idx) => setWizStays(prev => prev.filter((_, i) => i !== idx));

    const updateStayField = (idx, field, val) => {
      setWizStays(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
    };

    return (
      <>
        {/* Added stays */}
        {wizStays.map((s, i) => (
          <div key={i} style={css.card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</h4>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {s.rating && <span style={{ fontSize: 11, color: T.amber }}>{"★"} {s.rating}</span>}
                  {s.address && <span style={{ fontSize: 10, color: T.t3 }}>· {s.address.length > 40 ? s.address.slice(0, 40) + "..." : s.address}</span>}
                  {!s.address && s.location && <span style={{ fontSize: 10, color: T.t3 }}>· {s.location}</span>}
                </div>
              </div>
              <button style={{ ...css.btn, ...css.btnSm, fontSize: 11, color: T.red }} onClick={() => removeStay(i)}>Remove</button>
            </div>
            {/* Dates */}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 10, color: T.t3, marginBottom: 3 }}>Check-in</label>
                <input type="date" value={s.checkIn} min={wizTrip.start || undefined} max={wizTrip.end || undefined}
                  onChange={e => updateStayField(i, "checkIn", e.target.value)}
                  onClick={e => e.target.showPicker?.()}
                  style={{ width: "100%", padding: "8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none", cursor: "pointer", minHeight: 40, colorScheme: "light" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 10, color: T.t3, marginBottom: 3 }}>Check-out</label>
                <input type="date" value={s.checkOut} min={s.checkIn || wizTrip.start || undefined} max={wizTrip.end || undefined}
                  onChange={e => updateStayField(i, "checkOut", e.target.value)}
                  onClick={e => e.target.showPicker?.()}
                  style={{ width: "100%", padding: "8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none", cursor: "pointer", minHeight: 40, colorScheme: "light" }} />
              </div>
            </div>
            {/* Extra fields */}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 10, color: T.t3, marginBottom: 3 }}>Total cost (£)</label>
                <input type="text" inputMode="decimal" value={s.cost || ""} placeholder="0.00"
                  onChange={e => updateStayField(i, "cost", e.target.value.replace(/[^0-9.]/g, ''))}
                  style={{ width: "100%", padding: "8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none", minHeight: 40 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 10, color: T.t3, marginBottom: 3 }}>Booking ref</label>
                <input type="text" value={s.bookingRef || ""} placeholder="e.g. BK-123456"
                  onChange={e => updateStayField(i, "bookingRef", e.target.value)}
                  style={{ width: "100%", padding: "8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none", minHeight: 40 }} />
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 10, color: T.t3, marginBottom: 3 }}>Confirmation link (optional)</label>
              <input type="url" value={s.confirmationLink || ""} placeholder="https://booking.com/..."
                onChange={e => updateStayField(i, "confirmationLink", e.target.value)}
                style={{ width: "100%", padding: "8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none", minHeight: 40 }} />
            </div>
            {s.type && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Tag bg={T.purpleL} color={T.purple}>{s.type}</Tag>
                {s.cost && parseFloat(s.cost) > 0 && <Tag bg={T.al} color={T.ad}>{"£"}{parseFloat(s.cost).toFixed(2)}</Tag>}
                {s.bookingRef && <Tag bg={T.blueL} color={T.blue}>Ref: {s.bookingRef}</Tag>}
              </div>
            )}
          </div>
        ))}

        {/* Search / Add section */}
        {staySearchOpen ? (
          <div style={{ ...css.card, padding: 12 }}>
            <input value={staySearch} onChange={e => handleStaySearchChange(e.target.value)} autoFocus
              style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s2, outline: "none", marginBottom: 8 }}
              placeholder={locationName ? `Search hotels near ${locationName}...` : "Search hotels, B&Bs, cottages..."} />

            {staySearching && (
              <p style={{ fontSize: 12, color: T.t3, textAlign: "center", padding: 8 }}>Searching...</p>
            )}

            {/* Places API results */}
            {stayPlacesResults.map((place, i) => (
              <div key={i} onClick={() => addStay({
                name: place.name,
                type: "Hotel",
                tags: [place.rating ? `★ ${place.rating}` : null, place.priceLevel ? "£".repeat(place.priceLevel) : null].filter(Boolean),
                rating: place.rating || null,
                price: place.priceLevel ? "£".repeat(place.priceLevel) : null,
                address: place.address || "",
                location: place.address ? place.address.split(",").slice(-2).join(",").trim() : "",
                placeId: place.placeId,
              })} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", cursor: "pointer", borderRadius: T.rs, border: `.5px solid ${T.border}`, marginBottom: 6, background: T.s, transition: "background .15s" }}>
                {place.photo ? (
                  <img src={place.photo} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: T.purpleL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🏨</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{place.name}</p>
                  <p style={{ fontSize: 11, color: T.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {place.rating && `★ ${place.rating}`}{place.address && ` · ${place.address.length > 35 ? place.address.slice(0, 35) + "..." : place.address}`}
                  </p>
                </div>
                <span style={{ fontSize: 11, color: T.a, fontWeight: 500, flexShrink: 0 }}>+ Add</span>
              </div>
            ))}

            {/* Custom add option */}
            {staySearch.trim().length >= 2 && (
              <div onClick={() => addStay({ name: staySearch.trim(), type: "Custom", tags: [], rating: null, price: null, address: "", location: "" })}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", cursor: "pointer", borderRadius: T.rs, border: `1.5px dashed ${T.a}`, marginBottom: 8, background: T.al, transition: "background .15s" }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: T.a, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, color: "#fff" }}>+</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>Add "{staySearch.trim()}" manually</p>
                  <p style={{ fontSize: 11, color: T.t3 }}>Enter your own booking details</p>
                </div>
              </div>
            )}

            {/* External search links */}
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <button onClick={() => {
                const q = staySearch.trim() || (locationName ? `hotels near ${locationName}` : "hotels");
                window.open(`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(q)}`, "_blank");
              }} style={{ ...css.btn, ...css.btnP, ...css.btnSm, flex: 1, justifyContent: "center", fontSize: 11 }}>
                Search Booking.com
              </button>
              <button onClick={() => {
                const q = staySearch.trim() || (locationName ? `accommodation near ${locationName}` : "accommodation");
                window.open(`https://www.google.com/travel/hotels?q=${encodeURIComponent(q)}`, "_blank");
              }} style={{ ...css.btn, ...css.btnSm, flex: 1, justifyContent: "center", fontSize: 11 }}>
                Google Hotels
              </button>
            </div>
            <button onClick={() => { setStaySearchOpen(false); setStaySearch(""); setStayPlacesResults([]); }}
              style={{ ...css.btn, ...css.btnSm, width: "100%", justifyContent: "center", marginTop: 6, fontSize: 11 }}>Cancel</button>
          </div>
        ) : (
          <div>
            <button onClick={() => setStaySearchOpen(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, border: `1.5px dashed ${T.border}`, borderRadius: T.r, color: T.t3, fontSize: 13, cursor: "pointer", background: "none", width: "100%", fontFamily: T.font }}>+ Add accommodation</button>
            {wizStays.length === 0 && (
              <p style={{ textAlign: "center", padding: "8px 10px", color: T.t3, fontSize: 12, marginTop: 4 }}>
                Search for real hotels or add your own booking details.
                {locationName && ` We'll search near ${locationName}.`}
              </p>
            )}
          </div>
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
    uk: { food: ["Fish & chips", "Sunday roast", "Cream tea", "Curry house", "Gastropub grub", "Full English", "Pie & mash", "Local ale"], activities: ["Castle visit", "Coastal walk", "Market town stroll", "Afternoon tea", "Heritage site", "Country pub"] },
    scotland: { food: ["Haggis", "Scottish salmon", "Whisky tasting", "Shortbread", "Cullen skink", "Cranachan", "Scotch pie"], activities: ["Castle tour", "Whisky distillery", "Highland walk", "Loch cruise", "Old Town walk", "Ceilidh night"] },
    england: { food: ["Fish & chips", "Sunday roast", "Cream tea", "Curry house", "Gastropub grub", "Full English", "Pie & mash"], activities: ["Castle visit", "Coastal walk", "Market town stroll", "Afternoon tea", "Country house visit", "Canal walk"] },
  };

  // Places API-powered suggestions for preferences
  const [placesFood, setPlacesFood] = useState([]);
  const [placesActivities, setPlacesActivities] = useState([]);
  const [placesFetched, setPlacesFetched] = useState("");

  const fetchPlacesSuggestions = async (places) => {
    const key = places.join(",");
    if (key === placesFetched || places.length === 0) return;
    setPlacesFetched(key);
    try {
      // Fetch restaurants and activities for the first location
      const loc = places[0];
      const [foodRes, actRes] = await Promise.all([
        fetch("/api/places", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: `best restaurants in ${loc}` }) }),
        fetch("/api/places", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: `things to do in ${loc}` }) }),
      ]);
      if (foodRes.ok) {
        const data = await foodRes.json();
        const names = (data.places || []).map(p => p.name).filter(Boolean);
        if (names.length > 0) setPlacesFood(names);
      }
      if (actRes.ok) {
        const data = await actRes.json();
        const names = (data.places || []).map(p => p.name).filter(Boolean);
        if (names.length > 0) setPlacesActivities(names);
      }
    } catch { /* keep static fallback */ }
  };

  // Trigger fetch when places change and we reach prefs step
  React.useEffect(() => {
    if (wizStep === 3 && wizTrip.places.length > 0) {
      fetchPlacesSuggestions(wizTrip.places);
    }
  }, [wizStep, wizTrip.places.join(",")]);

  const renderWizPrefs = () => {
    const region = wizTrip.places.length > 0 ? getRegion(wizTrip.places) : null;
    const regionSugg = region && REGION_SUGGESTIONS[region] ? REGION_SUGGESTIONS[region] : null;
    const regionLabel = region ? region.charAt(0).toUpperCase() + region.slice(1) : "";
    const locationName = wizTrip.places.length > 0 ? wizTrip.places[0] : "";

    // Build food options: Places API real restaurants → region suggestions → dietary defaults
    const dietaryDefaults = ["Vegetarian", "Non-veg", "Local cuisine", "Kid-friendly menus", "Vegan", "Halal", "Gluten-free", "Pescatarian", "Dairy-free", "Nut-free", "Organic", "Street food"];
    const regionFoodOpts = regionSugg ? regionSugg.food : [];
    const allFoodOpts = [...new Set([...placesFood, ...regionFoodOpts, ...dietaryDefaults])];

    // Build activity options: Places API real activities → region suggestions → generic defaults
    const regionActOpts = regionSugg ? regionSugg.activities : [];
    const genericActs = ACTIVITY_SUGGESTIONS.default.adults;
    const allAdultActs = [...new Set([...placesActivities, ...regionActOpts, ...genericActs])];
    const suggestions = { ...ACTIVITY_SUGGESTIONS.default, adults: allAdultActs };

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

    const renderPrefSection = (label, key, allOpts, searchVal, setSearchVal, placeholder, hasPlacesData) => (
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>{label}</label>
        {hasPlacesData && (
          <p style={{ fontSize: 10, color: T.a, marginBottom: 4 }}>{"📍"} Includes real places near {locationName}</p>
        )}
        <input value={searchVal} onChange={e => setSearchVal(e.target.value)}
          onKeyDown={e => { if ((e.key === "Enter" || e.key === "Tab") && searchVal.trim()) { e.preventDefault(); addCustomPref(key, searchVal, setSearchVal); } }}
          style={{ width: "100%", padding: "8px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 12, background: T.s2, outline: "none", marginBottom: 6 }}
          placeholder={placeholder} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {filterOpts(allOpts, searchVal, wizPrefs[key]).map(o => {
            const isFromPlaces = key === "food" ? placesFood.includes(o) : key === "adultActs" ? placesActivities.includes(o) : false;
            return (
              <span key={o} onClick={() => togglePref(key, o)} style={{ ...css.chip, ...(wizPrefs[key].has(o) ? css.chipActive : {}), ...(isFromPlaces && !wizPrefs[key].has(o) ? { borderColor: T.a + "40", background: T.al + "30" } : {}) }}>
                {isFromPlaces && "📍 "}{o}
              </span>
            );
          })}
          {searchVal.trim() && !allOpts.includes(searchVal.trim()) && !wizPrefs[key].has(searchVal.trim()) && (
            <span onClick={() => addCustomPref(key, searchVal, setSearchVal)} style={{ ...css.chip, borderStyle: "dashed", color: T.a }}>+ Add "{searchVal.trim()}"</span>
          )}
        </div>
      </div>
    );

    return (
      <>
        {regionSugg && <p style={{ fontSize: 11, color: T.a, fontWeight: 500, marginBottom: 8 }}>{"🌍"} Showing suggestions popular in {regionLabel}</p>}
        {renderPrefSection("Food preferences", "food", allFoodOpts, foodSearch, setFoodSearch, "Search or type a food preference...", placesFood.length > 0)}
        {renderPrefSection("Activities — Adults", "adultActs", suggestions.adults, adultActSearch, setAdultActSearch, "Search or add an activity...", placesActivities.length > 0)}
        {wizTravellers.olderKids.length > 0 && renderPrefSection("Activities — Children 8-14", "olderActs", suggestions.olderKids, olderActSearch, setOlderActSearch, "Search or add a kids activity...", false)}
        {wizTravellers.youngerKids.length > 0 && renderPrefSection("Activities — Children 3-7", "youngerActs", suggestions.youngerKids, youngerActSearch, setYoungerActSearch, "Search or add a kids activity...", false)}
      </>
    );
  };

  const renderWizReview = () => {
    // Build auto-summary from all wizard data
    const parts = [];
    const fmtDateShort = (d) => { try { return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return d; } };
    // Smart numDays: prefer stay date span if available (protects against user date entry errors)
    let numDays = null;
    let effectiveStart = wizTrip.start;
    let effectiveEnd = wizTrip.end;
    if (wizStays.length > 0 && !wizTrip.start && !wizTrip.end) {
      const checkIns = wizStays.map(s => s.checkIn).filter(Boolean).sort();
      const checkOuts = wizStays.map(s => s.checkOut).filter(Boolean).sort();
      if (checkIns.length > 0 && checkOuts.length > 0) {
        effectiveStart = checkIns[0];
        effectiveEnd = checkOuts[checkOuts.length - 1];
        numDays = Math.max(1, Math.round((new Date(effectiveEnd + "T12:00:00") - new Date(effectiveStart + "T12:00:00")) / 86400000) + 1);
      }
    }
    if (!numDays && wizTrip.start && wizTrip.end) {
      numDays = Math.max(1, Math.round((new Date(wizTrip.end + "T12:00:00") - new Date(wizTrip.start + "T12:00:00")) / 86400000) + 1);
    }
    if (numDays && wizTrip.places.length > 0) {
      const dateRange = effectiveStart && effectiveEnd ? ` (${fmtDateShort(effectiveStart)} – ${fmtDateShort(effectiveEnd)})` : "";
      parts.push(`${numDays}-day trip to ${wizTrip.places.join(", ")}${dateRange}`);
    }
    if (wizTrip.travel.size > 0) parts.push(`travelling by ${[...wizTrip.travel].join(" + ").toLowerCase()}`);
    if (wizTrip.startLocation) parts.push(`starting from ${wizTrip.startLocation}`);
    const na = wizTravellers.adults.length, nok = wizTravellers.olderKids.length, nyk = wizTravellers.youngerKids.length;
    const groupParts = [];
    if (na > 0) groupParts.push(`${na} adult${na > 1 ? "s" : ""}`);
    if (nok > 0) groupParts.push(`${nok} older kid${nok > 1 ? "s" : ""} (${wizTravellers.olderKids.map(k => `${k.name || "child"}, ${k.age}`).join("; ")})`);
    if (nyk > 0) groupParts.push(`${nyk} younger kid${nyk > 1 ? "s" : ""} (${wizTravellers.youngerKids.map(k => `${k.name || "child"}, ${k.age}`).join("; ")})`);
    if (groupParts.length) parts.push(`group: ${groupParts.join(", ")}`);
    if (wizTrip.budget) parts.push(`${wizTrip.budget.toLowerCase()} budget`);
    if (wizPrefs.food.size > 0) parts.push(`food: ${[...wizPrefs.food].join(", ")}`);
    if (wizPrefs.adultActs.size > 0) parts.push(`adult activities: ${[...wizPrefs.adultActs].join(", ")}`);
    if (wizPrefs.olderActs.size > 0) parts.push(`older kids activities: ${[...wizPrefs.olderActs].join(", ")}`);
    if (wizPrefs.youngerActs.size > 0) parts.push(`younger kids activities: ${[...wizPrefs.youngerActs].join(", ")}`);
    if (wizStays.length > 0) parts.push(`staying at ${wizStays.map(s => `${s.name}${s.location ? ` (${s.location})` : ""}`).join(", ")}`);
    if (nok + nyk > 0) {
      const ages = [...wizTravellers.olderKids, ...wizTravellers.youngerKids].map(k => parseInt(k.age) || 0);
      const youngest = Math.min(...ages);
      if (youngest <= 5) parts.push("plan for short activity blocks — young children in group");
      else if (youngest <= 10) parts.push("mix family-friendly activities with some adult time");
    }
    const autoSummary = parts.length > 0 ? parts.join(". ") + "." : "";

    // Auto-fill on first visit to this step
    if (autoSummary && !wizPrefs.instructions) {
      setTimeout(() => setWizPrefs(prev => prev.instructions ? prev : { ...prev, instructions: autoSummary }), 0);
    }

    return (
      <>
        <p style={{ fontSize: 13, color: T.t2, lineHeight: 1.6, marginBottom: 16 }}>
          This summary is generated from everything you've entered. It guides the AI when building your itinerary. Edit freely to add specific preferences.
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5 }}>Trip summary</label>
          {autoSummary && wizPrefs.instructions !== autoSummary && (
            <button onClick={() => setWizPrefs(prev => ({ ...prev, instructions: autoSummary }))}
              style={{ fontSize: 10, color: T.a, background: "none", border: "none", cursor: "pointer", fontFamily: T.font, fontWeight: 500 }}>↻ Reset to auto</button>
          )}
        </div>
        <textarea value={wizPrefs.instructions} onChange={e => setWizPrefs(prev => ({ ...prev, instructions: e.target.value }))}
          placeholder="Your trip summary will appear here..."
          ref={el => { if (el) { el.style.height = "auto"; el.style.height = Math.max(140, el.scrollHeight + 4) + "px"; } }}
          style={{ width: "100%", padding: "12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none", resize: "vertical", minHeight: 140, maxHeight: 300, lineHeight: 1.6, overflow: "auto" }} />
        <p style={{ fontSize: 10, color: T.t3, marginTop: 4, marginBottom: 16 }}>Add keywords like "dog-friendly", "avoid steep trails", "late starts", "accessible" to influence your itinerary</p>

        {/* Quick glance at what's included */}
        <div style={{ background: T.s2, borderRadius: T.rs, padding: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Included in this trip</p>

          {/* Places */}
          {wizTrip.places.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 9, fontWeight: 600, color: T.t3, marginBottom: 4, textTransform: "uppercase", letterSpacing: .3 }}>Places</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {wizTrip.places.map(p => <Tag key={p} bg={T.purpleL} color={T.purple}>{p}</Tag>)}
              </div>
            </div>
          )}

          {/* Stays */}
          {wizStays.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 9, fontWeight: 600, color: T.t3, marginBottom: 4, textTransform: "uppercase", letterSpacing: .3 }}>Stays</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {wizStays.map((s, i) => <Tag key={i} bg={T.amberL} color={T.amber}>{s.name}{s.location ? ` · ${s.location}` : ""}</Tag>)}
              </div>
            </div>
          )}

          {/* Travel & Budget */}
          {(wizTrip.travel.size > 0 || wizTrip.budget) && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 9, fontWeight: 600, color: T.t3, marginBottom: 4, textTransform: "uppercase", letterSpacing: .3 }}>Travel & Budget</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {[...wizTrip.travel].map(t => <Tag key={t} bg={T.blueL} color={T.blue}>{t}</Tag>)}
                {wizTrip.budget && <Tag bg={T.greenL} color={T.green}>{wizTrip.budget}</Tag>}
              </div>
            </div>
          )}

          {/* Preferences — food, activities, kids */}
          {(wizPrefs.food.size > 0 || wizPrefs.adultActs.size > 0 || wizPrefs.olderActs.size > 0 || wizPrefs.youngerActs.size > 0) && (
            <div>
              <p style={{ fontSize: 9, fontWeight: 600, color: T.t3, marginBottom: 4, textTransform: "uppercase", letterSpacing: .3 }}>Preferences</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {[...wizPrefs.food].map(f => <Tag key={f} bg={T.coralL} color={T.coral}>{f}</Tag>)}
                {[...wizPrefs.adultActs].map(a => <Tag key={`aa-${a}`} bg={T.blueL} color={T.blue}>{a}</Tag>)}
                {[...wizPrefs.olderActs].map(a => <Tag key={`oa-${a}`} bg={T.pinkL || "#fce4ec"} color={T.pink || "#e91e63"}>{a} (8-14)</Tag>)}
                {[...wizPrefs.youngerActs].map(a => <Tag key={`ya-${a}`} bg={T.pinkL || "#fce4ec"} color={T.pink || "#e91e63"}>{a} (3-7)</Tag>)}
              </div>
            </div>
          )}
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
            <button style={{ ...css.btn, ...css.btnSm, background: "rgba(255,255,255,.18)", borderColor: "rgba(255,255,255,.3)", color: "#fff", fontSize: 12, fontWeight: 500 }} onClick={() => navigate("home")}>← Back</button>
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
          <div style={{ marginBottom: 12 }}>
            <TripMap
              places={[TRIP.startLocation, ...TRIP.places]}
              height={160}
            />
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
      { keywords: ["restaurant", "food", "eating", "dinner", "lunch", "breakfast", "cafe", "dining", "hungry", "meal"], response: "For your group near Ambleside:\n\n1. **The Drunken Duck** — 4.8★, 12 min. Steaks + veggie, kids free before 6 PM.\n\n2. **Fellinis** — 4.6★, 3 min walk. Veggie-focused, children's menu.\n\n3. **The Unicorn** — 4.4★, 5 min. Pub grills, playground out back.\n\nWant me to add any of these to your itinerary?" },
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

    const sendMessage = async (text) => {
      const msg = text || chatInput;
      if (!msg.trim()) return;
      setChatInput("");
      setChatMessages(prev => [...prev, { role: "user", text: msg }]);
      setChatTyping(true);

      const lower = msg.trim().toLowerCase();
      const isNearby = /nearby|nearest|near me|near here|around me|close by|closest/i.test(lower);
      const isPlaceSearch = /restaurant|food|eat|dining|cafe|coffee|pub|bar|pizza|burger|takeaway|lunch|dinner|breakfast|brunch|supermarket|petrol|fuel|pharmacy|hospital|atm|ev|charger|charging/i.test(lower);

      // ── GPS-based nearby search (restaurants, EV chargers, etc.) ──
      if (isNearby || (isPlaceSearch && isNearby)) {
        const searchType = /ev|charger|charging/i.test(lower) ? "electric_vehicle_charging_station"
          : /cafe|coffee/i.test(lower) ? "cafe"
          : /pub|bar/i.test(lower) ? "bar"
          : /supermarket|grocery/i.test(lower) ? "supermarket"
          : /petrol|fuel|gas station/i.test(lower) ? "gas_station"
          : /pharmacy|chemist/i.test(lower) ? "pharmacy"
          : /hospital|a&e|emergency/i.test(lower) ? "hospital"
          : /atm|cash/i.test(lower) ? "atm"
          : "restaurant";
        const searchLabel = searchType === "gas_station" ? "petrol stations" : searchType === "electric_vehicle_charging_station" ? "EV chargers" : searchType + "s";
        const searchIcon = /ev|charger|charging/i.test(lower) ? "⚡" : /cafe|coffee/i.test(lower) ? "☕" : /pub|bar/i.test(lower) ? "🍺" : /supermarket/i.test(lower) ? "🛒" : /petrol|fuel|gas/i.test(lower) ? "⛽" : "🍽️";
        const fallbackLoc = DAYS[selectedDay - 1]?.location || TRIP.places?.[0] || "your destination";

        setChatMessages(prev => [...prev, { role: "ai", text: `📍 Finding ${searchLabel} near your current location...` }]);

        const handleResults = async (lat, lng, locLabel) => {
          try {
            const body = lat && lng
              ? { location: { lat, lng }, type: searchType, radius: 8000 }
              : { query: `${searchType} near ${fallbackLoc}`, radius: 8000 };
            const res = await fetch("/api/places", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok && data.places?.length > 0) {
              const results = data.places.slice(0, 6);
              const list = results.map((p, i) => {
                const stars = p.rating ? ` · ${p.rating}★` : "";
                const price = p.priceLevel || "";
                const status = p.openNow === true ? " · **Open now**" : p.openNow === false ? " · Closed" : "";
                const mapLink = `https://www.google.com/maps/place/?q=place_id:${p.placeId}`;
                return `${i + 1}. **${p.name}** ${price}${stars}${status}\n   ${p.address}\n   [Navigate in Maps](${mapLink})`;
              }).join("\n\n");
              return `${searchIcon} **${searchLabel.charAt(0).toUpperCase() + searchLabel.slice(1)} near ${locLabel}:**\n\n${list}\n\n💡 *These results are based on your ${lat ? "current GPS location" : "trip destination"}.*`;
            }
          } catch (e) { /* fallback below */ }
          return `${searchIcon} Couldn't find ${searchLabel} via search. Try [Google Maps](https://www.google.com/maps/search/${encodeURIComponent(searchType + " near me")}) for real-time results near you.`;
        };

        const updateChat = (reply) => {
          setChatTyping(false);
          setChatMessages(prev => {
            const updated = [...prev];
            const idx = updated.findLastIndex(m => m.text.includes(`Finding ${searchLabel} near`));
            if (idx >= 0) updated[idx] = { role: "ai", text: reply };
            else updated.push({ role: "ai", text: reply });
            return updated;
          });
        };

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => updateChat(await handleResults(pos.coords.latitude, pos.coords.longitude, "your location")),
            async () => updateChat(await handleResults(null, null, fallbackLoc)),
            { enableHighAccuracy: false, timeout: 8000 }
          );
        } else {
          handleResults(null, null, fallbackLoc).then(updateChat);
        }
        return;
      }

      // ── Claude API for all other queries (with GPS context when available) ──
      const getGpsContext = () => new Promise((resolve) => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            () => resolve(null),
            { enableHighAccuracy: false, timeout: 5000 }
          );
        } else resolve(null);
      });

      try {
        const gps = isPlaceSearch ? await getGpsContext() : null;
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: msg.trim(),
            tripContext: {
              tripName: TRIP.name,
              dates: `${TRIP.start} – ${TRIP.end} ${TRIP.year}`,
              places: TRIP.places,
              travelMode: TRIP.travelMode,
              travellers: TRIP.travellers,
              stays: TRIP.stays,
              currentDay: selectedDay,
              currentLocation: DAYS[selectedDay - 1]?.location,
              ...(gps ? { gpsLocation: gps } : {}),
            },
            chatHistory: chatMessages.slice(-8),
          }),
        });
        const data = await res.json();
        if (res.ok && data.reply) {
          setChatTyping(false);
          setChatMessages(prev => [...prev, { role: "ai", text: data.reply }]);
          return;
        }
      } catch (e) { /* API unavailable — fall back to local */ }

      // Local fallback
      const response = findResponse(msg.trim());
      const delay = Math.min(2500, Math.max(800, response.length * 6));
      setTimeout(() => {
        setChatTyping(false);
        setChatMessages(prev => [...prev, { role: "ai", text: response }]);
      }, delay);
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
          <div style={{ display: "flex", gap: 8, padding: "0 24px 8px", overflowX: "auto" }}>
            {DAYS.map(d => (
              <button key={d.day} className="w-chip" onClick={() => setSelectedDay(d.day)}
                style={{ ...css.chip, flexShrink: 0, fontSize: 11, padding: "8px 16px",
                  ...(selectedDay === d.day ? { background: T.a, color: "#fff", borderColor: T.ad } : {}) }}>
                Day {d.day} · {d.location}
              </button>
            ))}
          </div>
        </div>
        <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {chatMessages.map((m, i) => (
            <div key={i} style={{ marginBottom: 12, maxWidth: "85%", ...(m.role === "user" ? { marginLeft: "auto" } : {}) }}>
              {m.role === "ai" && <div style={{ fontSize: 11, color: T.t3, marginBottom: 3 }}>Trip With Me</div>}
              <div style={{
                padding: "10px 14px", fontSize: 14, lineHeight: 1.5,
                ...(m.role === "user"
                  ? { background: T.a, color: "#fff", borderRadius: "16px 16px 4px 16px" }
                  : { background: T.s, border: `.5px solid ${T.border}`, borderRadius: "16px 16px 16px 4px" }),
              }} dangerouslySetInnerHTML={{ __html: renderChatHtml(m.text) }} />
            </div>
          ))}
          {chatTyping && (
            <div style={{ marginBottom: 12, maxWidth: "85%" }}>
              <div style={{ fontSize: 11, color: T.t3, marginBottom: 3 }}>Trip With Me</div>
              <div style={{ padding: "12px 18px", background: T.s, border: `.5px solid ${T.border}`, borderRadius: "16px 16px 16px 4px", display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.t3, animation: "typingDot 1.2s infinite", animationDelay: "0s" }} />
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.t3, animation: "typingDot 1.2s infinite", animationDelay: "0.2s" }} />
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.t3, animation: "typingDot 1.2s infinite", animationDelay: "0.4s" }} />
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: "0 24px" }}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "8px 0" }}>
            {quickActions.map(p => (
              <button key={p} className="w-chip" style={{ ...css.chip, flexShrink: 0, fontSize: 12 }} onClick={() => sendMessage(p)}>{p}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: "16px 24px", background: T.s, borderTop: `.5px solid ${T.border}` }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
              style={{ flex: 1, padding: "12px 16px", border: `.5px solid ${T.border}`, borderRadius: 24, fontFamily: T.font, fontSize: 14, background: T.s2, outline: "none", minHeight: 48 }}
              placeholder="Ask anything about your trip..." aria-label="Chat message input" />
            <button className="w-btnP" onClick={() => sendMessage()} aria-label="Send message" style={{ width: 48, height: 48, borderRadius: "50%", background: T.a, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s", flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
            </button>
          </div>
        </div>
        <TabBar active="chat" onNav={navigate} />
      </div>
    );
  };

  // ─── Screen: Polls ───
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [newPollOptions, setNewPollOptions] = useState(["", ""]);

  const createNewPoll = () => {
    if (!newPollQuestion.trim()) { alert("Enter a question"); return; }
    const validOpts = newPollOptions.filter(o => o.trim());
    if (validOpts.length < 2) { alert("Add at least 2 options"); return; }
    const newPoll = {
      id: Date.now(),
      q: newPollQuestion.trim(),
      status: "active",
      ends: "Tomorrow 9 PM",
      by: "You",
      votes: 0,
      options: validOpts.map(text => ({ text: text.trim(), pct: 0, voters: [], voted: false })),
    };
    setPollData(prev => [newPoll, ...prev]);
    setNewPollQuestion("");
    setNewPollOptions(["", ""]);
    setShowPollCreator(false);
    showToast("Poll created!");
  };

  const renderVoteScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("trip")}>Back</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Group polls</h2>
        <button style={{ ...css.btn, ...css.btnSm, ...css.btnP }} onClick={() => setShowPollCreator(true)}>+ New</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {showPollCreator && (
          <div style={{ ...css.card, marginBottom: 16, border: `1px solid ${T.a}` }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: T.ad }}>New poll</p>
            <input value={newPollQuestion} onChange={e => setNewPollQuestion(e.target.value)}
              placeholder="What's the question?"
              style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, marginBottom: 10, outline: "none" }} />
            {newPollOptions.map((opt, i) => (
              <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                <input value={opt} onChange={e => setNewPollOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                  placeholder={`Option ${i + 1}`}
                  style={{ flex: 1, padding: "8px 10px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 12, outline: "none" }} />
                {newPollOptions.length > 2 && (
                  <button onClick={() => setNewPollOptions(prev => prev.filter((_, j) => j !== i))}
                    style={{ ...css.btn, ...css.btnSm, padding: "4px 10px", color: T.red, fontSize: 14, minHeight: 36 }}>×</button>
                )}
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {newPollOptions.length < 5 && (
                <button onClick={() => setNewPollOptions(prev => [...prev, ""])}
                  style={{ ...css.btn, ...css.btnSm, flex: 1, justifyContent: "center", fontSize: 11 }}>+ Add option</button>
              )}
              <button onClick={createNewPoll} style={{ ...css.btn, ...css.btnSm, ...css.btnP, flex: 1, justifyContent: "center", fontSize: 11 }}>Create poll</button>
              <button onClick={() => { setShowPollCreator(false); setNewPollQuestion(""); setNewPollOptions(["", ""]); }}
                style={{ ...css.btn, ...css.btnSm, flex: 0, justifyContent: "center", fontSize: 11, color: T.t3 }}>Cancel</button>
            </div>
          </div>
        )}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, fontSize: 11, color: T.t3 }}>
              <span>{poll.options.reduce((s, o) => s + (o.voters?.length || 0), 0)} votes · by {poll.by}</span>
              <div style={{ display: "flex", gap: 6 }}>
                {poll.status === "active" && (
                  <button onClick={(e) => { e.stopPropagation(); setPollData(prev => prev.map(p => p.id === poll.id ? { ...p, status: "closed" } : p)); showToast("Poll closed"); }}
                    style={{ ...css.btn, ...css.btnSm, fontSize: 10, padding: "3px 8px", color: T.red, borderColor: T.red }}>Close poll</button>
                )}
                {poll.status === "closed" && (() => {
                  const winner = [...poll.options].sort((a, b) => (b.voters?.length || 0) - (a.voters?.length || 0))[0];
                  const topCount = winner?.voters?.length || 0;
                  const isTie = poll.options.filter(o => (o.voters?.length || 0) === topCount).length > 1;
                  return topCount > 0 && !isTie ? (
                    <button onClick={(e) => { e.stopPropagation(); addTimelineItem(selectedCreatedTrip?.id || createdTrips[0]?.id); showToast(`Added "${winner.text}" to itinerary`); }}
                      style={{ ...css.btn, ...css.btnSm, ...css.btnP, fontSize: 10, padding: "3px 8px" }}>+ Add winner to itinerary</button>
                  ) : topCount > 0 && isTie ? (
                    <Tag bg={T.amberL} color={T.amber}>Tie — revote needed</Tag>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>
      <TabBar active="trip" onNav={navigate} />
    </div>
  );

  // ─── Screen: Memories ───
  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    const trip = selectedCreatedTrip || createdTrips[0];
    const tripId = trip?.dbId || trip?.id || 'default';

    for (const f of files) {
      const uniqueId = Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      const filePath = `${tripId}/${uniqueId}-${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      let url = URL.createObjectURL(f);
      let storedInSupabase = false;

      try {
        const { data, error } = await supabase.storage.from('trip-photos').upload(filePath, f, { cacheControl: '3600', upsert: false });
        if (!error && data) {
          const { data: urlData } = supabase.storage.from('trip-photos').getPublicUrl(filePath);
          if (urlData?.publicUrl) {
            url = urlData.publicUrl;
            storedInSupabase = true;
          }
        }
      } catch (err) { /* Storage not set up — use local URL */ }

      const newPhoto = {
        id: uniqueId, url, name: f.name, day: "Untagged", liked: false, caption: "",
        uploadDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        sortOrder: uploadedPhotos.length, filePath: storedInSupabase ? filePath : null,
      };

      setUploadedPhotos(prev => [...prev, newPhoto]);

      // Save metadata to Supabase
      if (storedInSupabase && user) {
        try {
          await supabase.from('trip_photos').insert({
            trip_id: tripId, user_id: user.id, file_url: url, file_path: filePath,
            file_name: f.name, day_tag: 'Untagged', liked: false, caption: '', sort_order: uploadedPhotos.length,
          });
        } catch (err) { /* table may not exist yet */ }
      }
    }
    e.target.value = "";
  };
  const renderMemoriesScreen = () => {
    const totalPhotos = uploadedPhotos.length;
    const likedCount = uploadedPhotos.filter(p => p.liked).length;
    const daysWithPhotos = new Set(uploadedPhotos.filter(p => p.day !== "Untagged").map(p => p.day)).size;
    const untaggedPhotos = uploadedPhotos.filter(p => p.day === "Untagged");
    const tripForPhotos = selectedCreatedTrip || createdTrips[0];
    const photoDayCount = tripForPhotos?.start && tripForPhotos?.end
      ? Math.max(1, Math.ceil((new Date(tripForPhotos.end) - new Date(tripForPhotos.start)) / 86400000) + 1)
      : 5;
    const dayGroups = Array.from({ length: Math.min(photoDayCount, 30) }, (_, i) => `Day ${i + 1}`);
    const taggedByDay = {};
    dayGroups.forEach(d => { taggedByDay[d] = uploadedPhotos.filter(p => p.day === d); });

    const renderPhotoThumb = (p, idx) => (
      <div key={idx} style={{ position: "relative" }}>
        <div style={{ aspectRatio: "1", borderRadius: T.rs, overflow: "hidden", cursor: "pointer", position: "relative", border: p.liked ? `2px solid ${T.red}` : "none" }} onClick={() => setViewingPhoto(p)}>
          <img src={p.url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <span onClick={(e) => { e.stopPropagation(); const updated = uploadedPhotos.map(ph => ph.id === p.id ? { ...ph, liked: !ph.liked } : ph); setUploadedPhotos(updated); updatePhotoInSupabase(p.id, { liked: !p.liked }); }} style={{ position: "absolute", top: 4, left: 4, fontSize: 14, cursor: "pointer", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.4))" }}>{p.liked ? "\u2764\uFE0F" : "\uD83E\uDD0D"}</span>
          <span onClick={(e) => { e.stopPropagation(); setUploadedPhotos(prev => prev.filter(ph => ph.id !== p.id)); deletePhotoFromSupabase(p); }} style={{ position: "absolute", top: 2, right: 4, fontSize: 14, cursor: "pointer", color: "#fff", fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,.6)", lineHeight: 1 }}>&times;</span>
        </div>
        <select value={p.day} onChange={(e) => { const newDay = e.target.value; setUploadedPhotos(prev => prev.map(ph => ph.id === p.id ? { ...ph, day: newDay } : ph)); updatePhotoInSupabase(p.id, { day_tag: newDay }); }}
          style={{ width: "100%", padding: "3px 4px", fontSize: 10, border: `.5px solid ${T.border}`, borderRadius: 4, background: T.s2, color: T.t2, marginTop: 3, fontFamily: T.font, cursor: "pointer" }}>
          <option value="Untagged">Untagged</option>
          {dayGroups.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
    );

    const renderUploadBox = () => (
      <div onClick={() => photoInputRef.current?.click()} style={{ aspectRatio: "1", borderRadius: T.rs, border: `1.5px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 24, color: T.t3 }}>+</div>
    );

    return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <input type="file" accept="image/*" multiple ref={photoInputRef} style={{ display: "none" }} onChange={handlePhotoUpload} aria-label="Upload photos" />
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

        {/* Reel style selector */}
        {totalPhotos > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Reel Style</p>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { id: "cinematic", label: "\uD83C\uDFAC Cinematic", desc: "Slow Ken Burns" },
                { id: "slideshow", label: "\uD83D\uDCF7 Slideshow", desc: "Clean fades" },
                { id: "energetic", label: "\u26A1 Energetic", desc: "Fast & dynamic" },
              ].map(s => (
                <button key={s.id} onClick={() => setReelStyle(s.id)}
                  style={{ flex: 1, padding: "10px 8px", borderRadius: T.rs, border: `.5px solid ${reelStyle === s.id ? T.a : T.border}`,
                    background: reelStyle === s.id ? T.al : T.s2, cursor: "pointer", textAlign: "center" }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: reelStyle === s.id ? T.ad : T.t1 }}>{s.label}</p>
                  <p style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>{s.desc}</p>
                </button>
              ))}
            </div>
            <p style={{ fontSize: 10, color: T.t3, marginTop: 6 }}>Photos play in upload order. Drag to reorder coming soon.</p>
          </div>
        )}

        <div style={{ ...css.card, padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Video settings</p>
          <p style={{ fontSize: 12, color: T.t2, marginBottom: 12 }}>Customise your highlight reel</p>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {["Music overlay", "AI narration", "Date stamps", "Slow-mo", "Boomerangs"].map((o) => {
              const comingSoon = ["Music overlay", "AI narration", "Boomerangs"].includes(o);
              return (
                <span key={o} onClick={() => setVideoSettings(prev => { const next = new Set(prev); if (next.has(o)) next.delete(o); else next.add(o); return next; })} style={{ ...css.chip, ...(videoSettings.has(o) ? css.chipActive : {}), cursor: "pointer", position: "relative" }}>
                  {o}
                  {comingSoon && <span style={{ fontSize: 7, color: T.amber, marginLeft: 3 }}>soon</span>}
                </span>
              );
            })}
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
          <code style={{ flex: 1, fontFamily: T.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>tripwithme.app/trip/easter-ld-2026</code>
          <button style={{ ...css.btn, ...css.btnSm }} onClick={() => { navigator.clipboard?.writeText("https://tripwithme.app/trip/easter-ld-2026"); alert("Link copied!"); }}>Copy</button>
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
  const renderExploreScreen = () => {
    // Dynamic location: use current day's location from demo or created trip
    const currentLoc = DAYS[selectedDay - 1]?.location || "Ambleside";
    const locActs = getLocationActivities(currentLoc);
    // Build dynamic explore items from location data
    const exploreItems = [];
    if (locActs) {
      if (locActs.dinner?.[0]) exploreItems.push({ title: locActs.dinner[0].split(" at ").pop() || locActs.dinner[0], sub: `Restaurant · ${currentLoc}`, tags: [["Dining", T.coralL, T.coral]], icon: "🍽️", bg: T.coralL });
      if (locActs.kids?.[0]) exploreItems.push({ title: locActs.kids[0], sub: `Family activity · ${currentLoc}`, tags: [["Kids", T.pinkL, T.pink]], icon: "🎢", bg: T.pinkL });
      exploreItems.push({ title: `EV Chargers near ${currentLoc}`, sub: "Open Charge Map", tags: [["EV charging", T.al, T.ad]], icon: "⚡", bg: T.al });
      if (locActs.morning?.[0]) exploreItems.push({ title: locActs.morning[0], sub: `Activity · ${currentLoc}`, tags: [["Explore", T.blueL, T.blue]], icon: "🥾", bg: T.blueL });
      if (locActs.afternoon?.[0]) exploreItems.push({ title: locActs.afternoon[0], sub: `Afternoon · ${currentLoc}`, tags: [["Sightseeing", T.purpleL, T.purple]], icon: "📸", bg: T.purpleL });
    } else {
      exploreItems.push(
        { title: `Restaurants in ${currentLoc}`, sub: "Find dining nearby", tags: [["Dining", T.coralL, T.coral]], icon: "🍽️", bg: T.coralL },
        { title: `Things to do in ${currentLoc}`, sub: "Activities & attractions", tags: [["Explore", T.blueL, T.blue]], icon: "🎯", bg: T.blueL },
        { title: `EV Chargers near ${currentLoc}`, sub: "Open Charge Map", tags: [["EV charging", T.al, T.ad]], icon: "⚡", bg: T.al },
        { title: `Walks near ${currentLoc}`, sub: "Trails & hikes", tags: [["Outdoors", T.purpleL, T.purple]], icon: "🥾", bg: T.purpleL },
      );
    }
    const mapIcons = [["🍽️", "28%", "30%", T.coral], ["🎢", "68%", "22%", T.pink], ["⚡", "75%", "58%", T.a], ["🥾", "18%", "60%", T.purple]];
    if (exploreItems.length > 4) mapIcons.push(["📸", "45%", "70%", T.blue]);
    return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("trip")}>Back</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Explore nearby</h2>
        <span style={{ fontSize: 12, color: T.t3 }}>{currentLoc}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <div style={{ height: 160, background: T.s2, borderRadius: T.r, marginBottom: 12, position: "relative", overflow: "hidden", border: `.5px solid ${T.border}` }}>
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(170deg, #D4E8D0, #E2EDDA 40%, #C9DBC3)" }}>
            <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", ...css.avatar(T.blue, 28), border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,.15)" }}>You</div>
            {mapIcons.map(([icon, l, t, c], i) => (
              <div key={i} style={{ position: "absolute", left: l, top: t, ...css.avatar(c, 22), fontSize: 11, border: "2px solid #fff" }}>{icon}</div>
            ))}
          </div>
        </div>
        {exploreItems.map((p, i) => (
          <div key={i} onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(p.title)}+${encodeURIComponent(currentLoc)}`, "_blank")} style={{ ...css.card, display: "flex", gap: 12, cursor: "pointer" }}>
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
  };

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
        <div style={{ background: T.amberL, padding: "8px 12px", borderRadius: T.rs, marginBottom: 8 }}>
          <p style={{ fontSize: 11, color: T.amber, fontWeight: 500 }}>🔌 Coming soon — connector integrations will power live data from these services. Toggles saved for when ready.</p>
        </div>
        <p style={{ fontSize: 12, color: T.t3, marginBottom: 8 }}>Trip With Me uses intelligent routing to connect the right services automatically. Toggle individual connectors on/off.</p>
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
        <div style={{ background: T.blueL, padding: "8px 12px", borderRadius: T.rs, marginBottom: 8 }}>
          <p style={{ fontSize: 11, color: T.blue, fontWeight: 500 }}>📱 Coming soon — push notifications require the mobile app. Preferences saved for launch.</p>
        </div>
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
    // Smart numDays: prefer stay date span if stays indicate shorter trip
    let numDays = 1;
    const tripStays = trip.stays || [];
    if (tripStays.length > 0) {
      const cis = tripStays.map(s => s.checkIn).filter(Boolean).sort();
      const cos = tripStays.map(s => s.checkOut).filter(Boolean).sort();
      if (cis.length > 0 && cos.length > 0) {
        const sd = Math.max(1, Math.round((new Date(cos[cos.length - 1] + "T12:00:00") - new Date(cis[0] + "T12:00:00")) / 86400000) + 1);
        const rd = trip.rawStart && trip.rawEnd ? Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1) : null;
        numDays = (rd && sd < rd && sd <= 30) ? sd : (rd || sd);
      }
    }
    if (numDays <= 1 && trip.rawStart && trip.rawEnd) {
      numDays = Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1);
    }
    const dayItems = getDayItems(trip.timeline, selectedDay);
    const tripHasTimeline = hasTimeline(trip);
    const tripStart = trip.rawStart ? new Date(trip.rawStart) : null;

    // Edit trip handler
    const editTrip = () => {
      setWizTrip({ name: trip.name, brief: trip.brief || "", start: trip.rawStart || "", end: trip.rawEnd || "", places: [...trip.places], travel: new Set(trip.travel), budget: trip.budget || "", startLocation: trip.startLocation || "" });
      setWizTravellers({ adults: trip.travellers.adults.map(a => ({ ...a })), olderKids: trip.travellers.olderKids.map(c => ({ ...c })), youngerKids: trip.travellers.youngerKids.map(c => ({ ...c })) });
      setWizStays(trip.stays || []);
      setWizPrefs({ food: new Set(trip.prefs.food), adultActs: new Set(trip.prefs.adultActs || trip.prefs.activities), olderActs: new Set(trip.prefs.olderActs || []), youngerActs: new Set(trip.prefs.youngerActs || []), instructions: trip.prefs.instructions || "" });
      setWizStep(0);
      setEditingTripId(trip.id);
      navigate("create");
    };

    // Tab bar for live trips
    const tripTabStyle = (tab) => ({
      flex: 1, padding: "10px 0", textAlign: "center", fontSize: 12, fontWeight: tripDetailTab === tab ? 600 : 400,
      color: tripDetailTab === tab ? T.a : T.t3, cursor: "pointer", border: "none", background: "none",
      fontFamily: T.font, borderBottom: tripDetailTab === tab ? `2px solid ${T.a}` : "2px solid transparent", transition: "all .15s"
    });

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        {/* ── Header ── */}
        <div style={{ background: isLive ? T.ad : T.blue, color: "#fff", padding: "16px 20px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <button style={{ ...css.btn, ...css.btnSm, background: "rgba(255,255,255,.18)", borderColor: "rgba(255,255,255,.3)", color: "#fff", fontSize: 12, fontWeight: 500 }} onClick={() => navigate("home")}>← Back</button>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {isLive
                ? <span style={{ fontSize: 10, fontWeight: 600, background: "rgba(255,255,255,.22)", color: "#fff", padding: "3px 10px", borderRadius: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>● Live</span>
                : <span style={{ fontSize: 10, fontWeight: 600, background: "rgba(255,255,255,.22)", color: "#fff", padding: "3px 10px", borderRadius: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>Draft</span>
              }
              <button onClick={editTrip} style={{ ...css.btn, ...css.btnSm, color: "#fff", fontSize: 12, fontWeight: 500, background: "rgba(255,255,255,.18)", borderColor: "rgba(255,255,255,.3)" }}>Edit</button>
            </div>
          </div>
          <h2 style={{ fontFamily: T.fontD, fontSize: 20, fontWeight: 400 }}>{trip.name}</h2>
          <p style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
            {trip.start && trip.end ? `${trip.start} – ${trip.end} ${trip.year}` : "Dates TBC"}
            {` · ${trip.places.join(", ") || "No locations"} · ${totalTravellers} traveller${totalTravellers > 1 ? "s" : ""}`}
          </p>
        </div>

        {/* ── Not live: activation CTA ── */}
        {!isLive && (
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            <div style={{ ...css.card, background: T.al, borderColor: T.a, marginBottom: 16, textAlign: "center", padding: "24px 20px" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🚀</div>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: T.ad }}>Ready to go live?</h3>
              <p style={{ fontSize: 12, color: T.t2, marginBottom: 16, lineHeight: 1.5 }}>Trip With Me will generate your day-by-day itinerary based on your places, stays, and preferences.</p>
              <button onClick={() => makeTripLive(trip.id)} style={{ ...css.btn, ...css.btnP, justifyContent: "center", width: "100%", padding: "14px 16px", fontSize: 15, fontWeight: 600, borderRadius: T.r, boxShadow: "0 2px 8px rgba(27,143,106,.25)" }}>Activate trip</button>
            </div>

            {/* Details preview for non-live */}
            <Collapsible title="Details" icon="📍" sectionKey="details" defaultOpen={true} expandedSections={expandedSections} setExpandedSections={setExpandedSections}
              count={trip.places.length + trip.travel.length + trip.stayNames.length}>
              <div className="w-card" style={css.card}>
                {trip.places.length > 0 && <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Locations</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{trip.places.map(p => <Tag key={p} bg={T.purpleL} color={T.purple}>{p}</Tag>)}</div></div>}
                {trip.travel.length > 0 && <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Travel</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{trip.travel.map(tv => <Tag key={tv} bg={T.blueL} color={T.blue}>{tv}</Tag>)}</div></div>}
                {trip.stayNames.length > 0 && <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Stays</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{trip.stayNames.map(s => <Tag key={s} bg={T.amberL} color={T.amber}>{s}</Tag>)}</div></div>}
              </div>
            </Collapsible>

            <button onClick={() => { if (window.confirm(`Are you sure you want to remove "${trip.name}"? This cannot be undone.`)) { deleteCreatedTrip(trip.id); navigate("home"); } }}
              style={{ ...css.btn, ...css.btnSm, color: T.red, borderColor: "rgba(200,50,50,.2)", background: "rgba(200,50,50,.04)", marginTop: 16, fontSize: 12, justifyContent: "center", width: "100%" }}>Remove trip</button>
          </div>
        )}

        {/* ── Live trip: 3-tab layout ── */}
        {isLive && (
          <>
            {/* Tab bar */}
            <div style={{ display: "flex", background: T.s, borderBottom: `.5px solid ${T.border}`, position: "sticky", top: 0, zIndex: 10 }}>
              <button className="w-tab" style={tripTabStyle("itinerary")} onClick={() => setTripDetailTab("itinerary")}>Itinerary</button>
              <button className="w-tab" style={tripTabStyle("chat")} onClick={() => setTripDetailTab("chat")}>Chat</button>
              <button className="w-tab" style={tripTabStyle("polls")} onClick={() => setTripDetailTab("polls")}>Polls</button>
              <button className="w-tab" style={tripTabStyle("expenses")} onClick={() => setTripDetailTab("expenses")}>Expenses</button>
              <button className="w-tab" style={tripTabStyle("memories")} onClick={() => setTripDetailTab("memories")}>Memories</button>
              <button className="w-tab" style={tripTabStyle("info")} onClick={() => setTripDetailTab("info")}>Info</button>
            </div>

            {/* ── ITINERARY TAB ── */}
            {tripDetailTab === "itinerary" && (
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
                {!tripHasTimeline && (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>✨</div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: T.ad, marginBottom: 4 }}>Your itinerary is being prepared</p>
                      <p style={{ fontSize: 12, color: T.t2, lineHeight: 1.5, marginBottom: 12 }}>Generate your plan or add activities manually.</p>
                      <button onClick={() => { generateAndSetTimeline(trip.id); }} style={{ ...css.btn, ...css.btnP, ...css.btnSm }}>Generate itinerary</button>
                    </div>
                  </div>
                )}
                {tripHasTimeline && (
                  <>
                    {/* Day navigator pills */}
                    <div style={{ display: "flex", gap: 6, padding: "10px 20px", overflowX: "auto", background: T.s, borderBottom: `.5px solid ${T.border}` }}>
                      {Array.from({ length: numDays }, (_, i) => i + 1).map(d => {
                        const dayDate = tripStart ? new Date(tripStart.getTime() + (d - 1) * 86400000) : null;
                        const dateStr = dayDate ? dayDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
                        const isActive = selectedDay === d;
                        const dayHasItems = getDayItems(trip.timeline, d).length > 0;
                        return (
                          <button key={d} onClick={() => { setSelectedDay(d); setEditingTimelineIdx(null); }}
                            style={{ padding: "6px 14px", borderRadius: 20, border: `.5px solid ${isActive ? T.a : T.border}`,
                              background: isActive ? T.a : dayHasItems ? T.s : T.s2, color: isActive ? "#fff" : dayHasItems ? T.t1 : T.t3,
                              fontSize: 11, fontWeight: isActive ? 600 : 400, fontFamily: T.font, cursor: "pointer", whiteSpace: "nowrap",
                              transition: "all .15s", flexShrink: 0, opacity: dayHasItems || isActive ? 1 : 0.6 }}>
                            Day {d}{dateStr ? ` · ${dateStr}` : ""}
                          </button>
                        );
                      })}
                    </div>

                    {/* Embedded Map */}
                    {showMap && trip.places?.length > 0 && (
                      <div style={{ padding: "10px 20px 0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: 0.5 }}>🗺️ Route Map</p>
                          <button onClick={() => setShowMap(false)} style={{ ...css.btn, ...css.btnSm, fontSize: 10, opacity: 0.5, padding: "3px 8px" }}>Hide</button>
                        </div>
                        <TripMap
                          places={(() => {
                            const route = getFullRouteFromStays(trip);
                            const stops = trip.startLocation ? [trip.startLocation, ...route] : route;
                            // Add return leg: append startLocation at end for full loop
                            if (trip.startLocation && stops.length > 1 && stops[stops.length - 1].toLowerCase() !== trip.startLocation.toLowerCase()) {
                              stops.push(trip.startLocation);
                            }
                            return stops;
                          })()}
                          height={180}
                          onDirectionsLoaded={setTripDirections}
                          travelMode={trip.travel?.[0] || trip.travel?.values?.().next?.().value || ""}
                        />
                        {tripDirections && (() => {
                          const travelIcon = (() => { const m = (trip.travel?.[0] || "").toLowerCase(); if (/train|transit/.test(m)) return "🚂"; if (/walk/.test(m)) return "🚶"; if (/bicy|bike/.test(m)) return "🚴"; if (/flight|fly/.test(m)) return "✈️"; if (/ev/i.test(m)) return "⚡🚗"; return "🚗"; })();
                          const legs = tripDirections.legs || [];
                          const nDays = numDays || legs.length || 1;

                          // Map legs to days: spread legs evenly across trip days
                          // If more days than legs, some days have no driving
                          // If more legs than days, group legs into days
                          const getDayLegs = () => {
                            if (legs.length === 0) return [];
                            if (legs.length <= nDays) {
                              // Assign one leg per travel day: Day 1 = leg 0, Day 2 = leg 1, etc.
                              // But first day might be travel to first stop, last leg is return
                              const legIdx = selectedDay - 1;
                              if (legIdx < legs.length) return [legs[legIdx]];
                              return []; // Rest day — no driving
                            }
                            // More legs than days — divide evenly
                            const legsPerDay = Math.ceil(legs.length / nDays);
                            const startIdx = (selectedDay - 1) * legsPerDay;
                            return legs.slice(startIdx, startIdx + legsPerDay);
                          };

                          const dayLegs = getDayLegs();
                          const hasDayDriving = dayLegs.length > 0;

                          // Parse distance/duration text to numbers for day totals
                          const parseMiles = (text) => { const m = text?.match(/([\d,.]+)\s*mi/); return m ? parseFloat(m[1].replace(",", "")) : 0; };
                          const parseDuration = (text) => {
                            const hrs = text?.match(/(\d+)\s*hr/); const mins = text?.match(/(\d+)\s*min/);
                            return (hrs ? parseInt(hrs[1]) * 60 : 0) + (mins ? parseInt(mins[1]) : 0);
                          };
                          const fmtDuration = (totalMins) => {
                            const h = Math.floor(totalMins / 60), m = totalMins % 60;
                            return h > 0 ? `${h} hr ${m} min` : `${m} min`;
                          };

                          const dayDist = dayLegs.reduce((s, l) => s + parseMiles(l.distance), 0);
                          const dayDur = dayLegs.reduce((s, l) => s + parseDuration(l.duration), 0);
                          const dayRoute = dayLegs.length > 0 ? `${dayLegs[0].start.split(",")[0]} → ${dayLegs[dayLegs.length - 1].end.split(",")[0]}` : "";

                          return (
                            <div style={{ padding: "6px 0 2px" }}>
                              {hasDayDriving ? (
                                <div style={{ textAlign: "center" }}>
                                  <p style={{ fontSize: 10, color: T.t3, marginBottom: 4, fontWeight: 500 }}>Day {selectedDay} driving</p>
                                  <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 11, color: T.t2 }}>{travelIcon} <b>{dayDist.toFixed(1)} mi</b></span>
                                    <span style={{ fontSize: 11, color: T.t2 }}>⏱️ <b>{fmtDuration(dayDur)}</b></span>
                                  </div>
                                  <p style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>{dayRoute}</p>
                                </div>
                              ) : (
                                <p style={{ fontSize: 10, color: T.t3, textAlign: "center" }}>No driving today — rest & explore</p>
                              )}
                              <details style={{ textAlign: "center", marginTop: 4 }}>
                                <summary style={{ fontSize: 10, color: T.t3, cursor: "pointer", listStyle: "none" }}>
                                  <span style={{ textDecoration: "underline", textUnderlineOffset: 2 }}>Full trip: {tripDirections.totalDistance} · {tripDirections.totalDuration}</span>
                                </summary>
                                <div style={{ display: "flex", gap: 8, justifyContent: "center", padding: "4px 0", flexWrap: "wrap" }}>
                                  {legs.map((l, i) => (
                                    <span key={i} style={{ fontSize: 9, color: i === selectedDay - 1 ? T.a : T.t3, fontWeight: i === selectedDay - 1 ? 600 : 400 }}>
                                      Leg {i + 1}: {l.distance}
                                    </span>
                                  ))}
                                </div>
                              </details>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                    {!showMap && trip.places?.length > 0 && (
                      <div style={{ padding: "4px 20px" }}>
                        <button onClick={() => setShowMap(true)} style={{ ...css.btn, ...css.btnSm, fontSize: 10, color: T.a }}>🗺️ Show map</button>
                      </div>
                    )}

                    {/* Chat nudge banner */}
                    <div onClick={() => setTripDetailTab("chat")} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 20px", background: `${T.a}10`, borderBottom: `.5px solid ${T.border}`, cursor: "pointer" }}>
                      <span style={{ fontSize: 14 }}>💬</span>
                      <p style={{ fontSize: 11, color: T.a, fontWeight: 500, margin: 0 }}>Not quite right? Switch to <b>Chat</b> to refine this itinerary with AI</p>
                      <span style={{ marginLeft: "auto", fontSize: 11, color: T.a }}>→</span>
                    </div>

                    {/* Timeline items for selected day */}
                    <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>
                          Day {selectedDay}
                          {(() => { const dd = tripStart ? new Date(tripStart.getTime() + (selectedDay - 1) * 86400000) : null; return dd ? ` — ${dd.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}` : ""; })()}
                          {(() => {
                            // Derive location from stay check-in dates for this day
                            const dayDateStr = tripStart ? new Date(tripStart.getTime() + (selectedDay - 1) * 86400000).toISOString().split("T")[0] : null;
                            if (dayDateStr && trip.stays?.length > 0) {
                              const sorted = [...trip.stays].filter(s => s.checkIn && s.location).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
                              const match = sorted.find(s => s.checkIn <= dayDateStr && s.checkOut > dayDateStr) || sorted.find(s => s.checkIn === dayDateStr) || sorted[0];
                              return match?.location ? ` · ${match.location}` : "";
                            }
                            const loc = trip.places?.[(selectedDay - 1) % (trip.places?.length || 1)];
                            return loc ? ` · ${loc}` : "";
                          })()}
                        </p>
                        <button onClick={() => addTimelineItem(trip.id)} style={{ ...css.btn, ...css.btnSm, fontSize: 11, color: T.a }}>+ Add</button>
                      </div>

                      {dayItems.length === 0 && (
                        <div style={{ textAlign: "center", padding: "24px 0", color: T.t3 }}>
                          <p style={{ fontSize: 13, marginBottom: 8 }}>No activities planned for Day {selectedDay} yet.</p>
                          <button onClick={() => addTimelineItem(trip.id)} style={{ ...css.btn, ...css.btnSm, color: T.a, fontSize: 11 }}>+ Add activity</button>
                        </div>
                      )}

                      {dayItems.map((item, i) => (
                        <div key={i} data-timeline-idx={i} style={{ display: "flex", gap: 12, marginBottom: editingTimelineIdx === i ? 8 : 14 }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 14 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                            {i < dayItems.length - 1 && <div style={{ width: 1.5, flex: 1, background: T.border, marginTop: 4 }} />}
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
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                  <button onClick={() => setEditingTimelineIdx(null)} style={{ ...css.btn, ...css.btnP, ...css.btnSm, fontSize: 10 }}>Done</button>
                                  <button onClick={() => moveTimelineItem(trip.id, i, -1)} disabled={i === 0}
                                    style={{ ...css.btn, ...css.btnSm, fontSize: 12, padding: "4px 8px", opacity: i === 0 ? 0.3 : 1 }} aria-label="Move up">▲</button>
                                  <button onClick={() => moveTimelineItem(trip.id, i, 1)} disabled={i === dayItems.length - 1}
                                    style={{ ...css.btn, ...css.btnSm, fontSize: 12, padding: "4px 8px", opacity: i === dayItems.length - 1 ? 0.3 : 1 }} aria-label="Move down">▼</button>
                                  <button onClick={() => deleteTimelineItem(trip.id, i)} style={{ ...css.btn, ...css.btnSm, fontSize: 10, color: T.red }}>Delete</button>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                                <div style={{ flex: 1 }}>
                                  <p style={{ fontSize: 11, color: T.t3, marginBottom: 2 }}>{item.time}</p>
                                  <p style={{ fontSize: 14, fontWeight: 500 }}>{item.title}</p>
                                  <p style={{ fontSize: 12, color: T.t2, marginTop: 2 }}>{item.desc}</p>
                                  <Tag bg={item.group === "Adults" ? T.blueL : item.group === "Kids" ? T.pinkL : item.group === "Note" ? T.amberL : T.al} color={item.group === "Adults" ? T.blue : item.group === "Kids" ? T.pink : item.group === "Note" ? T.amber : T.ad}>{item.group}</Tag>
                                </div>
                                <button onClick={() => setEditingTimelineIdx(i)} aria-label={`Edit ${item.title}`} style={{ ...css.btn, ...css.btnSm, fontSize: 14, padding: "8px", minWidth: 40, minHeight: 40, opacity: 0.5, justifyContent: "center" }}>✏️</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Tonight's stay — matched from selected day */}
                      {trip.stays?.length > 0 && (() => {
                        const currentDate = tripStart ? new Date(tripStart.getTime() + (selectedDay - 1) * 86400000) : null;
                        const matchedStay = currentDate ? trip.stays.find(s => {
                          if (!s.checkIn || !s.checkOut) return false;
                          return currentDate >= new Date(s.checkIn) && currentDate < new Date(s.checkOut);
                        }) : trip.stays[0];
                        return matchedStay ? (
                          <div style={{ ...css.card, background: T.purpleL, borderColor: T.purple, marginTop: 4 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 14 }}>🏠</span>
                              <div>
                                <p style={{ fontSize: 12, fontWeight: 500, color: T.purple }}>Tonight's stay</p>
                                <p style={{ fontSize: 11, color: T.t2 }}>{matchedStay.name}{matchedStay.checkIn ? ` · ${new Date(matchedStay.checkIn).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(matchedStay.checkOut).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}</p>
                              </div>
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── CHAT TAB ── */}
            {tripDetailTab === "chat" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                  {tripChatMessages.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px 16px", color: T.t3 }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: T.t2, marginBottom: 4 }}>Chat with AI</p>
                      <p style={{ fontSize: 12, lineHeight: 1.5 }}>Ask about restaurants, adjust times, add activities, get budget tips — anything about your trip.</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 16 }}>
                        {[`Find restaurants in ${trip.places?.[(selectedDay - 1) % (trip.places?.length || 1)] || "this area"}`, "Suggest kid-friendly activities", "What's the budget looking like?", "Regenerate itinerary"].map(q => (
                          <button key={q} onClick={() => { setTripChatInput(q); }} className="w-btn"
                            style={{ ...css.btn, ...css.btnSm, fontSize: 11, color: T.a, background: T.al, borderColor: T.a }}>
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {tripChatMessages.map((msg, i) => {
                    // Extract actionable items from AI messages (lines starting with "- **Name**" or "1. **Name**")
                    const actionItems = msg.role === "ai" ? (msg.text.match(/(?:^|\n)\s*(?:\d+\.\s*|\-\s*)\*\*([^*]+)\*\*/g) || []).map(m => {
                      const match = m.match(/\*\*([^*]+)\*\*/);
                      return match ? match[1].trim() : null;
                    }).filter(Boolean).slice(0, 6) : [];

                    return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 8 }}>
                      <div style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: 16, fontSize: 13, lineHeight: 1.5,
                        background: msg.role === "user" ? T.a : T.s2, color: msg.role === "user" ? "#fff" : T.t1,
                        borderBottomRightRadius: msg.role === "user" ? 4 : 16, borderBottomLeftRadius: msg.role === "user" ? 16 : 4,
                        wordBreak: "break-word", overflowWrap: "break-word" }}
                        dangerouslySetInnerHTML={{ __html: renderChatHtml(msg.text, msg.role === "user" ? "#fff" : T.a) }} />
                      {/* Action buttons for AI suggestions */}
                      {actionItems.length > 0 && (
                        <div style={{ maxWidth: "85%", display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4, position: "relative" }}>
                          {actionItems.map((item, j) => {
                            const pickerOpen = chatAddDayPicker?.msgIdx === i && chatAddDayPicker?.itemIdx === j;
                            const tripDays = trip.start && trip.end ? Math.max(1, Math.ceil((new Date(trip.end) - new Date(trip.start)) / 86400000) + 1) : Object.keys(trip.timeline || {}).length || 5;
                            return (
                              <div key={j} style={{ position: "relative" }}>
                                <button onClick={() => setChatAddDayPicker(pickerOpen ? null : { msgIdx: i, itemIdx: j })}
                                  className="w-btn" style={{ ...css.btn, ...css.btnSm, fontSize: 10, padding: "4px 8px", borderRadius: 12,
                                    color: T.a, background: T.al, borderColor: T.a }}>
                                  + {item.length > 22 ? item.slice(0, 22) + "\u2026" : item}
                                </button>
                                {pickerOpen && (
                                  <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 50, background: T.bg, border: `.5px solid ${T.border}`, borderRadius: 10, padding: 4, marginTop: 4, boxShadow: "0 4px 12px rgba(0,0,0,.12)", display: "flex", flexWrap: "wrap", gap: 3, minWidth: 140 }}>
                                    {Array.from({ length: tripDays }, (_, d) => d + 1).map(day => (
                                      <button key={day} onClick={() => {
                                        const curLoc = trip.places?.[(day - 1) % (trip.places?.length || 1)] || "your destination";
                                        const newItem = { time: "12:00 PM", title: item, desc: `${curLoc} \u00B7 Added from chat`, group: "Everyone", color: T.blue };
                                        setCreatedTrips(prev => prev.map(t => {
                                          if (t.id !== trip.id) return t;
                                          const tl = t.timeline || {};
                                          return { ...t, timeline: { ...tl, [day]: [...(tl[day] || []), newItem] } };
                                        }));
                                        showToast(`Added "${item}" to Day ${day}`);
                                        setChatAddDayPicker(null);
                                      }}
                                        style={{ ...css.btn, ...css.btnSm, fontSize: 10, padding: "4px 10px", borderRadius: 8, cursor: "pointer",
                                          background: day === selectedDay ? T.a : T.s2, color: day === selectedDay ? "#fff" : T.t1, border: `.5px solid ${day === selectedDay ? T.ad : T.border}` }}>
                                        Day {day}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    );
                  })}
                  {tripChatTyping && (
                    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
                      <div style={{ padding: "12px 18px", background: T.s2, borderRadius: "16px 16px 16px 4px", display: "flex", gap: 4, alignItems: "center" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.t3, animation: "typingDot 1.2s infinite", animationDelay: "0s" }} />
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.t3, animation: "typingDot 1.2s infinite", animationDelay: "0.2s" }} />
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.t3, animation: "typingDot 1.2s infinite", animationDelay: "0.4s" }} />
                      </div>
                    </div>
                  )}
                  <div ref={tripChatEndRef} />
                </div>
                <div style={{ padding: "12px 20px", borderTop: `.5px solid ${T.border}`, background: T.s }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={tripChatInput} onChange={e => setTripChatInput(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleTripChat(trip.id)}
                      style={{ flex: 1, padding: "10px 14px", border: `.5px solid ${T.border}`, borderRadius: 24, fontFamily: T.font, fontSize: 13, background: "#fff", outline: "none" }}
                      placeholder="Ask about your trip..." aria-label="Trip chat input" />
                    <button onClick={() => handleTripChat(trip.id)} aria-label="Send trip message" style={{ ...css.btn, ...css.btnP, borderRadius: 24, padding: "10px 18px", fontSize: 12 }}>Send</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── POLLS TAB ── */}
            {tripDetailTab === "polls" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.t2 }}>Group polls</p>
                  <button style={{ ...css.btn, ...css.btnSm, ...css.btnP }} onClick={() => setShowPollCreator(true)}>+ New poll</button>
                </div>

                {showPollCreator && (
                  <div style={{ ...css.card, marginBottom: 16, border: `1px solid ${T.a}` }}>
                    <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: T.ad }}>New poll</p>
                    <input value={newPollQuestion} onChange={e => setNewPollQuestion(e.target.value)}
                      placeholder="What's the question?"
                      style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, marginBottom: 10, outline: "none" }} />
                    {newPollOptions.map((opt, i) => (
                      <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                        <input value={opt} onChange={e => setNewPollOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                          placeholder={`Option ${i + 1}`}
                          style={{ flex: 1, padding: "8px 10px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 12, outline: "none" }} />
                        {newPollOptions.length > 2 && (
                          <button onClick={() => setNewPollOptions(prev => prev.filter((_, j) => j !== i))}
                            style={{ ...css.btn, ...css.btnSm, padding: "4px 10px", color: T.red, fontSize: 14, minHeight: 36 }}>×</button>
                        )}
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      {newPollOptions.length < 5 && (
                        <button onClick={() => setNewPollOptions(prev => [...prev, ""])}
                          style={{ ...css.btn, ...css.btnSm, flex: 1, justifyContent: "center", fontSize: 11 }}>+ Add option</button>
                      )}
                      <button onClick={createNewPoll} style={{ ...css.btn, ...css.btnSm, ...css.btnP, flex: 1, justifyContent: "center", fontSize: 11 }}>Create poll</button>
                      <button onClick={() => { setShowPollCreator(false); setNewPollQuestion(""); setNewPollOptions(["", ""]); }}
                        style={{ ...css.btn, ...css.btnSm, flex: 0, justifyContent: "center", fontSize: 11, color: T.t3 }}>Cancel</button>
                    </div>
                  </div>
                )}

                {pollData.length === 0 && !showPollCreator && (
                  <div style={{ textAlign: "center", padding: "40px 16px", color: T.t3 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🗳️</div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: T.t2, marginBottom: 4 }}>No polls yet</p>
                    <p style={{ fontSize: 12, lineHeight: 1.5 }}>Create a poll to let your group vote on activities, restaurants, or plans.</p>
                  </div>
                )}

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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, fontSize: 11, color: T.t3 }}>
                      <span>{poll.options.reduce((s, o) => s + (o.voters?.length || 0), 0)} votes · by {poll.by}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        {poll.status === "active" && (
                          <button onClick={(e) => { e.stopPropagation(); setPollData(prev => prev.map(p => p.id === poll.id ? { ...p, status: "closed" } : p)); showToast("Poll closed"); }}
                            style={{ ...css.btn, ...css.btnSm, fontSize: 10, padding: "3px 8px", color: T.red, borderColor: T.red }}>Close poll</button>
                        )}
                        {poll.status === "closed" && (() => {
                          const winner = [...poll.options].sort((a, b) => (b.voters?.length || 0) - (a.voters?.length || 0))[0];
                          const topCount = winner?.voters?.length || 0;
                          const isTie = poll.options.filter(o => (o.voters?.length || 0) === topCount).length > 1;
                          return topCount > 0 && !isTie ? (
                            <button onClick={(e) => { e.stopPropagation(); addTimelineItem(trip.id); showToast(`Added "${winner.text}" to itinerary`); }}
                              style={{ ...css.btn, ...css.btnSm, ...css.btnP, fontSize: 10, padding: "3px 8px" }}>+ Add to itinerary</button>
                          ) : topCount > 0 && isTie ? (
                            <Tag bg={T.amberL} color={T.amber}>Tie — revote needed</Tag>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── EXPENSES TAB ── */}
            {tripDetailTab === "expenses" && (() => {
              const adults = (trip.travellers?.adults || []).map(a => a.name).filter(Boolean);
              // Include accommodation costs from stays
              const stayCosts = (trip.stays || []).filter(s => s.cost && parseFloat(s.cost) > 0).map(s => ({
                id: `stay-${s.name}`, description: s.name || "Accommodation", amount: parseFloat(s.cost),
                category: "accommodation", paid_by: adults[0] || "You", isStay: true,
                splits: adults.map(name => ({ participant_name: name, share_amount: Math.round(parseFloat(s.cost) / adults.length * 100) / 100 })),
              }));
              const allExpenses = [...stayCosts, ...expenses];
              const totalSpent = allExpenses.reduce((s, e) => s + e.amount, 0);
              const catBreakdown = getCategoryBreakdown(allExpenses);
              const settlements = calculateSettlement(allExpenses);

              const openAddExpense = (existingExpense) => {
                if (existingExpense) {
                  setEditingExpense(existingExpense);
                  setExpenseDesc(existingExpense.description);
                  setExpenseAmount(String(existingExpense.amount));
                  setExpenseCategory(existingExpense.category);
                  setExpensePaidBy(existingExpense.paid_by);
                  setExpenseSplitMethod(existingExpense.split_method || 'equal');
                  setExpenseParticipants((existingExpense.splits || []).map(s => s.participant_name));
                  const customs = {};
                  (existingExpense.splits || []).forEach(s => {
                    customs[s.participant_name] = existingExpense.split_method === 'percentage' ? (s.share_percentage || 0) : s.share_amount;
                  });
                  setExpenseCustomSplits(customs);
                } else {
                  resetExpenseForm();
                  setExpensePaidBy(adults[0] || '');
                  setExpenseParticipants([...adults]);
                }
                setShowAddExpense(true);
              };

              return (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                {/* Add Expense Modal */}
                {showAddExpense && (
                  <div style={{ position: "absolute", inset: 0, zIndex: 100, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "20px 0" }}
                    onClick={(e) => { if (e.target === e.currentTarget) resetExpenseForm(); }}>
                    <div style={{ background: T.bg, borderRadius: 20, width: "calc(100% - 32px)", maxWidth: 480, padding: "20px 20px 30px", margin: "auto 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <h3 style={{ fontFamily: T.fontD, fontSize: 18, fontWeight: 400 }}>{editingExpense ? "Edit Expense" : "Add Expense"}</h3>
                        <button onClick={resetExpenseForm} style={{ ...css.btn, ...css.btnSm, fontSize: 18, padding: "2px 8px" }}>&times;</button>
                      </div>

                      {/* Description */}
                      <label style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5 }}>What was it for?</label>
                      <input value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} placeholder="e.g. Dinner at The Harbour"
                        style={{ width: "100%", padding: "10px 14px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, marginTop: 4, marginBottom: 12, outline: "none", boxSizing: "border-box" }} />

                      {/* Amount */}
                      <label style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5 }}>Amount</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, marginBottom: 12 }}>
                        <span style={{ fontSize: 18, fontWeight: 600, color: T.t2 }}>{"£"}</span>
                        <input value={expenseAmount} onChange={e => setExpenseAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" type="text" inputMode="decimal"
                          style={{ flex: 1, padding: "10px 14px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 16, fontWeight: 600, outline: "none" }} />
                      </div>

                      {/* Category */}
                      <label style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5 }}>Category</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4, marginBottom: 12 }}>
                        {EXPENSE_CATEGORIES.map(cat => (
                          <button key={cat.key} onClick={() => setExpenseCategory(cat.key)}
                            style={{ ...css.btn, ...css.btnSm, fontSize: 11, padding: "6px 10px", borderRadius: 20,
                              background: expenseCategory === cat.key ? cat.color : T.s2,
                              color: expenseCategory === cat.key ? "#fff" : T.t2,
                              borderColor: expenseCategory === cat.key ? cat.color : T.border }}>
                            {cat.icon} {cat.label}
                          </button>
                        ))}
                      </div>

                      {/* Paid by */}
                      <label style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5 }}>Paid by</label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4, marginBottom: 12 }}>
                        {adults.map(name => (
                          <button key={name} onClick={() => setExpensePaidBy(name)}
                            style={{ ...css.btn, ...css.btnSm, fontSize: 12, padding: "6px 12px", borderRadius: 20,
                              background: expensePaidBy === name ? T.a : T.s2,
                              color: expensePaidBy === name ? "#fff" : T.t2,
                              borderColor: expensePaidBy === name ? T.ad : T.border }}>
                            {name}
                          </button>
                        ))}
                      </div>

                      {/* Split between (participant selection) */}
                      <label style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5 }}>Split between</label>
                      <p style={{ fontSize: 10, color: T.t3, margin: "2px 0 6px" }}>Tap to add/remove people from this expense</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                        {adults.map(name => {
                          const isIn = expenseParticipants.includes(name);
                          return (
                            <button key={name} onClick={() => {
                              setExpenseParticipants(prev => isIn ? prev.filter(n => n !== name) : [...prev, name]);
                            }}
                              style={{ ...css.btn, ...css.btnSm, fontSize: 12, padding: "6px 12px", borderRadius: 20,
                                background: isIn ? T.blueL : T.s2, color: isIn ? T.blue : T.t3,
                                borderColor: isIn ? T.blue : T.border, fontWeight: isIn ? 600 : 400 }}>
                              {isIn ? "\u2713 " : ""}{name}
                            </button>
                          );
                        })}
                      </div>

                      {/* Split method */}
                      <label style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5 }}>Split method</label>
                      <div style={{ display: "flex", gap: 6, marginTop: 4, marginBottom: 12 }}>
                        {[{ key: 'equal', label: 'Equal' }, { key: 'percentage', label: 'By %' }, { key: 'custom', label: 'Custom' }].map(m => (
                          <button key={m.key} onClick={() => setExpenseSplitMethod(m.key)}
                            style={{ ...css.btn, ...css.btnSm, flex: 1, fontSize: 12, padding: "8px 0", borderRadius: T.rs,
                              background: expenseSplitMethod === m.key ? T.a : T.s2,
                              color: expenseSplitMethod === m.key ? "#fff" : T.t2,
                              borderColor: expenseSplitMethod === m.key ? T.ad : T.border, fontWeight: 500 }}>
                            {m.label}
                          </button>
                        ))}
                      </div>

                      {/* Equal split preview */}
                      {expenseSplitMethod === 'equal' && expenseParticipants.length > 0 && parseFloat(expenseAmount) > 0 && (
                        <div style={{ background: T.s2, borderRadius: T.rs, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: T.t2 }}>
                          {"£"}{(parseFloat(expenseAmount) / expenseParticipants.length).toFixed(2)} each ({expenseParticipants.length} {expenseParticipants.length === 1 ? "person" : "people"})
                        </div>
                      )}

                      {/* Percentage inputs */}
                      {expenseSplitMethod === 'percentage' && expenseParticipants.length > 0 && (
                        <div style={{ background: T.s2, borderRadius: T.rs, padding: 12, marginBottom: 12 }}>
                          {expenseParticipants.map(name => (
                            <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{name}</span>
                              <input value={expenseCustomSplits[name] || ''} onChange={e => setExpenseCustomSplits(prev => ({ ...prev, [name]: e.target.value }))}
                                placeholder="0" type="text" inputMode="decimal" style={{ width: 60, padding: "6px 8px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontSize: 13, fontWeight: 600, textAlign: "right", outline: "none" }} />
                              <span style={{ fontSize: 12, color: T.t3 }}>%</span>
                            </div>
                          ))}
                          <div style={{ fontSize: 11, color: expenseParticipants.reduce((s, n) => s + (parseFloat(expenseCustomSplits[n]) || 0), 0) === 100 ? T.green : T.red, marginTop: 4, fontWeight: 600 }}>
                            Total: {expenseParticipants.reduce((s, n) => s + (parseFloat(expenseCustomSplits[n]) || 0), 0).toFixed(0)}%
                          </div>
                        </div>
                      )}

                      {/* Custom amount inputs */}
                      {expenseSplitMethod === 'custom' && expenseParticipants.length > 0 && (
                        <div style={{ background: T.s2, borderRadius: T.rs, padding: 12, marginBottom: 12 }}>
                          {expenseParticipants.map(name => (
                            <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                              <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{name}</span>
                              <span style={{ fontSize: 12, color: T.t3 }}>{"£"}</span>
                              <input value={expenseCustomSplits[name] || ''} onChange={e => setExpenseCustomSplits(prev => ({ ...prev, [name]: e.target.value }))}
                                placeholder="0.00" type="text" inputMode="decimal" style={{ width: 70, padding: "6px 8px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontSize: 13, fontWeight: 600, textAlign: "right", outline: "none" }} />
                            </div>
                          ))}
                          {parseFloat(expenseAmount) > 0 && (
                            <div style={{ fontSize: 11, color: Math.abs(expenseParticipants.reduce((s, n) => s + (parseFloat(expenseCustomSplits[n]) || 0), 0) - parseFloat(expenseAmount)) < 0.02 ? T.green : T.red, marginTop: 4, fontWeight: 600 }}>
                              Total: {"£"}{expenseParticipants.reduce((s, n) => s + (parseFloat(expenseCustomSplits[n]) || 0), 0).toFixed(2)} / {"£"}{parseFloat(expenseAmount).toFixed(2)}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Save button */}
                      <button onClick={() => saveExpense(trip)} style={{ ...css.btn, ...css.btnP, width: "100%", padding: "12px 0", borderRadius: T.rs, fontSize: 14, fontWeight: 600 }}>
                        {editingExpense ? "Update Expense" : "Add Expense"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Expenses content */}
                <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                  {/* Summary header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <p style={{ fontSize: 22, fontWeight: 700, fontFamily: T.fontD, color: T.t1 }}>{"£"}{totalSpent.toFixed(2)}</p>
                      <p style={{ fontSize: 11, color: T.t3 }}>total spent{allExpenses.length > 0 ? ` \u00B7 ${allExpenses.length} item${allExpenses.length !== 1 ? "s" : ""}${stayCosts.length > 0 ? ` (incl. ${stayCosts.length} stay${stayCosts.length > 1 ? "s" : ""})` : ""}` : ""}</p>
                    </div>
                    <button onClick={() => openAddExpense()} style={{ ...css.btn, ...css.btnP, borderRadius: 24, padding: "10px 18px", fontSize: 12, fontWeight: 600 }}>
                      + Add
                    </button>
                  </div>

                  {/* Category breakdown bar */}
                  {catBreakdown.length > 0 && (
                    <div className="w-card" style={{ ...css.card, marginBottom: 16, padding: 14 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Spending Breakdown</p>
                      <div style={{ display: "flex", height: 10, borderRadius: 5, overflow: "hidden", marginBottom: 10 }}>
                        {catBreakdown.map(s => (
                          <div key={s.key} style={{ width: `${s.percentage}%`, background: s.color, minWidth: s.percentage > 0 ? 3 : 0 }} title={`${s.label}: \u00A3${s.amount.toFixed(2)}`} />
                        ))}
                      </div>
                      {catBreakdown.map(s => (
                        <div key={s.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", fontSize: 12 }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6, color: T.t2 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                            {s.icon} {s.label}
                          </span>
                          <span style={{ fontWeight: 600, color: T.t1 }}>{"£"}{s.amount.toFixed(2)} <span style={{ fontWeight: 400, color: T.t3 }}>({s.percentage.toFixed(0)}%)</span></span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Settlement summary */}
                  {expenses.length > 0 && (
                    <div className="w-card" style={{ ...css.card, marginBottom: 16, padding: 14, borderColor: settlements.length > 0 ? T.amber : T.green }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                        onClick={() => setShowSettlement(!showSettlement)}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5 }}>
                          {settlements.length > 0 ? "\uD83D\uDCB8 Who Owes Whom" : "\u2705 All Settled Up"}
                        </p>
                        <span style={{ fontSize: 12, color: T.t3 }}>{showSettlement ? "\u25B2" : "\u25BC"}</span>
                      </div>
                      {showSettlement && settlements.length > 0 && (
                        <div style={{ marginTop: 10 }}>
                          {settlements.map((s, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: i < settlements.length - 1 ? `.5px solid ${T.border}` : "none" }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: T.coral }}>{s.from}</span>
                              <span style={{ fontSize: 11, color: T.t3 }}>{"→"} pays</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: T.green }}>{s.to}</span>
                              <span style={{ marginLeft: "auto", fontSize: 14, fontWeight: 700, color: T.t1 }}>{"£"}{s.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {showSettlement && settlements.length === 0 && (
                        <p style={{ fontSize: 12, color: T.t3, marginTop: 8 }}>Everyone is square! No payments needed.</p>
                      )}
                    </div>
                  )}

                  {/* Accommodation costs from stays */}
                  {stayCosts.length > 0 && (
                    <div className="w-card" style={{ ...css.card, marginBottom: 16, padding: 14, borderColor: T.amber }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>🏨 Accommodation Costs</p>
                      {stayCosts.map((sc, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < stayCosts.length - 1 ? `.5px solid ${T.border}` : "none" }}>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500 }}>{sc.description}</p>
                            <p style={{ fontSize: 10, color: T.t3 }}>Split equally · {adults.length} people · £{(sc.amount / adults.length).toFixed(2)} each</p>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: T.amber }}>£{sc.amount.toFixed(2)}</span>
                        </div>
                      ))}
                      <p style={{ fontSize: 10, color: T.t3, marginTop: 6, fontStyle: "italic" }}>Auto-added from accommodation details</p>
                    </div>
                  )}

                  {/* Expense list */}
                  {expenses.length === 0 && stayCosts.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px 16px", color: T.t3 }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>{"💷"}</div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: T.t2, marginBottom: 4 }}>No expenses yet</p>
                      <p style={{ fontSize: 12, lineHeight: 1.5 }}>Tap <b>+ Add</b> to log group expenses and track who owes what.</p>
                    </div>
                  )}
                  {expenses.length === 0 && stayCosts.length > 0 && (
                    <p style={{ fontSize: 12, color: T.t3, textAlign: "center", padding: "12px 0" }}>No additional expenses logged yet. Tap <b>+ Add</b> to log meals, activities, and more.</p>
                  )}
                  {expenses.map((exp, i) => {
                    const cat = getCatInfo(exp.category);
                    const splitNames = (exp.splits || []).map(s => s.participant_name).join(", ");
                    return (
                      <div key={exp.id || i} className="w-card" style={{ ...css.card, marginBottom: 8, padding: "12px 14px", cursor: "pointer" }}
                        onClick={() => openAddExpense(exp)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: cat.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                            {cat.icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exp.description}</p>
                            <p style={{ fontSize: 11, color: T.t3 }}>Paid by <b>{exp.paid_by}</b> {"·"} {exp.split_method} split {"·"} {(exp.splits || []).length} people</p>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <p style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{"£"}{exp.amount.toFixed(2)}</p>
                            <p style={{ fontSize: 10, color: T.t3 }}>{cat.label}</p>
                          </div>
                        </div>
                        {/* Delete button */}
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                          <button onClick={(e) => { e.stopPropagation(); deleteExpense(exp.id, trip.dbId || trip.id); }}
                            style={{ ...css.btn, ...css.btnSm, fontSize: 10, color: T.red, padding: "3px 10px" }}>Remove</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              );
            })()}

            {/* ── MEMORIES TAB ── */}
            {tripDetailTab === "memories" && (() => {
              const photoDayCount = trip.start && trip.end
                ? Math.max(1, Math.ceil((new Date(trip.end) - new Date(trip.start)) / 86400000) + 1)
                : Object.keys(trip.timeline || {}).length || 5;
              const dayGroups = Array.from({ length: Math.min(photoDayCount, 30) }, (_, i) => `Day ${i + 1}`);
              const taggedByDay = {};
              dayGroups.forEach(d => { taggedByDay[d] = uploadedPhotos.filter(p => p.day === d); });
              const untaggedPhotos = uploadedPhotos.filter(p => p.day === "Untagged");
              const totalPhotos = uploadedPhotos.length;
              const likedCount = uploadedPhotos.filter(p => p.liked).length;

              const renderThumb = (p, idx) => (
                <div key={idx} style={{ position: "relative" }}>
                  <div style={{ aspectRatio: "1", borderRadius: T.rs, overflow: "hidden", cursor: "pointer", position: "relative", border: p.liked ? `2px solid ${T.red}` : "none" }} onClick={() => setViewingPhoto(p)}>
                    <img src={p.url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <span onClick={(e) => { e.stopPropagation(); const updated = uploadedPhotos.map(ph => ph.id === p.id ? { ...ph, liked: !ph.liked } : ph); setUploadedPhotos(updated); updatePhotoInSupabase(p.id, { liked: !p.liked }); }} style={{ position: "absolute", top: 4, left: 4, fontSize: 14, cursor: "pointer", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.4))" }}>{p.liked ? "\u2764\uFE0F" : "\uD83E\uDD0D"}</span>
                    <span onClick={(e) => { e.stopPropagation(); setUploadedPhotos(prev => prev.filter(ph => ph.id !== p.id)); deletePhotoFromSupabase(p); }} style={{ position: "absolute", top: 2, right: 4, fontSize: 14, cursor: "pointer", color: "#fff", fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,.6)", lineHeight: 1 }}>&times;</span>
                  </div>
                  <select value={p.day} onChange={(e) => { const newDay = e.target.value; setUploadedPhotos(prev => prev.map(ph => ph.id === p.id ? { ...ph, day: newDay } : ph)); updatePhotoInSupabase(p.id, { day_tag: newDay }); }}
                    style={{ width: "100%", padding: "3px 4px", fontSize: 10, border: `.5px solid ${T.border}`, borderRadius: 4, background: T.s2, color: T.t2, marginTop: 3, fontFamily: T.font, cursor: "pointer" }}>
                    <option value="Untagged">Untagged</option>
                    {dayGroups.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              );
              const uploadBox = () => (
                <div onClick={() => photoInputRef.current?.click()} style={{ aspectRatio: "1", borderRadius: T.rs, border: `1.5px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 24, color: T.t3 }}>+</div>
              );

              return (
              <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                <input type="file" accept="image/*" multiple ref={photoInputRef} style={{ display: "none" }} onChange={handlePhotoUpload} />
                {/* Stats */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 12, fontSize: 12, color: T.t2 }}>
                    <span>📸 {totalPhotos}</span>
                    <span>❤️ {likedCount}</span>
                  </div>
                  <button style={{ ...css.btn, ...css.btnSm, ...css.btnP }} onClick={() => photoInputRef.current?.click()}>+ Upload</button>
                </div>

                {/* Highlight reel */}
                {totalPhotos > 0 && (
                  <div style={{ ...css.card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
                    <div style={{ height: 120, background: `linear-gradient(135deg, ${T.ad}, ${T.a})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", gap: 12 }}>
                      <button onClick={() => { setReelIndex(0); setReelPaused(false); setReelPlaying(true); }}
                        style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                      </button>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 500 }}>Trip Highlight Reel</p>
                        <p style={{ fontSize: 11, opacity: .7 }}>{totalPhotos} photos · Auto-generated</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reel style selector */}
                {totalPhotos > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Reel Style</p>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[
                        { id: "cinematic", label: "\uD83C\uDFAC Cinematic", desc: "Slow Ken Burns" },
                        { id: "slideshow", label: "\uD83D\uDCF7 Slideshow", desc: "Clean fades" },
                        { id: "energetic", label: "\u26A1 Energetic", desc: "Fast & dynamic" },
                      ].map(s => (
                        <button key={s.id} onClick={() => setReelStyle(s.id)}
                          style={{ flex: 1, padding: "10px 8px", borderRadius: T.rs, border: `.5px solid ${reelStyle === s.id ? T.a : T.border}`,
                            background: reelStyle === s.id ? T.al : T.s2, cursor: "pointer", textAlign: "center" }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: reelStyle === s.id ? T.ad : T.t1 }}>{s.label}</p>
                          <p style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>{s.desc}</p>
                        </button>
                      ))}
                    </div>
                    <p style={{ fontSize: 10, color: T.t3, marginTop: 6 }}>Photos play in upload order. Drag to reorder coming soon.</p>
                  </div>
                )}

                {/* Day-grouped photos */}
                {dayGroups.map(dayLabel => {
                  const dayPhotos = taggedByDay[dayLabel];
                  return (
                    <div key={dayLabel} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5 }}>{dayLabel}</p>
                        <span style={{ fontSize: 11, color: T.t3 }}>{dayPhotos.length} photo{dayPhotos.length !== 1 ? "s" : ""}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                        {dayPhotos.map((p, i) => renderThumb(p, i))}
                        {uploadBox()}
                      </div>
                    </div>
                  );
                })}

                {/* Untagged */}
                {untaggedPhotos.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Untagged</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                      {untaggedPhotos.map((p, i) => renderThumb(p, i))}
                    </div>
                  </div>
                )}

                {totalPhotos === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 16px", color: T.t3 }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: T.t2, marginBottom: 4 }}>No memories yet</p>
                    <p style={{ fontSize: 12, lineHeight: 1.5 }}>Upload photos to create your trip highlight reel and organise memories by day.</p>
                  </div>
                )}
              </div>
              );
            })()}

            {/* ── INFO TAB ── */}
            {tripDetailTab === "info" && (
              <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
                {/* Share & Invite */}
                {trip.shareCode && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Share & Invite</p>
                    <div className="w-card" style={{ ...css.card, borderColor: T.a }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: T.s2, borderRadius: T.rs, fontSize: 12, color: T.t2, marginBottom: 8 }}>
                        <code style={{ flex: 1, fontFamily: T.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{`${window.location.origin}?join=${trip.shareCode}`}</code>
                        <button className="w-btn" style={{ ...css.btn, ...css.btnSm, fontSize: 11 }} onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}?join=${trip.shareCode}`); showToast("Link copied!"); }}>Copy</button>
                      </div>
                      {trip.travellers.adults.map((a, i) => {
                        const adultColors = [T.a, T.coral, T.blue, T.amber, T.purple, T.pink];
                        const getInit = (n) => { if (!n) return "?"; const p = n.trim().split(/\s+/); return p.length > 1 ? (p[0][0] + p[1][0]).toUpperCase() : n.slice(0, 2).toUpperCase(); };
                        const status = a.isLead ? "Organiser" : a.email ? "Invited" : "Pending";
                        const statusColor = a.isLead ? T.ad : a.email ? T.blue : T.t3;
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < trip.travellers.adults.length - 1 ? `.5px solid ${T.border}` : "none" }}>
                            <Avatar bg={adultColors[i % adultColors.length]} label={getInit(a.name)} size={24} />
                            <p style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{a.name || `Adult ${i + 1}`}</p>
                            <p style={{ fontSize: 10, color: statusColor }}>{status}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Trip brief */}
                {trip.brief && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Trip Summary</p>
                    <p style={{ fontSize: 13, color: T.t2, lineHeight: 1.5, background: T.s2, padding: 12, borderRadius: T.rs }}>{trip.brief}</p>
                  </div>
                )}

                {/* Details */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Trip Details</p>
                  <div className="w-card" style={css.card}>
                    {trip.places.length > 0 && <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>Locations</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{trip.places.map(p => <Tag key={p} bg={T.purpleL} color={T.purple}>{p}</Tag>)}</div></div>}
                    {trip.travel.length > 0 && <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>Travel</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{trip.travel.map(tv => <Tag key={tv} bg={T.blueL} color={T.blue}>{tv}</Tag>)}</div></div>}
                    {trip.stayNames.length > 0 && <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>Stays</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{trip.stayNames.map(s => <Tag key={s} bg={T.amberL} color={T.amber}>{s}</Tag>)}</div></div>}
                    {trip.prefs.food.length > 0 && <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>Food</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{trip.prefs.food.map(f => <Tag key={f} bg={T.coralL} color={T.coral}>{f}</Tag>)}</div></div>}
                    {(trip.prefs.adultActs?.length > 0 || trip.prefs.activities?.length > 0) && <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>Adult activities</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{(trip.prefs.adultActs || trip.prefs.activities).map(a => <Tag key={a} bg={T.blueL} color={T.blue}>{a}</Tag>)}</div></div>}
                    {trip.prefs.olderActs?.length > 0 && <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>Older kids</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{trip.prefs.olderActs.map(a => <Tag key={a} bg={T.pinkL} color={T.pink}>{a}</Tag>)}</div></div>}
                    {trip.prefs.youngerActs?.length > 0 && <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>Younger kids</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{trip.prefs.youngerActs.map(a => <Tag key={a} bg={T.pinkL} color={T.pink}>{a}</Tag>)}</div></div>}
                    {trip.prefs.instructions && <div><label style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>Instructions</label><p style={{ fontSize: 12, color: T.t2, marginTop: 4, lineHeight: 1.5 }}>{trip.prefs.instructions}</p></div>}
                  </div>
                </div>

                <button onClick={() => { if (window.confirm(`Are you sure you want to remove "${trip.name}"? This cannot be undone.`)) { deleteCreatedTrip(trip.id); navigate("home"); } }}
                  style={{ ...css.btn, ...css.btnSm, color: T.red, borderColor: "rgba(200,50,50,.2)", background: "rgba(200,50,50,.04)", fontSize: 12, justifyContent: "center", width: "100%", marginTop: 16 }}>Remove trip</button>
              </div>
            )}
          </>
        )}
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
                  <button onClick={async () => {
                    setJoinedSlot(realIdx);
                    // Persist join to Supabase
                    if (a.dbId && user && user.id !== 'demo') {
                      const ok = await joinTripAsTraveller(trip.dbId || trip.id, a.dbId, user.user_metadata?.full_name || user.email || slotName);
                      if (!ok) showToast("Failed to sync join — try again", "error");
                    }
                  }} style={{ ...css.btn, ...css.btnP, ...css.btnSm, fontSize: 11 }}>Join</button>
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
              <button onClick={() => {
                // Add trip to createdTrips if not already there, then navigate
                if (!createdTrips.find(t => t.id === trip.id)) {
                  setCreatedTrips(prev => [...prev, { ...trip, isJoined: true }]);
                }
                setSelectedCreatedTrip(trip);
                setJoinedSlot(null);
                navigate("createdTrip");
              }} style={{ ...css.btn, ...css.btnP, width: "100%", marginTop: 12, padding: "10px 16px", justifyContent: "center", fontSize: 13, fontWeight: 500, gap: 6 }}>
                📋 View full itinerary
              </button>
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
        <h1 style={{ fontFamily: T.fontD, fontSize: 32, fontWeight: 400, color: T.t1, marginBottom: 4 }}>Trip With Me</h1>
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
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); authScreen === "signup" ? signUpWithEmail() : signInWithEmail(); } }}
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
            <button onClick={() => { setUser({ id: 'demo', email: 'demo@tripwithme.app' }); setAuthLoading(false); }}
              style={{ ...css.btn, fontSize: 12, color: T.t3, cursor: "pointer", margin: "0 auto" }}>
              Skip — explore as guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Render ───
  const phoneStyle = { maxWidth: 600, width: "100%", margin: "0 auto", minHeight: "100dvh", height: "100dvh", background: T.bg, overflow: "hidden", fontFamily: T.font, color: T.t1 };

  if (authLoading) {
    return (
      <div className="w-app" style={phoneStyle}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;1,400&family=Instrument+Serif&display=swap');@keyframes spin{to{transform:rotate(360deg)}}@keyframes kb1{from{transform:scale(1)}to{transform:scale(1.15)}}@keyframes kb2{from{transform:scale(1.15)}to{transform:scale(1)}}@keyframes kb3{from{transform:scale(1) translateX(0)}to{transform:scale(1.1) translateX(-3%)}}@keyframes kb4{from{transform:scale(1.1) translateY(-2%)}to{transform:scale(1) translateY(0)}}@keyframes reelFadeIn{from{opacity:0}to{opacity:1}}@keyframes reelProgress{from{width:0%}to{width:100%}}@keyframes reelEnergetic{0%{transform:scale(1) rotate(0deg);opacity:0}10%{opacity:1}100%{transform:scale(1.15) rotate(1.5deg);opacity:1}}@keyframes demoPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}@keyframes demoSlideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes demoPulse{0%,100%{opacity:.3}50%{opacity:1}}@keyframes demoBounce{0%{transform:translateY(-16px);opacity:0}65%{transform:translateY(3px)}100%{transform:translateY(0);opacity:1}}@keyframes demoFadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}@keyframes demoType{from{width:0}to{width:100%}}@keyframes demoGrow{from{width:0%}to{width:var(--target-width)}}@keyframes typingDot{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.08);border-radius:4px}.w-app input:focus-visible,.w-app textarea:focus-visible,.w-app select:focus-visible{border-color:#4a6f60!important;box-shadow:0 0 0 2px rgba(74,111,96,.15)}.w-app button:focus-visible{outline:2px solid #4a6f60;outline-offset:2px}.w-app input[type="date"]{cursor:pointer}.w-app input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;padding:4px;opacity:.6}.w-app button{transition:all .15s}.w-app button:hover{filter:brightness(.96)}.w-app button:active{filter:brightness(.9);transition:all 60ms}.w-pri:hover{filter:brightness(1.08)!important;box-shadow:0 2px 8px rgba(74,111,96,.25)}.w-pri:active{filter:brightness(.9)!important;transform:scale(.97)}.w-chip:hover{border-color:rgba(74,111,96,.4)!important;background:rgba(74,111,96,.06)!important}.w-chip:active{transform:scale(.96)}.w-tab:hover{color:#4a6f60!important}.w-expand{cursor:pointer;transition:all .15s}.w-expand:hover{background:rgba(0,0,0,.02)}.w-expand:active{background:rgba(0,0,0,.04)}html,body,#root{height:100%;margin:0;background:#f5f3f0}@media(min-width:601px){.w-app{border-radius:22px!important;max-height:900px!important;min-height:0!important;height:900px!important;border:.5px solid rgba(0,0,0,.08)!important;box-shadow:0 8px 40px rgba(0,0,0,.08)!important;margin-top:20px!important;zoom:0.85}}@media(max-width:600px){.w-app{border-radius:0!important;max-height:none!important;height:100dvh!important;border:none!important;box-shadow:none!important;margin:0!important;font-size:14px}}`}</style>
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontFamily: T.fontD, fontSize: 24, fontWeight: 400 }}>Trip With Me</h1>
            <p style={{ fontSize: 12, color: T.t2, marginTop: 4 }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-app" style={phoneStyle}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;1,400&family=Instrument+Serif&display=swap');@keyframes spin{to{transform:rotate(360deg)}}@keyframes kb1{from{transform:scale(1)}to{transform:scale(1.15)}}@keyframes kb2{from{transform:scale(1.15)}to{transform:scale(1)}}@keyframes kb3{from{transform:scale(1) translateX(0)}to{transform:scale(1.1) translateX(-3%)}}@keyframes kb4{from{transform:scale(1.1) translateY(-2%)}to{transform:scale(1) translateY(0)}}@keyframes reelFadeIn{from{opacity:0}to{opacity:1}}@keyframes reelProgress{from{width:0%}to{width:100%}}@keyframes reelEnergetic{0%{transform:scale(1) rotate(0deg);opacity:0}10%{opacity:1}100%{transform:scale(1.15) rotate(1.5deg);opacity:1}}@keyframes demoPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}@keyframes demoSlideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes demoPulse{0%,100%{opacity:.3}50%{opacity:1}}@keyframes demoBounce{0%{transform:translateY(-16px);opacity:0}65%{transform:translateY(3px)}100%{transform:translateY(0);opacity:1}}@keyframes demoFadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}@keyframes demoType{from{width:0}to{width:100%}}@keyframes demoGrow{from{width:0%}to{width:var(--target-width)}}@keyframes typingDot{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.08);border-radius:4px}.w-app input:focus-visible,.w-app textarea:focus-visible,.w-app select:focus-visible{border-color:#4a6f60!important;box-shadow:0 0 0 2px rgba(74,111,96,.15)}.w-app button:focus-visible{outline:2px solid #4a6f60;outline-offset:2px}.w-app input[type="date"]{cursor:pointer}.w-app input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;padding:4px;opacity:.6}.w-app button{transition:all .15s}.w-app button:hover{filter:brightness(.96)}.w-app button:active{filter:brightness(.9);transition:all 60ms}.w-pri:hover{filter:brightness(1.08)!important;box-shadow:0 2px 8px rgba(74,111,96,.25)}.w-pri:active{filter:brightness(.9)!important;transform:scale(.97)}.w-chip:hover{border-color:rgba(74,111,96,.4)!important;background:rgba(74,111,96,.06)!important}.w-chip:active{transform:scale(.96)}.w-tab:hover{color:#4a6f60!important}.w-expand{cursor:pointer;transition:all .15s}.w-expand:hover{background:rgba(0,0,0,.02)}.w-expand:active{background:rgba(0,0,0,.04)}html,body,#root{height:100%;margin:0;background:#f5f3f0}@media(min-width:601px){.w-app{border-radius:22px!important;max-height:900px!important;min-height:0!important;height:900px!important;border:.5px solid rgba(0,0,0,.08)!important;box-shadow:0 8px 40px rgba(0,0,0,.08)!important;margin-top:20px!important;zoom:0.85}}@media(max-width:600px){.w-app{border-radius:0!important;max-height:none!important;height:100dvh!important;border:none!important;box-shadow:none!important;margin:0!important;font-size:14px}}`}</style>
        <div style={{ height: "100%" }}>
          {renderAuthScreen()}
        </div>
      </div>
    );
  }

  return (
    <div className="w-app" style={phoneStyle}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;1,400&family=Instrument+Serif&display=swap');@keyframes spin{to{transform:rotate(360deg)}}@keyframes kb1{from{transform:scale(1)}to{transform:scale(1.15)}}@keyframes kb2{from{transform:scale(1.15)}to{transform:scale(1)}}@keyframes kb3{from{transform:scale(1) translateX(0)}to{transform:scale(1.1) translateX(-3%)}}@keyframes kb4{from{transform:scale(1.1) translateY(-2%)}to{transform:scale(1) translateY(0)}}@keyframes reelFadeIn{from{opacity:0}to{opacity:1}}@keyframes reelProgress{from{width:0%}to{width:100%}}@keyframes reelEnergetic{0%{transform:scale(1) rotate(0deg);opacity:0}10%{opacity:1}100%{transform:scale(1.15) rotate(1.5deg);opacity:1}}@keyframes demoPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}@keyframes demoSlideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes demoPulse{0%,100%{opacity:.3}50%{opacity:1}}@keyframes demoBounce{0%{transform:translateY(-16px);opacity:0}65%{transform:translateY(3px)}100%{transform:translateY(0);opacity:1}}@keyframes demoFadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}@keyframes demoType{from{width:0}to{width:100%}}@keyframes demoGrow{from{width:0%}to{width:var(--target-width)}}@keyframes typingDot{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.08);border-radius:4px}.w-app input:focus-visible,.w-app textarea:focus-visible,.w-app select:focus-visible{border-color:#4a6f60!important;box-shadow:0 0 0 2px rgba(74,111,96,.15)}.w-app button:focus-visible{outline:2px solid #4a6f60;outline-offset:2px}.w-app input[type="date"]{cursor:pointer}.w-app input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;padding:4px;opacity:.6}.w-app button{transition:all .15s}.w-app button:hover{filter:brightness(.96)}.w-app button:active{filter:brightness(.9);transition:all 60ms}.w-pri:hover{filter:brightness(1.08)!important;box-shadow:0 2px 8px rgba(74,111,96,.25)}.w-pri:active{filter:brightness(.9)!important;transform:scale(.97)}.w-chip:hover{border-color:rgba(74,111,96,.4)!important;background:rgba(74,111,96,.06)!important}.w-chip:active{transform:scale(.96)}.w-tab:hover{color:#4a6f60!important}.w-expand{cursor:pointer;transition:all .15s}.w-expand:hover{background:rgba(0,0,0,.02)}.w-expand:active{background:rgba(0,0,0,.04)}html,body,#root{height:100%;margin:0;background:#f5f3f0}@media(min-width:601px){.w-app{border-radius:22px!important;max-height:900px!important;min-height:0!important;height:900px!important;border:.5px solid rgba(0,0,0,.08)!important;box-shadow:0 8px 40px rgba(0,0,0,.08)!important;margin-top:20px!important;zoom:0.85}}@media(max-width:600px){.w-app{border-radius:0!important;max-height:none!important;height:100dvh!important;border:none!important;box-shadow:none!important;margin:0!important;font-size:14px}}`}</style>
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
      {/* ── Activation Preferences Modal (global, works from any screen) ── */}
      {showActivationModal && (() => {
        const pendTrip = createdTrips.find(t => t.id === pendingActivationTripId);
        const isEV = pendTrip?.travel?.some(m => /ev/i.test(m));
        const startLoc = pendTrip?.startLocation || "";
        const firstPlace = pendTrip?.places?.[0] || "";
        const routePlaces = pendTrip ? getSmartRouteOrder(pendTrip) : [];
        const startH = activationPrefs.startTime ? parseInt(activationPrefs.startTime.split(":")[0]) : 8;
        const estArrival = Math.min(startH + 2, 18);
        const fmtHr = (h) => { const s = h >= 12 ? "PM" : "AM"; return `${h > 12 ? h - 12 : h}:00 ${s}`; };
        return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380, maxHeight: "85vh", overflowY: "auto" }}>
            <h3 style={{ fontFamily: T.fontD, fontSize: 18, fontWeight: 400, marginBottom: 4 }}>Plan your journey</h3>
            <p style={{ fontSize: 12, color: T.t2, marginBottom: 16 }}>We'll build your itinerary around your travel.</p>

            {/* Route overview */}
            {startLoc && routePlaces.length > 0 && (
              <div style={{ background: T.s2, borderRadius: T.rs, padding: 12, marginBottom: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Your route</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: T.t1, fontWeight: 500 }}>{startLoc}</span>
                  {routePlaces.map((p, i) => (
                    <React.Fragment key={i}>
                      <span style={{ fontSize: 10, color: T.t3 }}>→</span>
                      <span style={{ fontSize: 12, color: T.ad, fontWeight: 500 }}>{p}</span>
                    </React.Fragment>
                  ))}
                  <span style={{ fontSize: 10, color: T.t3 }}>→</span>
                  <span style={{ fontSize: 12, color: T.t1, fontWeight: 500 }}>{startLoc}</span>
                </div>
                {isEV && <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, padding: "6px 10px", background: T.amberL, borderRadius: 8 }}>
                  <span style={{ fontSize: 14 }}>⚡</span>
                  <p style={{ fontSize: 11, color: T.amber, fontWeight: 500 }}>EV detected — we'll suggest charging stops along the way</p>
                </div>}
              </div>
            )}

            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>What time do you start your journey?</label>
            <input type="time" value={activationPrefs.startTime} onChange={e => setActivationPrefs(p => ({ ...p, startTime: e.target.value }))}
              style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none", marginBottom: 4, minHeight: 44 }} />
            {startLoc && firstPlace && <p style={{ fontSize: 11, color: T.t3, marginBottom: 14 }}>Estimated arrival at {firstPlace}: ~{fmtHr(estArrival)}</p>}

            {/* Stopovers */}
            {activationPrefs.stopovers.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>Suggested stops</label>
                {activationPrefs.stopovers.map((stop, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 6, background: stop.enabled ? (stop.type === "ev_charge" ? T.amberL : T.s2) : T.s, borderRadius: T.rs, border: `.5px solid ${stop.enabled ? (stop.type === "ev_charge" ? T.amber : T.border) : T.border}`, opacity: stop.enabled ? 1 : 0.5, cursor: "pointer", transition: "all .15s" }}
                    onClick={() => setActivationPrefs(p => ({ ...p, stopovers: p.stopovers.map((s, si) => si === i ? { ...s, enabled: !s.enabled } : s) }))}>
                    <span style={{ fontSize: 16 }}>{stop.type === "ev_charge" ? "⚡" : "☕"}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: T.t1 }}>{stop.label}</p>
                      <p style={{ fontSize: 10, color: T.t3 }}>{stop.desc} · {stop.time}</p>
                    </div>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `.5px solid ${stop.enabled ? T.a : T.border}`, background: stop.enabled ? T.a : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {stop.enabled && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>}
                    </div>
                  </div>
                ))}
                {isEV && activationPrefs.stopovers.some(s => s.type === "ev_charge" && s.enabled && s.combineMeal) && (
                  <p style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>Charging stops include a meal/coffee break</p>
                )}
              </div>
            )}

            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>Day 1 pace?</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {[{ id: "relaxed", label: "Relaxed", desc: "Settle in, easy start" }, { id: "balanced", label: "Balanced", desc: "Some exploring" }, { id: "packed", label: "Packed", desc: "Hit the ground running" }].map(opt => (
                <div key={opt.id} onClick={() => setActivationPrefs(p => ({ ...p, dayOnePace: opt.id }))}
                  style={{ flex: 1, padding: "8px 6px", borderRadius: T.rs, border: `.5px solid ${activationPrefs.dayOnePace === opt.id ? T.a : T.border}`,
                    background: activationPrefs.dayOnePace === opt.id ? T.al : T.s, cursor: "pointer", textAlign: "center", transition: "all .15s" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: activationPrefs.dayOnePace === opt.id ? T.ad : T.t1 }}>{opt.label}</p>
                  <p style={{ fontSize: 9, color: T.t3, marginTop: 2 }}>{opt.desc}</p>
                </div>
              ))}
            </div>

            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>Anything else? (optional)</label>
            <textarea value={activationPrefs.notes} onChange={e => setActivationPrefs(p => ({ ...p, notes: e.target.value }))}
              placeholder="e.g. Nap break after lunch, prefer outdoor activities..."
              style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 12, background: T.s, outline: "none", resize: "vertical", minHeight: 44, marginBottom: 16 }} />

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowActivationModal(false); setPendingActivationTripId(null); }} style={{ ...css.btn, ...css.btnSm, flex: 1, justifyContent: "center" }}>Cancel</button>
              <button onClick={confirmActivation} style={{ ...css.btn, ...css.btnP, flex: 2, justifyContent: "center", padding: "12px 16px" }}>Generate itinerary</button>
            </div>
          </div>
        </div>
        );
      })()}
      {/* Trip Reel Overlay */}
      {reelPlaying && uploadedPhotos.length > 0 && (() => {
        const photo = uploadedPhotos[reelIndex] || uploadedPhotos[0];
        // Animation based on reel style
        const baseDur = reelStyle === "energetic" ? 2 : reelStyle === "slideshow" ? 3 : 4;
        const reelDuration = videoSettings.has("Slow-mo") ? baseDur * 1.5 : baseDur;
        let photoAnimation, photoTransformOrigin;
        if (reelStyle === "cinematic") {
          const kbAnimations = ["kb1", "kb2", "kb3", "kb4"];
          const kbOrigins = ["top left", "center", "bottom right", "top right"];
          photoAnimation = `${kbAnimations[reelIndex % 4]} ${reelDuration}s ease-in-out forwards`;
          photoTransformOrigin = kbOrigins[reelIndex % 4];
        } else if (reelStyle === "slideshow") {
          photoAnimation = `reelFadeIn 0.8s ease-in`;
          photoTransformOrigin = "center";
        } else {
          // energetic — quick zoom with slight rotation
          photoAnimation = `reelEnergetic ${reelDuration}s ease-out forwards`;
          photoTransformOrigin = reelIndex % 2 === 0 ? "center left" : "center right";
        }
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
                    ...(i === reelIndex && !reelPaused ? { animation: `reelProgress ${reelDuration}s linear forwards` } : {}),
                    ...(i === reelIndex && reelPaused ? { width: "50%" } : {}),
                  }} />
                </div>
              ))}
            </div>
            {/* Close button */}
            <button onClick={() => setReelPlaying(false)} style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", zIndex: 3, lineHeight: 1, padding: 4 }}>&times;</button>
            {/* Photo with style-based animation */}
            <div key={reelIndex} style={{ flex: 1, overflow: "hidden", position: "relative", animation: "reelFadeIn 0.5s ease-in" }}>
              <img
                src={photo.url}
                alt={photo.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  animation: photoAnimation,
                  transformOrigin: photoTransformOrigin,
                }}
              />
              {/* Date stamp overlay */}
              {videoSettings.has("Date stamps") && photo.uploadDate && (
                <span style={{ position: "absolute", top: 40, right: 12, color: "rgba(255,255,255,.8)", fontSize: 11, fontWeight: 500, textShadow: "0 1px 3px rgba(0,0,0,.5)", zIndex: 2 }}>{"\uD83D\uDCC5"} {photo.uploadDate}</span>
              )}
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
            <h2 style={{ fontFamily: T.fontD, fontSize: 22, fontWeight: 400, marginBottom: 8 }}>Welcome to Trip With Me</h2>
            <p style={{ fontSize: 13, color: T.t2, marginBottom: 20, lineHeight: 1.5 }}>Your AI travel concierge. Plan trips, invite friends, and create memories together.</p>
            <button onClick={() => { setShowWelcome(false); localStorage.setItem('twm_welcomed', 'true'); setScreen("create"); setWizStep(0); resetWizard(); }}
              style={{ ...css.btn, ...css.btnP, width: "100%", padding: "12px 16px", justifyContent: "center", fontSize: 14, fontWeight: 500, marginBottom: 10 }}>
              Create my first trip
            </button>
            <button onClick={() => { setShowWelcome(false); localStorage.setItem('twm_welcomed', 'true'); setShowDemo(true); setDemoSlide(0); }}
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
        // Chat bubble — mount at delay, transition at delay+1 (flicker-free)
        const ChatBubble = ({ text, isUser, delay }) => {
          if (t < delay) return null;
          const visible = t > delay;
          return (
            <div style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: 14, fontSize: 12, lineHeight: 1.5, alignSelf: isUser ? "flex-end" : "flex-start",
              background: isUser ? T.a : T.s2, color: isUser ? "#fff" : T.t,
              opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(.96)",
              transition: "opacity .5s ease, transform .5s ease" }}>
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
                    <p style={{ fontSize: 14, fontWeight: 500, marginTop: 2, fontFamily: T.font, color: t < 3 ? T.t3 : T.t }}>{t < 3 ? "│" : typeText("Easter Lake District", 3, 1)}</p>
                  </div>
                  {show(25) && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 10, ...slideUp(25) }}>
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
                  {show(30) && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {["Windermere", "Ambleside", "Keswick", "Grasmere"].map((p, i) => (
                        show(32 + i * 3) && <span key={p} style={{ ...css.chip, ...css.chipActive, fontSize: 11, padding: "4px 10px", ...popIn(32 + i * 3) }}>{p}</span>
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
                      <span style={{ fontSize: 12, color: T.t3 }}>{typeText("Windermere hotels...", 6, 0.75)}</span>
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
                  <ChatBubble delay={2} text={<span>🔋 <b>Travel day!</b> Manchester → Windermere<br/><br/>What time would you like to leave?</span>} />
                  {show(14) && (
                    <div style={{ display: "flex", gap: 6, ...slideUp(14) }}>
                      {["8:00 AM", "9:00 AM", "10:00 AM"].map((time, i) => (
                        <span key={time} style={{ ...css.chip, fontSize: 10, padding: "5px 12px",
                          ...(demoInteracted.time === time ? css.chipActive : {}),
                          cursor: "pointer", ...popIn(16 + i * 3) }}
                          onClick={e => { e.stopPropagation(); setDemoInteracted(p => ({...p, time})); setDemoPaused(true); setTimeout(() => setDemoPaused(false), 1500); }}>
                          {time}
                        </span>
                      ))}
                    </div>
                  )}
                  <ChatBubble delay={demoInteracted.time ? 0 : 28} isUser text={demoInteracted.time || "9:00 AM"} />
                  {(demoInteracted.time || show(34)) && (
                    <ChatBubble delay={demoInteracted.time ? 2 : 34} text={
                      <span>🗺️ <b>Route ready!</b><br/>Manchester → M6 → A591<br/>⚡ EV stop: Lancaster Services<br/>📍 Arrive ~{demoInteracted.time === "8:00 AM" ? "9:30 AM" : demoInteracted.time === "10:00 AM" ? "11:30 AM" : "10:30 AM"}</span>
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
                  <ChatBubble delay={2} text={<span>Good morning! Day 2 in <b>Ambleside</b> · 12°C ☁️</span>} />
                  {show(14) && (
                    <div style={{ background: T.amberL, borderRadius: 8, padding: "6px 10px", fontSize: 11, ...slideUp(14) }}>
                      🏨 Your base: <b>Windermere Boutique Hotel</b>
                    </div>
                  )}
                  {show(20) && (
                    <div style={{ display: "flex", gap: 6, ...slideUp(20) }}>
                      <div style={{ flex: 1, background: T.blueL, borderRadius: 8, padding: 8, ...slideUp(20) }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: T.blue, marginBottom: 4 }}>Adults</p>
                        {["🥾 Loughrigg Fell", "💆 Low Wood Spa"].map((a, i) => show(24 + i * 4) && <p key={i} style={{ fontSize: 10, marginBottom: 2, ...slideUp(24 + i * 4) }}>{a}</p>)}
                      </div>
                      <div style={{ flex: 1, background: T.pinkL, borderRadius: 8, padding: 8, ...slideUp(22) }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: T.pink, marginBottom: 4 }}>Kids</p>
                        {["🎢 Brockhole Park", "🥚 Easter egg trail"].map((a, i) => show(26 + i * 4) && <p key={i} style={{ fontSize: 10, marginBottom: 2, ...slideUp(26 + i * 4) }}>{a}</p>)}
                      </div>
                    </div>
                  )}
                  {show(36) && (
                    <div style={{ fontSize: 11, color: T.ad, textAlign: "center", padding: 6, background: T.al, borderRadius: 8, ...popIn(36) }}>
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
                  <ChatBubble delay={2} text={<span>🏠 <b>Time to head home!</b> Keswick → Manchester<br/><br/>When do you want to set off?</span>} />
                  {show(14) && (
                    <div style={{ display: "flex", gap: 6, ...slideUp(14) }}>
                      {["10:00 AM", "After lunch"].map((opt, i) => (
                        <span key={opt} style={{ ...css.chip, fontSize: 10, padding: "5px 12px", cursor: "pointer", ...popIn(16 + i * 3),
                          ...(demoInteracted.depart === opt ? css.chipActive : {}) }}
                          onClick={e => { e.stopPropagation(); setDemoInteracted(p => ({...p, depart: opt})); setDemoPaused(true); setTimeout(() => setDemoPaused(false), 1500); }}>
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}
                  <ChatBubble delay={demoInteracted.depart ? 0 : 26} isUser text={demoInteracted.depart || "After lunch"} />
                  {(demoInteracted.depart || show(32)) && (
                    <ChatBubble delay={demoInteracted.depart ? 2 : 32} text={
                      <span>🗺️ <b>Route planned!</b><br/>Keswick → A66 → M6<br/>☕ Stop: Rheged Centre<br/>📍 Home by ~{demoInteracted.depart === "10:00 AM" ? "1:30 PM" : "5:00 PM"}</span>
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
                  Trip With Me connects maps, weather, bookings, EV chargers, and AI — so you can focus on making memories.
                </p>
                {show(14) && (
                  <button onClick={e => { e.stopPropagation(); setShowDemo(false); setScreen("create"); setWizStep(0); resetWizard(); }}
                    style={{ ...css.btn, ...css.btnP, width: "100%", padding: "14px 16px", justifyContent: "center", fontSize: 15, fontWeight: 500, marginBottom: 10, ...slideUp(14) }}>
                    Create my first trip
                  </button>
                )}
                {show(18) && (
                  <p onClick={e => { e.stopPropagation(); setShowDemo(false); }}
                    style={{ fontSize: 12, color: "rgba(255,255,255,.4)", cursor: "pointer", marginTop: 4, ...slideUp(18) }}>
                    or explore the demo trip →
                  </p>
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
                  onBlur={() => { updatePhotoInSupabase(photo.id, { caption: photo.caption || '' }); }}
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
                      updatePhotoInSupabase(photo.id, { day_tag: val });
                    }}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: T.rs, border: `.5px solid rgba(255,255,255,0.2)`, background: "rgba(255,255,255,0.15)", color: "#fff", fontFamily: T.font, fontSize: 13, outline: "none" }}
                  >
                    <option value="Untagged" style={{ color: "#000" }}>Untagged</option>
                    {(() => {
                      const tp = selectedCreatedTrip || createdTrips[0];
                      const dc = tp?.start && tp?.end ? Math.max(1, Math.ceil((new Date(tp.end) - new Date(tp.start)) / 86400000) + 1) : 5;
                      return Array.from({ length: Math.min(dc, 30) }, (_, i) => (
                        <option key={i} value={`Day ${i + 1}`} style={{ color: "#000" }}>Day {i + 1}</option>
                      ));
                    })()}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button
                    onClick={() => {
                      setUploadedPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, liked: !p.liked } : p));
                      setViewingPhoto(prev => ({ ...prev, liked: !prev.liked }));
                      updatePhotoInSupabase(photo.id, { liked: !photo.liked });
                    }}
                    style={{ ...css.btn, background: photo.liked ? T.redL : "rgba(255,255,255,0.1)", color: photo.liked ? T.red : "#fff", borderColor: photo.liked ? T.red : "rgba(255,255,255,0.2)" }}
                  >
                    {photo.liked ? "\u2764\uFE0F Liked" : "\uD83E\uDD0D Like"}
                  </button>
                  <button
                    onClick={() => {
                      deletePhotoFromSupabase(photo);
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
