import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { mapTripFromDB, mapTripForInsert, mapTripForInsertMinimal, mapTravellersForInsert, mapStaysForInsert, mapPrefsForInsert } from "../utils/tripMappers";
import { generateMultiDayTimeline } from "../utils/timelineGenerator";
import { useAuth } from "./AuthContext";
import { useNavigation } from "./NavigationContext";
import { cacheTripsOffline, getOfflineTrips, getOfflineCacheAge, cacheUserOffline } from "../utils/offlineCache";
import { subscribeToTripUpdates } from "../utils/liveTrip";

const TripDataContext = createContext(null);

export function TripDataProvider({ children }) {
  const { user } = useAuth();
  const { showToast, navigate, showCelebration } = useNavigation();

  // ─── Trip State ───
  const [createdTrips, setCreatedTrips] = useState([]);
  const [selectedCreatedTrip, setSelectedCreatedTrip] = useState(null);
  const [joinShareCode, setJoinShareCode] = useState("");
  const [joinTab, setJoinTab] = useState(null);
  const [joinedSlot, setJoinedSlot] = useState(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const dbWriteLockRef = React.useRef(false); // Prevents loadTripsFromDB during updateTripInDB
  const [showNotifications, setShowNotifications] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
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
    // Skip if a DB write is in progress (prevents race with delete+reinsert)
    if (dbWriteLockRef.current) return;
    setSyncing(true);
    try {
      // Fetch trips where user is the lead OR is listed as a traveller
      const [ownRes, memberRes] = await Promise.all([
        supabase
          .from('trips')
          .select('*, trip_travellers(*), trip_stays(*), trip_preferences(*)')
          .eq('lead_user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('trip_travellers')
          .select('trip_id')
          .eq('user_id', user.id),
      ]);
      if (ownRes.error) throw ownRes.error;
      const memberTripIds = (memberRes.data || []).map(r => r.trip_id).filter(Boolean);
      // Fetch any trips user is a traveller on but didn't create
      const ownIds = new Set((ownRes.data || []).map(t => t.id));
      const extraIds = memberTripIds.filter(id => !ownIds.has(id));
      let extraTrips = [];
      if (extraIds.length > 0) {
        const { data } = await supabase
          .from('trips')
          .select('*, trip_travellers(*), trip_stays(*), trip_preferences(*)')
          .in('id', extraIds);
        extraTrips = data || [];
      }
      const trips = [...(ownRes.data || []), ...extraTrips];
      const error = null;

      if (error) throw error;

      if (trips && trips.length > 0) {
        const mapped = trips.map(t => mapTripFromDB(t));
        // Smart merge: preserve local stays/travellers/prefs if DB returns empty
        // (protects against race condition during delete+reinsert in updateTripInDB)
        setCreatedTrips(prev => {
          return mapped.map(dbTrip => {
            const localTrip = prev.find(lt => lt.dbId === dbTrip.dbId || lt.id === dbTrip.id);
            if (!localTrip) return dbTrip;
            return {
              ...dbTrip,
              // Preserve local stays if DB returned empty but local has data
              stays: (dbTrip.stays?.length > 0) ? dbTrip.stays : (localTrip.stays || []),
              stayNames: (dbTrip.stayNames?.length > 0) ? dbTrip.stayNames : (localTrip.stayNames || []),
              // Preserve local timeline if DB has none but local does
              timeline: dbTrip.timeline || localTrip.timeline,
              // Preserve activation prefs (not stored in DB)
              activationPrefs: localTrip.activationPrefs,
              // Preserve activity log (not always in DB)
              activity: dbTrip.activity?.length > 0 ? dbTrip.activity : (localTrip.activity || []),
              // Preserve startLocation/budget if DB has none but local does
              startLocation: dbTrip.startLocation || localTrip.startLocation || "",
              budget: dbTrip.budget || localTrip.budget || "",
              brief: dbTrip.brief || localTrip.brief || "",
            };
          });
        });

        // Backfill: push local data to DB for fields that weren't persisted on creation
        for (const dbTrip of mapped) {
          const localTrip = createdTrips.find(lt => lt.dbId === dbTrip.dbId || lt.id === dbTrip.id);
          if (!localTrip || !dbTrip.dbId) continue;
          const patch = {};
          if (!dbTrip.startLocation && localTrip.startLocation) patch.start_location = localTrip.startLocation;
          if (!dbTrip.budget && localTrip.budget) patch.budget = localTrip.budget;
          if (!dbTrip.brief && localTrip.brief) patch.brief = localTrip.brief;
          if (Object.keys(patch).length > 0) {
            patch.updated_at = new Date().toISOString();
            supabase.from('trips').update(patch).eq('id', dbTrip.dbId).then(() => {});
          }
        }
      }
    } catch (err) {
      console.error('Error loading trips:', err);
      // ─── Offline Fallback ───
      const cached = getOfflineTrips();
      if (cached && cached.length > 0) {
        setCreatedTrips(cached);
        const ageMs = getOfflineCacheAge();
        const ageMin = ageMs ? Math.round(ageMs / 60000) : null;
        const ageLabel = ageMin != null ? (ageMin < 60 ? `${ageMin}m ago` : `${Math.round(ageMin / 60)}h ago`) : '';
        showToast(`Offline — showing cached data${ageLabel ? ` (${ageLabel})` : ''}`, "error");
      } else {
        showToast("Failed to load trips — check connection", "error");
      }
    }
    setSyncing(false);
  }, [user, showToast]);

  // ─── Supabase: Save Trip ───
  const saveTripToDB = async (tripData) => {
    if (!user || user.id === 'demo') return tripData;

    try {
      let trip, tripError;
      // Try full insert first, fall back to minimal if columns don't exist
      ({ data: trip, error: tripError } = await supabase
        .from('trips')
        .insert(mapTripForInsert(tripData, user.id))
        .select()
        .single());

      if (tripError) {
        // Retry with minimal columns (without start_location, budget, summary)
        console.warn('Full insert failed, retrying with minimal columns:', tripError.message);
        ({ data: trip, error: tripError } = await supabase
          .from('trips')
          .insert(mapTripForInsertMinimal(tripData, user.id))
          .select()
          .single());
        if (tripError) throw tripError;
      }

      const travellerRows = mapTravellersForInsert(tripData, trip.id, user.id);
      if (travellerRows.length > 0) {
        const { error: tErr } = await supabase.from('trip_travellers').insert(travellerRows);
        if (tErr) console.error('Error saving travellers:', tErr);
      }

      const stayRows = mapStaysForInsert(tripData.stays, trip.id);
      if (stayRows.length > 0) {
        let { error: sErr } = await supabase.from('trip_stays').insert(stayRows);
        if (sErr) {
          console.warn('Full stays insert failed, retrying without extended columns:', sErr.message);
          const minimalRows = stayRows.map(({ check_in, check_out, cost, booking_ref, address, ...rest }) => rest);
          const { error: retryErr } = await supabase.from('trip_stays').insert(minimalRows);
          if (retryErr) console.error('Error saving stays (both attempts failed):', retryErr);
        }
      }

      const prefsRow = mapPrefsForInsert(tripData.prefs, trip.id);
      if (prefsRow) {
        const { error: pErr } = await supabase.from('trip_preferences').insert(prefsRow);
        if (pErr) console.error('Error saving preferences:', pErr);
      }

      return { ...tripData, id: trip.id, shareCode: trip.share_code, dbId: trip.id };
    } catch (err) {
      console.error('Error saving trip:', err);
      showToast("Failed to save — check connection", "error");
      return tripData;
    }
  };

  // ─── Supabase: Save Timeline ───
  const saveTimelineToDB = async (tripId, timeline) => {
    if (!user || user.id === 'demo' || !tripId) return;
    try {
      await supabase.from('trips').update({ timeline, updated_at: new Date().toISOString() }).eq('id', tripId);
    } catch (err) {
      console.error('Error saving timeline:', err);
    }
  };

  // ─── Supabase: Update Edited Trip ───
  const updateTripInDB = async (tripData, tripId) => {
    if (!user || user.id === 'demo' || !tripId) return;
    // Lock to prevent loadTripsFromDB from running during delete+reinsert
    dbWriteLockRef.current = true;
    try {
      // Update the main trip row
      const { error: tripError } = await supabase.from('trips').update({
        name: tripData.name,
        brief: tripData.brief || null,
        start_date: tripData.rawStart || null,
        end_date: tripData.rawEnd || null,
        places: tripData.places || [],
        travel_modes: Array.from(tripData.travel || []),
        budget: tripData.budget || null,
        start_location: tripData.startLocation || null,
        summary: tripData.summary || null,
        timeline: tripData.timeline || null,
        updated_at: new Date().toISOString(),
      }).eq('id', tripId);
      if (tripError) throw tripError;

      // Upsert stays: update existing, insert new, delete removed (same pattern as travellers)
      const stayRows = mapStaysForInsert(tripData.stays, tripId);
      const staysWithId = stayRows.filter(r => r.id);
      const staysWithoutId = stayRows.filter(r => !r.id);
      if (staysWithId.length > 0) {
        const { error: uErr } = await supabase.from('trip_stays').upsert(staysWithId, { onConflict: 'id' });
        if (uErr) console.error('Error upserting stays:', uErr);
      }
      if (staysWithoutId.length > 0) {
        const { error: iErr } = await supabase.from('trip_stays').insert(staysWithoutId);
        if (iErr) console.error('Error inserting new stays:', iErr);
      }
      // Delete stays that were removed locally
      const keepStayIds = staysWithId.map(r => r.id);
      if (stayRows.length > 0) {
        const { data: existingStays } = await supabase.from('trip_stays').select('id').eq('trip_id', tripId);
        const allNewIds = [...keepStayIds];
        if (staysWithoutId.length > 0) {
          const { data: justInserted } = await supabase.from('trip_stays').select('id').eq('trip_id', tripId);
          justInserted?.forEach(s => { if (!allNewIds.includes(s.id)) allNewIds.push(s.id); });
        }
        const toDeleteStays = (existingStays || []).filter(r => !allNewIds.includes(r.id)).map(r => r.id);
        if (toDeleteStays.length > 0) {
          await supabase.from('trip_stays').delete().in('id', toDeleteStays);
        }
      } else {
        await supabase.from('trip_stays').delete().eq('trip_id', tripId);
      }

      // Upsert travellers: insert new, update existing, delete removed
      const travellerRows = mapTravellersForInsert(tripData, tripId, user.id);
      const rowsWithId = travellerRows.filter(r => r.id);
      const rowsWithoutId = travellerRows.filter(r => !r.id);
      // Upsert rows that have existing IDs (preserves them, avoids DELETE+INSERT cycle)
      if (rowsWithId.length > 0) {
        const { error: uErr } = await supabase.from('trip_travellers').upsert(rowsWithId, { onConflict: 'id' });
        if (uErr) console.error('Error upserting travellers:', uErr);
      }
      // Insert genuinely new travellers (no dbId yet)
      if (rowsWithoutId.length > 0) {
        const { error: iErr } = await supabase.from('trip_travellers').insert(rowsWithoutId);
        if (iErr) console.error('Error inserting new travellers:', iErr);
      }
      // Delete travellers that were removed locally (exist in DB but not in current data)
      const keepIds = rowsWithId.map(r => r.id);
      if (keepIds.length > 0) {
        const { data: existingRows } = await supabase.from('trip_travellers').select('id').eq('trip_id', tripId);
        const toDelete = (existingRows || []).filter(r => !keepIds.includes(r.id) && !rowsWithoutId.length).map(r => r.id);
        if (toDelete.length > 0) {
          await supabase.from('trip_travellers').delete().in('id', toDelete);
        }
      } else if (travellerRows.length === 0) {
        // No travellers at all — clear the table
        await supabase.from('trip_travellers').delete().eq('trip_id', tripId);
      }

      // Replace preferences: delete old, insert new
      await supabase.from('trip_preferences').delete().eq('trip_id', tripId);
      const prefsRow = mapPrefsForInsert(tripData.prefs, tripId);
      if (prefsRow) {
        const { error: pErr } = await supabase.from('trip_preferences').insert(prefsRow);
        if (pErr) console.error('Error saving preferences:', pErr);
      }

      // Re-fetch the full trip from DB to ensure local state is fresh
      const { data: refreshed } = await supabase
        .from('trips')
        .select('*, trip_travellers(*), trip_stays(*), trip_preferences(*)')
        .eq('id', tripId)
        .single();
      if (refreshed) {
        const fresh = mapTripFromDB(refreshed);
        setCreatedTrips(prev => prev.map(t =>
          (t.dbId === tripId || t.id === tripId) ? { ...t, ...fresh, timeline: t.timeline || fresh.timeline, activity: t.activity || fresh.activity, activationPrefs: t.activationPrefs } : t
        ));
        if (selectedCreatedTrip && (selectedCreatedTrip.dbId === tripId || selectedCreatedTrip.id === tripId)) {
          setSelectedCreatedTrip(prev => ({ ...prev, ...fresh, timeline: prev.timeline || fresh.timeline, activity: prev.activity || fresh.activity, activationPrefs: prev.activationPrefs }));
        }
      }
    } catch (err) {
      console.error('Error updating trip:', err);
      showToast("Failed to save changes — check connection", "error");
    } finally {
      dbWriteLockRef.current = false;
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
  // NOTE: This uses the `join_trip_by_share_code` RPC function (SECURITY DEFINER)
  // which must exist in Supabase before this code works. Run supabase-rls-lockdown.sql
  // in the Supabase SQL Editor to create it.
  const lookupTripByShareCode = async (code) => {
    try {
      const { data, error } = await supabase.rpc('join_trip_by_share_code', { code: code.toUpperCase() });
      if (error) throw error;
      // The RPC returns trip rows (without joins), so fetch the full trip with relations
      if (data && data.length > 0) {
        const trip = data[0];
        const { data: fullTrip, error: fetchError } = await supabase
          .from('trips')
          .select('*, trip_travellers(*), trip_stays(*), trip_preferences(*)')
          .eq('id', trip.id)
          .single();
        if (fetchError) throw fetchError;
        return fullTrip;
      }
      return null;
    } catch (err) {
      console.error('Error looking up trip:', err);
      return null;
    }
  };

  // ─── Supabase: Join Trip as Traveller ───
  const joinTripAsTraveller = async (tripId, travellerId, userName) => {
    if (!user || user.id === 'demo') return false;
    try {
      // Check if user is already claimed on any slot in this trip (prevent double-claim)
      const { data: existing } = await supabase.from('trip_travellers')
        .select('id')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .limit(1);
      if (existing && existing.length > 0) {
        // Already claimed — skip the update to avoid double-claim
        return true;
      }
      await supabase.from('trip_travellers')
        .update({ user_id: user.id, is_claimed: true, name: userName, joined_at: new Date().toISOString() })
        .eq('id', travellerId);
      return true;
    } catch (err) {
      console.error('Error joining trip:', err);
      return false;
    }
  };

  // ─── Remove Traveller ───
  const removeTraveller = async (tripDbId, traveller) => {
    // Update local state immediately
    setCreatedTrips(prev => prev.map(t => {
      if (t.dbId !== tripDbId && t.id !== tripDbId) return t;
      const travellers = { ...t.travellers };
      const removeFrom = (list) => (list || []).filter(a => a.dbId !== traveller.dbId);
      travellers.adults = removeFrom(travellers.adults);
      travellers.olderKids = removeFrom(travellers.olderKids);
      travellers.youngerKids = removeFrom(travellers.youngerKids);
      travellers.infants = removeFrom(travellers.infants);
      return { ...t, travellers };
    }));
    setSelectedCreatedTrip(prev => {
      if (!prev || (prev.dbId !== tripDbId && prev.id !== tripDbId)) return prev;
      const travellers = { ...prev.travellers };
      const removeFrom = (list) => (list || []).filter(a => a.dbId !== traveller.dbId);
      travellers.adults = removeFrom(travellers.adults);
      travellers.olderKids = removeFrom(travellers.olderKids);
      travellers.youngerKids = removeFrom(travellers.youngerKids);
      travellers.infants = removeFrom(travellers.infants);
      return { ...prev, travellers };
    });
    // Delete from DB
    if (user && user.id !== 'demo' && traveller.dbId) {
      try {
        const { error } = await supabase.from('trip_travellers').delete().eq('id', traveller.dbId);
        if (error) {
          console.error('Error removing traveller:', error);
          showToast("Failed to remove — try again", "error");
          loadTripsFromDB(); // Re-sync on failure
          return false;
        }
        return true;
      } catch (err) {
        console.error('Error removing traveller:', err);
        showToast("Failed to remove — try again", "error");
        return false;
      }
    }
    return true;
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
    const na = trip.travellers?.adults?.length || 0, nok = trip.travellers?.olderKids?.length || 0, nyk = trip.travellers?.youngerKids?.length || 0, ninf = trip.travellers?.infants?.length || 0;
    const gp = [];
    if (na > 0) gp.push(`${na} adult${na > 1 ? "s" : ""}`);
    if (nok > 0) gp.push(`${nok} teen${nok > 1 ? "s" : ""} (${trip.travellers.olderKids.map(k => `${k.name || "teen"}, ${k.age}`).join("; ")})`);
    if (nyk > 0) gp.push(`${nyk} child${nyk > 1 ? "ren" : ""} (${trip.travellers.youngerKids.map(k => `${k.name || "child"}, ${k.age}`).join("; ")})`);
    if (ninf > 0) gp.push(`${ninf} infant${ninf > 1 ? "s" : ""} (${trip.travellers.infants.map(k => `${k.name || "baby"}, ${k.age}`).join("; ")})`);
    if (gp.length) parts.push(`group: ${gp.join(", ")}`);
    if (trip.budget) parts.push(`${trip.budget.toLowerCase()} budget`);
    if (trip.prefs?.food?.length > 0) parts.push(`food preferences: ${trip.prefs.food.join(", ")}`);
    if (trip.prefs?.adultActs?.length > 0) parts.push(`adult activities: ${trip.prefs.adultActs.join(", ")}`);
    if (trip.prefs?.olderActs?.length > 0) parts.push(`teen activities: ${trip.prefs.olderActs.join(", ")}`);
    if (trip.prefs?.youngerActs?.length > 0) parts.push(`children activities: ${trip.prefs.youngerActs.join(", ")}`);
    if (trip.stayNames?.length > 0) parts.push(`staying at ${trip.stayNames.join(", ")}`);
    if (ninf > 0) parts.push("infant in group — plan for nap breaks, pram-friendly routes, baby-changing facilities");
    const allKids = [...(trip.travellers?.olderKids || []), ...(trip.travellers?.youngerKids || []), ...(trip.travellers?.infants || [])];
    if (allKids.length > 0) {
      const ages = allKids.map(k => parseInt(k.age) || 0);
      const youngest = Math.min(...ages);
      if (youngest <= 1) parts.push("infant in group — plan short outings with rest breaks, pram access required");
      else if (youngest <= 5) parts.push("young children in group — plan short activity blocks and rest breaks");
      else if (youngest <= 10) parts.push("children in group — mix family-friendly with adult activities");
    }
    if (trip.brief) parts.push(`trip brief: ${trip.brief}`);
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
      travellers: { adults: wizTravellers.adults.map(a => ({ ...a })), olderKids: wizTravellers.olderKids.map(c => ({ ...c })), youngerKids: wizTravellers.youngerKids.map(c => ({ ...c })), infants: wizTravellers.infants.map(c => ({ ...c })) },
      stays: [...wizStays],
      stayNames: wizStays.map(s => s.name || s),
      prefs: { food: [...wizPrefs.food], activities: [...wizPrefs.adultActs, ...wizPrefs.olderActs, ...wizPrefs.youngerActs], adultActs: [...wizPrefs.adultActs], olderActs: [...wizPrefs.olderActs], youngerActs: [...wizPrefs.youngerActs], instructions: wizPrefs.instructions || "" },
    };
    tripData.summary = buildTripSummary(tripData);
    if (editingTripId) {
      let updatedTrip;
      setCreatedTrips(prev => prev.map(t => {
        if (t.id !== editingTripId) return t;
        const updated = { ...t, ...tripData };
        if (t.status === "live") updated.timeline = generateMultiDayTimeline(updated);
        updatedTrip = updated;
        return updated;
      }));
      if (!updatedTrip) updatedTrip = { ...createdTrips.find(t => t.id === editingTripId), ...tripData };
      setSelectedCreatedTrip(updatedTrip);
      // Persist edits to Supabase
      const dbId = updatedTrip.dbId || editingTripId;
      if (user && user.id !== 'demo' && dbId) {
        updateTripInDB(updatedTrip, dbId).then(() => {
          showToast("Changes saved", "success");
        });
      }
      setSaving(false);
      navigate("createdTrip");
    } else {
      // Generate a cryptographically secure share code instead of Math.random()
      const _scArr = new Uint8Array(4);
      crypto.getRandomValues(_scArr);
      const _shareCode = Array.from(_scArr, b => b.toString(36).padStart(2, '0')).join('').substring(0, 8).toUpperCase();
      const newTrip = { id: Date.now(), ...tripData, status: "new", timeline: [], polls: [], activity: [], shareCode: _shareCode };
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
      showCelebration(newTrip.name);
      setSelectedCreatedTrip(newTrip);
      navigate("createdTrip");
    }
  };

  // ─── End Trip ───
  const endTrip = async (tripId) => {
    setCreatedTrips(prev => prev.map(t => t.id === tripId ? { ...t, status: "completed" } : t));
    setSelectedCreatedTrip(prev => prev?.id === tripId ? { ...prev, status: "completed" } : prev);
    const trip = createdTrips.find(t => t.id === tripId);
    const dbId = trip?.dbId || tripId;
    await updateTripStatusInDB(dbId, "completed");
    logActivity(tripId, "\uD83C\uDFC1", "Trip completed!", "milestone");
    showToast("Trip completed!");
  };

  // ─── WhatsApp Share Helper ───
  const shareToWhatsApp = (tripName, message, shareCodeOrId, options = {}) => {
    const trip = createdTrips.find(t => t.dbId === shareCodeOrId || t.id === shareCodeOrId);
    const code = trip?.shareCode || shareCodeOrId;
    let link = `${window.location.origin}?join=${code}`;
    if (options.tab) link += `&tab=${options.tab}`;
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

  // Check for share code in URL — requires authenticated user
  const pendingJoinRef = React.useRef(null);

  // Extract join code from URL on mount (before auth may be ready)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    const tab = params.get('tab');
    if (tab) setJoinTab(tab);
    if (joinCode) {
      pendingJoinRef.current = joinCode;
      setJoinShareCode(joinCode);
      // Clean up URL params without reload
      try { window.history.replaceState({}, '', window.location.origin + window.location.pathname); } catch {}
    }
  }, []);

  // Process the join code once user is authenticated
  useEffect(() => {
    const code = pendingJoinRef.current;
    if (!code) return;
    // Wait for auth — don't process if not logged in or demo user
    if (!user || user.id === 'demo') return;
    pendingJoinRef.current = null; // Clear so it doesn't re-fire

    lookupTripByShareCode(code).then(data => {
      if (data) {
        const mapped = mapTripFromDB(data);
        setSelectedCreatedTrip(mapped);
        navigate('joinPreview');
      } else {
        showToast("Invalid or expired invite link", "error");
        navigate('home');
      }
    });
  }, [user]);

  // Real-time Supabase subscriptions
  useEffect(() => {
    if (!user || user.id === 'demo') return;

    const channel = supabase.channel('trip-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new) {
          // Skip if we're in the middle of a DB write (delete-reinsert stays race)
          if (dbWriteLockRef.current) return;
          const updated = payload.new;
          // Preserve stays, travellers, prefs, timeline — realtime payload only has trips table columns
          setCreatedTrips(prev => prev.map(t => {
            if (t.dbId === updated.id) {
              return { ...t, name: updated.name || t.name, status: updated.status || t.status,
                start: updated.start_date || t.start, end: updated.end_date || t.end,
                places: updated.places || t.places, travel: updated.travel_modes || t.travel,
                timeline: updated.timeline || t.timeline, polls: updated.polls || t.polls };
              // NOTE: stays, travellers, prefs are in separate tables — NOT in this payload.
              // They are preserved via the ...t spread above.
            }
            return t;
          }));
          setSelectedCreatedTrip(prev => {
            if (prev?.dbId === updated.id) {
              return { ...prev, name: updated.name || prev.name, status: updated.status || prev.status,
                start: updated.start_date || prev.start, end: updated.end_date || prev.end,
                places: updated.places || prev.places, travel: updated.travel_modes || prev.travel,
                timeline: updated.timeline || prev.timeline, polls: updated.polls || prev.polls };
            }
            return prev;
          });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_travellers' }, (payload) => {
        if (dbWriteLockRef.current) return; // Skip during delete+reinsert in updateTripInDB
        if (payload.new) {
          const newTraveller = payload.new;
          setCreatedTrips(prev => prev.map(t => {
            if (t.dbId === newTraveller.trip_id) {
              const role = newTraveller.role;
              const entry = { name: newTraveller.name, dbId: newTraveller.id, email: newTraveller.email || "", isClaimed: newTraveller.is_claimed, claimedUserId: newTraveller.user_id || null };
              const travellers = { ...t.travellers };
              // Check for duplicate — skip if traveller with same dbId, same user_id, or same name+role already exists
              const allExisting = [...(travellers.adults || []), ...(travellers.olderKids || []), ...(travellers.youngerKids || []), ...(travellers.infants || [])];
              if (allExisting.some(a => a.dbId === newTraveller.id)) return t;
              if (newTraveller.user_id && allExisting.some(a => a.claimedUserId === newTraveller.user_id)) return t; // same user already has a slot
              if (allExisting.some(a => a.name === newTraveller.name && !a.dbId)) return t; // name match for freshly added travellers without dbId yet
              if (role === 'lead' || role === 'adult') {
                travellers.adults = [...(travellers.adults || []), { ...entry, isLead: role === 'lead' }];
              } else if (role === 'child_older' || role === 'teen') {
                travellers.olderKids = [...(travellers.olderKids || []), { ...entry, age: newTraveller.age || 14 }];
              } else if (role === 'child_younger' || role === 'child') {
                travellers.youngerKids = [...(travellers.youngerKids || []), { ...entry, age: newTraveller.age || 6 }];
              } else if (role === 'infant') {
                travellers.infants = [...(travellers.infants || []), { ...entry, age: newTraveller.age || 0 }];
              }
              return { ...t, travellers };
            }
            return t;
          }));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trip_travellers' }, (payload) => {
        if (payload.new) {
          const updated = payload.new;
          // Update local traveller state when a slot is claimed
          setCreatedTrips(prev => prev.map(t => {
            if (t.dbId !== updated.trip_id) return t;
            const travellers = { ...t.travellers };
            const updateList = (list) => (list || []).map(a =>
              a.dbId === updated.id ? { ...a, name: updated.name || a.name, isClaimed: updated.is_claimed && !!updated.user_id, claimedUserId: updated.user_id || null } : a
            );
            travellers.adults = updateList(travellers.adults);
            travellers.olderKids = updateList(travellers.olderKids);
            travellers.youngerKids = updateList(travellers.youngerKids);
            travellers.infants = updateList(travellers.infants);
            return { ...t, travellers };
          }));
          if (updated.is_claimed) {
            showToast(`${updated.name || "Someone"} joined the trip!`);
          }
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'trip_travellers' }, (payload) => {
        if (dbWriteLockRef.current) return; // Skip during delete+reinsert in updateTripInDB
        if (payload.old) {
          const deletedId = payload.old.id;
          const deletedTripId = payload.old.trip_id;
          setCreatedTrips(prev => prev.map(t => {
            if (t.dbId !== deletedTripId) return t;
            const travellers = { ...t.travellers };
            const removeFrom = (list) => (list || []).filter(a => a.dbId !== deletedId);
            travellers.adults = removeFrom(travellers.adults);
            travellers.olderKids = removeFrom(travellers.olderKids);
            travellers.youngerKids = removeFrom(travellers.youngerKids);
            travellers.infants = removeFrom(travellers.infants);
            return { ...t, travellers };
          }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Load trips when user logs in
  useEffect(() => {
    if (user && user.id !== 'demo') {
      loadTripsFromDB();
    } else if (user && user.id === 'demo') {
      // Guest mode: restore trips from offline cache so they persist across refreshes
      const cached = getOfflineTrips();
      if (cached && cached.length > 0) {
        setCreatedTrips(cached);
      }
    }
  }, [user, loadTripsFromDB]);

  // ─── Cache trips offline whenever they update ───
  useEffect(() => {
    if (createdTrips.length > 0) {
      cacheTripsOffline(createdTrips);
    }
  }, [createdTrips]);

  // ─── Cache user info for offline display ───
  useEffect(() => {
    if (user && user.id !== 'demo') {
      cacheUserOffline(user);
    }
  }, [user]);

  // ─── Per-trip Realtime Subscription (collaborative editing) ───
  useEffect(() => {
    const tripDbId = selectedCreatedTrip?.dbId;
    if (!tripDbId || !user || user.id === 'demo') {
      setRealtimeConnected(false);
      return;
    }

    const unsubscribe = subscribeToTripUpdates(tripDbId, {
      onTripUpdate: (payload) => {
        const updated = payload.new;
        if (!updated) return;
        // Skip if we're in the middle of a DB write (delete-reinsert stays race)
        if (dbWriteLockRef.current) return;
        // Merge incoming trip changes — preserve stays/travellers/prefs (separate tables, not in payload)
        setCreatedTrips(prev => prev.map(t => {
          if (t.dbId !== updated.id) return t;
          return {
            ...t,
            name: updated.name || t.name,
            status: updated.status || t.status,
            timeline: updated.timeline || t.timeline,
            polls: updated.polls || t.polls,
            start: updated.start_date || t.start,
            end: updated.end_date || t.end,
            places: updated.places || t.places,
            travel: updated.travel_modes || t.travel,
            // stays, travellers, prefs preserved via ...t spread (they're in separate tables)
          };
        }));
        setSelectedCreatedTrip(prev => {
          if (!prev || prev.dbId !== updated.id) return prev;
          return {
            ...prev,
            name: updated.name || prev.name,
            status: updated.status || prev.status,
            timeline: updated.timeline || prev.timeline,
            polls: updated.polls || prev.polls,
            start: updated.start_date || prev.start,
            end: updated.end_date || prev.end,
            places: updated.places || prev.places,
            travel: updated.travel_modes || prev.travel,
            // stays, travellers, prefs preserved via ...prev spread
          };
        });
        showToast("Trip updated by a collaborator", "info");
      },
      onMessage: (payload) => {
        const msg = payload.new;
        if (!msg) return;
        const senderName = msg.sender_name || msg.user_name || "Someone";
        showToast(`New message from ${senderName}`, "info");
      },
      onExpenseChange: (payload) => {
        const { eventType } = payload;
        if (eventType === 'DELETE') {
          showToast("An expense was removed", "info");
        } else {
          showToast("Expenses updated", "info");
        }
        // Trigger a refetch of trips to get fresh expense data
        loadTripsFromDB();
      },
      onStatusChange: (status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      },
    });

    return () => {
      unsubscribe();
      setRealtimeConnected(false);
    };
  }, [selectedCreatedTrip?.dbId, user, showToast, loadTripsFromDB]);

  const value = {
    createdTrips, setCreatedTrips,
    selectedCreatedTrip, setSelectedCreatedTrip,
    joinShareCode, setJoinShareCode,
    joinTab, setJoinTab,
    joinedSlot, setJoinedSlot,
    saving, setSaving,
    syncing, setSyncing,
    showNotifications, setShowNotifications,
    lastSeenActivity, setLastSeenActivity,
    totalUnread,
    allRecentActivity,
    loadTripsFromDB,
    saveTripToDB,
    saveTimelineToDB,
    updateTripStatusInDB,
    lookupTripByShareCode,
    joinTripAsTraveller,
    removeTraveller,
    buildTripSummary,
    createTrip,
    logActivity,
    getUnreadCount,
    markTripSeen,
    shareToWhatsApp,
    deleteCreatedTrip,
    endTrip,
    realtimeConnected,
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
