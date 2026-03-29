import { API } from "../constants/api";
import { authFetch } from "./authFetch";

/**
 * EV Vehicle Profile & Smart Route Charging Planner
 * Calculates range, suggests charging stops along route, and estimates charging time.
 */

// Common EV models with range data (miles, usable battery kWh, max charge speed kW)
export const EV_MODELS = [
  { id: "tesla_m3_lr", make: "Tesla", model: "Model 3 Long Range", rangeMiles: 358, batteryKwh: 75, maxChargeKw: 250, connectors: ["CCS", "Tesla"] },
  { id: "tesla_m3_sr", make: "Tesla", model: "Model 3 Standard", rangeMiles: 272, batteryKwh: 57.5, maxChargeKw: 170, connectors: ["CCS", "Tesla"] },
  { id: "tesla_my_lr", make: "Tesla", model: "Model Y Long Range", rangeMiles: 331, batteryKwh: 75, maxChargeKw: 250, connectors: ["CCS", "Tesla"] },
  { id: "hyundai_ioniq5_lr", make: "Hyundai", model: "IONIQ 5 Long Range", rangeMiles: 315, batteryKwh: 77.4, maxChargeKw: 232, connectors: ["CCS"] },
  { id: "hyundai_ioniq5_sr", make: "Hyundai", model: "IONIQ 5 Standard", rangeMiles: 240, batteryKwh: 58, maxChargeKw: 180, connectors: ["CCS"] },
  { id: "kia_ev6_lr", make: "Kia", model: "EV6 Long Range", rangeMiles: 328, batteryKwh: 77.4, maxChargeKw: 232, connectors: ["CCS"] },
  { id: "kia_niro_ev", make: "Kia", model: "Niro EV", rangeMiles: 285, batteryKwh: 64.8, maxChargeKw: 80, connectors: ["CCS"] },
  { id: "vw_id3_pro", make: "VW", model: "ID.3 Pro", rangeMiles: 264, batteryKwh: 58, maxChargeKw: 120, connectors: ["CCS"] },
  { id: "vw_id4_pro", make: "VW", model: "ID.4 Pro", rangeMiles: 323, batteryKwh: 77, maxChargeKw: 175, connectors: ["CCS"] },
  { id: "bmw_ix1", make: "BMW", model: "iX1 xDrive30", rangeMiles: 272, batteryKwh: 64.7, maxChargeKw: 130, connectors: ["CCS"] },
  { id: "bmw_i4", make: "BMW", model: "i4 eDrive40", rangeMiles: 365, batteryKwh: 83.9, maxChargeKw: 200, connectors: ["CCS"] },
  { id: "mg_zs_ev", make: "MG", model: "ZS EV Long Range", rangeMiles: 273, batteryKwh: 72.6, maxChargeKw: 92, connectors: ["CCS"] },
  { id: "mg4_ev_lr", make: "MG", model: "MG4 EV Long Range", rangeMiles: 281, batteryKwh: 64, maxChargeKw: 144, connectors: ["CCS"] },
  { id: "nissan_leaf_40", make: "Nissan", model: "Leaf 40kWh", rangeMiles: 168, batteryKwh: 40, maxChargeKw: 50, connectors: ["CHAdeMO"] },
  { id: "nissan_ariya", make: "Nissan", model: "Ariya 87kWh", rangeMiles: 329, batteryKwh: 87, maxChargeKw: 130, connectors: ["CCS"] },
  { id: "polestar_2_lr", make: "Polestar", model: "Polestar 2 Long Range", rangeMiles: 340, batteryKwh: 79, maxChargeKw: 200, connectors: ["CCS"] },
  { id: "audi_q4", make: "Audi", model: "Q4 e-tron 50", rangeMiles: 316, batteryKwh: 76.6, maxChargeKw: 175, connectors: ["CCS"] },
  { id: "merc_eqa", make: "Mercedes", model: "EQA 250+", rangeMiles: 329, batteryKwh: 70.5, maxChargeKw: 100, connectors: ["CCS"] },
  { id: "volvo_ex30", make: "Volvo", model: "EX30 Single Motor", rangeMiles: 298, batteryKwh: 69, maxChargeKw: 153, connectors: ["CCS"] },
  { id: "ford_mach_e_sr", make: "Ford", model: "Mustang Mach-E SR", rangeMiles: 273, batteryKwh: 70, maxChargeKw: 115, connectors: ["CCS"] },
  { id: "byd_atto3", make: "BYD", model: "ATTO 3", rangeMiles: 261, batteryKwh: 60.5, maxChargeKw: 88, connectors: ["CCS"] },
  { id: "other", make: "Other", model: "Custom EV", rangeMiles: 250, batteryKwh: 60, maxChargeKw: 100, connectors: ["CCS"] },
];

/**
 * Calculate realistic range based on conditions
 * Real-world range is typically 75-85% of WLTP, affected by speed, weather, load
 */
export function calculateRealisticRange(vehicle, conditions = {}) {
  let efficiency = 0.80; // Base real-world factor (80% of rated)

  // Weather impact
  if (conditions.tempC !== undefined) {
    if (conditions.tempC < 5) efficiency *= 0.85; // Cold weather penalty
    else if (conditions.tempC < 0) efficiency *= 0.75; // Very cold
    else if (conditions.tempC > 35) efficiency *= 0.92; // AC usage
  }

  // Speed impact (motorway vs city)
  if (conditions.motorway) efficiency *= 0.90; // Motorway driving uses more
  if (conditions.headwind) efficiency *= 0.95;

  // Load
  if (conditions.passengers > 3) efficiency *= 0.97;
  if (conditions.roofbox) efficiency *= 0.90;

  const realisticMiles = Math.round(vehicle.rangeMiles * efficiency);
  return {
    ratedRange: vehicle.rangeMiles,
    realisticRange: realisticMiles,
    efficiency: Math.round(efficiency * 100),
    milesPerKwh: Math.round(realisticMiles / vehicle.batteryKwh * 10) / 10,
  };
}

/**
 * Estimate charging time
 * @param {Object} vehicle - EV model object
 * @param {number} fromPercent - Current battery %
 * @param {number} toPercent - Target battery %
 * @param {number} chargerKw - Charger power in kW
 * @returns {Object} { minutes, kwhAdded, rangeAdded }
 */
export function estimateChargeTime(vehicle, fromPercent, toPercent, chargerKw) {
  const actualChargeKw = Math.min(chargerKw, vehicle.maxChargeKw);
  const kwhNeeded = vehicle.batteryKwh * (toPercent - fromPercent) / 100;

  // Charging slows above 80% — model taper curve
  let minutes;
  if (toPercent <= 80) {
    minutes = (kwhNeeded / actualChargeKw) * 60;
  } else {
    const kwhTo80 = Math.max(0, vehicle.batteryKwh * (80 - fromPercent) / 100);
    const kwh80Plus = kwhNeeded - kwhTo80;
    const timeTo80 = (kwhTo80 / actualChargeKw) * 60;
    const time80Plus = (kwh80Plus / (actualChargeKw * 0.4)) * 60; // Taper to 40%
    minutes = timeTo80 + time80Plus;
  }

  return {
    minutes: Math.round(minutes),
    kwhAdded: Math.round(kwhNeeded * 10) / 10,
    rangeAdded: Math.round(kwhNeeded / vehicle.batteryKwh * vehicle.rangeMiles * 0.8),
  };
}

/**
 * Plan charging stops for a route
 * @param {Object} vehicle - EV model
 * @param {number} distanceMiles - Total route distance
 * @param {number} startBattery - Starting battery % (0-100)
 * @param {Object} conditions - Weather/driving conditions
 * @returns {Array} [{ stopNumber, atMiles, batteryAtStop, chargeToPercent, chargeTimeMin, suggestedActivity }]
 */
export function planChargingStops(vehicle, distanceMiles, startBattery = 80, conditions = {}) {
  const range = calculateRealisticRange(vehicle, conditions);
  const availableMiles = range.realisticRange * (startBattery / 100);
  const stops = [];

  if (availableMiles >= distanceMiles) {
    // No stops needed
    return {
      stops: [],
      arrivalBattery: Math.round((1 - distanceMiles / range.realisticRange) * 100 * (startBattery / 100)),
      message: `No charging stops needed. You'll arrive with ~${Math.round(startBattery - (distanceMiles / range.realisticRange * 100))}% battery.`,
    };
  }

  // Need charging stops
  let currentMiles = 0;
  let currentBattery = startBattery;
  let stopNum = 0;
  const safeMinBattery = 15; // Don't go below 15%

  while (currentMiles < distanceMiles) {
    const milesRemaining = distanceMiles - currentMiles;
    const currentRange = range.realisticRange * (currentBattery / 100);

    // Can we reach destination?
    if (currentRange >= milesRemaining + (range.realisticRange * safeMinBattery / 100)) {
      break;
    }

    // Need to stop — drive until battery is at 15%
    const drivableMiles = range.realisticRange * ((currentBattery - safeMinBattery) / 100);
    currentMiles += drivableMiles;
    currentBattery = safeMinBattery;
    stopNum++;

    // Charge to 80% (optimal) unless last stop — then just enough
    const milesToDest = distanceMiles - currentMiles;
    const neededBattery = Math.min(80, Math.ceil((milesToDest / range.realisticRange) * 100) + 20);
    const chargeTime = estimateChargeTime(vehicle, safeMinBattery, neededBattery, 100); // Assume 100kW rapid charger average

    const suggestedActivities = [
      "Grab a coffee while charging",
      "Stretch your legs and explore nearby",
      "Great time for a snack break",
      "Let the kids run around",
      "Check out nearby attractions",
    ];

    stops.push({
      stopNumber: stopNum,
      atMiles: Math.round(currentMiles),
      batteryAtStop: safeMinBattery,
      chargeToPercent: neededBattery,
      chargeTimeMin: chargeTime.minutes,
      rangeAdded: chargeTime.rangeAdded,
      suggestedActivity: suggestedActivities[stopNum % suggestedActivities.length],
    });

    currentBattery = neededBattery;

    // Safety: max 5 stops
    if (stopNum >= 5) break;
  }

  const arrivalBattery = Math.max(0, Math.round(currentBattery - ((distanceMiles - currentMiles) / range.realisticRange * 100)));

  return {
    stops,
    arrivalBattery,
    totalChargeTime: stops.reduce((sum, s) => sum + s.chargeTimeMin, 0),
    message: stops.length === 0
      ? "No charging stops needed"
      : `${stops.length} charging stop${stops.length > 1 ? "s" : ""} recommended (${stops.reduce((s, x) => s + x.chargeTimeMin, 0)} min total charging)`,
  };
}

/**
 * Find nearby chargers along a route at a given point
 */
export async function findChargersAtStop(stopLocation, connectorTypes = ["CCS"]) {
  try {
    const res = await authFetch(API.PLACES, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: `EV charging station near ${stopLocation}`, type: "electric_vehicle_charging_station", radius: 10000 }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.places || []).slice(0, 5);
  } catch {
    return [];
  }
}
