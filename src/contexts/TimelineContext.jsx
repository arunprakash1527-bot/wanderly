import React, { createContext, useContext, useCallback } from "react";
import { T } from "../styles/tokens";
import { API } from "../constants/api";
import { generateMultiDayTimeline } from "../utils/timelineGenerator";
import { estimateTravelHours, estimateDistanceMiles } from "../utils/locationHelpers";
import { useTripData } from "./TripDataContext";
import { useTripUI } from "./TripUIContext";
import { useAuth } from "./AuthContext";
import { useNavigation } from "./NavigationContext";

const TimelineContext = createContext(null);

export function TimelineProvider({ children }) {
  const { user } = useAuth();
  const { showToast, navigate } = useNavigation();
  const {
    createdTrips, setCreatedTrips, selectedCreatedTrip, setSelectedCreatedTrip,
    logActivity, updateTripStatusInDB, setShowNotifications,
  } = useTripData();
  const {
    selectedDay, setSelectedDay, setTripDetailTab,
    editingTimelineIdx, setEditingTimelineIdx,
    activationPrefs, setActivationPrefs, setShowActivationModal, setPendingActivationTripId,
    pendingActivationTripId,
  } = useTripUI();

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
          const res = await fetch(API.PLACES, {
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
    const EV_CHARGE_THRESHOLD_MILES = 50; // Only suggest charging for legs > 50 miles
    const REST_THRESHOLD_MILES = 60;      // Only suggest rest stops for legs > 60 miles

    if (isDriving && places.length > 0 && startLoc) {
      const firstLegMiles = estimateDistanceMiles(startLoc, places[0]) || 100;
      const firstLegHrs = estimateTravelHours(startLoc, places[0]);
      const timeLabel = firstLegHrs >= 1.5 ? `~${Math.round(firstLegHrs * 10) / 10} hrs into journey` : `~${Math.round(firstLegHrs * 60)} min drive`;

      if (isEV && firstLegMiles >= EV_CHARGE_THRESHOLD_MILES) {
        autoStops.push({ type: "ev_charge", label: `EV charge & refreshments`, desc: `Service station between ${startLoc} and ${places[0]} (~${firstLegMiles} mi)`, time: timeLabel, enabled: true, combineMeal: true });
      } else if (!isEV && firstLegMiles >= REST_THRESHOLD_MILES) {
        autoStops.push({ type: "rest", label: "Rest & coffee stop", desc: `Between ${startLoc} and ${places[0]} (~${firstLegMiles} mi)`, time: timeLabel, enabled: true, combineMeal: false });
      }
    }
    if (isDriving) {
      for (let i = 0; i < places.length - 1; i++) {
        const legMiles = estimateDistanceMiles(places[i], places[i + 1]) || 100;
        const legHrs = estimateTravelHours(places[i], places[i + 1]);
        if (isEV && legMiles >= EV_CHARGE_THRESHOLD_MILES) {
          const legLabel = legHrs >= 1 ? `~${Math.round(legHrs * 10) / 10} hrs` : `~${Math.round(legHrs * 60)} min`;
          autoStops.push({ type: "ev_charge", label: `EV charge & refreshments`, desc: `Service station between ${places[i]} and ${places[i + 1]} (~${legMiles} mi)`, time: legLabel, enabled: true, combineMeal: true });
        }
      }
    }
    setPendingActivationTripId(id);
    setActivationPrefs({ startTime: "08:00", dayOnePace: "balanced", notes: "", stopovers: autoStops });
    setShowActivationModal(true);
  };

  // ─── Confirm Activation ───
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
          const res = await fetch(API.PLACES, {
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

  // ─── View Created Trip (needs both TripData + TripUI state) ───
  const viewCreatedTrip = (trip) => {
    setSelectedCreatedTrip(trip);
    setEditingTimelineIdx(null);
    setTripDetailTab("itinerary");
    setSelectedDay(1);
    setShowNotifications(false);
    navigate("createdTrip");
  };

  const value = {
    generateMultiDayTimeline,
    generateAndSetTimeline,
    getSmartRouteOrder,
    getFullRouteFromStays,
    makeTripLive,
    confirmActivation,
    updateTimelineItem,
    deleteTimelineItem,
    moveTimelineItem,
    addTimelineItem,
    findSmartSlot,
    getDayItems,
    getNumDays,
    hasTimeline,
    viewCreatedTrip,
  };

  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
}

export function useTimeline() {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error("useTimeline must be used within a TimelineProvider");
  }
  return context;
}
