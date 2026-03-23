import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { T } from "../styles/tokens";
import { POLLS } from "../constants/tripData";
import { mapTripFromDB, mapTripForInsert, mapTravellersForInsert, mapStaysForInsert, mapPrefsForInsert } from "../utils/tripMappers";
import { getLocationActivities, estimateTravelHours } from "../utils/locationHelpers";
import { useAuth } from "./AuthContext";
import { useNavigation } from "./NavigationContext";

const TripContext = createContext(null);

export function TripProvider({ children }) {
  const { user } = useAuth();
  const { showToast, navigate } = useNavigation();

  // ─── Trip State ───
  const [createdTrips, setCreatedTrips] = useState([]);
  const [selectedCreatedTrip, setSelectedCreatedTrip] = useState(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const [tripDetailTab, setTripDetailTab] = useState("itinerary");
  const [expandedItem, setExpandedItem] = useState(null);
  const [editingTimelineIdx, setEditingTimelineIdx] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [bookingStates, setBookingStates] = useState({});
  const [joinShareCode, setJoinShareCode] = useState("");
  const [joinedSlot, setJoinedSlot] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastSeenActivity, setLastSeenActivity] = useState(() => {
    try { return JSON.parse(localStorage.getItem("twm_lastSeen") || "{}"); } catch { return {}; }
  });
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationPrefs, setActivationPrefs] = useState({ startTime: "08:00", dayOnePace: "balanced", notes: "", stopovers: [] });
  const [pendingActivationTripId, setPendingActivationTripId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [tripDirections, setTripDirections] = useState(null);
  const [pollData, setPollData] = useState(POLLS);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [newPollOptions, setNewPollOptions] = useState(["", ""]);

  // ─── Computed Values ───
  const getUnreadCount = useCallback((tripId) => {
    const trip = createdTrips.find(t => t.id === tripId);
    if (!trip) return 0;
    const lastSeen = lastSeenActivity[tripId] || 0;
    return (trip.activity || []).filter(a => new Date(a.time).getTime() > lastSeen).length;
  }, [createdTrips, lastSeenActivity]);

  const totalUnread = createdTrips.reduce((sum, t) => sum + getUnreadCount(t.id), 0);

  const allRecentActivity = createdTrips
    .flatMap(t => (t.activity || []).map(a => ({ ...a, tripId: t.id, tripName: t.name })))
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 30);

  // ─── Notification Helpers ───
  const markTripSeen = useCallback((tripId) => {
    setLastSeenActivity(prev => {
      const next = { ...prev, [tripId]: Date.now() };
      try { localStorage.setItem("twm_lastSeen", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // ─── Activity Log Helper ───
  const logActivity = (tripId, icon, text, type = "info") => {
    const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "You";
    const entry = { id: Date.now(), icon, text, by: userName, time: new Date().toISOString(), type };
    setCreatedTrips(prev => prev.map(t => t.id === tripId ? { ...t, activity: [entry, ...(t.activity || [])].slice(0, 50) } : t));
  };

  // ─── Supabase: Load Trips ───
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
        const mapped = trips.map(t => mapTripFromDB(t));
        setCreatedTrips(mapped);
      }
    } catch (err) {
      console.error('Error loading trips:', err);
      showToast("Failed to save — check connection", "error");
    }
    setSyncing(false);
  }, [user, showToast]);

  // ─── Supabase: Save Trip ───
  const saveTripToDB = async (tripData) => {
    if (!user || user.id === 'demo') return tripData;

    try {
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert(mapTripForInsert(tripData, user.id))
        .select()
        .single();

      if (tripError) throw tripError;

      const travellerRows = mapTravellersForInsert(tripData, trip.id, user.id);
      if (travellerRows.length > 0) {
        await supabase.from('trip_travellers').insert(travellerRows);
      }

      const stayRows = mapStaysForInsert(tripData.stays, trip.id);
      if (stayRows.length > 0) {
        await supabase.from('trip_stays').insert(stayRows);
      }

      const prefsRow = mapPrefsForInsert(tripData.prefs, trip.id);
      if (prefsRow) {
        await supabase.from('trip_preferences').insert(prefsRow);
      }

      return { ...tripData, id: trip.id, shareCode: trip.share_code, dbId: trip.id };
    } catch (err) {
      console.error('Error saving trip:', err);
      showToast("Failed to save — check connection", "error");
      return tripData;
    }
  };

  // ─── Supabase: Update Trip Status ───
  const updateTripStatusInDB = async (tripId, status) => {
    if (!user || user.id === 'demo' || !tripId) return;
    try {
      await supabase.from('trips').update({ status, updated_at: new Date().toISOString() }).eq('id', tripId);
    } catch (err) {
      console.error('Error updating trip status:', err);
    }
  };

  // ─── Supabase: Lookup Trip by Share Code ───
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

  // ─── Supabase: Join Trip as Traveller ───
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

  // ─── Build Trip Summary ───
  const buildTripSummary = (trip) => {
    const parts = [];
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

  // ─── Create Trip ───
  // Accepts wizardState: { wizTrip, wizTravellers, wizStays, wizPrefs, editingTripId }
  const createTrip = async (wizardState) => {
    const { wizTrip, wizTravellers, wizStays, wizPrefs, editingTripId } = wizardState;
    if (wizTrip.name.trim().length < 2) {
      alert("Please enter a trip name (at least 2 characters)");
      return;
    }
    setSaving(true);
    const name = wizTrip.name.trim();
    const formatDate = (d) => { if (!d) return ""; const dt = new Date(d + "T12:00:00"); return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
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
      setCreatedTrips(prev => prev.map(t => {
        if (t.id !== editingTripId) return t;
        const updated = { ...t, ...tripData };
        if (t.status === "live") updated.timeline = generateMultiDayTimeline(updated);
        return updated;
      }));
      const updatedTrip = { ...createdTrips.find(t => t.id === editingTripId), ...tripData };
      setSelectedCreatedTrip(updatedTrip);
      setSaving(false);
      navigate("createdTrip");
    } else {
      const newTrip = { id: Date.now(), ...tripData, status: "new", timeline: [], polls: [], activity: [], shareCode: Math.random().toString(36).substring(2, 8).toUpperCase() };
      setCreatedTrips(prev => [newTrip, ...prev]);
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
      setSaving(false);
      showToast("Trip created!");
      setSelectedCreatedTrip(newTrip);
      navigate("createdTrip");
    }
  };

  // ─── Smart Time Slot Finder ───
  const findSmartSlot = useCallback((tripId, day, itemType) => {
    const trip = createdTrips.find(t => t.id === tripId);
    const dayItems = (trip?.timeline || {})[day] || [];
    const existingTimes = dayItems.map(item => {
      const m = item.time?.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!m) return null;
      let h = parseInt(m[1]); const min = parseInt(m[2]); const ampm = m[3].toUpperCase();
      if (ampm === "PM" && h !== 12) h += 12; if (ampm === "AM" && h === 12) h = 0;
      return h * 60 + min;
    }).filter(Boolean);

    const isRestaurant = /restaurant|food|eat|cafe|dinner|lunch|breakfast|brunch/i.test(itemType);
    if (isRestaurant) {
      const slots = [
        { time: "12:30 PM", mins: 750, label: "Lunch" },
        { time: "7:00 PM", mins: 1140, label: "Dinner" },
        { time: "8:30 AM", mins: 510, label: "Breakfast" },
        { time: "1:00 PM", mins: 780, label: "Lunch" },
        { time: "6:30 PM", mins: 1110, label: "Dinner" },
      ];
      for (const slot of slots) {
        if (!existingTimes.some(t => Math.abs(t - slot.mins) < 60)) return slot;
      }
      return { time: "12:30 PM", mins: 750, label: "Meal" };
    }
    const actSlots = [
      { time: "10:00 AM", mins: 600, label: "Morning" },
      { time: "2:30 PM", mins: 870, label: "Afternoon" },
      { time: "4:00 PM", mins: 960, label: "Afternoon" },
      { time: "11:00 AM", mins: 660, label: "Morning" },
    ];
    for (const slot of actSlots) {
      if (!existingTimes.some(t => Math.abs(t - slot.mins) < 45)) return slot;
    }
    return { time: "2:00 PM", mins: 840, label: "Activity" };
  }, [createdTrips]);

  // ─── WhatsApp Share Helper ───
  const shareToWhatsApp = (tripName, message, tripId) => {
    const link = `${window.location.origin}/join/${tripId}`;
    const text = `${message}\n\n${tripName} on TripWithMe\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  // ─── Delete Trip ───
  const deleteCreatedTrip = async (id) => {
    const trip = createdTrips.find(t => t.id === id);
    if (!window.confirm("Remove '" + (trip?.name || "this trip") + "'? This cannot be undone.")) return;
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

  // ─── Generate Single-Day Timeline ───
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

    const wantsDogFriendly = /dog|pet/.test(ctxLower);
    const wantsAccessible = /accessible|wheelchair|mobility|pushchair|buggy|pram/.test(ctxLower);
    const wantsLateStart = /late start|sleep in|no rush|relaxed morning/.test(ctxLower);
    const wantsShortBlocks = /short.*block|short.*activit|restless|young child|toddler/.test(ctxLower);
    const wantsAvoidSteep = /avoid.*steep|no.*steep|gentle|easy.*walk|flat/.test(ctxLower);
    const wantsPubs = /pub|pubs|tavern|inn/.test(ctxLower);

    const arriveTime = wantsLateStart ? "11:00 AM" : "9:00 AM";
    const morningTime = wantsLateStart ? "12:00 PM" : "10:30 AM";
    const lunchTime = wantsLateStart ? "1:30 PM" : "12:30 PM";
    const afternoonTime = wantsLateStart ? "3:00 PM" : "2:30 PM";
    const returnTime = "5:00 PM";
    const dinnerTime = "7:00 PM";

    const tags = (base) => {
      const t = [base];
      if (wantsDogFriendly) t.push("🐕 Dog-friendly");
      if (wantsAccessible) t.push("♿ Accessible");
      return t.join(" · ");
    };

    const arriveDesc = trip.startLocation ? `${travelMode} from ${trip.startLocation} · Check in at ${stayName}` : `${travelMode} · Check in at ${stayName}`;
    items.push({ time: arriveTime, title: `Arrive ${loc}`, desc: arriveDesc, group: "Everyone", color: T.a });

    let morningAct = adultActs[0] || "Explore the area";
    if (wantsAvoidSteep && /hik|trail|climb|trek/.test(morningAct.toLowerCase())) morningAct = "Gentle walking tour";
    const morningDesc = tags(`${loc} · ${budgetTier.label}`);
    if (hasKids && kidActs.length > 0) {
      items.push({ time: morningTime, title: morningAct, desc: morningDesc, group: "Adults", color: T.blue });
      items.push({ time: morningTime, title: kidActs[0], desc: tags(`${loc} · Family-friendly`), group: "Kids", color: T.pink });
    } else {
      items.push({ time: morningTime, title: morningAct, desc: morningDesc, group: "Everyone", color: T.blue });
    }

    if (wantsShortBlocks && hasKids) {
      const youngest = allKids.map(k => `${k.name || "child"}`).join(" & ");
      items.push({ time: wantsLateStart ? "1:00 PM" : "11:45 AM", title: `Rest break`, desc: `Snack stop for ${youngest} · Keep energy up`, group: "Kids", color: T.amber });
    }

    const lunchDesc = wantsPubs ? `${budgetTier.label} pub · ${budgetTier.price}` : `${budgetTier.label} restaurant · ${budgetTier.price}`;
    const dietaryTags = [];
    if (food.some(f => /vegetarian|vegan/i.test(f))) dietaryTags.push("🥬 Veggie options");
    if (food.some(f => /halal/i.test(f))) dietaryTags.push("Halal");
    if (food.some(f => /gluten/i.test(f))) dietaryTags.push("GF options");
    if (hasKids && food.some(f => /kid/i.test(f))) dietaryTags.push("Kids menu");
    const lunchExtra = dietaryTags.length > 0 ? ` · ${dietaryTags.join(", ")}` : "";
    items.push({ time: lunchTime, title: `Lunch — ${foodLabel}`, desc: `${lunchDesc}${lunchExtra}${wantsDogFriendly ? " · 🐕 Dog-friendly" : ""}`, group: "Everyone", color: T.coral });

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

    items.push({ time: returnTime, title: `Return to ${stayName}`, desc: "Relax & freshen up", group: "Everyone", color: T.t3 });
    const dinnerDesc = wantsPubs ? `${foodLabel} · ${budgetTier.label} pub · ${budgetTier.price}` : `${foodLabel} · ${budgetTier.label} · ${budgetTier.price}`;
    items.push({ time: dinnerTime, title: wantsPubs ? "Dinner at local pub" : "Dinner", desc: `${dinnerDesc}${wantsDogFriendly ? " · 🐕 Dog-friendly" : ""}${lunchExtra}`, group: "Everyone", color: T.coral });

    return items;
  };

  // ─── Generate Multi-Day Timeline ───
  // Returns { 1: [...], 2: [...], ... }
  const generateMultiDayTimeline = (trip) => {
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
    const sortedStays = [...(trip.stays || [])].filter(s => s.checkIn && s.location).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    const tripStartDate = trip.rawStart ? new Date(trip.rawStart + "T12:00:00") : new Date();
    const places = trip.places || [];

    const uniqueStayLocations = [...new Set(sortedStays.map(s => s.location.toLowerCase().trim()))];
    const isBaseCamp = sortedStays.length >= 1 && uniqueStayLocations.length === 1 && places.length > 1;

    const dayMap = {};
    if (isBaseCamp) {
      // ─── BASE CAMP PATTERN ───
      const baseStay = sortedStays[0];
      const baseLoc = baseStay.location;
      const baseStayName = baseStay.name;
      const dayTripPlaces = places.filter(p => p.toLowerCase().trim() !== baseLoc.toLowerCase().trim());

      for (let d = 1; d <= numDays; d++) {
        const isFirst = d === 1;
        const isLast = d === numDays;
        let dayPlace, isDayTrip = false;

        if (isFirst) {
          dayPlace = baseLoc;
        } else if (isLast) {
          dayPlace = baseLoc;
        } else {
          const dtIdx = (d - 2) % Math.max(1, dayTripPlaces.length);
          if (dayTripPlaces.length > 0) {
            dayPlace = dayTripPlaces[dtIdx];
            isDayTrip = true;
          } else {
            dayPlace = baseLoc;
          }
        }

        const prevDay = dayMap[d - 1];
        dayMap[d] = {
          place: dayPlace,
          stayName: baseStayName,
          prevPlace: prevDay ? prevDay.place : null,
          isTransit: false,
          isBaseCamp: true,
          isDayTrip,
          baseLoc,
          baseStayName,
        };
      }
    } else if (sortedStays.length > 1) {
      // ─── ROAD TRIP PATTERN ───
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

  // ─── Generate and Set Timeline (with EV enrichment) ───
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

  // ─── Smart Route Ordering ───
  const getSmartRouteOrder = (trip) => {
    const places = trip?.places || [];
    const stays = trip?.stays || [];
    if (places.length <= 1 || stays.length === 0) return places;
    const placeCheckIn = {};
    stays.forEach(s => {
      if (s.location && s.checkIn) {
        const loc = s.location.toLowerCase();
        const existing = placeCheckIn[loc];
        if (!existing || s.checkIn < existing) placeCheckIn[loc] = s.checkIn;
      }
    });
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

  // ─── Full Route from Stays ───
  const getFullRouteFromStays = (trip) => {
    const stays = trip?.stays || [];
    if (stays.length === 0) return trip?.places || [];
    const sorted = [...stays].filter(s => s.checkIn && s.location).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    if (sorted.length === 0) return trip?.places || [];
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
    (trip?.places || []).forEach(p => {
      if (!seen.has(p.toLowerCase())) {
        seen.add(p.toLowerCase());
        route.push(p);
      }
    });
    return route;
  };

  // ─── Make Trip Live (opens activation modal) ───
  const makeTripLive = (id) => {
    const trip = createdTrips.find(t => t.id === id);
    const isEV = trip?.travel?.some(m => /ev\s*vehicle/i.test(m));
    const isDriving = isEV || trip?.travel?.some(m => /non-ev\s*vehicle/i.test(m));
    const places = getSmartRouteOrder(trip);
    const startLoc = trip?.startLocation || "";
    const autoStops = [];
    if (isDriving && places.length > 0 && startLoc) {
      if (isEV) {
        autoStops.push({ type: "ev_charge", label: `EV charge & refreshments`, desc: `Service station between ${startLoc} and ${places[0]}`, time: "~1.5 hrs into journey", enabled: true, combineMeal: true });
      } else {
        autoStops.push({ type: "rest", label: "Rest & coffee stop", desc: `Between ${startLoc} and ${places[0]}`, time: "~1.5 hrs into journey", enabled: true, combineMeal: false });
      }
    }
    if (isDriving) {
      for (let i = 0; i < places.length - 1; i++) {
        if (isEV) {
          autoStops.push({ type: "ev_charge", label: `EV charge & refreshments`, desc: `Service station between ${places[i]} and ${places[i + 1]}`, time: "En route", enabled: true, combineMeal: true });
        }
      }
    }
    setPendingActivationTripId(id);
    setActivationPrefs({ startTime: "08:00", dayOnePace: "balanced", notes: "", stopovers: autoStops });
    setShowActivationModal(true);
  };

  // ─── Confirm Activation ───
  // Note: loadTripMessages, loadExpenses, loadTripPhotos are NOT called here.
  // Screen components handle loading those when they mount.
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
    logActivity(id, "🚀", "Trip activated — itinerary generated!", "milestone");
    setShowActivationModal(false);
    setPendingActivationTripId(null);
    setSelectedDay(1);
    setTripDetailTab("itinerary");
    setSelectedCreatedTrip(updated);
    setEditingTimelineIdx(null);
    navigate("createdTrip");
    setTimeout(() => {
      showToast("Want to refine this itinerary? Switch to the Chat tab and tell me what to change!");
    }, 1500);
  };

  // ─── View Created Trip ───
  // Note: loadTripMessages, loadExpenses, loadTripPhotos are NOT called here.
  // Screen components handle loading those when they mount.
  const viewCreatedTrip = (trip) => {
    setSelectedCreatedTrip(trip);
    setEditingTimelineIdx(null);
    setTripDetailTab("itinerary");
    setSelectedDay(1);
    setShowNotifications(false);
    navigate("createdTrip");
  };

  // ─── Timeline Editing Functions ───
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
    setEditingTimelineIdx(newIdx);
    setTimeout(() => {
      const el = document.querySelector(`[data-timeline-idx="${newIdx}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // ─── Timeline Helpers ───
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

  // ─── Create New Poll ───
  const createNewPoll = (tripId) => {
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
    if (tripId) {
      setCreatedTrips(prev => prev.map(t => t.id === tripId ? { ...t, polls: [newPoll, ...(t.polls || [])] } : t));
      logActivity(tripId, "🗳️", `Created poll: "${newPollQuestion.trim()}"`, "poll");
    } else {
      setPollData(prev => [newPoll, ...prev]);
    }
    setNewPollQuestion("");
    setNewPollOptions(["", ""]);
    setShowPollCreator(false);
    showToast("Poll created!");
  };

  // ─── Effects ───

  // Check for share code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setJoinShareCode(joinCode);
      lookupTripByShareCode(joinCode).then(data => {
        if (data) {
          const mapped = mapTripFromDB(data);
          setSelectedCreatedTrip(mapped);
          navigate('joinPreview');
        } else {
          navigate('joinPreview');
        }
      });
    }
  }, []);

  // Real-time Supabase subscriptions
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
          showToast(`${payload.new.name || "Someone"} joined the trip!`);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Load trips when user logs in
  useEffect(() => {
    if (user && user.id !== 'demo') {
      loadTripsFromDB();
    }
  }, [user, loadTripsFromDB]);

  // ─── Context Value ───
  const value = {
    // State
    createdTrips, setCreatedTrips,
    selectedCreatedTrip, setSelectedCreatedTrip,
    selectedDay, setSelectedDay,
    tripDetailTab, setTripDetailTab,
    expandedItem, setExpandedItem,
    editingTimelineIdx, setEditingTimelineIdx,
    expandedSections, setExpandedSections,
    bookingStates, setBookingStates,
    joinShareCode, setJoinShareCode,
    joinedSlot, setJoinedSlot,
    showNotifications, setShowNotifications,
    lastSeenActivity, setLastSeenActivity,
    showActivationModal, setShowActivationModal,
    activationPrefs, setActivationPrefs,
    pendingActivationTripId, setPendingActivationTripId,
    saving, setSaving,
    syncing, setSyncing,
    showMap, setShowMap,
    tripDirections, setTripDirections,
    pollData, setPollData,
    showPollCreator, setShowPollCreator,
    newPollQuestion, setNewPollQuestion,
    newPollOptions, setNewPollOptions,

    // Computed
    totalUnread,
    allRecentActivity,

    // Functions
    loadTripsFromDB,
    saveTripToDB,
    updateTripStatusInDB,
    lookupTripByShareCode,
    joinTripAsTraveller,
    buildTripSummary,
    createTrip,
    logActivity,
    getUnreadCount,
    markTripSeen,
    findSmartSlot,
    shareToWhatsApp,
    deleteCreatedTrip,
    generateTimeline,
    generateMultiDayTimeline,
    generateAndSetTimeline,
    getSmartRouteOrder,
    getFullRouteFromStays,
    makeTripLive,
    confirmActivation,
    viewCreatedTrip,
    updateTimelineItem,
    deleteTimelineItem,
    moveTimelineItem,
    addTimelineItem,
    getDayItems,
    getNumDays,
    hasTimeline,
    createNewPoll,
  };

  return (
    <TripContext.Provider value={value}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error("useTrip must be used within a TripProvider");
  }
  return context;
}
