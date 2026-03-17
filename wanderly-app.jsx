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
  const [chatInput, setChatInput] = useState("");

  const navigate = useCallback((s) => setScreen(s), []);

  // ─── Screen: Home ───
  const HomeScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px 20px 12px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <h1 style={{ fontFamily: T.fontD, fontSize: 24, fontWeight: 400, color: T.t1 }}>Wanderly</h1>
          <span style={{ fontSize: 11, color: T.t3, fontWeight: 500, letterSpacing: 0.5 }}>TRAVEL CONCIERGE</span>
        </div>
        <button style={{ ...css.btn, ...css.btnP, ...css.btnSm }} onClick={() => { setWizStep(0); navigate("create"); }}>+ New trip</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <p style={{ fontSize: 13, color: T.t3, marginBottom: 16 }}>Your upcoming adventures</p>
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
        <div style={{ ...css.card, border: `1.5px dashed ${T.border}`, background: "none", textAlign: "center", padding: "36px 20px", cursor: "pointer", boxShadow: "none" }} onClick={() => { setWizStep(0); navigate("create"); }}>
          <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}>+</div>
          <p style={{ fontSize: 14, fontWeight: 500, color: T.t2 }}>Plan your next adventure</p>
          <p style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>Create from scratch or use a template</p>
        </div>

        <div style={{ ...css.sectionTitle, marginTop: 28 }}>Connectors &amp; integrations</div>
        <p style={{ fontSize: 12, color: T.t3, marginBottom: 12 }}>Wanderly connects to 18 travel services for a seamless experience.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {Object.entries(CONNECTORS).slice(0, 18).map(([key, c]) => (
            <div key={key} style={{ background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.rs, padding: "10px 8px", textAlign: "center", fontSize: 11, color: T.t2, cursor: "pointer", transition: "all .15s" }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
              <div style={{ fontWeight: 500, fontSize: 10, color: T.t1, lineHeight: 1.3 }}>{c.name.split(" / ")[0]}</div>
            </div>
          ))}
        </div>
      </div>
      <TabBar active="home" onNav={navigate} />
    </div>
  );

  // ─── Screen: Create (Step Wizard) ───
  const wizSteps = ["Details", "Travellers", "Stays", "Preferences"];
  const CreateScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("home")}>Cancel</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>New trip</h2>
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
        {wizStep === 0 && <WizDetails />}
        {wizStep === 1 && <WizTravellers />}
        {wizStep === 2 && <WizStays />}
        {wizStep === 3 && <WizPrefs />}
      </div>
      <div style={{ display: "flex", gap: 10, padding: "12px 20px", background: T.s, borderTop: `.5px solid ${T.border}` }}>
        {wizStep > 0 && <button style={{ ...css.btn, flex: 1, justifyContent: "center" }} onClick={() => setWizStep(wizStep - 1)}>Back</button>}
        <button style={{ ...css.btn, ...css.btnP, flex: 1, justifyContent: "center" }} onClick={() => wizStep < 3 ? setWizStep(wizStep + 1) : navigate("trip")}>
          {wizStep < 3 ? `Next: ${wizSteps[wizStep + 1]}` : "Create trip"}
        </button>
      </div>
    </div>
  );

  const WizDetails = () => (
    <>
      <Field label="Trip name" defaultValue={TRIP.name} />
      <Field label="Brief" type="textarea" defaultValue="Relaxing Easter break in the Lake District with friends. Scenic drives, easy hikes, great food, kids activities." />
      <div style={{ display: "flex", gap: 10 }}>
        <Field label="Start" type="date" defaultValue="2026-04-03" style={{ flex: 1 }} />
        <Field label="End" type="date" defaultValue="2026-04-07" style={{ flex: 1 }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>Places visiting</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          {TRIP.places.map(p => (
            <span key={p} style={{ ...css.chip, ...css.chipActive, paddingRight: 8 }}>{p} <span style={{ opacity: 0.5, cursor: "pointer", marginLeft: 3 }}>×</span></span>
          ))}
        </div>
        <input style={{ width: "100%", padding: "9px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none" }} placeholder="Add a place..." />
      </div>
      <ChipSelect label="Mode of travel" options={["EV car", "Petrol car", "Train", "Walking", "Bicycle"]} active={[0]} />
    </>
  );

  const WizTravellers = () => (
    <>
      <GroupCounter icon="🧑" label="Adults" sub="Ages 15+" count={4} bg={T.blueL} />
      <GroupCounter icon="🧒" label="Children 8-14" sub="Older kids" count={1} bg={T.pinkL}>
        <ChildEntry name="Max" age={12} color={T.pink} ageRange={[8, 14]} />
      </GroupCounter>
      <GroupCounter icon="🧒" label="Children 3-8" sub="Younger kids" count={1} bg={T.coralL}>
        <ChildEntry name="Ella" age={8} color={T.coral} ageRange={[3, 8]} />
      </GroupCounter>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "10px 14px", background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.r }}>
        <Tag bg={T.blueL} color={T.blue}>4 adults</Tag>
        <Tag bg={T.pinkL} color={T.pink}>1 child (8-14)</Tag>
        <Tag bg={T.coralL} color={T.coral}>1 child (3-8)</Tag>
      </div>
    </>
  );

  const WizStays = () => (
    <>
      {TRIP.stays.map((s, i) => (
        <div key={i} style={css.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</h4>
              <p style={{ fontSize: 12, color: T.t2 }}>{s.dates} ({s.nights} nights)</p>
            </div>
            <button style={{ ...css.btn, ...css.btnSm, fontSize: 11 }}>Edit</button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Tag bg={T.purpleL} color={T.purple}>{s.type}</Tag>
            {s.tags.map(t => <Tag key={t} bg={T.purpleL} color={T.purple}>{t}</Tag>)}
          </div>
        </div>
      ))}
      <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, border: `1.5px dashed ${T.border}`, borderRadius: T.r, color: T.t3, fontSize: 13, cursor: "pointer", background: "none", width: "100%", fontFamily: T.font }}>+ Add another stay</button>
    </>
  );

  const WizPrefs = () => (
    <>
      <ChipSelect label="Food preferences" options={["Vegetarian", "Non-veg", "Local cuisine", "Kid-friendly menus", "Vegan", "Halal", "Gluten-free"]} active={[0, 1, 2, 3]} />
      <ChipSelect label="Activities — Adults" options={["Light hikes", "Spas & wellness", "Boat trips", "Museums", "Pub crawl"]} active={[0, 1, 2, 3]} />
      <ChipSelect label="Activities — Children 8-14" options={["Adventure parks", "Climbing walls", "Easter trails", "Interactive museums", "Bike hire"]} active={[0, 1, 2]} />
      <ChipSelect label="Activities — Children 3-8" options={["Playgrounds", "Animal farms", "Soft play", "Story trails", "Easter bunny"]} active={[0, 1, 2, 3]} />
      <Field label="Special instructions" type="textarea" defaultValue="Dog-friendly places. Top-rated pubs for dinners. Avoid steep trails. Kids get restless after 2 hrs — plan short, fun stops." />
    </>
  );

  // ─── Screen: Trip Dashboard ───
  const TripScreen = () => {
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
            <div style={{ position: "absolute", bottom: 8, right: 8, ...css.btn, ...css.btnSm, background: "rgba(255,255,255,.9)", fontSize: 10, padding: "4px 8px" }}>
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
                onBook={() => setBookingStates(prev => ({ ...prev, [`${selectedDay}-${i}`]: "confirmed" }))} />
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

  const TimelineItem = ({ item, index, expanded, onToggle, bookingState, onBook }) => {
    const forMap = { all: "Everyone", adults: "Adults", kids: "Max & Ella", older: "Max (12)", younger: "Ella (8)" };
    return (
      <div style={{ position: "relative", marginBottom: 12, cursor: "pointer" }} onClick={onToggle}>
        <div style={{ position: "absolute", left: -18, top: 6, width: 8, height: 8, borderRadius: "50%", background: index < 3 ? T.a : T.s2, border: `2px solid ${index < 3 ? T.al : T.border}` }} />
        <div style={{ fontSize: 11, color: T.t3 }}>{item.time}</div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{item.title}</div>
        <div style={{ fontSize: 12, color: T.t2 }}>{item.desc}</div>
        {item.for && <div style={{ marginTop: 3 }}><GroupTag type={item.for}>{forMap[item.for]}</GroupTag></div>}

        {/* Booking confirmation */}
        {item.needsBooking && !bookingState && (
          <div style={{ display: "flex", gap: 8, padding: 10, background: T.amberL, border: `.5px solid ${T.amber}`, borderRadius: T.rs, marginTop: 6, alignItems: "center" }}
            onClick={e => e.stopPropagation()}>
            <p style={{ flex: 1, fontSize: 12, color: T.amber }}><strong>Book:</strong> {item.price}</p>
            <button style={{ ...css.btn, ...css.btnSm, ...css.btnP, fontSize: 11 }} onClick={onBook}>Confirm</button>
            <button style={{ ...css.btn, ...css.btnSm, fontSize: 11 }}>Skip</button>
          </div>
        )}
        {item.needsBooking && bookingState === "confirmed" && (
          <div style={{ padding: "6px 10px", background: T.al, borderRadius: T.rs, marginTop: 6, fontSize: 12, color: T.ad }}>
            ✓ Confirmed! Tickets sent to email.
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
              <button style={{ ...css.btn, ...css.btnSm, ...css.btnP }}>Navigate</button>
              <button style={{ ...css.btn, ...css.btnSm }}>Call</button>
              <button style={{ ...css.btn, ...css.btnSm }}>Reviews</button>
              <button style={{ ...css.btn, ...css.btnSm }}>Menu</button>
              <button style={{ ...css.btn, ...css.btnSm, color: T.red }}>Remove</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Screen: Chat ───
  const ChatScreen = () => {
    const aiResponses = {
      "EV chargers": "3 chargers near Ambleside:\n\n1. **Rydal Road** — 50kW CCS, 3 min walk, 2 available\n2. **Tesla Supercharger** — 8 stalls, 8 min drive\n3. **Pod Point, Co-op** — 7kW, 2 min walk",
      "Restaurants": "For your group:\n\n**The Drunken Duck** — 4.8★, 12 min. Steaks + veggie, kids free before 6 PM.\n\n**Fellinis** — 4.6★, 3 min walk. Veggie-focused, children's menu.\n\n**The Unicorn** — 4.4★, 5 min. Pub grills, playground out back.",
      "Kids activities": "**Max (12):**\n- Brockhole Adventure Park — nets, zip wire\n- Climbing Wall — indoor, ages 6+\n\n**Ella (8):**\n- Brockhole soft play — free\n- Trotters Animal Farm — pony rides\n\n**Both:** Easter egg trail at Wray Castle, 4 PM today",
      "Create poll": "I'll set up a poll! Some options:\n\n1. **Tomorrow's activity** — Hike vs boat vs rest day\n2. **Dinner choice** — Pick from 3 restaurants\n3. **Custom question** — Write your own\n\nWhich one?",
      "Weather": "Ambleside: 12°C, cloudy, wind 8 mph.\n\nDry until 4 PM, light rain 5-7 PM.\n\nOutdoor morning is best. Easter trail at 4 PM should be dry. Spa or climbing wall as rain backup.",
    };

    const sendMessage = (text) => {
      const msg = text || chatInput;
      if (!msg.trim()) return;
      setChatInput("");
      setChatMessages(prev => [...prev, { role: "user", text: msg }]);
      setTimeout(() => {
        const response = aiResponses[msg] || "Based on your group and location near Ambleside, I'll find the best options. What are you looking for?";
        setChatMessages(prev => [...prev, { role: "ai", text: response }]);
      }, 800);
    };

    useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [chatMessages]);

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
      </div>
    );
  };

  // ─── Screen: Polls ───
  const VoteScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("trip")}>Back</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Group polls</h2>
        <button style={{ ...css.btn, ...css.btnSm, ...css.btnP }}>+ New</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {POLLS.map(poll => (
          <div key={poll.id} style={{ ...css.card, opacity: poll.status === "closed" ? 0.6 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <Tag bg={poll.status === "active" ? T.al : T.s2} color={poll.status === "active" ? T.ad : T.t3}>
                {poll.status === "active" ? "Active" : "Closed"}
              </Tag>
              <span style={{ fontSize: 11, color: T.t3 }}>{poll.ends}</span>
            </div>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>{poll.q}</p>
            {poll.options.map((opt, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: `.5px solid ${opt.voted ? T.a : T.border}`, borderRadius: T.rs, marginBottom: 6, cursor: "pointer", position: "relative", overflow: "hidden", background: opt.voted ? T.al : T.s }}>
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
    </div>
  );

  // ─── Screen: Memories ───
  const MemoriesScreen = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("trip")}>Back</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Memories</h2>
        <button style={{ ...css.btn, ...css.btnSm, ...css.btnP }}>Upload</button>
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
              <div style={{ aspectRatio: "1", borderRadius: T.rs, border: `1.5px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 24, color: T.t3 }}>+</div>
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
  const ShareScreen = () => (
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
          <button style={{ ...css.btn, ...css.btnSm }}>Copy</button>
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
    </div>
  );

  // ─── Screen: Explore ───
  const ExploreScreen = () => (
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
          <div key={i} style={{ ...css.card, display: "flex", gap: 12, cursor: "pointer" }}>
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
  const SettingsScreen = () => (
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
        <div style={css.sectionTitle}>Connected services</div>
        {Object.entries(CONNECTORS).slice(0, 8).map(([k, c]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `.5px solid ${T.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>{c.icon}</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</p>
                <p style={{ fontSize: 11, color: T.t3 }}>{c.apis.length} endpoints</p>
              </div>
            </div>
            <div style={{ width: 40, height: 22, borderRadius: 11, background: T.a, position: "relative", cursor: "pointer" }}>
              <div style={{ position: "absolute", top: 2, left: 20, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
            </div>
          </div>
        ))}
        <div style={css.sectionTitle}>Notifications</div>
        {["Booking confirmations", "EV charger alerts", "Traffic & closures", "Daily video generation", "Poll reminders", "Checkout reminders"].map(n => (
          <div key={n} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `.5px solid ${T.border}` }}>
            <span style={{ fontSize: 14 }}>{n}</span>
            <div style={{ width: 40, height: 22, borderRadius: 11, background: T.a, position: "relative", cursor: "pointer" }}>
              <div style={{ position: "absolute", top: 2, left: 20, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)" }} />
            </div>
          </div>
        ))}
      </div>
      <TabBar active="settings" onNav={navigate} />
    </div>
  );

  // ─── Tab Bar ───
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

  // ─── Reusable Form Components ───
  function Field({ label, type = "text", defaultValue, style: wrapStyle }) {
    return (
      <div style={{ marginBottom: 14, ...wrapStyle }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>{label}</label>
        {type === "textarea" ? (
          <textarea defaultValue={defaultValue} style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none", resize: "vertical", minHeight: 60 }} />
        ) : (
          <input type={type} defaultValue={defaultValue} style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none" }} />
        )}
      </div>
    );
  }

  function ChipSelect({ label, options, active = [] }) {
    const [selected, setSelected] = useState(new Set(active));
    return (
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 6, textTransform: "uppercase", letterSpacing: .5 }}>{label}</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {options.map((o, i) => (
            <span key={o} onClick={() => { const s = new Set(selected); s.has(i) ? s.delete(i) : s.add(i); setSelected(s); }}
              style={{ ...css.chip, ...(selected.has(i) ? css.chipActive : {}) }}>{o}</span>
          ))}
        </div>
      </div>
    );
  }

  function GroupCounter({ icon, label, sub, count: init, bg, children }) {
    const [count, setCount] = useState(init);
    return (
      <div style={{ background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.r, marginBottom: 10, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{icon}</div>
            <div><h4 style={{ fontSize: 14, fontWeight: 500 }}>{label}</h4><p style={{ fontSize: 12, color: T.t2 }}>{sub}</p></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button style={css.btn} onClick={() => setCount(Math.max(0, count - 1))}>-</button>
            <span style={{ fontSize: 15, fontWeight: 500, minWidth: 20, textAlign: "center" }}>{count}</span>
            <button style={css.btn} onClick={() => setCount(count + 1)}>+</button>
          </div>
        </div>
        {children && count > 0 && <div style={{ padding: "0 14px 10px", borderTop: `.5px solid ${T.border}` }}>{children}</div>}
      </div>
    );
  }

  function ChildEntry({ name, age, color, ageRange }) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
        <Avatar bg={color} label={name[0]} size={28} />
        <input defaultValue={name} style={{ flex: 1, padding: "6px 10px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 13, background: T.s2, outline: "none" }} />
        <select defaultValue={age} style={{ padding: "6px 8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 12, background: T.s, outline: "none", width: 56 }}>
          {Array.from({ length: ageRange[1] - ageRange[0] + 1 }, (_, i) => ageRange[0] + i).map(a => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </div>
    );
  }

  // ─── Render ───
  return (
    <div style={{ maxWidth: 430, margin: "0 auto", height: 900, background: T.bg, borderRadius: 22, border: `.5px solid ${T.border}`, overflow: "hidden", fontFamily: T.font, color: T.t1, boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;1,400&family=Instrument+Serif&display=swap');@keyframes spin{to{transform:rotate(360deg)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.08);border-radius:4px}`}</style>
      <div style={{ height: "100%" }}>
        {screen === "home" && <HomeScreen />}
        {screen === "create" && <CreateScreen />}
        {screen === "trip" && <TripScreen />}
        {screen === "chat" && <ChatScreen />}
        {screen === "vote" && <VoteScreen />}
        {screen === "memories" && <MemoriesScreen />}
        {screen === "share" && <ShareScreen />}
        {screen === "explore" && <ExploreScreen />}
        {screen === "settings" && <SettingsScreen />}
      </div>
    </div>
  );
}
