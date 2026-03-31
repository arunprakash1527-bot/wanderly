import React, { createContext, useContext, useCallback } from "react";
import { T } from "../styles/tokens";
import { API } from "../constants/api";
import { authFetch } from "../utils/authFetch";
import { generateMultiDayTimeline } from "../utils/timelineGenerator";
import { estimateTravelHours, estimateDistanceMiles, findCoords } from "../utils/locationHelpers";
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
    logActivity, updateTripStatusInDB, setShowNotifications, saveTimelineToDB,
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

    // Enrich EV charging stops with route-scored charger data
    let evProfile = null;
    try { evProfile = JSON.parse(localStorage.getItem("twm_ev_profile")); } catch {}
    const evConnector = evProfile?.connectors?.[0] || null;
    const evRange = evProfile?.rangeMiles || 250;

    const evItems = [];
    const legMap = {};
    Object.entries(timeline).forEach(([day, items]) => {
      items.forEach((item, idx) => {
        if (item.evSearch) {
          const key = `${item.evSearch.from}|${item.evSearch.to}`;
          if (!legMap[key]) legMap[key] = [];
          legMap[key].push({ day: parseInt(day), idx });
          evItems.push({ day: parseInt(day), idx, from: item.evSearch.from, to: item.evSearch.to });
        }
      });
    });

    if (evItems.length > 0) {
      try {
        const legKeys = Object.keys(legMap);
        const legResults = await Promise.all(legKeys.map(async (key) => {
          const [from, to] = key.split("|");
          const fromCoords = findCoords(from);
          const toCoords = findCoords(to);
          if (!fromCoords || !toCoords) {
            const body = { query: `EV charging station services between ${from} and ${to}`, type: "electric_vehicle_charging_station" };
            const res = await authFetch(API.PLACES, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            const data = await res.json();
            return { key, stopPoints: null, places: res.ok ? (data.places || []) : [] };
          }
          const res = await authFetch(API.EV_CHARGERS, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "route", fromLat: fromCoords[0], fromLng: fromCoords[1], toLat: toCoords[0], toLng: toCoords[1], rangeMiles: evRange, connectorType: evConnector }),
          });
          const data = await res.json();
          return { key, stopPoints: data.stopPoints || [], places: null };
        }));

        for (const result of legResults) {
          const items = legMap[result.key];
          if (result.stopPoints) {
            items.forEach((item, stopIdx) => {
              const stopPoint = result.stopPoints[stopIdx] || result.stopPoints[0];
              if (stopPoint?.chargers?.length > 0) {
                const best = stopPoint.chargers[0];
                const speedInfo = best.speedLabel || "";
                const pointsInfo = best.totalPoints >= 4 ? `${best.totalPoints} points · Low queue risk` : `${best.totalPoints || "?"} points`;
                const facilitiesStr = best.facilities?.length > 0 ? best.facilities.slice(0, 3).join(", ") : "";
                const chargeKw = best.maxPowerKW || 50;
                const chargeMin = chargeKw >= 150 ? "~15" : chargeKw >= 50 ? "~25" : "~45";
                timeline[item.day][item.idx].title = `⚡ ${best.name}`;
                timeline[item.day][item.idx].desc = `${best.address} · ${speedInfo} · ${pointsInfo} · ${chargeMin} min charge${facilitiesStr ? ` · ${facilitiesStr}` : ""}`;
              }
            });
          } else if (result.places?.length > 0) {
            const s = result.places[0];
            const rating = s.rating ? ` · ${s.rating}★` : "";
            items.forEach(item => {
              timeline[item.day][item.idx].title = `⚡ ${s.name}`;
              timeline[item.day][item.idx].desc = `${s.address} · Rapid charge ~30 min · Grab food & coffee while charging${rating}`;
            });
          }
        }
      } catch (e) { /* fallback — keep generic descriptions */ }
    }

    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== id) return t;
      return { ...t, timeline };
    }));

    // Persist timeline to Supabase
    const dbId = trip.dbId || trip.id;
    saveTimelineToDB(dbId, timeline);

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
    const isEV = trip?.travel?.some(m => /\bev\b/i.test(m) && !/non[\s-]*ev/i.test(m));
    const isDriving = isEV || trip?.travel?.some(m => /non-ev\s*vehicle/i.test(m));
    const places = getSmartRouteOrder(trip);
    const startLoc = trip?.startLocation || "";
    const autoStops = [];
    const REST_THRESHOLD_MILES = 60;

    // Read EV profile for range-aware stop calculation
    let evProfile = null;
    try { evProfile = JSON.parse(localStorage.getItem("twm_ev_profile")); } catch {}
    const evRange = evProfile?.rangeMiles || 250;
    const safeRange = Math.round(evRange * 0.65); // 65% of rated for real-world + buffer

    if (isDriving && places.length > 0 && startLoc) {
      const firstLegMiles = estimateDistanceMiles(startLoc, places[0]) || 100;
      const firstLegHrs = estimateTravelHours(startLoc, places[0]);
      const timeLabel = firstLegHrs >= 1.5 ? `~${Math.round(firstLegHrs * 10) / 10} hrs into journey` : `~${Math.round(firstLegHrs * 60)} min drive`;

      if (isEV) {
        // Calculate how many EV stops needed for this leg based on actual vehicle range
        const stopsNeeded = Math.max(0, Math.ceil(firstLegMiles / safeRange) - 1);
        for (let s = 0; s < stopsNeeded; s++) {
          const atMiles = Math.round(safeRange * (s + 1));
          autoStops.push({ type: "ev_charge", label: `EV charge & refreshments`, desc: `Service station between ${startLoc} and ${places[0]} (~${atMiles} mi mark)`, time: timeLabel, enabled: true, combineMeal: s === 0, atMiles, legFrom: startLoc, legTo: places[0] });
        }
      } else if (!isEV && firstLegMiles >= REST_THRESHOLD_MILES) {
        autoStops.push({ type: "rest", label: "Rest & coffee stop", desc: `Between ${startLoc} and ${places[0]} (~${firstLegMiles} mi)`, time: timeLabel, enabled: true, combineMeal: false });
      }
    }
    if (isDriving) {
      for (let i = 0; i < places.length - 1; i++) {
        const legMiles = estimateDistanceMiles(places[i], places[i + 1]) || 100;
        const legHrs = estimateTravelHours(places[i], places[i + 1]);
        if (isEV) {
          const stopsNeeded = Math.max(0, Math.ceil(legMiles / safeRange) - 1);
          for (let s = 0; s < stopsNeeded; s++) {
            const atMiles = Math.round(safeRange * (s + 1));
            const legLabel = legHrs >= 1 ? `~${Math.round(legHrs * 10) / 10} hrs` : `~${Math.round(legHrs * 60)} min`;
            autoStops.push({ type: "ev_charge", label: `EV charge & refreshments`, desc: `Service station between ${places[i]} and ${places[i + 1]} (~${atMiles} mi mark)`, time: legLabel, enabled: true, combineMeal: false, atMiles, legFrom: places[i], legTo: places[i + 1] });
          }
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

    // Enrich EV charging stops with real charger data (route-aware scoring)
    let evProfile = null;
    try { evProfile = JSON.parse(localStorage.getItem("twm_ev_profile")); } catch {}
    const evConnector = evProfile?.connectors?.[0] || null;
    const evRange = evProfile?.rangeMiles || 250;

    // Group evSearch items by leg (from→to) to batch route queries
    const evItems = [];
    const legMap = {}; // "from|to" → [{day, idx}]
    Object.entries(updated.timeline).forEach(([day, items]) => {
      items.forEach((item, idx) => {
        if (item.evSearch) {
          const key = `${item.evSearch.from}|${item.evSearch.to}`;
          if (!legMap[key]) legMap[key] = [];
          legMap[key].push({ day: parseInt(day), idx });
          evItems.push({ day: parseInt(day), idx, from: item.evSearch.from, to: item.evSearch.to });
        }
      });
    });

    if (evItems.length > 0) {
      try {
        // Fetch route chargers per unique leg
        const legKeys = Object.keys(legMap);
        const legResults = await Promise.all(legKeys.map(async (key) => {
          const [from, to] = key.split("|");
          const fromCoords = findCoords(from);
          const toCoords = findCoords(to);
          if (!fromCoords || !toCoords) {
            // Fallback to Places API if coords not found
            const query = `EV charging station with cafe between ${from} and ${to}`;
            const res = await authFetch(API.PLACES, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query, type: "electric_vehicle_charging_station" }),
            });
            const data = await res.json();
            return { key, stopPoints: null, places: res.ok ? (data.places || []) : [] };
          }
          // Use route mode for scored charger results
          const res = await authFetch(API.EV_CHARGERS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode: "route",
              fromLat: fromCoords[0], fromLng: fromCoords[1],
              toLat: toCoords[0], toLng: toCoords[1],
              rangeMiles: evRange,
              connectorType: evConnector,
            }),
          });
          const data = await res.json();
          return { key, stopPoints: data.stopPoints || [], places: null };
        }));

        // Apply results to timeline items
        for (const result of legResults) {
          const items = legMap[result.key];
          if (result.stopPoints) {
            // Route mode — scored chargers per stop point
            items.forEach((item, stopIdx) => {
              const stopPoint = result.stopPoints[stopIdx] || result.stopPoints[0];
              if (stopPoint?.chargers?.length > 0) {
                const best = stopPoint.chargers[0]; // Highest scored
                const speedInfo = best.speedLabel || "";
                const pointsInfo = best.totalPoints >= 4 ? `${best.totalPoints} points · Low queue risk` : `${best.totalPoints || "?"} points`;
                const facilitiesStr = best.facilities?.length > 0 ? best.facilities.slice(0, 3).join(", ") : "";
                const chargeKw = best.maxPowerKW || 50;
                const chargeMin = chargeKw >= 150 ? "~15" : chargeKw >= 50 ? "~25" : "~45";
                updated.timeline[item.day][item.idx].title = `⚡ ${best.name}`;
                updated.timeline[item.day][item.idx].desc = `${best.address} · ${speedInfo} · ${pointsInfo} · ${chargeMin} min charge${facilitiesStr ? ` · ${facilitiesStr}` : ""}`;
                updated.timeline[item.day][item.idx].evCharger = { name: best.name, score: best.score, totalPoints: best.totalPoints, maxPowerKW: chargeKw, speedLabel: speedInfo, lat: best.lat, lng: best.lng, mapsLink: best.mapsLink, zapMapLink: best.zapMapLink };
              }
            });
          } else if (result.places?.length > 0) {
            // Fallback Places API
            const s = result.places[0];
            const rating = s.rating ? ` · ${s.rating}★` : "";
            items.forEach(item => {
              updated.timeline[item.day][item.idx].title = `⚡ ${s.name}`;
              updated.timeline[item.day][item.idx].desc = `${s.address} · Rapid charge ~30 min · Grab food & coffee while charging${rating}`;
            });
          }
        }
      } catch (e) { /* fallback to generic */ }
    }

    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== id) return { ...t, status: t.status === "live" ? "new" : t.status };
      return updated;
    }));

    // Persist timeline to Supabase
    const dbId = trip.dbId || trip.id;
    saveTimelineToDB(dbId, updated.timeline);

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

  // ─── Sort day items by time (chronological order) ───
  const sortByTime = (items) => {
    const parseTime = (t) => {
      const m = t?.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!m) return 9999;
      let h = parseInt(m[1]); const min = parseInt(m[2]); const ampm = m[3].toUpperCase();
      if (ampm === "PM" && h !== 12) h += 12; if (ampm === "AM" && h === 12) h = 0;
      return h * 60 + min;
    };
    return [...items].sort((a, b) => parseTime(a.time) - parseTime(b.time));
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
      // Prioritize slots based on meal context from the query
      const isDinner = /dinner|supper|evening/i.test(itemType);
      const isBreakfast = /breakfast/i.test(itemType);
      const isBrunch = /brunch/i.test(itemType);
      const isLunch = /lunch|midday/i.test(itemType);

      let slots;
      if (isDinner) {
        slots = [
          { time: "7:00 PM", mins: 1140, label: "Dinner" },
          { time: "6:30 PM", mins: 1110, label: "Dinner" },
          { time: "7:30 PM", mins: 1170, label: "Dinner" },
          { time: "8:00 PM", mins: 1200, label: "Dinner" },
        ];
      } else if (isBreakfast) {
        slots = [
          { time: "8:30 AM", mins: 510, label: "Breakfast" },
          { time: "8:00 AM", mins: 480, label: "Breakfast" },
          { time: "9:00 AM", mins: 540, label: "Breakfast" },
        ];
      } else if (isBrunch) {
        slots = [
          { time: "10:30 AM", mins: 630, label: "Brunch" },
          { time: "11:00 AM", mins: 660, label: "Brunch" },
        ];
      } else if (isLunch) {
        slots = [
          { time: "12:30 PM", mins: 750, label: "Lunch" },
          { time: "1:00 PM", mins: 780, label: "Lunch" },
        ];
      } else {
        slots = [
          { time: "12:30 PM", mins: 750, label: "Lunch" },
          { time: "7:00 PM", mins: 1140, label: "Dinner" },
          { time: "8:30 AM", mins: 510, label: "Breakfast" },
          { time: "1:00 PM", mins: 780, label: "Lunch" },
          { time: "6:30 PM", mins: 1110, label: "Dinner" },
        ];
      }
      for (const slot of slots) {
        if (!existingTimes.some(t => Math.abs(t - slot.mins) < 60)) return slot;
      }
      return slots[0] || { time: "12:30 PM", mins: 750, label: "Meal" };
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

  // ─── Helper: persist timeline after local mutation ───
  const persistTimeline = (tripId, newTimeline) => {
    const trip = createdTrips.find(t => t.id === tripId);
    const dbId = trip?.dbId || tripId;
    saveTimelineToDB(dbId, newTimeline);
  };

  // ─── Timeline Editing Functions ───
  const updateTimelineItem = (tripId, idx, field, value) => {
    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const tl = t.timeline || {};
      // When editing, items are in raw (unsorted) order — idx maps directly
      const dayItems = (tl[selectedDay] || []).map((item, i) => i === idx ? { ...item, [field]: value } : item);
      const newTimeline = { ...tl, [selectedDay]: dayItems };
      persistTimeline(tripId, newTimeline);
      return { ...t, timeline: newTimeline };
    }));
  };

  // Sort and persist after editing is complete (called when user clicks Done)
  const finaliseTimelineEdit = (tripId) => {
    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const tl = t.timeline || {};
      const dayItems = tl[selectedDay] || [];
      const sorted = sortByTime(dayItems);
      const newTimeline = { ...tl, [selectedDay]: sorted };
      persistTimeline(tripId, newTimeline);
      return { ...t, timeline: newTimeline };
    }));
  };

  const deleteTimelineItem = (tripId, idx) => {
    const trip = createdTrips.find(t => t.id === tripId);
    if (!trip) return;
    const dayKey = selectedDay;
    const dayItems = trip.timeline?.[dayKey] || [];
    if (idx < 0 || idx >= dayItems.length) return;
    const item = dayItems[idx];
    const title = item?.title || "this item";
    let confirmed = true;
    try { confirmed = window.confirm(`Remove "${title}" from Day ${dayKey}?`); } catch { confirmed = true; }
    if (!confirmed) return;
    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const tl = { ...(t.timeline || {}) };
      tl[dayKey] = [...(tl[dayKey] || [])].filter((_, i) => i !== idx);
      persistTimeline(tripId, tl);
      return { ...t, timeline: tl };
    }));
    setEditingTimelineIdx(null);
    showToast(`"${title}" removed from Day ${dayKey}`);
  };

  const moveTimelineItem = (tripId, idx, direction) => {
    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const tl = t.timeline || {};
      const items = [...(tl[selectedDay] || [])];
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= items.length) return t;
      [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
      const newTimeline = { ...tl, [selectedDay]: items };
      persistTimeline(tripId, newTimeline);
      return { ...t, timeline: newTimeline };
    }));
    // Keep editor open at the new position so user can continue moving
    setEditingTimelineIdx(idx + direction);
  };

  const addTimelineItem = (tripId) => {
    let newIdx = 0;
    const newItem = { time: "12:00 PM", title: "New activity", desc: "Tap to edit details", group: "Everyone", color: T.blue, _isNew: true };
    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const tl = t.timeline || {};
      const existing = tl[selectedDay] || [];
      const sorted = sortByTime([...existing, newItem]);
      newIdx = sorted.findIndex(item => item._isNew);
      sorted[newIdx] = { ...sorted[newIdx] }; delete sorted[newIdx]._isNew;
      const newTimeline = { ...tl, [selectedDay]: sorted };
      persistTimeline(tripId, newTimeline);
      return { ...t, timeline: newTimeline };
    }));
    setEditingTimelineIdx(newIdx);
    setTimeout(() => {
      const el = document.querySelector(`[data-timeline-idx="${newIdx}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // ─── Timeline Helpers ───
  const getDayItems = (timeline, day, isEditing) => {
    if (!timeline) return [];
    const items = Array.isArray(timeline) ? (day === 1 ? timeline : []) : (timeline[day] || []);
    // Always sort for display UNLESS actively editing (to prevent index shift)
    return isEditing ? items : sortByTime(items);
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
  const viewCreatedTrip = (trip, initialTab = "itinerary") => {
    setSelectedCreatedTrip(trip);
    setEditingTimelineIdx(null);
    setTripDetailTab(initialTab);
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
    finaliseTimelineEdit,
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
