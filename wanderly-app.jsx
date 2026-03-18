import { useState, useEffect, useRef, useCallback } from "react";

// ─── Design Tokens ───
const T = {
  bg: "#FAF9F6", s: "#FFFFFF", s2: "#F0EFEB", s3: "#E8E7E2",
  t1: "#1A1A18", t2: "#5E5D58", t3: "#9C9B96",
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
    { time: "10:00 AM", title: "Arrive Windermere", desc: "Check in at hotel · EV charge in car park", for: "all", rating: null, price: null },
    { time: "12:30 PM", title: "Lunch at Francine's", desc: "4.7★ · Veggie + non-veg · Kids menu", for: "all", rating: 4.7, price: "££" },
    { time: "2:30 PM", title: "Lake Windermere walk", desc: "Gentle 1hr lakeside stroll · Dog friendly", for: "all", rating: 4.8, price: "Free" },
    { time: "5:00 PM", title: "Settle into hotel", desc: "Windermere Boutique · Rooms 14 & 16", for: "all", rating: null, price: null },
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
    { time: "2:00 PM", title: "Drive home", desc: "Stop at Tebay Services (EV charger · farm shop)", for: "all", rating: null, price: null },
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
  "London", "Manchester", "Birmingham", "Edinburgh", "Glasgow", "Liverpool", "Bristol", "Leeds", "Sheffield", "Newcastle",
  "Cambridge", "Oxford", "Bath", "Brighton", "York", "Cardiff", "Belfast", "Nottingham", "Southampton", "Leicester",
  "Windermere", "Ambleside", "Keswick", "Grasmere", "Lake District", "Cotswolds", "Peak District", "Cornwall", "Devon", "Dorset",
  "Welwyn Garden City", "St Albans", "Hertford", "Hatfield", "Stevenage", "Watford", "Hitchin", "Letchworth",
  "Paris", "Amsterdam", "Barcelona", "Rome", "Berlin", "Prague", "Vienna", "Lisbon", "Dublin", "Zurich",
  "New York", "Los Angeles", "San Francisco", "Tokyo", "Sydney", "Dubai", "Singapore", "Bangkok", "Bali", "Maldives",
  "Scotland", "Wales", "Northern Ireland", "England", "UK", "France", "Spain", "Italy", "Germany", "Portugal",
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

function generateLocalAccommodations(places) {
  if (!places || places.length === 0) return [];
  const results = [];
  places.forEach(place => {
    const placeName = place.trim();
    ACCOM_TEMPLATES.forEach(tmpl => {
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
  const [chatMessages, setChatMessages] = useState([
    { role: "ai", text: "Good morning! Day 2 of your Lake District trip. 12°C and cloudy — perfect for walking. I've split today: adults + Max do Loughrigg Fell, Ella heads to Brockhole. Everyone meets at Fellinis for lunch. The boat cruise needs confirmation (£42 for 6). There's also an active poll on tonight's dinner — cast your vote!" },
  ]);
  const [bookingStates, setBookingStates] = useState({});
  const chatRef = useRef(null);
  const photoInputRef = useRef(null);
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

  // ─── New Trip Wizard State ───
  const [wizTrip, setWizTrip] = useState({ name: "", brief: "", start: "", end: "", places: [], travel: new Set() });
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

  const resetWizard = useCallback(() => {
    setWizTrip({ name: "", brief: "", start: "", end: "", places: [], travel: new Set() });
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

  const createTrip = () => {
    const name = wizTrip.name.trim() || "Untitled Trip";
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
      setEditingTripId(null);
      navigate("home");
    }
  };

  const deleteCreatedTrip = (id) => setCreatedTrips(prev => prev.filter(t => t.id !== id));

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
      const timeline = generateTimeline(t);
      return { ...t, status: "live", timeline };
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
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {trip.status !== "live" && <button onClick={e => { e.stopPropagation(); makeTripLive(trip.id); }} style={{ ...css.btn, ...css.btnP, ...css.btnSm, fontSize: 11 }}>🚀 Make Live</button>}
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
            <Tag bg={T.al} color={T.ad}>Live</Tag>
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
        {wizSteps.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= wizStep ? T.a : T.s2, transition: "background .3s" }} />
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
      if (place && !wizTrip.places.includes(place)) {
        setWizTrip(prev => ({ ...prev, places: [...prev.places, place] }));
      }
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
          <div style={{ textAlign: "center", padding: "20px 10px", color: T.t3, fontSize: 13 }}>
            <p style={{ marginBottom: 4 }}>No accommodations added yet.</p>
            <p style={{ fontSize: 12 }}>{wizTrip.places.length > 0
              ? `Showing suggestions near ${locationName}. Search or browse live options.`
              : "Add locations in Step 1 to get localised suggestions."}</p>
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
              <div style={{ textAlign: "center", padding: 8 }}>
                <p style={{ fontSize: 12, color: T.t3, marginBottom: 6 }}>No local matches for "{staySearch}".</p>
                <button onClick={() => {
                  const q = locationName ? `${staySearch.trim()} near ${locationName}` : staySearch.trim();
                  window.open(`https://www.google.com/search?q=${encodeURIComponent(q + " accommodation")}`, "_blank");
                }} style={{ ...css.btn, ...css.btnSm, fontSize: 11, color: T.a, margin: "0 auto" }}>🔍 Search Google for "{staySearch.trim()}"</button>
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
  const renderWizPrefs = () => {
    const allFoodOpts = ["Vegetarian", "Non-veg", "Local cuisine", "Kid-friendly menus", "Vegan", "Halal", "Gluten-free", "Pescatarian", "Dairy-free", "Nut-free", "Organic", "Street food"];
    const suggestions = ACTIVITY_SUGGESTIONS.default;

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
    const aiResponsePatterns = [
      { keywords: ["ev", "charger", "charge", "charging", "electric", "plug"], response: "3 chargers near Ambleside:\n\n1. **Rydal Road** — 50kW CCS, 3 min walk, 2 available\n2. **Tesla Supercharger** — 8 stalls, 8 min drive\n3. **Pod Point, Co-op** — 7kW, 2 min walk\n\nShall I add a charging stop to your itinerary?" },
      { keywords: ["restaurant", "food", "eat", "dinner", "lunch", "breakfast", "cafe", "dining", "hungry"], response: "For your group near Ambleside:\n\n**The Drunken Duck** — 4.8★, 12 min. Steaks + veggie, kids free before 6 PM.\n\n**Fellinis** — 4.6★, 3 min walk. Veggie-focused, children's menu.\n\n**The Unicorn** — 4.4★, 5 min. Pub grills, playground out back.\n\nWant me to add any of these to your itinerary?" },
      { keywords: ["kid", "child", "children", "activity", "activities", "play", "fun", "game"], response: "**Max (12):**\n- Brockhole Adventure Park — nets, zip wire\n- Climbing Wall — indoor, ages 6+\n\n**Ella (8):**\n- Brockhole soft play — free\n- Trotters Animal Farm — pony rides\n\n**Both:** Easter egg trail at Wray Castle, 4 PM today.\n\nShall I add any to the timeline?" },
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
      { keywords: ["morning", "today", "plan for today", "what's next", "itinerary", "schedule"], response: "**Today's plan:**\n\n🕙 10:00 — Arrive Windermere, check in\n🕧 12:30 — Lunch at Francine's (veggie + non-veg)\n🕝 2:30 — Lake Windermere walk (everyone)\n🕔 5:00 — Settle into hotel\n🕖 7:00 — Dinner (TBC)\n\n⛅ Weather looks good until 4 PM. Want to adjust anything?" },
      { keywords: ["emergency", "hospital", "doctor", "pharmacy", "medical", "urgent", "police"], response: "**Emergency contacts:**\n\n🚑 **999** — Emergency services\n🏥 **Ambleside Health Centre** — 015394 32693, Mon-Fri 8am-6pm\n💊 **Ambleside Pharmacy** — 015394 33594, closes 5:30 PM\n🏥 **Nearest A&E** — Westmorland General, Kendal (20 min drive)\n🚔 **Non-emergency police** — 101\n\nStay safe out there!" },
    ];

    const findResponse = (msg) => {
      const lower = msg.toLowerCase();
      // First check exact matches (for quick-tap buttons)
      const exactMap = { "EV chargers": 0, "Restaurants": 1, "Kids activities": 2, "Create poll": 3, "Weather": 4 };
      if (exactMap[msg] !== undefined) return aiResponsePatterns[exactMap[msg]].response;
      // Then do keyword matching — score each pattern
      let bestMatch = null;
      let bestScore = 0;
      for (const pattern of aiResponsePatterns) {
        const score = pattern.keywords.filter(kw => lower.includes(kw)).length;
        if (score > bestScore) { bestScore = score; bestMatch = pattern; }
      }
      if (bestMatch && bestScore > 0) return bestMatch.response;
      // Smart fallback based on message length and content
      if (lower.includes("?")) return `Great question! Let me look into that for your Lake District trip.\n\nBased on your group (4 adults + 2 children) near Ambleside, I'd suggest checking the **Explore** tab for curated options, or try asking about:\n\n• Restaurants & food\n• Activities for kids or adults\n• Weather & planning\n• Boats, hikes, or attractions\n• Budget & costs`;
      return `Got it! I'll look into "${msg}" for your trip.\n\nHere are some things I can help with right now:\n\n🍽 **Food** — Restaurant suggestions for your group\n🏔 **Activities** — Walks, boats, kids' fun, spa\n⚡ **EV charging** — Nearest chargers\n⛅ **Weather** — Forecast & backup plans\n🗳 **Polls** — Group decision making\n\nJust ask about any of these!`;
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

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("trip")}>Back</button>
          <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Trip chat</h2>
          <div style={{ display: "flex" }}>
            {[["You", T.a], ["JM", T.coral], ["SP", T.blue]].map(([l, c], i) => (
              <Avatar key={i} bg={c} label={l} size={24} style={{ marginLeft: i ? -4 : 0, border: `1.5px solid ${T.s}` }} />
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
            {["EV chargers", "Restaurants", "Kids activities", "Create poll", "Weather"].map(p => (
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
    const newPhotos = files.map(f => ({ url: URL.createObjectURL(f), name: f.name, day: "Uploaded" }));
    setUploadedPhotos(prev => [...prev, ...newPhotos]);
    e.target.value = "";
  };
  const renderMemoriesScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <input type="file" accept="image/*" multiple ref={photoInputRef} style={{ display: "none" }} onChange={handlePhotoUpload} />
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("trip")}>Back</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Memories</h2>
        <button style={{ ...css.btn, ...css.btnSm, ...css.btnP }} onClick={() => photoInputRef.current?.click()}>Upload</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
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
                <button onClick={() => { setVideoState("generating"); setTimeout(() => setVideoState("ready"), 2500); }}
                  style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,.2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                </button>
                <p style={{ fontSize: 13, marginTop: 10, opacity: .8 }}>
                  {videoState === "ready" ? "Ready! Tap to play your reel" : "AI trip highlight reel"}
                </p>
              </>
            )}
          </div>
          <div style={{ padding: "12px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500 }}>Easter Lake District 2026</p>
                <p style={{ fontSize: 12, color: T.t2 }}>Auto-generated from 12 photos</p>
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

        {uploadedPhotos.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={css.sectionTitle}>Your uploads</div>
              <span style={{ fontSize: 12, color: T.t3 }}>{uploadedPhotos.length} photo{uploadedPhotos.length !== 1 ? "s" : ""}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 16 }}>
              {uploadedPhotos.map((p, i) => (
                <div key={i} style={{ aspectRatio: "1", borderRadius: T.rs, overflow: "hidden", cursor: "pointer", position: "relative" }}>
                  <img src={p.url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <span style={{ position: "absolute", bottom: 2, left: 4, color: "#fff", fontSize: 9, fontWeight: 500, textShadow: "0 1px 3px rgba(0,0,0,.6)" }}>{p.name.length > 12 ? p.name.slice(0, 12) + "..." : p.name}</span>
                </div>
              ))}
              <div onClick={() => photoInputRef.current?.click()} style={{ aspectRatio: "1", borderRadius: T.rs, border: `1.5px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 24, color: T.t3 }}>+</div>
            </div>
          </div>
        )}

        {MEMORIES.map((m, mi) => (
          <div key={mi}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={css.sectionTitle}>{m.label}</div>
              <span style={{ fontSize: 12, color: T.t3 }}>{m.count} photos</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 16 }}>
              {m.photos.map((p, i) => (
                <div key={i} style={{ aspectRatio: "1", borderRadius: T.rs, background: p.color, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <span style={{ color: "#fff", fontSize: 10, fontWeight: 500 }}>{p.label}</span>
                </div>
              ))}
              <div onClick={() => photoInputRef.current?.click()} style={{ aspectRatio: "1", borderRadius: T.rs, border: `1.5px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 24, color: T.t3 }}>+</div>
            </div>
          </div>
        ))}

        <div style={{ ...css.card, textAlign: "center", padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>AI video settings</p>
          <p style={{ fontSize: 12, color: T.t2, marginBottom: 12 }}>Customise your highlight reel</p>
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
            {["Music overlay", "AI narration", "Date stamps", "Slow-mo", "Boomerangs"].map((o, i) => (
              <span key={o} style={{ ...css.chip, ...(i < 3 ? css.chipActive : {}) }}>{o}</span>
            ))}
          </div>
        </div>
      </div>
      <TabBar active="memories" onNav={navigate} />
    </div>
  );

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
            <button style={{ ...css.btn, ...css.btnSm, color: "#fff", opacity: 0.8 }} onClick={() => navigate("home")}>← Back</button>
            {isLive ? <Tag bg="rgba(255,255,255,0.2)" color="#fff">🟢 Live</Tag> : <Tag bg="rgba(255,255,255,0.2)" color="#fff">New</Tag>}
          </div>
          <h2 style={{ fontFamily: T.fontD, fontSize: 22, fontWeight: 400 }}>{trip.name}</h2>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <p style={{ fontSize: 12, opacity: 0.8 }}>{trip.start && trip.end ? `${trip.start} – ${trip.end} ${trip.year}` : "Dates TBC"}</p>
            <button onClick={() => { /* pre-fill wizard with this trip's data and navigate to edit */
              setWizTrip({ name: trip.name, brief: trip.brief || "", start: trip.rawStart || "", end: trip.rawEnd || "", places: [...trip.places], travel: new Set(trip.travel) });
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
                <code style={{ flex: 1, fontFamily: T.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>wanderly.app/join/{trip.shareCode}</code>
                <button style={{ ...css.btn, ...css.btnSm, fontSize: 11 }} onClick={() => { navigator.clipboard?.writeText(`https://wanderly.app/join/${trip.shareCode}`); }}>Copy link</button>
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
              <button onClick={() => makeTripLive(trip.id)} style={{ ...css.btn, ...css.btnP, justifyContent: "center", width: "100%", padding: "12px 16px", fontSize: 14 }}>🚀 Make Trip Live</button>
            </div>
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
            {!isLive && <button onClick={() => makeTripLive(trip.id)} style={{ ...css.btn, ...css.btnP, flex: 1, justifyContent: "center" }}>🚀 Make Live</button>}
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

  // ─── Render ───
  return (
    <div style={{ maxWidth: 430, margin: "0 auto", height: 900, background: T.bg, borderRadius: 22, border: `.5px solid ${T.border}`, overflow: "hidden", fontFamily: T.font, color: T.t1, boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;1,400&family=Instrument+Serif&display=swap');@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.08);border-radius:4px}`}</style>
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
    </div>
  );
}
