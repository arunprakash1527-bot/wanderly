/**
 * UK School Holiday Awareness
 * Detects if trip dates overlap with school holidays, half-terms, or bank holidays.
 * Uses England & Wales dates (Scotland/NI have slight variations).
 * Updated annually — covers 2025-2027.
 */

// School holiday periods (approximate — varies by council, these are common windows)
const SCHOOL_HOLIDAYS = [
  // 2025
  { name: "February Half Term", start: "2025-02-17", end: "2025-02-21", peak: true },
  { name: "Easter Holidays", start: "2025-04-07", end: "2025-04-21", peak: true },
  { name: "May Half Term", start: "2025-05-26", end: "2025-05-30", peak: true },
  { name: "Summer Holidays", start: "2025-07-23", end: "2025-09-02", peak: true },
  { name: "October Half Term", start: "2025-10-27", end: "2025-10-31", peak: true },
  { name: "Christmas Holidays", start: "2025-12-22", end: "2026-01-02", peak: true },
  // 2026
  { name: "February Half Term", start: "2026-02-16", end: "2026-02-20", peak: true },
  { name: "Easter Holidays", start: "2026-03-30", end: "2026-04-13", peak: true },
  { name: "May Half Term", start: "2026-05-25", end: "2026-05-29", peak: true },
  { name: "Summer Holidays", start: "2026-07-22", end: "2026-09-01", peak: true },
  { name: "October Half Term", start: "2026-10-26", end: "2026-10-30", peak: true },
  { name: "Christmas Holidays", start: "2026-12-21", end: "2027-01-01", peak: true },
  // 2027
  { name: "February Half Term", start: "2027-02-15", end: "2027-02-19", peak: true },
  { name: "Easter Holidays", start: "2027-03-29", end: "2027-04-09", peak: true },
  { name: "May Half Term", start: "2027-05-31", end: "2027-06-04", peak: true },
  { name: "Summer Holidays", start: "2027-07-21", end: "2027-09-01", peak: true },
];

// UK Bank Holidays (England & Wales)
const BANK_HOLIDAYS = [
  // 2025
  "2025-01-01", "2025-04-18", "2025-04-21", "2025-05-05", "2025-05-26", "2025-08-25", "2025-12-25", "2025-12-26",
  // 2026
  "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28",
  // 2027
  "2027-01-01", "2027-03-26", "2027-03-29", "2027-05-03", "2027-05-31", "2027-08-30", "2027-12-27", "2027-12-28",
];

/**
 * Check if trip dates overlap with school holidays
 * @param {string} startDate - ISO date string (YYYY-MM-DD)
 * @param {string} endDate - ISO date string (YYYY-MM-DD)
 * @returns {Object} { overlaps: [...], bankHolidays: [...], warnings: [...], isPeakPricing: bool }
 */
export function checkSchoolHolidays(startDate, endDate) {
  if (!startDate || !endDate) return { overlaps: [], bankHolidays: [], warnings: [], isPeakPricing: false };

  const tripStart = new Date(startDate + "T00:00:00");
  const tripEnd = new Date(endDate + "T23:59:59");
  const result = { overlaps: [], bankHolidays: [], warnings: [], isPeakPricing: false };

  // Check school holiday overlaps
  for (const hol of SCHOOL_HOLIDAYS) {
    const holStart = new Date(hol.start + "T00:00:00");
    const holEnd = new Date(hol.end + "T23:59:59");
    if (tripStart <= holEnd && tripEnd >= holStart) {
      result.overlaps.push(hol);
      if (hol.peak) result.isPeakPricing = true;
    }
  }

  // Check bank holiday overlaps
  for (const bh of BANK_HOLIDAYS) {
    const bhDate = new Date(bh + "T12:00:00");
    if (bhDate >= tripStart && bhDate <= tripEnd) {
      result.bankHolidays.push(bh);
    }
  }

  // Generate warnings
  if (result.overlaps.length > 0) {
    const names = result.overlaps.map(h => h.name);
    result.warnings.push({
      type: "school_holiday",
      severity: "info",
      icon: "🏫",
      title: "School holiday period",
      message: `Your trip overlaps with ${names.join(" & ")}. Expect higher prices and busier attractions.`,
    });
  }

  if (result.isPeakPricing) {
    result.warnings.push({
      type: "peak_pricing",
      severity: "warning",
      icon: "💷",
      title: "Peak pricing window",
      message: "Accommodation and activities may cost 20-40% more during school holidays. Book early for the best rates.",
    });
  }

  if (result.bankHolidays.length > 0) {
    result.warnings.push({
      type: "bank_holiday",
      severity: "info",
      icon: "🇬🇧",
      title: "Bank holiday",
      message: `${result.bankHolidays.length} bank holiday${result.bankHolidays.length > 1 ? "s" : ""} during your trip. Some shops may have reduced hours.`,
    });
  }

  // Check if trip is during term time (potential savings note)
  if (result.overlaps.length === 0) {
    result.warnings.push({
      type: "term_time",
      severity: "positive",
      icon: "✅",
      title: "Term-time travel",
      message: "Your dates are outside school holidays — expect lower prices and fewer crowds.",
    });
  }

  return result;
}

/**
 * Get a short label for display in trip cards
 */
export function getHolidayBadge(startDate, endDate) {
  const result = checkSchoolHolidays(startDate, endDate);
  if (result.overlaps.length > 0) {
    return { label: result.overlaps[0].name, isPeak: true, icon: "🏫" };
  }
  if (result.bankHolidays.length > 0) {
    return { label: "Bank holiday", isPeak: false, icon: "🇬🇧" };
  }
  return null;
}
