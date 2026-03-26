import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { REGION_SUGGESTIONS } from "../constants/regions";
import { API } from "../constants/api";
import { authFetch } from "../utils/authFetch";
import { useAuth } from "./AuthContext";

const WizardContext = createContext(null);

export function WizardProvider({ children }) {
  const { user } = useAuth();
  const userDisplayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || "You";

  // ─── Wizard Step ───
  const [wizStep, setWizStep] = useState(0);

  // ─── New Trip Wizard State ───
  const [wizTrip, setWizTrip] = useState({ name: "", brief: "", start: "", end: "", places: [], travel: new Set(), budget: "", startLocation: "", templateKey: "" });
  const [wizTravellers, setWizTravellers] = useState({ adults: [{ name: userDisplayName, email: "", isLead: true }], olderKids: [], youngerKids: [], infants: [] });
  const [wizStays, setWizStays] = useState([]);
  const [wizPrefs, setWizPrefs] = useState({ food: new Set(), adultActs: new Set(), olderActs: new Set(), youngerActs: new Set(), instructions: "" });
  const [wizShowErrors, setWizShowErrors] = useState(false);

  // Update lead adult name when user auth resolves
  useEffect(() => {
    if (userDisplayName && userDisplayName !== "You") {
      setWizTravellers(prev => {
        const lead = prev.adults[0];
        if (lead?.isLead && (lead.name === "You" || !lead.name)) {
          return { ...prev, adults: [{ ...lead, name: userDisplayName }, ...prev.adults.slice(1)] };
        }
        return prev;
      });
    }
  }, [userDisplayName]);

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
        const res = await authFetch(API.PLACES, {
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
        const foodRes = await authFetch(API.PLACES, {
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
        const actRes = await authFetch(API.PLACES, {
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
    setWizTrip({ name: "", brief: "", start: "", end: "", places: [], travel: new Set(), budget: "", startLocation: "", templateKey: "" });
    setWizTravellers({ adults: [{ name: userDisplayName, email: "", isLead: true }], olderKids: [], youngerKids: [], infants: [] });
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
