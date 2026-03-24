/**
 * Generates all data needed for the "Trip Wrapped" Spotify-style recap.
 * Pure function — no side effects, easily testable.
 */
import { getCatInfo } from '../constants/expenses';

export function generateWrappedData(trip, expenses, photos, polls, timeline) {
  // ─── Basic trip info ───
  const places = trip.places || [];
  const travellers = trip.travellers || {};
  const adults = travellers.adults || [];
  const teens = travellers.olderKids || [];
  const children = travellers.youngerKids || [];
  const infants = travellers.infants || [];
  const totalTravellers = adults.length + teens.length + children.length + infants.length;

  // Duration
  let numDays = 1;
  if (trip.rawStart && trip.rawEnd) {
    numDays = Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1);
  }

  const dateRange = trip.rawStart && trip.rawEnd
    ? `${fmtDate(trip.rawStart)} – ${fmtDate(trip.rawEnd)}`
    : (trip.start && trip.end ? `${trip.start} – ${trip.end}` : "");

  // ─── Expense stats ───
  const totalSpent = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  // Category breakdown
  const byCategory = {};
  expenses.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
  const catTotal = Object.values(byCategory).reduce((a, b) => a + b, 0);
  const categoryBreakdown = Object.entries(byCategory)
    .map(([cat, amount]) => ({
      ...getCatInfo(cat), amount, percentage: catTotal > 0 ? (amount / catTotal) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Who paid the most
  const paidByTotals = {};
  expenses.forEach(e => { paidByTotals[e.paid_by] = (paidByTotals[e.paid_by] || 0) + e.amount; });
  const topSpender = Object.entries(paidByTotals).sort((a, b) => b[1] - a[1])[0] || null;
  const biggestExpense = expenses.length > 0
    ? expenses.reduce((max, e) => e.amount > max.amount ? e : max, expenses[0])
    : null;

  // Most generous (paid most relative to their share)
  const balances = {};
  expenses.forEach(exp => {
    balances[exp.paid_by] = (balances[exp.paid_by] || 0) + exp.amount;
    (exp.splits || []).forEach(s => {
      balances[s.participant_name] = (balances[s.participant_name] || 0) - s.share_amount;
    });
  });
  const mostGenerous = Object.entries(balances).sort((a, b) => b[1] - a[1])[0] || null;

  // Average per person per day
  const avgPerPersonPerDay = totalTravellers > 0 && numDays > 0
    ? totalSpent / totalTravellers / numDays
    : 0;

  // ─── Photo stats ───
  const photosCount = photos.length;
  const likedPhotos = photos.filter(p => p.liked);
  const captionedPhotos = photos.filter(p => p.caption);

  // Best moments — top 3 by score
  const scored = photos.map(p => {
    let score = 0;
    if (p.liked) score += 10;
    if (p.caption) score += 5;
    if (p.day && p.day !== "Untagged") score += 3;
    return { ...p, _score: score };
  }).sort((a, b) => b._score - a._score);
  const bestMoments = scored.slice(0, 3).map(({ _score, ...p }) => p);

  // Most photographed day
  const photosByDay = {};
  photos.forEach(p => {
    const d = p.day || "Untagged";
    photosByDay[d] = (photosByDay[d] || 0) + 1;
  });
  const mostPhotographedDay = Object.entries(photosByDay)
    .filter(([d]) => d !== "Untagged")
    .sort((a, b) => b[1] - a[1])[0] || null;

  // ─── Poll stats ───
  const pollCount = (polls || []).length;
  const totalVotes = (polls || []).reduce((sum, p) => sum + (p.votes || 0), 0);
  const mostVotedPoll = (polls || []).length > 0
    ? (polls || []).reduce((max, p) => (p.votes || 0) > (max.votes || 0) ? p : max, polls[0])
    : null;

  // ─── Timeline / itinerary stats ───
  let totalActivities = 0;
  const allTimelineItems = [];
  if (timeline) {
    Object.entries(timeline).forEach(([day, items]) => {
      if (Array.isArray(items)) {
        totalActivities += items.length;
        items.forEach(item => allTimelineItems.push({ ...item, day: parseInt(day, 10) }));
      }
    });
  }

  // Highest rated activity
  const ratedItems = allTimelineItems.filter(i => i.rating && i.rating >= 4);
  const topRatedActivity = ratedItems.sort((a, b) => (b.rating || 0) - (a.rating || 0))[0] || null;

  // ─── Journey / places ───
  const stays = trip.stays || [];
  const stayNames = trip.stayNames || stays.map(s => s.name).filter(Boolean);

  // ─── Activity log stats ───
  const activity = trip.activity || [];
  const milestones = activity.filter(a => a.type === "milestone");

  return {
    // Card 1: Intro
    tripName: trip.name,
    places,
    dateRange,
    year: trip.year || new Date().getFullYear(),

    // Card 2: By the numbers
    numDays,
    totalTravellers,
    placesVisited: places.length,
    photosCount,
    totalSpent,
    totalActivities,
    staysCount: stays.length,

    // Card 3: Spending
    categoryBreakdown,
    avgPerPersonPerDay,
    biggestExpense,

    // Card 4: Superlatives
    topSpender,     // [name, amount]
    mostGenerous,   // [name, balance]
    travellers: { adults, teens, children, infants },

    // Card 5: Best moments
    bestMoments,
    likedCount: likedPhotos.length,
    mostPhotographedDay, // [dayLabel, count]

    // Card 6: Polls
    pollCount,
    totalVotes,
    mostVotedPoll,

    // Card 7: Journey
    stayNames,
    stays,
    travelModes: trip.travel || [],

    // Card 8: Final
    topRatedActivity,
    milestoneCount: milestones.length,
  };
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return `${d.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]}`;
}
