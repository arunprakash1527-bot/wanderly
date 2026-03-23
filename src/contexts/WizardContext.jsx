import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

const WizardContext = createContext(null);

// ─── Region-specific suggestions for food, activities, and kids activities ───
const REGION_SUGGESTIONS = {
  uk: {
    food: ["Fish & chips", "Sunday roast", "Cream tea", "Pub grub", "Curry", "Pie & mash", "Full English"],
    activities: ["Country walk", "Castle visit", "Pub crawl", "National Trust property", "Afternoon tea", "Canal boat trip", "Theatre show"],
    olderKids: ["Theme park", "Go Ape", "Rock climbing", "Beach day", "Museum trail"],
  },
  england: {
    food: ["Fish & chips", "Sunday roast", "Cream tea", "Pub grub", "Afternoon tea", "Cornish pasty", "Pie & mash"],
    activities: ["Country walk", "Castle visit", "Cathedral tour", "National Trust property", "River punting", "Afternoon tea", "Theatre"],
    olderKids: ["Theme park", "Go Ape", "Beach day", "Museum trail", "Climbing wall"],
  },
  scotland: {
    food: ["Haggis", "Cullen skink", "Scotch pie", "Smoked salmon", "Cranachan", "Shortbread", "Whisky tasting"],
    activities: ["Highland hike", "Whisky distillery tour", "Castle visit", "Loch cruise", "Munro bagging", "Edinburgh Old Town walk", "Ceilidh night"],
    olderKids: ["Loch Ness boat trip", "Highland wildlife safari", "Mountain biking", "Tree-top adventure", "Ghostly Edinburgh tour"],
  },
  france: {
    food: ["Croissants & pastries", "Coq au vin", "Crêpes", "Baguette & cheese", "Ratatouille", "Macarons", "Wine tasting"],
    activities: ["Wine tasting", "Museum visit", "River cruise", "Château tour", "Market browsing", "Patisserie class", "Cycling tour"],
    olderKids: ["Disneyland Paris", "Accrobranche", "Beach day", "Kayaking", "Treasure hunt"],
  },
  spain: {
    food: ["Tapas", "Paella", "Churros", "Jamón ibérico", "Gazpacho", "Sangria", "Pintxos"],
    activities: ["Tapas tour", "Flamenco show", "Beach day", "Siesta & stroll", "Market visit", "Cathedral tour", "Wine tasting"],
    olderKids: ["PortAventura", "Beach sports", "Snorkelling", "Cycling", "Aquarium visit"],
  },
  italy: {
    food: ["Pizza", "Pasta", "Gelato", "Risotto", "Bruschetta", "Tiramisu", "Espresso & cornetto"],
    activities: ["Colosseum tour", "Gondola ride", "Wine tasting", "Cooking class", "Gallery visit", "Vespa tour", "Piazza stroll"],
    olderKids: ["Gladiator school", "Gondola ride", "Gelato tour", "Beach day", "Bike ride"],
  },
  japan: {
    food: ["Sushi", "Ramen", "Tempura", "Okonomiyaki", "Matcha treats", "Yakitori", "Bento"],
    activities: ["Temple visit", "Tea ceremony", "Onsen", "Cherry blossom walk", "Shrine tour", "Bullet train experience", "Market visit"],
    olderKids: ["Robot restaurant", "Pokémon center", "DisneySea", "Arcade visit", "Ninja experience"],
  },
  germany: {
    food: ["Bratwurst", "Pretzel", "Schnitzel", "Currywurst", "Black Forest cake", "Beer garden lunch", "Strudel"],
    activities: ["Beer garden visit", "Castle tour", "Christmas market", "Rhine cruise", "Museum visit", "Cycling tour", "Spa visit"],
    olderKids: ["Europa-Park", "Legoland", "River rafting", "Climbing park", "Zoo visit"],
  },
  netherlands: {
    food: ["Stroopwafel", "Bitterballen", "Herring", "Poffertjes", "Cheese tasting", "Pannenkoeken", "Apple pie"],
    activities: ["Canal cruise", "Cycling tour", "Museum visit", "Tulip fields", "Windmill visit", "Market browse", "Brown café visit"],
    olderKids: ["Efteling", "Cycling adventure", "Pancake boat", "Zoo visit", "Madurodam"],
  },
  portugal: {
    food: ["Pastel de nata", "Bacalhau", "Francesinha", "Piri-piri chicken", "Port wine tasting", "Seafood cataplana", "Bifana"],
    activities: ["Tram ride", "Port wine tasting", "Beach day", "Tile museum", "Fado show", "Surf lesson", "Market visit"],
    olderKids: ["Surfing lesson", "Beach day", "Oceanarium", "Kayaking", "Castle exploration"],
  },
  ireland: {
    food: ["Irish stew", "Soda bread", "Fish & chips", "Full Irish", "Boxty", "Colcannon", "Whiskey tasting"],
    activities: ["Cliff walk", "Pub session", "Castle visit", "Whiskey distillery", "Coastal drive", "Sheep farm visit", "Traditional music night"],
    olderKids: ["Cliffs of Moher", "Aran Islands ferry", "Rock climbing", "Horse riding", "Kayaking"],
  },
  usa: {
    food: ["Burgers", "BBQ", "Tacos", "Lobster roll", "Deep dish pizza", "Clam chowder", "Brunch"],
    activities: ["National park hike", "Broadway show", "Food tour", "Beach day", "City bike tour", "Museum visit", "Live music"],
    olderKids: ["Theme park", "Whale watching", "Surfing", "Baseball game", "Escape room"],
  },
  australia: {
    food: ["Barramundi", "Meat pie", "Avocado toast", "Tim Tams", "Pavlova", "BBQ", "Flat white"],
    activities: ["Surfing", "Snorkelling", "Bush walk", "Wildlife sanctuary", "Harbour cruise", "Beach BBQ", "Wine tasting"],
    olderKids: ["Surfing lesson", "Snorkelling", "Zoo visit", "Whale watching", "Kayaking"],
  },
  uae: {
    food: ["Shawarma", "Hummus & falafel", "Al machboos", "Arabic coffee", "Luqaimat", "Mezze platter", "Grilled kebab"],
    activities: ["Desert safari", "Souq visit", "Dhow cruise", "Burj Khalifa", "Beach club", "Gold souq", "Spa day"],
    olderKids: ["Waterpark", "Desert safari", "Indoor skiing", "Aquarium visit", "Dune buggy ride"],
  },
  singapore: {
    food: ["Hainanese chicken rice", "Chilli crab", "Laksa", "Satay", "Roti prata", "Kaya toast", "Hawker centre tour"],
    activities: ["Gardens by the Bay", "Hawker centre tour", "Marina Bay walk", "Boat Quay stroll", "Night safari", "Chinatown visit", "Rooftop bar"],
    olderKids: ["Universal Studios", "Night safari", "Sentosa beach", "S.E.A. Aquarium", "Luge ride"],
  },
  thailand: {
    food: ["Pad Thai", "Green curry", "Mango sticky rice", "Tom Yum", "Som Tam", "Street food tour", "Massaman curry"],
    activities: ["Temple tour", "Thai massage", "Cooking class", "Night market", "Island hopping", "Elephant sanctuary", "Muay Thai show"],
    olderKids: ["Elephant sanctuary", "Snorkelling", "Night market", "Thai cooking class", "Zip line"],
  },
  indonesia: {
    food: ["Nasi Goreng", "Satay", "Gado-gado", "Babi Guling", "Rendang", "Nasi Campur", "Smoothie bowl"],
    activities: ["Rice terrace walk", "Temple visit", "Surf lesson", "Cooking class", "Waterfall hike", "Snorkelling", "Yoga session"],
    olderKids: ["Surfing lesson", "Snorkelling", "Monkey forest", "Waterfall swim", "Cycling tour"],
  },
  maldives: {
    food: ["Grilled fish", "Coconut curry", "Mas huni", "Garudhiya", "Fresh seafood", "Tropical fruit platter", "Lobster dinner"],
    activities: ["Snorkelling", "Sunset cruise", "Spa treatment", "Diving", "Fishing trip", "Island hopping", "Kayaking"],
    olderKids: ["Snorkelling", "Dolphin watching", "Kayaking", "Glass-bottom boat", "Beach volleyball"],
  },
  czech: {
    food: ["Svíčková", "Trdelník", "Goulash", "Koleno", "Czech beer tasting", "Fried cheese", "Dumplings"],
    activities: ["Castle tour", "Beer tasting", "Old Town walk", "River cruise", "Jazz club", "Market visit", "Spa visit"],
    olderKids: ["Pedal boat", "Zoo visit", "Mirror maze", "Tower climbing", "Escape room"],
  },
  austria: {
    food: ["Wiener Schnitzel", "Sachertorte", "Apfelstrudel", "Kaiserschmarrn", "Coffee house visit", "Tafelspitz", "Palatschinken"],
    activities: ["Palace tour", "Concert hall visit", "Coffee house sit", "Alpine hike", "Museum visit", "Heuriger wine tavern", "Cycling along Danube"],
    olderKids: ["Alpine coaster", "Schönbrunn Zoo", "Ice caves", "Climbing park", "Toboggan run"],
  },
  switzerland: {
    food: ["Fondue", "Raclette", "Rösti", "Swiss chocolate", "Zürcher Geschnetzeltes", "Birchermüesli", "Cheese tasting"],
    activities: ["Alpine hike", "Lake cruise", "Chocolate factory", "Scenic train ride", "Mountain cable car", "Old town walk", "Spa visit"],
    olderKids: ["Mountain coaster", "Paragliding", "Toboggan run", "Lake swimming", "Chocolate workshop"],
  },
};

export function WizardProvider({ children }) {
  // ─── Wizard Step ───
  const [wizStep, setWizStep] = useState(0);

  // ─── New Trip Wizard State ───
  const [wizTrip, setWizTrip] = useState({ name: "", brief: "", start: "", end: "", places: [], travel: new Set(), budget: "", startLocation: "" });
  const [wizTravellers, setWizTravellers] = useState({ adults: [{ name: "You", email: "", isLead: true }], olderKids: [], youngerKids: [] });
  const [wizStays, setWizStays] = useState([]);
  const [wizPrefs, setWizPrefs] = useState({ food: new Set(), adultActs: new Set(), olderActs: new Set(), youngerActs: new Set(), instructions: "" });
  const [wizShowErrors, setWizShowErrors] = useState(false);

  // ─── Place Input (Details step) ───
  const [placeInput, setPlaceInput] = useState("");
  const [placeSuggestionsOpen, setPlaceSuggestionsOpen] = useState(false);

  // ─── Stay Search (Stays step) ───
  const [staySearch, setStaySearch] = useState("");
  const [staySearchOpen, setStaySearchOpen] = useState(false);

  // ─── Prefs Search ───
  const [foodSearch, setFoodSearch] = useState("");
  const [adultActSearch, setAdultActSearch] = useState("");
  const [olderActSearch, setOlderActSearch] = useState("");
  const [youngerActSearch, setYoungerActSearch] = useState("");
  const [expandedPrefSections, setExpandedPrefSections] = useState(new Set());

  // ─── Editing State ───
  const [editingTripId, setEditingTripId] = useState(null);

  // ─── Places API: Stay Search ───
  const [stayPlacesResults, setStayPlacesResults] = useState([]);
  const [staySearching, setStaySearching] = useState(false);
  const staySearchTimer = useRef(null);

  const handleStaySearchChange = useCallback((value) => {
    setStaySearch(value);
    if (staySearchTimer.current) clearTimeout(staySearchTimer.current);
    if (!value || value.length < 3) {
      setStayPlacesResults([]);
      setStaySearching(false);
      return;
    }
    setStaySearching(true);
    staySearchTimer.current = setTimeout(async () => {
      try {
        const locationName = wizTrip.places.length > 0 ? wizTrip.places[0] : "";
        const query = locationName ? `${value} near ${locationName}` : value;
        const res = await fetch("/api/places", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, type: "lodging" }),
        });
        const data = await res.json();
        if (res.ok && data.places) {
          setStayPlacesResults(data.places.map(p => ({
            name: p.displayName?.text || p.name || "",
            address: p.formattedAddress || p.shortFormattedAddress || "",
            rating: p.rating || null,
            priceLevel: p.priceLevel ? (typeof p.priceLevel === "number" ? p.priceLevel : { PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 }[p.priceLevel] || 0) : null,
            photo: p.photos?.[0]?.name ? `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxWidthPx=100` : null,
            placeId: p.id || p.place_id || "",
          })));
        } else {
          setStayPlacesResults([]);
        }
      } catch (e) {
        setStayPlacesResults([]);
      }
      setStaySearching(false);
    }, 400);
  }, [wizTrip.places]);

  // ─── Places API: Food & Activity suggestions ───
  const [placesFood, setPlacesFood] = useState([]);
  const [placesActivities, setPlacesActivities] = useState([]);

  useEffect(() => {
    if (wizTrip.places.length === 0) {
      setPlacesFood([]);
      setPlacesActivities([]);
      return;
    }
    const locationName = wizTrip.places[0];
    let cancelled = false;

    const fetchPlacesSuggestions = async () => {
      // Fetch food suggestions
      try {
        const foodRes = await fetch("/api/places", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: `best restaurants in ${locationName}`, type: "restaurant" }),
        });
        const foodData = await foodRes.json();
        if (!cancelled && foodRes.ok && foodData.places) {
          const foodNames = foodData.places
            .slice(0, 6)
            .map(p => p.displayName?.text || p.name || "")
            .filter(Boolean);
          setPlacesFood(foodNames);
        }
      } catch (e) {
        if (!cancelled) setPlacesFood([]);
      }

      // Fetch activity suggestions
      try {
        const actRes = await fetch("/api/places", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: `things to do in ${locationName}`, type: "tourist_attraction" }),
        });
        const actData = await actRes.json();
        if (!cancelled && actRes.ok && actData.places) {
          const actNames = actData.places
            .slice(0, 6)
            .map(p => p.displayName?.text || p.name || "")
            .filter(Boolean);
          setPlacesActivities(actNames);
        }
      } catch (e) {
        if (!cancelled) setPlacesActivities([]);
      }
    };

    fetchPlacesSuggestions();
    return () => { cancelled = true; };
  }, [wizTrip.places.length > 0 ? wizTrip.places[0] : ""]);

  // ─── Reset Wizard ───
  const resetWizard = useCallback(() => {
    setWizTrip({ name: "", brief: "", start: "", end: "", places: [], travel: new Set(), budget: "", startLocation: "" });
    setWizTravellers({ adults: [{ name: "You", email: "", isLead: true }], olderKids: [], youngerKids: [] });
    setWizStays([]);
    setWizPrefs({ food: new Set(), adultActs: new Set(), olderActs: new Set(), youngerActs: new Set(), instructions: "" });
    setStaySearch("");
    setStaySearchOpen(false);
    setStayPlacesResults([]);
    setPlaceInput("");
    setPlaceSuggestionsOpen(false);
    setFoodSearch("");
    setAdultActSearch("");
    setOlderActSearch("");
    setYoungerActSearch("");
    setExpandedPrefSections(new Set());
    setWizShowErrors(false);
    setWizStep(0);
    setEditingTripId(null);
    setPlacesFood([]);
    setPlacesActivities([]);
  }, []);

  return (
    <WizardContext.Provider value={{
      // Wizard step
      wizStep, setWizStep,
      // Trip details
      wizTrip, setWizTrip,
      wizTravellers, setWizTravellers,
      wizStays, setWizStays,
      wizPrefs, setWizPrefs,
      wizShowErrors, setWizShowErrors,
      // Place input
      placeInput, setPlaceInput,
      placeSuggestionsOpen, setPlaceSuggestionsOpen,
      // Stay search
      staySearch, setStaySearch,
      staySearchOpen, setStaySearchOpen,
      stayPlacesResults, setStayPlacesResults,
      staySearching,
      handleStaySearchChange,
      // Prefs search
      foodSearch, setFoodSearch,
      adultActSearch, setAdultActSearch,
      olderActSearch, setOlderActSearch,
      youngerActSearch, setYoungerActSearch,
      expandedPrefSections, setExpandedPrefSections,
      // Places API suggestions
      placesFood,
      placesActivities,
      // Region suggestions constant
      REGION_SUGGESTIONS,
      // Editing
      editingTripId, setEditingTripId,
      // Functions
      resetWizard,
    }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) throw new Error("useWizard must be used within a WizardProvider");
  return context;
}
