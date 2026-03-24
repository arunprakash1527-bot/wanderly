import { supabase } from "../supabaseClient";

/**
 * Live Trip Mode
 * Real-time features for active trips:
 * - Group location sharing (opt-in)
 * - Activity check-ins
 * - Running late notifications
 * - Auto-adjust remaining schedule
 */

// ─── Activity Check-ins ───

/**
 * Mark a timeline item as done/checked-in
 */
export function checkInActivity(trip, dayNum, itemIdx, setCreatedTrips, logActivity) {
  setCreatedTrips(prev => prev.map(t => {
    if (t.id !== trip.id) return t;
    const tl = { ...(t.timeline || {}) };
    const dayItems = [...(tl[dayNum] || [])];
    if (dayItems[itemIdx]) {
      dayItems[itemIdx] = { ...dayItems[itemIdx], checkedIn: true, checkedInAt: new Date().toISOString() };
      tl[dayNum] = dayItems;
    }
    return { ...t, timeline: tl };
  }));
  const item = trip.timeline?.[dayNum]?.[itemIdx];
  if (item && logActivity) {
    logActivity(trip.id, "✅", `Checked in: "${item.title}" on Day ${dayNum}`, "checkin");
  }
}

/**
 * Mark as running late — notify group and adjust schedule
 */
export function markRunningLate(trip, dayNum, delayMins, setCreatedTrips, logActivity) {
  // Find the next unchecked item and push all subsequent items by delayMins
  setCreatedTrips(prev => prev.map(t => {
    if (t.id !== trip.id) return t;
    const tl = { ...(t.timeline || {}) };
    const dayItems = [...(tl[dayNum] || [])];

    // Find first unchecked item
    const firstUnchecked = dayItems.findIndex(i => !i.checkedIn);
    if (firstUnchecked < 0) return t;

    // Shift all unchecked items forward
    for (let i = firstUnchecked; i < dayItems.length; i++) {
      if (!dayItems[i].checkedIn && dayItems[i].time) {
        dayItems[i] = { ...dayItems[i], time: shiftTime(dayItems[i].time, delayMins), adjusted: true };
      }
    }
    tl[dayNum] = dayItems;
    return { ...t, timeline: tl };
  }));

  if (logActivity) {
    logActivity(trip.id, "⏰", `Running ${delayMins} min late — schedule adjusted for Day ${dayNum}`, "schedule");
  }
}

/**
 * Get trip progress for a day (how many items checked in vs total)
 */
export function getDayProgress(timeline, dayNum) {
  const items = timeline?.[dayNum] || [];
  if (items.length === 0) return { total: 0, done: 0, percent: 0, nextItem: null };

  const done = items.filter(i => i.checkedIn).length;
  const nextItem = items.find(i => !i.checkedIn);

  return {
    total: items.length,
    done,
    percent: Math.round((done / items.length) * 100),
    nextItem,
    allDone: done === items.length,
  };
}

/**
 * Calculate time until next activity
 */
export function getTimeToNext(timeline, dayNum) {
  const items = timeline?.[dayNum] || [];
  const next = items.find(i => !i.checkedIn && i.time);
  if (!next) return null;

  const now = new Date();
  const nextTime = parseTimeToDate(next.time);
  if (!nextTime) return null;

  const diffMs = nextTime.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 0) return { item: next, mins: diffMins, label: `${Math.abs(diffMins)} min overdue`, overdue: true };
  if (diffMins < 60) return { item: next, mins: diffMins, label: `${diffMins} min`, overdue: false };
  const hrs = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return { item: next, mins: diffMins, label: mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`, overdue: false };
}

/**
 * Subscribe to real-time trip updates via Supabase Realtime
 * Returns an unsubscribe function
 */
export function subscribeToTripUpdates(tripDbId, callbacks) {
  if (!tripDbId) return () => {};

  const channel = supabase.channel(`trip-${tripDbId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'messages',
      filter: `trip_id=eq.${tripDbId}`,
    }, payload => {
      if (callbacks.onMessage) callbacks.onMessage(payload);
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}

// ─── Helpers ───

function shiftTime(timeStr, delayMins) {
  const m = timeStr?.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return timeStr;
  let h = parseInt(m[1]);
  let min = parseInt(m[2]);
  const isPM = m[3].toUpperCase() === "PM";

  // Convert to 24h
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;

  // Add delay
  const totalMins = h * 60 + min + delayMins;
  let newH = Math.floor(totalMins / 60) % 24;
  const newMin = totalMins % 60;

  // Convert back to 12h
  const newPeriod = newH >= 12 ? "PM" : "AM";
  if (newH > 12) newH -= 12;
  if (newH === 0) newH = 12;

  return `${newH}:${String(newMin).padStart(2, "0")} ${newPeriod}`;
}

function parseTimeToDate(timeStr) {
  const m = timeStr?.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
  if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
  const d = new Date();
  d.setHours(h, min, 0, 0);
  return d;
}
