/**
 * Weather Alerts — proactive weather warnings for trip days
 * Checks intelligence data and returns actionable alerts when
 * conditions change significantly (rain, heat, cold, storms, wind).
 */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Check weather data and return relevant alerts for the selected day.
 * @param {Object} intelligence - The trip intelligence object (from fetchTripIntelligence)
 * @param {Object} trip - The trip object
 * @param {number} selectedDay - Currently selected day number
 * @returns {Array<{type: string, severity: string, message: string, icon: string}>}
 */
export function checkWeatherAlerts(intelligence, trip, selectedDay) {
  if (!intelligence?.weather?.current) return [];

  // Only alert for days within 7 days of now (forecast accuracy drops beyond that)
  if (trip?.rawStart) {
    const dayDate = new Date(trip.rawStart + "T00:00:00");
    dayDate.setDate(dayDate.getDate() + (selectedDay - 1));
    const now = new Date();
    const diff = dayDate.getTime() - now.getTime();
    if (diff > SEVEN_DAYS_MS) return [];
  }

  const alerts = [];
  const w = intelligence.weather.current;
  const today = intelligence.weather.today || {};
  const desc = (w.description || "").toLowerCase();
  const temp = typeof w.temp === "number" ? w.temp : null;
  const windSpeed = today.windSpeed || w.windSpeed || 0;
  const rainProb = today.rainProbability ?? today.rainProb ?? null;

  // Storm alert (check first — highest priority)
  if (/storm|thunder/i.test(desc)) {
    alerts.push({
      type: "storm",
      severity: "warning",
      message: "Storms possible — check outdoor activities",
      icon: "\u26C8\uFE0F",
    });
  }

  // Rain alert
  if ((rainProb !== null && rainProb > 60) || /rain|drizzle|shower/i.test(desc)) {
    alerts.push({
      type: "rain",
      severity: "warning",
      message: "Rain expected — pack waterproofs",
      icon: "\uD83C\uDF27\uFE0F",
    });
  }

  // Heat alert
  if (temp !== null && temp > 30) {
    alerts.push({
      type: "heat",
      severity: "warning",
      message: "High heat — stay hydrated, plan indoor breaks",
      icon: "\uD83D\uDD25",
    });
  }

  // Cold alert
  if (temp !== null && temp < 5) {
    alerts.push({
      type: "cold",
      severity: "info",
      message: "Very cold — dress in layers",
      icon: "\uD83E\uDD76",
    });
  }

  // Wind alert
  if (windSpeed > 40) {
    alerts.push({
      type: "wind",
      severity: "info",
      message: "Strong winds expected",
      icon: "\uD83D\uDCA8",
    });
  }

  return alerts;
}

/**
 * Build a one-line weather summary for the current day.
 * @param {Object} intelligence - The trip intelligence object
 * @returns {string|null}
 */
export function getWeatherSummaryForDay(intelligence) {
  if (!intelligence?.weather?.current) return null;

  const w = intelligence.weather.current;
  const today = intelligence.weather.today || {};
  const parts = [];

  if (typeof w.temp === "number") {
    parts.push(`${w.temp}\u00B0C`);
  }
  if (w.description) {
    parts.push(w.description);
  }
  if (today.high != null && today.low != null) {
    parts.push(`H:${today.high}\u00B0 L:${today.low}\u00B0`);
  }
  if (today.rainProbability != null || today.rainProb != null) {
    const prob = today.rainProbability ?? today.rainProb;
    if (prob > 20) parts.push(`${prob}% rain`);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}
