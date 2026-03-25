// ─── Offline Cache Utility ───
// Caches trip data and user info to localStorage for offline access

const TRIPS_KEY = 'twm_offline_trips';
const TRIPS_TS_KEY = 'twm_offline_trips_ts';
const USER_KEY = 'twm_offline_user';

/**
 * Save trips to localStorage for offline access.
 * @param {Array} trips - Array of trip objects
 */
export function cacheTripsOffline(trips) {
  try {
    localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
    localStorage.setItem(TRIPS_TS_KEY, JSON.stringify(Date.now()));
  } catch (err) {
    console.warn('Failed to cache trips offline:', err);
  }
}

/**
 * Retrieve cached trips from localStorage.
 * @returns {Array|null} Cached trips array, or null if none cached
 */
export function getOfflineTrips() {
  try {
    const raw = localStorage.getItem(TRIPS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to read offline trips cache:', err);
    return null;
  }
}

/**
 * Get the age of the offline cache in milliseconds.
 * @returns {number|null} Age in ms, or null if no cache exists
 */
export function getOfflineCacheAge() {
  try {
    const raw = localStorage.getItem(TRIPS_TS_KEY);
    if (!raw) return null;
    return Date.now() - JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Cache the current user's basic info for offline display.
 * @param {Object} user - User object (from auth)
 */
export function cacheUserOffline(user) {
  if (!user) return;
  try {
    const basic = {
      name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
      email: user.email || '',
    };
    localStorage.setItem(USER_KEY, JSON.stringify(basic));
  } catch (err) {
    console.warn('Failed to cache user offline:', err);
  }
}

/**
 * Retrieve cached user info.
 * @returns {Object|null}
 */
export function getOfflineUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
