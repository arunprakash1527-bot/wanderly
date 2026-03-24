/**
 * AI Memories — contextual intelligence for photos using trip data.
 * No image recognition; infers from timeline, day tags, and trip metadata.
 */

// ─── Mood Detection ───
// Tags photos with mood categories based on what the trip timeline says happened that day.
const MOOD_MAP = [
  { keywords: ["hike","walk","adventure","climb","kayak","trek","trail","surf","ski","cycle","bike"], label: "Adventure", icon: "🏔️", bg: "#EAF3DE", color: "#4A9E2E" },
  { keywords: ["lunch","dinner","breakfast","cafe","restaurant","brunch","pub","bar","eat","food","tasting","market"], label: "Food", icon: "🍽️", bg: "#FAECE7", color: "#D85A30" },
  { keywords: ["drive","scenic","view","lake","beach","sunset","sunrise","mountain","lookout","coast","waterfall","garden","park"], label: "Scenic", icon: "🌅", bg: "#E4F0FB", color: "#2E7CC9" },
  { keywords: ["play","fun","game","entertainment","show","concert","museum","gallery","theatre","shopping","festival"], label: "Fun", icon: "🎉", bg: "#EDECFE", color: "#7B6FD6" },
  { keywords: ["hotel","cottage","cabin","camp","rest","relax","spa","pool","settle","check in","check out","lodge","airbnb"], label: "Chill", icon: "☕", bg: "#FAF0DA", color: "#B87215" },
  { keywords: ["charge","ev","station","petrol","fuel"], label: "Travel", icon: "🚗", bg: "#E1F3EC", color: "#1B8F6A" },
];

function getDayNumber(dayStr) {
  if (!dayStr || dayStr === "Untagged") return null;
  const match = dayStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Detect mood for a photo based on that day's timeline activities.
 * @returns {{ label, icon, bg, color } | null}
 */
export function detectMood(photo, timeline) {
  const dayNum = getDayNumber(photo.day);
  if (!dayNum || !timeline) return null;

  const dayItems = timeline[dayNum] || timeline[String(dayNum)] || [];
  if (dayItems.length === 0) return null;

  // Combine all text from the day's activities
  const dayText = dayItems.map(i => `${i.title || ""} ${i.desc || ""}`).join(" ").toLowerCase();

  // Score each mood
  const scores = MOOD_MAP.map(mood => {
    const score = mood.keywords.reduce((s, kw) => s + (dayText.includes(kw) ? 1 : 0), 0);
    return { ...mood, score };
  }).filter(m => m.score > 0).sort((a, b) => b.score - a.score);

  if (scores.length === 0) return null;
  const { keywords, score, ...mood } = scores[0]; // eslint-disable-line no-unused-vars
  return mood;
}

/**
 * Generate an auto-caption for a photo using timeline context.
 * @returns {string} A suggested caption
 */
export function generateAutoCaption(photo, timeline, trip) {
  const dayNum = getDayNumber(photo.day);
  const places = trip?.places || [];

  if (!dayNum || !timeline) {
    // Fallback: use trip info
    if (places.length > 0) return `Memories from ${places[0]}`;
    return `Trip memories`;
  }

  const dayItems = timeline[dayNum] || timeline[String(dayNum)] || [];

  if (dayItems.length === 0) {
    // Use place if available
    const placeIdx = Math.min(dayNum - 1, places.length - 1);
    return placeIdx >= 0 ? `Day ${dayNum} in ${places[placeIdx]}` : `Day ${dayNum} adventures`;
  }

  // Pick the most interesting activity (prefer ones with ratings or that are "highlight-worthy")
  const sorted = [...dayItems].sort((a, b) => {
    const aScore = (a.rating || 0) * 2 + (a.title?.length > 10 ? 1 : 0);
    const bScore = (b.rating || 0) * 2 + (b.title?.length > 10 ? 1 : 0);
    return bScore - aScore;
  });

  const best = sorted[0];
  const placeIdx = Math.min(dayNum - 1, places.length - 1);
  const location = placeIdx >= 0 ? places[placeIdx] : null;

  // Build caption from context
  const templates = [
    () => location ? `${best.title} in ${location}` : best.title,
    () => best.rating >= 4 ? `${best.title} ⭐` : null,
    () => dayItems.length >= 3 ? `A packed Day ${dayNum}` : null,
  ];

  for (const tmpl of templates) {
    const result = tmpl();
    if (result) return result;
  }

  return best.title || `Day ${dayNum}`;
}

/**
 * Smart-order photos within each day group by timeline proximity.
 * Morning activities first, evening last. Liked photos get slight priority.
 * @returns {Array} New array with updated sortOrder values
 */
export function smartOrderPhotos(photos, timeline) {
  if (!photos || photos.length === 0) return [];

  // Group by day
  const groups = {};
  photos.forEach(p => {
    const key = p.day || "Untagged";
    if (!groups[key]) groups[key] = [];
    groups[key].push({ ...p });
  });

  const result = [];
  let order = 0;

  // Process days in order (Day 1, Day 2, ..., Untagged last)
  const dayKeys = Object.keys(groups).sort((a, b) => {
    const aNum = getDayNumber(a);
    const bNum = getDayNumber(b);
    if (aNum === null && bNum === null) return 0;
    if (aNum === null) return 1;
    if (bNum === null) return -1;
    return aNum - bNum;
  });

  for (const dayKey of dayKeys) {
    const dayPhotos = groups[dayKey];
    const dayNum = getDayNumber(dayKey);
    const dayItems = dayNum && timeline ? (timeline[dayNum] || timeline[String(dayNum)] || []) : [];

    // Parse time from timeline items for ordering context
    const timeSlots = dayItems.map((item, idx) => {
      const timeStr = item.time || "";
      const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
      let minutes = idx * 60; // fallback: spread evenly
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2] || "0", 10);
        const ampm = (match[3] || "").toUpperCase();
        if (ampm === "PM" && h < 12) h += 12;
        if (ampm === "AM" && h === 12) h = 0;
        minutes = h * 60 + m;
      }
      return { ...item, _minutes: minutes };
    });

    // Sort photos: liked first within each "time bucket", then by upload order
    dayPhotos.sort((a, b) => {
      // Liked photos slightly earlier
      const aLiked = a.liked ? -1 : 0;
      const bLiked = b.liked ? -1 : 0;
      if (aLiked !== bLiked) return aLiked - bLiked;
      // Then by original sort order (upload time)
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

    dayPhotos.forEach(p => {
      p.sortOrder = order++;
      result.push(p);
    });
  }

  return result;
}

/**
 * Build a memory timeline — photos organized alongside itinerary context.
 * @returns {Array} [{ day, date, location, activities, photos, mood }]
 */
export function buildMemoryTimeline(photos, timeline, trip) {
  const places = trip?.places || [];
  const result = [];

  // Determine number of days
  let numDays = 1;
  if (trip?.rawStart && trip?.rawEnd) {
    numDays = Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1);
  }

  const tripStart = trip?.rawStart ? new Date(trip.rawStart + "T12:00:00") : null;

  for (let d = 1; d <= numDays; d++) {
    const dayPhotos = photos.filter(p => p.day === `Day ${d}`);
    const dayItems = timeline ? (timeline[d] || timeline[String(d)] || []) : [];
    const placeIdx = Math.min(d - 1, places.length - 1);

    // Calculate actual date
    let dateStr = "";
    if (tripStart) {
      const dayDate = new Date(tripStart);
      dayDate.setDate(dayDate.getDate() + d - 1);
      dateStr = `${dayDate.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][dayDate.getMonth()]}`;
    }

    // Detect mood from first photo with this day
    const samplePhoto = dayPhotos[0] || { day: `Day ${d}` };
    const mood = detectMood(samplePhoto, timeline);

    result.push({
      day: d,
      dayLabel: `Day ${d}`,
      date: dateStr,
      location: placeIdx >= 0 ? places[placeIdx] : "",
      activities: dayItems.slice(0, 3).map(i => ({ title: i.title, time: i.time })),
      photos: dayPhotos,
      mood,
      photoCount: dayPhotos.length,
    });
  }

  // Add untagged
  const untagged = photos.filter(p => !p.day || p.day === "Untagged");
  if (untagged.length > 0) {
    result.push({
      day: null,
      dayLabel: "Untagged",
      date: "",
      location: "",
      activities: [],
      photos: untagged,
      mood: null,
      photoCount: untagged.length,
    });
  }

  return result;
}

/**
 * Get uploader display info for a photo.
 * @returns {{ name, initial, color }}
 */
export function getPhotoUploader(photo, travellers) {
  // Currently photos don't store per-user info in local state
  // When collaborative features are added, this maps user_id to traveller
  const colors = ["#1B8F6A", "#D85A30", "#2E7CC9", "#7B6FD6", "#B87215", "#CF4D78"];
  const adults = travellers?.adults || [];

  // Default to "You" (current user = first adult / lead)
  const name = adults[0]?.name || "You";
  const initial = name.charAt(0).toUpperCase();
  return { name, initial, color: colors[0] };
}
