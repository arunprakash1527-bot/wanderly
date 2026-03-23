import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { mapTripFromDB, mapTripForInsert, mapTravellersForInsert, mapStaysForInsert, mapPrefsForInsert } from "../utils/tripMappers";
import { generateMultiDayTimeline } from "../utils/timelineGenerator";
import { useAuth } from "./AuthContext";
import { useNavigation } from "./NavigationContext";

const TripDataContext = createContext(null);

export function TripDataProvider({ children }) {
  const { user } = useAuth();
  const { showToast, navigate } = useNavigation();

  // ─── Trip State ───
  const [createdTrips, setCreatedTrips] = useState([]);
  const [selectedCreatedTrip, setSelectedCreatedTrip] = useState(null);
  const [joinShareCode, setJoinShareCode] = useState("");
  const [joinedSlot, setJoinedSlot] = useState(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastSeenActivity, setLastSeenActivity] = useState(() => {
    try { return JSON.parse(localStorage.getItem("twm_lastSeen") || "{}"); } catch { return {}; }
  });

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
      showToast("Failed to load trips — check connection", "error");
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

  const value = {
    createdTrips, setCreatedTrips,
    selectedCreatedTrip, setSelectedCreatedTrip,
    joinShareCode, setJoinShareCode,
    joinedSlot, setJoinedSlot,
    saving, setSaving,
    syncing, setSyncing,
    showNotifications, setShowNotifications,
    lastSeenActivity, setLastSeenActivity,
    totalUnread,
    allRecentActivity,
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
    shareToWhatsApp,
    deleteCreatedTrip,
  };

  return (
    <TripDataContext.Provider value={value}>
      {children}
    </TripDataContext.Provider>
  );
}

export function useTripData() {
  const context = useContext(TripDataContext);
  if (!context) {
    throw new Error("useTripData must be used within a TripDataProvider");
  }
  return context;
}
