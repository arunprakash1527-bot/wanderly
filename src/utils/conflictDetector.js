import { API } from "../constants/api";

/**
 * Smart Conflict Detection
 * Checks timeline items for scheduling conflicts:
 * - Drive time vs gap between activities
 * - Overlapping time slots
 * - Activities scheduled during travel days
 * - Unrealistic early/late timings with kids
 */

const parseTime = (str) => {
  if (!str) return null;
  const m = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let h = parseInt(m[1]);
  if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
  if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
  return h * 60 + parseInt(m[2]);
};

const fmtMins = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

/**
 * Detect all conflicts in a trip's timeline
 * @param {Object} trip - The trip object with timeline, stays, travel modes
 * @param {Object} directions - Cached directions data { "loc1→loc2": { durationMins } }
 * @returns {Array} conflicts - [{ dayNum, type, severity, message, items }]
 */
export function detectConflicts(trip, directions = {}) {
  const conflicts = [];
  if (!trip?.timeline) return conflicts;

  const allKids = [...(trip.travellers?.olderKids || []), ...(trip.travellers?.youngerKids || []), ...(trip.travellers?.infants || [])];
  const hasKids = allKids.length > 0;
  const hasInfants = (trip.travellers?.infants?.length || 0) > 0;
  const youngestAge = allKids.length > 0 ? Math.min(...allKids.map(k => parseInt(k.age) || 10)) : null;

  const numDays = Object.keys(trip.timeline).length || 1;

  for (let day = 1; day <= numDays; day++) {
    const items = trip.timeline[day] || [];
    if (items.length === 0) continue;

    // Parse all times
    const parsed = items.map((item, idx) => ({
      ...item,
      idx,
      startMins: parseTime(item.time),
    })).filter(i => i.startMins !== null).sort((a, b) => a.startMins - b.startMins);

    // 1. Overlapping / too-close activities
    for (let i = 0; i < parsed.length - 1; i++) {
      const current = parsed[i];
      const next = parsed[i + 1];
      const gap = next.startMins - current.startMins;

      if (gap < 0) {
        conflicts.push({
          dayNum: day, type: "overlap", severity: "error",
          icon: "⚠️",
          message: `"${current.title}" and "${next.title}" overlap on Day ${day}`,
          items: [current.idx, next.idx],
        });
      } else if (gap < 30 && gap >= 0) {
        conflicts.push({
          dayNum: day, type: "tight", severity: "warning",
          icon: "⏱️",
          message: `Only ${gap} min between "${current.title}" and "${next.title}" — that's quite tight`,
          items: [current.idx, next.idx],
        });
      }
    }

    // 2. Kid-aware timing checks
    if (hasKids && parsed.length > 0) {
      const lastItem = parsed[parsed.length - 1];
      const firstItem = parsed[0];

      // Late dinner with young kids
      if (youngestAge <= 7 && lastItem.startMins >= 19 * 60) { // 7 PM
        const isFood = /dinner|restaurant|eat|food|meal/i.test(lastItem.title);
        if (isFood) {
          conflicts.push({
            dayNum: day, type: "kid_timing", severity: "suggestion",
            icon: "👧",
            message: `Dinner at ${lastItem.time} may be late for young kids — consider moving to 5:30-6 PM`,
            items: [lastItem.idx],
          });
        }
      }

      // Very early start with kids
      if (youngestAge <= 5 && firstItem.startMins < 8 * 60) { // Before 8 AM
        conflicts.push({
          dayNum: day, type: "kid_timing", severity: "suggestion",
          icon: "👶",
          message: `Day starts at ${firstItem.time} — with young children, consider starting at 9 AM or later`,
          items: [firstItem.idx],
        });
      }

      // No rest break in long day
      const daySpan = (parsed[parsed.length - 1].startMins - parsed[0].startMins) / 60;
      if (youngestAge <= 6 && daySpan > 5 && parsed.length >= 4) {
        const hasBreak = parsed.some(p => /rest|break|nap|relax|quiet|chill/i.test(p.title));
        if (!hasBreak) {
          conflicts.push({
            dayNum: day, type: "kid_rest", severity: "suggestion",
            icon: "😴",
            message: `Long day (${Math.round(daySpan)}h) with no rest break — young kids may need downtime after lunch`,
            items: [],
          });
        }
      }

      // Infant-specific
      if (hasInfants && parsed.length >= 5) {
        conflicts.push({
          dayNum: day, type: "infant_pace", severity: "suggestion",
          icon: "🍼",
          message: `${parsed.length} activities on Day ${day} — with an infant, consider dropping 1-2 items for flexibility`,
          items: [],
        });
      }
    }

    // 3. Packed schedule warnings
    if (parsed.length >= 7) {
      conflicts.push({
        dayNum: day, type: "packed", severity: "warning",
        icon: "📋",
        message: `Day ${day} has ${parsed.length} activities — this might feel rushed. Consider removing the lowest-priority item.`,
        items: [],
      });
    }

    // 4. Empty middle days
    if (parsed.length === 0 && day > 1 && day < numDays) {
      conflicts.push({
        dayNum: day, type: "empty", severity: "info",
        icon: "📭",
        message: `Day ${day} has no activities planned yet`,
        items: [],
      });
    }
  }

  // 5. Check drive time vs schedule gaps (requires directions data)
  if (directions && Object.keys(directions).length > 0) {
    for (const [route, dirData] of Object.entries(directions)) {
      if (dirData.dayNum && dirData.durationMins && dirData.scheduledGapMins) {
        if (dirData.durationMins > dirData.scheduledGapMins) {
          conflicts.push({
            dayNum: dirData.dayNum, type: "drive_time", severity: "error",
            icon: "🚗",
            message: `Drive from ${dirData.from} to ${dirData.to} takes ${fmtMins(dirData.durationMins)} but you've only left ${fmtMins(dirData.scheduledGapMins)} in your schedule`,
            items: dirData.items || [],
          });
        }
      }
    }
  }

  // Sort: errors first, then warnings, then suggestions
  const severityOrder = { error: 0, warning: 1, suggestion: 2, info: 3 };
  conflicts.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));

  return conflicts;
}

/**
 * Fetch drive time between two locations and check against scheduled gap
 * @returns {Object|null} { durationMins, distanceText, durationText }
 */
export async function fetchDriveTime(origin, destination) {
  try {
    const res = await fetch(API.DIRECTIONS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination, mode: "driving" }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      durationMins: Math.round(data.totalDuration / 60),
      distanceText: data.totalDistanceText,
      durationText: data.totalDurationText,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a stay transition exists for a given day and calculate if schedule allows it
 */
export async function checkTravelDayConflict(trip, dayNum) {
  const stays = (trip.stays || []).filter(s => s.location && s.checkIn).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  if (stays.length < 2 || !trip.rawStart) return null;

  const tripStart = new Date(trip.rawStart + "T12:00:00");
  const dayDate = new Date(tripStart.getTime() + (dayNum - 1) * 86400000).toISOString().split("T")[0];

  // Find if this is a checkout/transition day
  const checkoutStay = stays.find(s => s.checkOut === dayDate);
  const checkinStay = stays.find(s => s.checkIn === dayDate && (!checkoutStay || s.location !== checkoutStay.location));

  if (!checkoutStay || !checkinStay || checkoutStay.location === checkinStay.location) return null;

  // This is a travel day — fetch drive time
  const driveTime = await fetchDriveTime(checkoutStay.location, checkinStay.location);
  if (!driveTime) return null;

  // Check if timeline has enough gap
  const dayItems = (trip.timeline?.[dayNum] || []).filter(i => parseTime(i.time) !== null).sort((a, b) => parseTime(a.time) - parseTime(b.time));

  return {
    from: checkoutStay.location,
    to: checkinStay.location,
    durationMins: driveTime.durationMins,
    durationText: driveTime.durationText,
    distanceText: driveTime.distanceText,
    dayNum,
    itemCount: dayItems.length,
  };
}
