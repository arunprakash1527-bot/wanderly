// ─── Location Suggestions Database ───
export const LOCATION_SUGGESTIONS = [
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
  "Delhi", "Mumbai", "Chennai", "Bangalore", "Hyderabad", "Kolkata", "Jaipur", "Goa", "Kerala", "Udaipur", "Agra", "Rishikesh", "Varanasi", "Pune", "Kochi", "Mysore", "Shimla", "Darjeeling", "Amritsar", "Jodhpur",
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
export const ACTIVITY_SUGGESTIONS = {
  default: {
    adults: ["Light hikes", "Spas & wellness", "Boat trips", "Museums", "Wine tasting", "Photography tours", "Cycling", "Local markets"],
    olderKids: ["Adventure parks", "Climbing walls", "Zip lining", "Kayaking", "Mountain biking", "Interactive museums", "Bike hire"],
    youngerKids: ["Playgrounds", "Animal farms", "Soft play", "Story trails", "Mini golf", "Beach activities", "Nature walks"],
  },
};

// ─── Location Vibes: detect destination character for smarter suggestions ───
export const LOCATION_VIBES = {
  coastal: {
    match: /miami|cancun|phuket|bali|goa|amalfi|brighton|cornwall|devon|dorset|nice|barcelona|malaga|gold coast|byron bay|cape town|zanzibar|maldives|seychelles|mauritius|fiji|bora bora|tahiti|honolulu|san diego|koh samui|krabi|langkawi|dubrovnik|split|crete|mykonos|santorini|sicily|sardinia|majorca|ibiza|madeira|canary islands|azores|jersey|tulum|playa del carmen|cartagena|rio de janeiro|cairns|mirissa|da nang|hoi an|jeju/i,
    food: ["Seafood", "Beach bar bites", "Fresh fish", "Ceviche", "Grilled prawns", "Coconut dishes"],
    activities: ["Surfing", "Snorkelling", "Jet ski", "Beach day", "Boat tour", "Scuba diving", "Kayaking", "Sunset cruise", "Paddleboarding", "Deep-sea fishing", "Beach volleyball"],
    olderKids: ["Bodyboarding", "Snorkelling tour", "Beach volleyball", "Kayaking", "Paddleboarding", "Sandcastle building", "Rock pooling", "Coasteering"],
    youngerKids: ["Sandcastle building", "Rock pooling", "Paddling", "Beach treasure hunt", "Shell collecting", "Shallow water splashing", "Crab catching"],
  },
  tropical: {
    match: /bali|phuket|koh samui|krabi|cancun|tulum|maldives|seychelles|mauritius|fiji|bora bora|tahiti|honolulu|goa|kerala|zanzibar|sri lanka|caribbean|jamaica|barbados|bahamas|costa rica|langkawi|ubud|mirissa/i,
    food: ["Tropical fruit", "Smoothie bowls", "Jerk chicken", "Curry", "Fresh juice", "Açaí bowls"],
    activities: ["Jungle trek", "Waterfall hike", "Zip lining", "Wildlife spotting", "Mangrove tour", "Rainforest walk", "Volcano visit"],
    olderKids: ["Jungle zip line", "Waterfall swimming", "Wildlife safari", "Snorkelling", "Banana boat ride", "Jungle walk", "Turtle spotting"],
    youngerKids: ["Butterfly garden", "Turtle sanctuary", "Monkey forest visit", "Gentle river float", "Tropical fruit tasting", "Animal feeding"],
  },
  mountain: {
    match: /swiss alps|interlaken|chamonix|banff|whistler|innsbruck|salzburg|zermatt|queenstown|patagonia|cusco|machu picchu|rishikesh|pokhara|kathmandu|snowdonia|peak district|lake district|highlands|fort william|ben nevis|dolomites|colorado|denver|aspen|jackson hole/i,
    food: ["Fondue", "Hot chocolate", "Hearty stews", "Mountain hut dining", "Alpine cheese"],
    activities: ["Hiking", "Skiing", "Snowboarding", "Cable car ride", "Mountain biking", "Rock climbing", "Via ferrata", "Paragliding", "Scenic train ride"],
    olderKids: ["Easy mountain hike", "Cable car ride", "Mountain biking", "Rock scrambling", "Scenic train ride", "Sledging", "Orienteering"],
    youngerKids: ["Cable car ride", "Nature trail", "Pebble skimming", "Picnic spot", "Gentle woodland walk", "Stream paddling", "Wildlife spotting"],
  },
  city: {
    match: /new york|london|paris|tokyo|berlin|amsterdam|barcelona|rome|chicago|los angeles|san francisco|singapore|dubai|hong kong|shanghai|beijing|bangkok|seoul|mumbai|delhi|istanbul|moscow|buenos aires|mexico city|toronto|sydney|melbourne|lisbon|madrid|vienna|prague|budapest|warsaw|dublin|brussels|copenhagen|stockholm|seattle|boston|washington dc|portland|austin|nashville|montreal|vancouver|edinburgh|glasgow|manchester|birmingham|leeds|liverpool/i,
    food: ["Street food tour", "Fine dining", "Food market", "Rooftop restaurant", "Brunch spot", "Michelin star experience"],
    activities: ["Walking tour", "Rooftop bar", "Museum hopping", "Street art tour", "Shopping district", "Live music venue", "Theatre show", "Night tour", "Architecture walk"],
    olderKids: ["Science museum", "Theme park", "Escape room", "Street food tour", "Skateboarding park", "Cinema/IMAX", "Trampoline park", "Laser tag"],
    youngerKids: ["Children's museum", "City park playground", "Puppet show", "Toy shop visit", "Aquarium", "Zoo", "Carousel ride", "Story time at library"],
  },
  cultural: {
    match: /rome|florence|venice|athens|cairo|luxor|jerusalem|kyoto|nara|agra|varanasi|jaipur|udaipur|petra|marrakech|fez|york|bath|oxford|cambridge|krakow|prague|vienna|budapest|dubrovnik|granada|seville|cusco|angkor|luang prabang|hoi an|st andrews/i,
    food: ["Traditional cuisine", "Cooking class", "Historic cafe", "Local market food"],
    activities: ["Historical sites", "Temple visit", "Art gallery", "Archaeological tour", "Cultural workshop", "Traditional performance", "Heritage walk", "Guided history tour"],
    olderKids: ["Treasure hunt tour", "Hands-on workshop", "Ancient ruins explorer", "Local craft making", "History scavenger hunt", "Kid-friendly walking tour"],
    youngerKids: ["Castle exploration", "Dress-up activities", "Story trail", "Drawing workshop", "Puppet theatre", "Simple craft making"],
  },
  island: {
    match: /maldives|seychelles|mauritius|fiji|bora bora|tahiti|bali|sicily|sardinia|majorca|ibiza|crete|mykonos|santorini|jersey|isle of skye|zanzibar|madeira|canary islands|azores|sri lanka|galápagos|koh samui|langkawi|jeju|tasmania|hawaii|honolulu|phuket/i,
    food: ["Island BBQ", "Fresh catch of the day", "Beachside dining"],
    activities: ["Island hopping", "Snorkelling", "Beachcombing", "Whale watching", "Catamaran trip", "Sunset sail"],
    olderKids: ["Snorkelling", "Glass-bottom boat", "Island bike ride", "Kayaking", "Fish feeding", "Beach Olympics"],
    youngerKids: ["Glass-bottom boat", "Beach play", "Shell collecting", "Shallow snorkelling", "Sandcastle contest", "Boat ride"],
  },
  adventure: {
    match: /queenstown|banff|whistler|interlaken|cusco|patagonia|galápagos|costa rica|nepal|pokhara|rishikesh|chamonix|zermatt|jackson hole|moab|iceland|reykjavik|new zealand|cairns|bali/i,
    food: ["Energy food", "Trail snacks", "Camp cooking"],
    activities: ["Bungee jumping", "White water rafting", "Skydiving", "Canyoning", "Abseiling", "Mountain biking", "4WD safari", "Glacier walk"],
    olderKids: ["Junior rafting", "Tree-top adventure", "Zip lining", "Mountain biking (easy trail)", "Rock climbing wall", "Caving", "Junior safari"],
    youngerKids: ["Nature trail", "Animal spotting", "Easy forest walk", "Canopy walkway", "Petting zoo", "Gentle stream walk"],
  },
};

// ─── Travel Time Estimates (driving hours between common city pairs) ───
export const TRAVEL_TIMES = {
  // UK
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
  // Europe
  "paris|lyon": 4.5, "paris|nice": 8, "paris|marseille": 7.5, "paris|bordeaux": 6,
  "rome|florence": 3, "rome|naples": 2.5, "rome|venice": 5, "rome|milan": 5.5,
  "florence|venice": 2.5, "florence|milan": 3, "florence|pisa": 1.5,
  "barcelona|madrid": 6, "barcelona|valencia": 3.5, "barcelona|seville": 10,
  "madrid|seville": 5.5, "madrid|valencia": 3.5,
  "amsterdam|brussels": 2, "amsterdam|paris": 5, "amsterdam|berlin": 6.5,
  "berlin|munich": 6, "berlin|hamburg": 3, "berlin|prague": 3.5,
  "munich|vienna": 4, "munich|zurich": 3.5, "munich|salzburg": 1.5,
  "zurich|geneva": 3, "zurich|milan": 3.5,
  // India
  "delhi|agra": 3.5, "delhi|jaipur": 5, "delhi|chandigarh": 4.5, "delhi|shimla": 7,
  "delhi|rishikesh": 5.5, "delhi|amritsar": 7.5, "delhi|varanasi": 12, "delhi|lucknow": 8,
  "delhi|mumbai": 22, "delhi|udaipur": 10, "delhi|jodhpur": 9.5, "delhi|dehradun": 5,
  "delhi|haridwar": 5, "delhi|manali": 12, "delhi|mussoorie": 5.5,
  "mumbai|pune": 3, "mumbai|goa": 9, "mumbai|nashik": 3, "mumbai|lonavala": 1.5,
  "mumbai|aurangabad": 5.5, "mumbai|ahmedabad": 8, "mumbai|surat": 4.5,
  "mumbai|udaipur": 12, "mumbai|bangalore": 16, "mumbai|hyderabad": 12,
  "chennai|bangalore": 5.5, "chennai|pondicherry": 2.5, "chennai|madurai": 7.5,
  "chennai|kochi": 10, "chennai|mysore": 8, "chennai|tirupati": 2.5,
  "chennai|hyderabad": 10, "chennai|ooty": 9, "chennai|coimbatore": 8,
  "chennai|thanjavur": 5, "chennai|mahabalipuram": 1, "chennai|munnar": 10,
  "bangalore|mysore": 2.5, "bangalore|goa": 8, "bangalore|ooty": 5, "bangalore|coorg": 4.5,
  "bangalore|hyderabad": 8, "bangalore|kochi": 8, "bangalore|pune": 14,
  "bangalore|hampi": 6, "bangalore|pondicherry": 5, "bangalore|coimbatore": 6,
  "bangalore|munnar": 7, "bangalore|wayanad": 5,
  "hyderabad|vijayawada": 4.5, "hyderabad|warangal": 2.5, "hyderabad|tirupati": 10,
  "kolkata|darjeeling": 10, "kolkata|puri": 8, "kolkata|varanasi": 12,
  "kolkata|siliguri": 9, "kolkata|digha": 3.5, "kolkata|shantiniketan": 3,
  "jaipur|udaipur": 6.5, "jaipur|jodhpur": 5, "jaipur|agra": 4,
  "jaipur|pushkar": 2.5, "jaipur|jaisalmer": 8.5, "jaipur|mount abu": 7,
  "kochi|munnar": 3.5, "kochi|alleppey": 1.5, "kochi|thekkady": 4.5,
  "kochi|trivandrum": 4, "kochi|wayanad": 5, "kochi|varkala": 3,
  "goa|hampi": 6, "goa|gokarna": 2.5, "goa|mumbai": 9, "goa|pune": 8, "goa|bangalore": 8,
  "chennai|goa": 10, "chennai|mumbai": 20, "delhi|bangalore": 34, "delhi|chennai": 36,
  "mumbai|chennai": 20, "mumbai|kolkata": 26, "delhi|kolkata": 22,
  // USA
  "new york|boston": 4, "new york|washington dc": 4, "new york|philadelphia": 2,
  "los angeles|san francisco": 6, "los angeles|san diego": 2, "los angeles|las vegas": 4,
  "san francisco|seattle": 12, "san francisco|portland": 10,
  "chicago|detroit": 4.5, "chicago|milwaukee": 1.5, "miami|orlando": 3.5,
  // Southeast Asia
  "bangkok|chiang mai": 9, "bangkok|pattaya": 2, "bangkok|hua hin": 3,
  "kuala lumpur|penang": 4, "kuala lumpur|malacca": 2, "kuala lumpur|singapore": 4.5,
  // Japan
  "tokyo|kyoto": 6, "tokyo|osaka": 6.5, "tokyo|hiroshima": 10, "osaka|kyoto": 1,
  // Australia
  "sydney|melbourne": 9, "sydney|canberra": 3, "melbourne|adelaide": 8,
};

// ─── City Coordinates (lat, lng) for distance-based travel time estimation ───
export const LOCATION_COORDS = {
  // UK
  london: [51.51, -0.13], manchester: [53.48, -2.24], birmingham: [52.49, -1.89],
  edinburgh: [55.95, -3.19], glasgow: [55.86, -4.25], liverpool: [53.41, -2.98],
  bristol: [51.45, -2.58], leeds: [53.80, -1.55], sheffield: [53.38, -1.47],
  newcastle: [54.98, -1.61], cambridge: [52.21, 0.12], oxford: [51.75, -1.25],
  bath: [51.38, -2.36], brighton: [50.82, -0.14], york: [53.96, -1.08],
  nottingham: [52.95, -1.15], "lake district": [54.45, -3.00], cornwall: [50.27, -5.05],
  windermere: [54.38, -2.91], grasmere: [54.46, -3.02], ambleside: [54.43, -2.96],
  keswick: [54.60, -3.13], bowness: [54.36, -2.92], penrith: [54.66, -2.75],
  kendal: [54.33, -2.74], coniston: [54.37, -3.07], ullswater: [54.57, -2.87],
  cockermouth: [54.66, -3.36], "cotswolds": [51.83, -1.68], "peak district": [53.35, -1.80],
  inverness: [57.48, -4.22], aberdeen: [57.15, -2.09], "isle of skye": [57.30, -6.30],
  "loch ness": [57.32, -4.45], "fort william": [56.82, -5.10], oban: [56.41, -5.47],
  "st andrews": [56.34, -2.80], stirling: [56.12, -3.94], dundee: [56.46, -2.97],
  // Europe
  paris: [48.86, 2.35], amsterdam: [52.37, 4.90], barcelona: [41.39, 2.17],
  rome: [41.90, 12.50], berlin: [52.52, 13.41], prague: [50.08, 14.44],
  vienna: [48.21, 16.37], lisbon: [38.72, -9.14], dublin: [53.35, -6.26],
  zurich: [47.38, 8.54], madrid: [40.42, -3.70], seville: [37.39, -5.98],
  valencia: [39.47, -0.38], florence: [43.77, 11.25], venice: [45.44, 12.32],
  milan: [45.46, 9.19], naples: [40.85, 14.27], nice: [43.71, 7.26],
  lyon: [45.76, 4.83], bordeaux: [44.84, -0.58], marseille: [43.30, 5.37],
  munich: [48.14, 11.58], hamburg: [53.55, 9.99], brussels: [50.85, 4.35],
  copenhagen: [55.68, 12.57], stockholm: [59.33, 18.07], oslo: [59.91, 10.75],
  budapest: [47.50, 19.04], salzburg: [47.80, 13.04], geneva: [46.20, 6.14],
  // India
  delhi: [28.61, 77.21], mumbai: [19.08, 72.88], chennai: [13.08, 80.27],
  bangalore: [12.97, 77.59], bengaluru: [12.97, 77.59], hyderabad: [17.39, 78.49],
  kolkata: [22.57, 88.36], jaipur: [26.91, 75.79], goa: [15.50, 73.83],
  kerala: [10.85, 76.27], udaipur: [24.59, 73.71], agra: [27.18, 78.02],
  rishikesh: [30.09, 78.27], varanasi: [25.32, 83.01], pune: [18.52, 73.86],
  kochi: [9.93, 76.27], mysore: [12.30, 76.65], shimla: [31.10, 77.17],
  darjeeling: [27.04, 88.26], amritsar: [31.63, 74.87], jodhpur: [26.24, 73.02],
  chandigarh: [30.73, 76.78], lucknow: [26.85, 80.95], ahmedabad: [23.02, 72.57],
  ooty: [11.41, 76.69], pondicherry: [11.93, 79.83], coimbatore: [11.02, 76.96],
  madurai: [9.93, 78.12], munnar: [10.09, 77.06], alleppey: [9.49, 76.34],
  manali: [32.24, 77.19], mussoorie: [30.46, 78.07], dehradun: [30.32, 78.03],
  haridwar: [29.95, 78.16], tirupati: [13.63, 79.42], hampi: [15.33, 76.46],
  gokarna: [14.55, 74.32], coorg: [12.42, 75.74], wayanad: [11.69, 76.08],
  thekkady: [9.60, 77.16], varkala: [8.73, 76.72], trivandrum: [8.52, 76.94],
  nashik: [19.99, 73.79], lonavala: [18.75, 73.41], aurangabad: [19.88, 75.34],
  surat: [21.17, 72.83], thanjavur: [10.79, 79.14], mahabalipuram: [12.62, 80.19],
  pushkar: [26.49, 74.55], jaisalmer: [26.92, 70.91], "mount abu": [24.59, 72.71],
  puri: [19.81, 85.83], siliguri: [26.71, 88.43], digha: [21.63, 87.51],
  shantiniketan: [23.68, 87.69], vijayawada: [16.51, 80.65], warangal: [18.00, 79.59],
  // USA
  "new york": [40.71, -74.01], "los angeles": [34.05, -118.24], "san francisco": [37.77, -122.42],
  chicago: [41.88, -87.63], miami: [25.76, -80.19], boston: [42.36, -71.06],
  "washington dc": [38.91, -77.04], seattle: [47.61, -122.33], "las vegas": [36.17, -115.14],
  portland: [45.52, -122.68], "san diego": [32.72, -117.16], philadelphia: [39.95, -75.17],
  orlando: [28.54, -81.38], detroit: [42.33, -83.05], milwaukee: [43.04, -87.91],
  austin: [30.27, -97.74], nashville: [36.16, -86.78], denver: [39.74, -104.99],
  // Asia
  tokyo: [35.68, 139.69], kyoto: [35.01, 135.77], osaka: [34.69, 135.50],
  bangkok: [13.76, 100.50], "chiang mai": [18.79, 98.98], phuket: [7.88, 98.39],
  singapore: [1.35, 103.82], "kuala lumpur": [3.14, 101.69], penang: [5.41, 100.34],
  bali: [8.34, 115.09], "ho chi minh city": [10.82, 106.63], hanoi: [21.03, 105.85],
  seoul: [37.57, 126.98], beijing: [39.90, 116.40], shanghai: [31.23, 121.47],
  "hong kong": [22.32, 114.17], taipei: [25.03, 121.57],
  // Middle East
  dubai: [25.20, 55.27], "abu dhabi": [24.45, 54.65], doha: [25.29, 51.53],
  // Africa
  "cape town": [-33.93, 18.42], johannesburg: [-26.20, 28.05], marrakech: [31.63, -8.01],
  cairo: [30.04, 31.24], nairobi: [-1.29, 36.82],
  // Oceania
  sydney: [-33.87, 151.21], melbourne: [-37.81, 144.96], brisbane: [-27.47, 153.03],
  perth: [-31.95, 115.86], auckland: [-36.85, 174.76], queenstown: [-45.03, 168.66],
  // Sri Lanka
  colombo: [6.93, 79.85], kandy: [7.29, 80.63], ella: [6.87, 81.05],
  galle: [6.03, 80.22], mirissa: [5.95, 80.45],
};

// ─── Location-specific activity pools ───
export const LOCATION_ACTIVITIES = {
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
