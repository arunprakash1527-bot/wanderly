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

// ─── Travel Time Estimates (driving hours between common UK/EU city pairs) ───
export const TRAVEL_TIMES = {
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
