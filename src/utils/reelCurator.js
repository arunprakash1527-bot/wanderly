/**
 * Curates the best photos for a reel from a larger set.
 * Scores, deduplicates, enforces variety, and caps the result.
 *
 * @param {Array} photos - Full photo array with { liked, caption, day, sortOrder, ... }
 * @param {number} maxPhotos - Maximum photos to include (default 15)
 * @returns {Array} Curated subset in optimal order
 */
export function curateReelPhotos(photos, maxPhotos = 15) {
  if (!photos || photos.length === 0) return [];

  // Score each photo
  const scored = photos.map((photo, originalIndex) => {
    let score = 0;
    if (photo.liked) score += 10;
    if (photo.caption) score += 5;
    if (photo.day && photo.day !== "Untagged") score += 3;
    return { ...photo, _score: score, _originalIndex: originalIndex };
  });

  // Extract numeric day order for sorting (e.g. "Day 2" -> 2)
  const dayOrder = (dayStr) => {
    if (!dayStr || dayStr === "Untagged") return Infinity;
    const match = dayStr.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : Infinity;
  };

  // Group by day and enforce max 3 per day (pick top 3 by score)
  const grouped = {};
  for (const photo of scored) {
    const key = photo.day || "Untagged";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(photo);
  }

  // Within each day group, sort by score desc then sortOrder asc, keep top 3
  const capped = [];
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return (a.sortOrder ?? a._originalIndex) - (b.sortOrder ?? b._originalIndex);
    });
    capped.push(...grouped[key].slice(0, 3));
  }

  // Sort the final list: score desc, then day order asc, then sortOrder asc
  // Untagged photos always go to the end
  capped.sort((a, b) => {
    const aUntagged = !a.day || a.day === "Untagged";
    const bUntagged = !b.day || b.day === "Untagged";

    // Untagged always last
    if (aUntagged && !bUntagged) return 1;
    if (!aUntagged && bUntagged) return -1;

    // By score descending
    if (b._score !== a._score) return b._score - a._score;

    // By day order ascending
    const aDayOrder = dayOrder(a.day);
    const bDayOrder = dayOrder(b.day);
    if (aDayOrder !== bDayOrder) return aDayOrder - bDayOrder;

    // By sort order ascending
    return (a.sortOrder ?? a._originalIndex) - (b.sortOrder ?? b._originalIndex);
  });

  // Cap at maxPhotos and strip internal fields
  return capped.slice(0, maxPhotos).map(({ _score, _originalIndex, ...photo }) => photo);
}
