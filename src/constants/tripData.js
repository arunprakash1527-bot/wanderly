// ─── Demo Trip Data ───
// Supports multiple demo trips — switch via setActiveDemoKey() + page reload

// ─── Lake District Demo ───
const TRIP_LAKES = {
  name: "Easter Lake District", start: "3 Apr", end: "7 Apr", year: "2026",
  places: ["Windermere", "Ambleside", "Keswick", "Grasmere"],
  startLocation: "Manchester",
  travelMode: "EV vehicle",
  brief: "",
  budget: "£2,000",
  travellers: {
    adults: [
      { name: "You", isLead: true, status: "Organiser" },
      { name: "James M.", email: "james@email.com", status: "Joined", isClaimed: true },
      { name: "Sophie P.", email: "sophie@email.com", status: "Joined", isClaimed: true },
      { name: "Rachel K.", email: "rachel@email.com", status: "Invited" },
    ],
    older: [{ name: "Max", age: 12 }],
    younger: [{ name: "Ella", age: 8 }],
  },
  stays: [
    { name: "Windermere Boutique Hotel", dates: "3-5 Apr", nights: 2, type: "Hotel", tags: ["2 rooms", "Breakfast", "EV charger"] },
    { name: "Keswick Lakeside Cottage", dates: "5-7 Apr", nights: 2, type: "Cottage", tags: ["3 beds", "Garden", "Dog friendly"] },
  ],
};

const DAYS_LAKES = [
  { day: 1, date: "3 Apr", label: "Thu", location: "Windermere", weather: { temp: 10, cond: "Partly cloudy", icon: "⛅" } },
  { day: 2, date: "4 Apr", label: "Fri", location: "Ambleside", weather: { temp: 12, cond: "Cloudy", icon: "☁️" } },
  { day: 3, date: "5 Apr", label: "Sat", location: "Grasmere", weather: { temp: 14, cond: "Sunny spells", icon: "🌤️" } },
  { day: 4, date: "6 Apr", label: "Sun", location: "Keswick", weather: { temp: 11, cond: "Light rain", icon: "🌧️" } },
  { day: 5, date: "7 Apr", label: "Mon", location: "Keswick", weather: { temp: 13, cond: "Sunny", icon: "☀️" } },
];

const TIMELINE_LAKES = {
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

const POLLS_LAKES = [
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


// ─── Paris Demo ───
// Showcases: EV route planning (London → Paris via Eurotunnel), weather-aware activities,
// trip brief for AI personalisation, traveller invite status, cuisine-tagged restaurants,
// multi-currency (£/€), route EV chargers, adult/kid split activities
const TRIP_PARIS = {
  name: "Spring in Paris", start: "10 Apr", end: "14 Apr", year: "2026",
  places: ["Paris", "Versailles", "Montmartre", "Le Marais"],
  startLocation: "London",
  travelMode: "EV vehicle",
  brief: "A culture-packed family getaway blending iconic Parisian landmarks with hidden gems. The kids love art and crepes. We want a mix of must-sees and off-the-beaten-path local experiences. Prefer walkable neighbourhoods and outdoor dining where possible.",
  budget: "£3,500",
  travellers: {
    adults: [
      { name: "You", isLead: true, status: "Organiser" },
      { name: "Alex R.", email: "alex@email.com", status: "Joined", isClaimed: true },
      { name: "Priya S.", email: "priya@email.com", status: "Joined", isClaimed: true },
      { name: "Tom W.", email: "tom@email.com", status: "Invited" },
    ],
    older: [{ name: "Leo", age: 14 }],
    younger: [{ name: "Mia", age: 9 }],
  },
  stays: [
    { name: "Hotel Le Petit Paris", dates: "10-12 Apr", nights: 2, type: "Boutique Hotel", tags: ["2 rooms", "Breakfast included", "Latin Quarter"], address: "214 Rue Saint-Jacques, 75005 Paris" },
    { name: "Montmartre Artist Loft", dates: "12-14 Apr", nights: 2, type: "Apartment", tags: ["3 beds", "Terrace", "Sacre-Coeur views"], address: "18 Rue Lepic, 75018 Paris" },
  ],
};

const DAYS_PARIS = [
  { day: 1, date: "10 Apr", label: "Fri", location: "Paris — Eiffel Tower & Latin Quarter", weather: { temp: 16, cond: "Sunny", icon: "☀️" } },
  { day: 2, date: "11 Apr", label: "Sat", location: "Paris — Louvre & Le Marais", weather: { temp: 18, cond: "Warm & clear", icon: "☀️" } },
  { day: 3, date: "12 Apr", label: "Sun", location: "Versailles", weather: { temp: 14, cond: "Light showers", icon: "🌧️" } },
  { day: 4, date: "13 Apr", label: "Mon", location: "Montmartre & Sacre-Coeur", weather: { temp: 17, cond: "Partly cloudy", icon: "⛅" } },
  { day: 5, date: "14 Apr", label: "Tue", location: "Paris — Canal Saint-Martin & Departure", weather: { temp: 15, cond: "Overcast", icon: "☁️" } },
];

const TIMELINE_PARIS = {
  1: [
    { time: "7:00 AM", title: "Depart London via Eurotunnel", desc: "Full EV charge at Folkestone terminal · 35 min crossing", for: "all", rating: null, price: "£180 return" },
    { time: "8:30 AM", title: "EV charge at Calais Coquelles", desc: "Ionity 350kW · 20 min top-up · Halfway London–Paris", for: "all", rating: null, price: null, evCharger: true },
    { time: "11:00 AM", title: "Arrive Paris · Check in Hotel Le Petit Paris", desc: "Boutique hotel in Latin Quarter · EV parking at Q-Park Notre Dame", for: "all", rating: null, price: null },
    { time: "12:00 PM", title: "Lunch at Breizh Cafe", desc: "4.6★ · French creperie · Buckwheat crepes · Kids menu · 109 Rue Vieille du Temple", for: "all", rating: 4.6, price: "€€", cuisine: "French creperie" },
    { time: "2:00 PM", title: "Eiffel Tower visit", desc: "Pre-booked skip-the-line · Summit tickets · Book 2 months ahead", for: "all", rating: 4.7, price: "€26.80/adult €6.70/child", needsBooking: true },
    { time: "4:30 PM", title: "Trocadero Gardens & Carousel", desc: "Best Eiffel Tower photos · Vintage carousel for kids · Free", for: "all", rating: 4.5, price: "Free" },
    { time: "5:30 PM", title: "Seine river cruise", desc: "Bateaux Mouches · 1 hr · Audio guide in English", for: "all", rating: 4.4, price: "€16/adult €7/child", needsBooking: true },
    { time: "7:30 PM", title: "Dinner at Le Bouillon Chartier", desc: "4.5★ · Traditional French · Historic brasserie · Steak frites, escargot · Unbeatable value · 7 Rue du Faubourg Montmartre", for: "all", rating: 4.5, price: "€€", cuisine: "Traditional French" },
  ],
  2: [
    { time: "8:30 AM", title: "Breakfast at Cafe de Flore", desc: "4.3★ · Iconic Left Bank cafe · Croissants & cafe au lait · 172 Blvd Saint-Germain", for: "all", rating: 4.3, price: "€€", cuisine: "French cafe" },
    { time: "10:00 AM", title: "Louvre Museum", desc: "Pre-booked timed entry · Mona Lisa route · 2-3 hrs · Kids audio trail", for: "all", rating: 4.8, price: "€22/adult, free under-18", needsBooking: true },
    { time: "10:00 AM", title: "Jardin des Tuileries playground", desc: "Trampolines, pony rides, puppet show · Right outside the Louvre", for: "kids", rating: 4.6, price: "€3-5" },
    { time: "10:00 AM", title: "Musee d'Orsay (if Louvre queue long)", desc: "Impressionist collection · Less crowded · Monet, Renoir, Van Gogh", for: "adults", rating: 4.8, price: "€16" },
    { time: "1:00 PM", title: "Lunch at L'As du Fallafel", desc: "4.7★ · Middle Eastern · Best falafel in Paris · Always a queue — worth it · 34 Rue des Rosiers", for: "all", rating: 4.7, price: "€", cuisine: "Middle Eastern" },
    { time: "2:30 PM", title: "Le Marais walking tour", desc: "Place des Vosges · Historic mansions · Street art · Vintage shops", for: "all", rating: 4.6, price: "Free" },
    { time: "4:00 PM", title: "Merci concept store & cafe", desc: "Design, books, fashion · Rooftop terrace · Great for teens", for: "adults", rating: 4.5, price: "Free entry" },
    { time: "4:00 PM", title: "Paris Chocolate workshop", desc: "Make your own truffles · 1.5 hrs · Ages 7+", for: "kids", rating: 4.8, price: "€45pp", needsBooking: true },
    { time: "7:00 PM", title: "Dinner at Pink Mamma", desc: "4.4★ · Italian · 4-storey restaurant · Wood-fired pizza · Truffle pasta · 20bis Rue de la Folie Mericourt", for: "all", rating: 4.4, price: "€€", cuisine: "Italian" },
  ],
  3: [
    { time: "9:00 AM", title: "Checkout Hotel Le Petit Paris", desc: "Pack up · 45 min drive to Versailles via A13", for: "all", rating: null, price: null },
    { time: "9:30 AM", title: "EV charge at Total Energies Versailles", desc: "175kW · 25 min · Charge while visiting palace", for: "all", rating: null, price: null, evCharger: true },
    { time: "10:00 AM", title: "Palace of Versailles", desc: "Pre-booked passport ticket · Hall of Mirrors · Marie Antoinette's Estate", for: "all", rating: 4.6, price: "€21.50/adult, free under-18", needsBooking: true },
    { time: "10:00 AM", title: "Versailles Gardens & Grand Canal", desc: "Rent a rowboat on the Grand Canal · Musical fountains (weekends)", for: "kids", rating: 4.7, price: "€10 boat rental" },
    { time: "10:00 AM", title: "Versailles Grand Trianon", desc: "Quieter palace · Beautiful gardens · Less crowds than main palace", for: "adults", rating: 4.5, price: "Included in passport" },
    { time: "1:00 PM", title: "Lunch at La Flottille", desc: "4.2★ · French bistro · Terrace on the Grand Canal · Salads & croque monsieur", for: "all", rating: 4.2, price: "€€", cuisine: "French bistro" },
    { time: "3:00 PM", title: "Versailles Market (Marche Notre-Dame)", desc: "Fresh produce · Cheese · Crepes · Great for rainy afternoon browsing", for: "all", rating: 4.5, price: "€" },
    { time: "4:30 PM", title: "Drive to Montmartre · Check in loft", desc: "Artist loft · Terrace with Sacre-Coeur views · 45 min drive", for: "all", rating: null, price: null },
    { time: "7:30 PM", title: "Dinner at Le Refuge des Fondus", desc: "4.3★ · French fondue · Wine in baby bottles · Quirky & fun · 17 Rue des Trois Freres", for: "all", rating: 4.3, price: "€€", cuisine: "French fondue" },
  ],
  4: [
    { time: "8:30 AM", title: "Breakfast at Le Consulat", desc: "4.2★ · Classic Montmartre cafe · Terrace views · Pain au chocolat · 18 Rue Norvins", for: "all", rating: 4.2, price: "€", cuisine: "French cafe" },
    { time: "10:00 AM", title: "Sacre-Coeur Basilica", desc: "Free entry · Dome climb for panoramic Paris views · 300 steps", for: "all", rating: 4.7, price: "Free (dome €7)" },
    { time: "11:00 AM", title: "Place du Tertre artists", desc: "Portrait sketches · Street performers · Caricatures for kids", for: "all", rating: 4.3, price: "€15-40 per portrait" },
    { time: "11:00 AM", title: "Montmartre street art walking tour", desc: "Hidden murals · Amelie filming locations · 1.5 hrs", for: "adults", rating: 4.8, price: "Free (tip-based)" },
    { time: "11:00 AM", title: "Montmartre Vineyard & Carousel", desc: "See Paris's last working vineyard · Ride the vintage carousel", for: "kids", rating: 4.4, price: "€3" },
    { time: "1:00 PM", title: "Lunch at Chez Janou", desc: "4.5★ · Provencal · Famous chocolate mousse from a giant bowl · Garden terrace · 2 Rue Roger Verlomme", for: "all", rating: 4.5, price: "€€", cuisine: "Provencal" },
    { time: "3:00 PM", title: "Musee de l'Orangerie", desc: "Monet's Water Lilies panoramas · Small museum · 1 hr · All ages", for: "all", rating: 4.7, price: "€12.50/adult, free under-18" },
    { time: "4:30 PM", title: "Luxembourg Gardens", desc: "Toy sailboats on the pond · Puppet theatre (Wed/Sat) · Playground", for: "kids", rating: 4.8, price: "€4 boat rental" },
    { time: "4:30 PM", title: "Saint-Germain wine bar crawl", desc: "Compagnie des Vins Surnaturels · Natural wines · Cheese plates", for: "adults", rating: 4.6, price: "€€" },
    { time: "7:30 PM", title: "Dinner at Le Comptoir du Pantheon", desc: "4.4★ · French bistro · Duck confit · Creme brulee · Outdoor seating · 5 Rue Soufflot", for: "all", rating: 4.4, price: "€€€", cuisine: "French bistro" },
  ],
  5: [
    { time: "8:00 AM", title: "Pack up Montmartre loft", desc: "Final check · Load car · Drive to Canal Saint-Martin", for: "all", rating: null, price: null },
    { time: "9:00 AM", title: "Canal Saint-Martin morning walk", desc: "Iron footbridges · Locks · Hip cafes · Street art", for: "all", rating: 4.5, price: "Free" },
    { time: "10:00 AM", title: "Marche d'Aligre flea market", desc: "Vintage finds · Fresh produce · Local pastries · Great for souvenirs", for: "all", rating: 4.4, price: "€" },
    { time: "11:30 AM", title: "Final lunch at Le Train Bleu", desc: "4.3★ · Classic French · Stunning Belle Epoque dining room in Gare de Lyon · Fitting farewell", for: "all", rating: 4.3, price: "€€€", cuisine: "Classic French" },
    { time: "1:30 PM", title: "EV charge at Fastned Calais", desc: "300kW · Quick top-up before Eurotunnel crossing", for: "all", rating: null, price: null, evCharger: true },
    { time: "3:00 PM", title: "Eurotunnel crossing to Folkestone", desc: "35 min crossing · Arrive London ~4:30 PM", for: "all", rating: null, price: null },
    { time: "4:30 PM", title: "Arrive home in London", desc: "End of trip · EV charge at home", for: "all", rating: null, price: null },
  ],
};

const POLLS_PARIS = [
  { id: 1, q: "Louvre or Musee d'Orsay on Day 2?", status: "active", ends: "Tonight", by: "You", votes: 5,
    options: [
      { text: "Louvre — Mona Lisa, Egyptian wing, huge collection", pct: 60, voters: ["You", "AR", "PS"], voted: true },
      { text: "Musee d'Orsay — Impressionists, less crowded, beautiful building", pct: 40, voters: ["TW", "Leo"] },
    ]},
  { id: 2, q: "Dinner style for Day 3 in Montmartre?", status: "active", ends: "Tomorrow 10 AM", by: "Alex R.", votes: 4,
    options: [
      { text: "Le Refuge des Fondus — fondue, quirky, wine in baby bottles", pct: 50, voters: ["You", "AR"], voted: true },
      { text: "Bouillon Pigalle — classic French, great value, traditional", pct: 25, voters: ["PS"] },
      { text: "La Maison Rose — pink cafe, Instagram-famous, garden seating", pct: 25, voters: ["TW"] },
    ]},
  { id: 3, q: "Should we do the chocolate workshop?", status: "closed", ends: "Yesterday", by: "Priya S.", votes: 6,
    options: [
      { text: "Yes! The kids will love making truffles", pct: 83, voters: ["You", "AR", "PS", "TW", "Leo"], voted: true },
      { text: "Skip it — too much planned already", pct: 17, voters: ["Mia"] },
    ]},
];


// ─── Demo Registry ───
export const DEMO_TRIPS = {
  lakes: { trip: TRIP_LAKES, days: DAYS_LAKES, timeline: TIMELINE_LAKES, polls: POLLS_LAKES, label: "Lake District" },
  paris: { trip: TRIP_PARIS, days: DAYS_PARIS, timeline: TIMELINE_PARIS, polls: POLLS_PARIS, label: "Paris" },
};

export const DEMO_KEYS = Object.keys(DEMO_TRIPS);

// ─── Active demo key (persisted in localStorage) ───
function getActiveDemoKey() {
  try { return localStorage.getItem("twm_demo_key") || "paris"; } catch { return "paris"; }
}
export function setActiveDemoKey(key) {
  try { localStorage.setItem("twm_demo_key", key); } catch { /* noop */ }
}

// ─── Default exports — reads active demo key at load time ───
const _active = DEMO_TRIPS[getActiveDemoKey()] || DEMO_TRIPS.paris;

export const TRIP = _active.trip;
export const DAYS = _active.days;
export const TIMELINE = _active.timeline;
export const POLLS = _active.polls;
