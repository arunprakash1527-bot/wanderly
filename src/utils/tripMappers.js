// ─── Trip Data Mappers ───
// Pure functions to convert between Supabase DB format and app format

/**
 * Map a trip row from Supabase (with joins) to the app's trip object format
 */
export function mapTripFromDB(t) {
  return {
    id: t.id,
    name: t.name,
    brief: t.brief,
    start: t.start_date,
    end: t.end_date,
    rawStart: t.start_date,
    rawEnd: t.end_date,
    places: t.places || [],
    travel: t.travel_modes || [],
    status: t.status,
    shareCode: t.share_code,
    budget: t.budget || "",
    startLocation: t.start_location || "",
    year: t.start_date ? new Date(t.start_date).getFullYear() : new Date().getFullYear(),
    travellers: {
      adults: (t.trip_travellers || [])
        .filter(tr => tr.role === 'lead' || tr.role === 'adult')
        .map(tr => ({
          name: tr.name,
          email: tr.email || "",
          isLead: tr.role === 'lead',
          dbId: tr.id,
          isClaimed: tr.is_claimed,
        })),
      olderKids: (t.trip_travellers || [])
        .filter(tr => tr.role === 'child_older' || tr.role === 'teen')
        .map(tr => ({ name: tr.name, age: tr.age || 14, dbId: tr.id })),
      youngerKids: (t.trip_travellers || [])
        .filter(tr => tr.role === 'child_younger' || tr.role === 'child')
        .map(tr => ({ name: tr.name, age: tr.age || 6, dbId: tr.id })),
      infants: (t.trip_travellers || [])
        .filter(tr => tr.role === 'infant')
        .map(tr => ({ name: tr.name, age: tr.age || 0, dbId: tr.id })),
    },
    stays: (t.trip_stays || []).map(s => ({
      name: s.name, type: s.type, tags: s.tags || [], rating: s.rating,
      price: s.price, location: s.location, checkIn: s.check_in, checkOut: s.check_out,
      cost: s.cost ? String(s.cost) : "", bookingRef: s.booking_ref || "",
      address: s.address || "", dbId: s.id,
    })),
    stayNames: (t.trip_stays || []).map(s => s.name),
    prefs: t.trip_preferences && t.trip_preferences.length > 0 ? {
      food: t.trip_preferences[0].food_prefs || [],
      adultActs: t.trip_preferences[0].adult_activities || [],
      olderActs: t.trip_preferences[0].older_kid_activities || [],
      youngerActs: t.trip_preferences[0].younger_kid_activities || [],
      instructions: t.trip_preferences[0].instructions || "",
      activities: [
        ...(t.trip_preferences[0].adult_activities || []),
        ...(t.trip_preferences[0].older_kid_activities || []),
        ...(t.trip_preferences[0].younger_kid_activities || []),
      ],
    } : { food: [], adultActs: [], olderActs: [], youngerActs: [], instructions: "", activities: [] },
    createdAt: t.created_at,
    dbId: t.id,
    timeline: [],
    polls: t.polls || [],
    activity: t.activity || [],
  };
}

/**
 * Map app trip data to Supabase trips table insert format
 */
export function mapTripForInsert(tripData, userId) {
  return {
    name: tripData.name,
    brief: tripData.brief,
    start_date: tripData.rawStart || null,
    end_date: tripData.rawEnd || null,
    places: tripData.places,
    travel_modes: Array.from(tripData.travel || []),
    status: 'draft',
    lead_user_id: userId,
  };
}

/**
 * Map app travellers to Supabase trip_travellers insert rows
 */
export function mapTravellersForInsert(tripData, tripId, userId) {
  const rows = [];
  if (tripData.travellers?.adults) {
    tripData.travellers.adults.forEach(a => {
      rows.push({
        trip_id: tripId,
        user_id: a.isLead ? userId : null,
        name: a.name || 'Adult',
        email: a.email || null,
        role: a.isLead ? 'lead' : 'adult',
        is_claimed: a.isLead,
      });
    });
  }
  if (tripData.travellers?.olderKids) {
    tripData.travellers.olderKids.forEach(c => {
      rows.push({ trip_id: tripId, name: c.name || 'Child', role: 'child_older', age: c.age });
    });
  }
  if (tripData.travellers?.youngerKids) {
    tripData.travellers.youngerKids.forEach(c => {
      rows.push({ trip_id: tripId, name: c.name || 'Child', role: 'child_younger', age: c.age });
    });
  }
  if (tripData.travellers?.infants) {
    tripData.travellers.infants.forEach(c => {
      rows.push({ trip_id: tripId, name: c.name || 'Baby', role: 'infant', age: c.age });
    });
  }
  return rows;
}

/**
 * Map app stays to Supabase trip_stays insert rows
 */
export function mapStaysForInsert(stays, tripId) {
  return (stays || []).map(s => ({
    trip_id: tripId,
    name: s.name,
    type: s.type,
    tags: s.tags || [],
    rating: s.rating,
    price: s.price,
    location: s.location,
    check_in: s.checkIn || null,
    check_out: s.checkOut || null,
    cost: s.cost ? parseFloat(s.cost) : null,
    booking_ref: s.bookingRef || null,
    address: s.address || null,
  }));
}

/**
 * Map app preferences to Supabase trip_preferences insert row
 */
export function mapPrefsForInsert(prefs, tripId) {
  if (!prefs) return null;
  return {
    trip_id: tripId,
    food_prefs: Array.from(prefs.food || []),
    adult_activities: Array.from(prefs.adultActs || prefs.activities || []),
    older_kid_activities: Array.from(prefs.olderActs || []),
    younger_kid_activities: Array.from(prefs.youngerActs || []),
    instructions: prefs.instructions || "",
  };
}
