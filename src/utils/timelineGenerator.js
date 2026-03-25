import { T } from "../styles/tokens";
import { getLocationActivities, estimateTravelHours } from "./locationHelpers";

/**
 * Pure function: generates a multi-day timeline object { 1: [...], 2: [...], ... }
 * from a trip object. No React state dependencies.
 */
export function generateMultiDayTimeline(trip) {
  let numDays = 1;
  const stays = trip.stays || [];
  if (stays.length > 0) {
    const checkIns = stays.map(s => s.checkIn).filter(Boolean).sort();
    const checkOuts = stays.map(s => s.checkOut).filter(Boolean).sort();
    if (checkIns.length > 0 && checkOuts.length > 0) {
      const stayStart = checkIns[0];
      const stayEnd = checkOuts[checkOuts.length - 1];
      const stayDays = Math.max(1, Math.round((new Date(stayEnd + "T12:00:00") - new Date(stayStart + "T12:00:00")) / 86400000) + 1);
      const rawDays = trip.rawStart && trip.rawEnd ? Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1) : null;
      if (rawDays && stayDays < rawDays && stayDays <= 30) {
        numDays = stayDays;
      } else {
        numDays = rawDays || stayDays;
      }
    }
  }
  if (numDays <= 1 && trip.rawStart && trip.rawEnd) {
    numDays = Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1);
  }
  const food = trip.prefs.food.length > 0 ? trip.prefs.food : ["Local cuisine"];
  const foodLabel = food.join(" + ");
  const travelMode = trip.travel[0] || "Travel";
  const allKids = [...(trip.travellers?.olderKids || []), ...(trip.travellers?.youngerKids || []), ...(trip.travellers?.infants || [])];
  const hasKids = allKids.length > 0;
  const budgetTier = { "Budget": { label: "budget-friendly", price: "£" }, "Mid-range": { label: "mid-range", price: "££" }, "Luxury": { label: "upscale", price: "£££" }, "No limit": { label: "top-rated", price: "££££" } }[trip.budget] || { label: "local", price: "££" };
  const ctx = (trip.summary || "") + " " + (trip.prefs.instructions || "");
  const ctxLower = ctx.toLowerCase();
  const wantsDogFriendly = /dog|pet/.test(ctxLower);
  const wantsAccessible = /accessible|wheelchair|mobility|pushchair|buggy|pram/.test(ctxLower);
  const wantsPubs = /pub|pubs|tavern|inn/.test(ctxLower);
  const wantsAvoidSteep = /avoid.*steep|no.*steep|gentle|easy.*walk|flat/.test(ctxLower);
  const prefs = trip.activationPrefs || {};
  const startHour = prefs.startTime ? parseInt(prefs.startTime.split(":")[0]) : 8;
  const startMin = prefs.startTime ? parseInt(prefs.startTime.split(":")[1] || "0") : 0;
  const isPacked = prefs.dayOnePace === "packed";
  const isRelaxed = prefs.dayOnePace === "relaxed";
  const isEV = trip.travel?.some(m => /\bev\b/i.test(m) && !/non[\s-]*ev/i.test(m));
  const enabledStops = (prefs.stopovers || []).filter(s => s.enabled);
  const tags = (base) => { const t = [base]; if (wantsDogFriendly) t.push("🐕 Dog-friendly"); if (wantsAccessible) t.push("♿ Accessible"); return t.join(" · "); };
  const fmtTime = (h, m = 0) => { const hh = Math.floor(h); const mm = m || Math.round((h - hh) * 60); const suffix = hh >= 12 ? "PM" : "AM"; const hr = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh; return `${hr}:${mm.toString().padStart(2, "0")} ${suffix}`; };

  // ─── BUILD DAY-TO-PLACE MAP ───
  const sortedStays = [...(trip.stays || [])].filter(s => s.checkIn && s.location).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const tripStartDate = trip.rawStart ? new Date(trip.rawStart + "T12:00:00") : new Date();
  const places = trip.places || [];

  const uniqueStayLocations = [...new Set(sortedStays.map(s => s.location.toLowerCase().trim()))];
  const isBaseCamp = sortedStays.length >= 1 && uniqueStayLocations.length === 1 && places.length > 1;

  const dayMap = {};
  if (isBaseCamp) {
    const baseStay = sortedStays[0];
    const baseLoc = baseStay.location;
    const baseStayName = baseStay.name;
    const dayTripPlaces = places.filter(p => p.toLowerCase().trim() !== baseLoc.toLowerCase().trim());

    for (let d = 1; d <= numDays; d++) {
      const isFirst = d === 1;
      const isLast = d === numDays;
      let dayPlace, isDayTrip = false;

      if (isFirst) {
        dayPlace = baseLoc;
      } else if (isLast) {
        dayPlace = baseLoc;
      } else {
        const dtIdx = (d - 2) % Math.max(1, dayTripPlaces.length);
        if (dayTripPlaces.length > 0) {
          dayPlace = dayTripPlaces[dtIdx];
          isDayTrip = true;
        } else {
          dayPlace = baseLoc;
        }
      }

      const prevDay = dayMap[d - 1];
      dayMap[d] = {
        place: dayPlace,
        stayName: baseStayName,
        prevPlace: prevDay ? prevDay.place : null,
        isTransit: false,
        isBaseCamp: true,
        isDayTrip,
        baseLoc,
        baseStayName,
      };
    }
  } else if (sortedStays.length > 1) {
    for (let d = 1; d <= numDays; d++) {
      const dayDateStr = new Date(tripStartDate.getTime() + (d - 1) * 86400000).toISOString().split("T")[0];
      let matchedStay = sortedStays.find(s => s.checkIn <= dayDateStr && s.checkOut > dayDateStr);
      if (!matchedStay) matchedStay = sortedStays.find(s => s.checkIn === dayDateStr);
      if (!matchedStay && d === 1) matchedStay = sortedStays[0];
      if (!matchedStay) {
        matchedStay = sortedStays.reduce((best, s) => {
          const diff = Math.abs(new Date(s.checkIn + "T12:00:00") - new Date(dayDateStr + "T12:00:00"));
          return (!best || diff < best.diff) ? { ...s, diff } : best;
        }, null);
      }
      const place = matchedStay?.location || places[0] || "your destination";
      const stayName = matchedStay?.name || "accommodation";
      const prevDay = dayMap[d - 1];
      const prevPlace = prevDay ? prevDay.place : null;
      const isTransit = prevPlace && prevPlace.toLowerCase() !== place.toLowerCase();
      dayMap[d] = { place, stayName, prevPlace, isTransit };
    }
  } else if (places.length > 0) {
    const daysPerPlace = Math.floor(numDays / places.length);
    const extraDays = numDays % places.length;
    let dayIdx = 1;
    for (let p = 0; p < places.length; p++) {
      const daysForThis = daysPerPlace + (p < extraDays ? 1 : 0);
      for (let dd = 0; dd < daysForThis; dd++) {
        const prevDay = dayMap[dayIdx - 1];
        const prevPlace = prevDay ? prevDay.place : null;
        const isTransit = prevPlace && prevPlace.toLowerCase() !== places[p].toLowerCase();
        dayMap[dayIdx] = { place: places[p], stayName: `accommodation in ${places[p]}`, prevPlace, isTransit };
        dayIdx++;
      }
    }
  } else {
    for (let d = 1; d <= numDays; d++) {
      dayMap[d] = { place: "your destination", stayName: "accommodation", prevPlace: null, isTransit: false };
    }
  }

  // ─── ACTIVITY & DINNER BUILDERS ───
  const getLocPools = (loc) => {
    const locActs = getLocationActivities(loc);
    if (locActs) return locActs;
    return {
      morning: [`Explore ${loc}`, `Walking tour of ${loc}`, `Local market in ${loc}`, "Scenic viewpoint", "Cultural tour"],
      afternoon: [`${loc} sightseeing walk`, "Shopping & souvenirs", "Museum visit", "Garden walk", "Photography walk"],
      dinner: wantsPubs ? [`Local pub in ${loc}`, "Pub supper", "Gastropub dinner"] : [`Dinner in ${loc}`, "Evening meal", "Dinner out"],
      kids: [`${loc} playground`, `Nature walk in ${loc}`, "Soft play", "Family activity"],
    };
  };

  const buildDinnerTitle = (loc, dayIdx) => {
    const locActs = getLocationActivities(loc);
    if (locActs?.dinner?.length > 0) return locActs.dinner[dayIdx % locActs.dinner.length];
    if (food.length > 0 && food[0] !== "Local cuisine") {
      const cuisine = food[dayIdx % food.length];
      return `${cuisine} ${wantsPubs ? "pub" : "restaurant"} in ${loc}`;
    }
    return wantsPubs ? "Dinner at local pub" : `Dinner in ${loc}`;
  };

  const pickAct = (pool, dayIdx, avoid) => {
    if (!pool || pool.length === 0) return null;
    let act = pool[dayIdx % pool.length];
    if (avoid && avoid.test(act.toLowerCase())) {
      act = pool.find(a => !avoid.test(a.toLowerCase())) || act;
    }
    return act;
  };
  const steepTest = wantsAvoidSteep ? /hik|trail|climb|trek|summit|ridge/ : null;

  // ─── GENERATE EACH DAY ───
  const days = {};
  const usedActIdx = {};
  const nextActIdx = (loc, pool) => {
    const key = loc + pool;
    usedActIdx[key] = (usedActIdx[key] || 0) + 1;
    return usedActIdx[key] - 1;
  };

  for (let d = 1; d <= numDays; d++) {
    const items = [];
    const isFirst = d === 1;
    const isLast = d === numDays;
    const { place: loc, stayName, prevPlace, isTransit } = dayMap[d];
    const locPools = getLocPools(loc);
    const kidPool = locPools.kids || [`Family activity in ${loc}`, "Nature walk", "Playground"];

    if (isFirst) {
      const travelHrs = estimateTravelHours(trip.startLocation || "", loc, travelMode);
      const evTime = isEV ? (enabledStops.filter(s => s.type === "ev_charge" && s.enabled).length * 0.5) : 0;
      const totalTravelHrs = travelHrs + evTime;
      const arrivalHour = Math.min(Math.floor(startHour + startMin / 60 + totalTravelHrs), 22);
      const arrivalMin = Math.round((totalTravelHrs % 1) * 60);
      const remainingHours = 22 - arrivalHour;

      if (trip.startLocation) {
        const tLabel = travelHrs >= 1 ? `~${Math.round(travelHrs * 10) / 10} hrs` : `~${Math.round(travelHrs * 60)} min`;
        items.push({ time: fmtTime(startHour, startMin), title: `Depart ${trip.startLocation}`, desc: `${travelMode} · ${tLabel} to ${loc}${isEV ? " · Full charge before departure" : ""}`, group: "Everyone", color: T.a });
      }

      const midHour = startHour + Math.floor(travelHrs / 2);
      const firstLegStops = enabledStops.filter(s => s.desc && s.desc.includes(trip.startLocation) && s.desc.includes(loc));
      firstLegStops.filter(s => s.type === "ev_charge").forEach((stop, si) => {
        items.push({ time: fmtTime(Math.max(Math.min(midHour + si, arrivalHour - 1), startHour + 1)), title: `⚡ Charge & Refresh`, desc: `${stop.desc} · ~30 min rapid charge · Grab coffee & snacks while charging`, group: "Everyone", color: T.amber, evSearch: { from: trip.startLocation, to: loc } });
      });
      firstLegStops.filter(s => s.type === "rest").forEach((stop, si) => {
        items.push({ time: fmtTime(Math.max(Math.min(midHour + si, arrivalHour - 1), startHour + 1)), title: `☕ Rest stop`, desc: `${stop.desc} · Quick break`, group: "Everyone", color: T.amber });
      });

      items.push({ time: fmtTime(arrivalHour, arrivalMin), title: `Arrive ${loc}`, desc: `Check in at ${stayName} · Drop bags, freshen up`, group: "Everyone", color: T.a });

      if (!isRelaxed && remainingHours >= 2) {
        const exploreHr = Math.min(arrivalHour + 1, 18);
        const idx = nextActIdx(loc, "m");
        const act = pickAct(locPools.morning, idx, steepTest) || `Explore ${loc}`;
        items.push({ time: fmtTime(exploreHr), title: act, desc: tags(`${loc} · ${budgetTier.label}`), group: hasKids ? "Adults" : "Everyone", color: T.blue });
        if (hasKids) {
          const kidAct = pickAct(kidPool, nextActIdx(loc, "k"), null) || `Family time in ${loc}`;
          items.push({ time: fmtTime(exploreHr), title: kidAct, desc: tags(`${loc} · Family-friendly`), group: "Kids", color: T.pink });
        }
        if (isPacked && remainingHours >= 4) {
          const lunchHr = Math.min(exploreHr + 2, 15);
          items.push({ time: fmtTime(lunchHr), title: `Lunch — ${foodLabel}`, desc: `${budgetTier.label} ${wantsPubs ? "pub" : "restaurant"} · ${budgetTier.price}`, group: "Everyone", color: T.coral });
          if (remainingHours >= 6) {
            const pmAct = pickAct(locPools.afternoon, nextActIdx(loc, "a"), steepTest) || `Stroll around ${loc}`;
            items.push({ time: fmtTime(Math.min(lunchHr + 2, 17)), title: pmAct, desc: tags(`${loc} · Afternoon`), group: "Everyone", color: T.blue });
          }
        }
      } else if (isRelaxed && remainingHours >= 3) {
        items.push({ time: fmtTime(Math.min(arrivalHour + 1, 18)), title: `Gentle stroll around ${loc}`, desc: tags(`Take it easy after the journey`), group: "Everyone", color: T.blue });
      }

      const dinnerHr = Math.max(arrivalHour + 2, 18);
      items.push({ time: fmtTime(Math.min(dinnerHr, 20)), title: buildDinnerTitle(loc, 0), desc: `${foodLabel} · ${budgetTier.label} · ${budgetTier.price}${wantsDogFriendly ? " · 🐕 Dog-friendly" : ""}`, group: "Everyone", color: T.coral });

    } else if (isLast && numDays > 1) {
      const dayInfo = dayMap[d];
      const departureLoc = dayInfo.isBaseCamp ? dayInfo.baseLoc : loc;
      const departureStay = dayInfo.isBaseCamp ? dayInfo.baseStayName : stayName;
      const returnHrs = estimateTravelHours(departureLoc, trip.startLocation || "", travelMode);
      const rLabel = returnHrs >= 1 ? `~${Math.round(returnHrs * 10) / 10} hrs` : `~${Math.round(returnHrs * 60)} min`;
      items.push({ time: fmtTime(8), title: "Breakfast", desc: departureStay, group: "Everyone", color: T.coral });
      items.push({ time: fmtTime(9, 30), title: "Check out & pack", desc: `${departureStay} · Bags ready`, group: "Everyone", color: T.t3 });
      const lastAct = pickAct(locPools.morning, nextActIdx(departureLoc, "m"), steepTest) || `Farewell stroll in ${departureLoc}`;
      items.push({ time: fmtTime(10), title: lastAct, desc: tags(`${departureLoc} · Final morning`), group: "Everyone", color: T.blue });
      if (hasKids) {
        const kidAct = pickAct(kidPool, nextActIdx(departureLoc, "k"), null);
        if (kidAct) items.push({ time: fmtTime(10), title: kidAct, desc: tags(`${departureLoc} · Last day fun`), group: "Kids", color: T.pink });
      }
      items.push({ time: fmtTime(12), title: "Lunch & depart", desc: `${foodLabel} · ${budgetTier.price} · Then ${travelMode.toLowerCase()} home (${rLabel})`, group: "Everyone", color: T.coral });
      if (trip.startLocation) {
        items.push({ time: fmtTime(14), title: `🚗 ${travelMode} home`, desc: `${departureLoc} → ${trip.startLocation} · ${rLabel}${isEV ? " · Plan charging stop" : ""}`, group: "Everyone", color: T.a });
        if (isEV) {
          items.push({ time: fmtTime(14 + Math.floor(returnHrs / 2)), title: `⚡ Charge & Lunch Stop`, desc: `Service station en route · ~30 min rapid charge · Grab a meal while charging`, group: "Everyone", color: T.amber, evSearch: { from: departureLoc, to: trip.startLocation } });
        }
        const arriveHomeHr = Math.min(14 + Math.ceil(returnHrs) + (isEV ? 1 : 0), 23);
        items.push({ time: fmtTime(arriveHomeHr), title: `🏠 Arrive home`, desc: `Back in ${trip.startLocation} · Trip complete! Unpack & rest`, group: "Everyone", color: "#1B8F6A" });
      }

    } else {
      const dayInfo = dayMap[d];

      if (dayInfo.isDayTrip && dayInfo.baseLoc) {
        const legHrs = estimateTravelHours(dayInfo.baseLoc, loc, travelMode);
        const legLabel = legHrs >= 1 ? `~${Math.round(legHrs * 10) / 10} hrs` : `~${Math.round(legHrs * 60)} min`;
        const departHr = startHour;

        items.push({ time: fmtTime(departHr), title: "Breakfast", desc: dayInfo.baseStayName, group: "Everyone", color: T.coral });
        items.push({ time: fmtTime(departHr + 1), title: `🚗 Day trip to ${loc}`, desc: `${dayInfo.baseLoc} → ${loc} · ${legLabel}${isEV ? " · Check charge level" : ""}`, group: "Everyone", color: T.a });

        if (isEV && legHrs >= 1.5) {
          const evHr = departHr + 1 + Math.floor(legHrs / 2);
          items.push({ time: fmtTime(evHr), title: `⚡ Charge & Coffee Stop`, desc: `En route to ${loc} · ~30 min rapid charge`, group: "Everyone", color: T.amber, evSearch: { from: dayInfo.baseLoc, to: loc } });
        }

        const arriveHr = Math.min(Math.floor(departHr + 1 + legHrs + (isEV && legHrs >= 1.5 ? 0.5 : 0)), 13);
        items.push({ time: fmtTime(arriveHr), title: `Arrive ${loc}`, desc: `Day trip — exploring ${loc}`, group: "Everyone", color: T.a });

        const mIdx = nextActIdx(loc, "m");
        const morningAct = pickAct(locPools.morning, mIdx, steepTest) || `Explore ${loc}`;
        items.push({ time: fmtTime(Math.min(arriveHr + 0.5, 12)), title: morningAct, desc: tags(`${loc} · ${budgetTier.label}`), group: hasKids ? "Adults" : "Everyone", color: T.blue });
        if (hasKids) {
          const kidAct = pickAct(kidPool, nextActIdx(loc, "k"), null) || `Family time in ${loc}`;
          items.push({ time: fmtTime(Math.min(arriveHr + 0.5, 12)), title: kidAct, desc: tags(`${loc} · Family-friendly`), group: "Kids", color: T.pink });
        }

        items.push({ time: fmtTime(13), title: `Lunch in ${loc}`, desc: `${foodLabel} · ${budgetTier.label} · ${budgetTier.price}`, group: "Everyone", color: T.coral });

        const pmAct = pickAct(locPools.afternoon, nextActIdx(loc, "a"), steepTest) || `Afternoon in ${loc}`;
        items.push({ time: fmtTime(14, 30), title: pmAct, desc: tags(`${loc} · Afternoon`), group: hasKids ? "Adults" : "Everyone", color: T.blue });
        if (hasKids) {
          const kidPmAct = pickAct(kidPool, nextActIdx(loc, "k"), null) || "Free play";
          items.push({ time: fmtTime(14, 30), title: kidPmAct, desc: tags(`${loc} · Fun for kids`), group: "Kids", color: T.pink });
        }

        const returnDepartHr = 16;
        items.push({ time: fmtTime(returnDepartHr), title: `🚗 Return to ${dayInfo.baseLoc}`, desc: `${loc} → ${dayInfo.baseLoc} · ${legLabel}`, group: "Everyone", color: T.a });
        if (isEV && legHrs >= 1.5) {
          items.push({ time: fmtTime(returnDepartHr + Math.floor(legHrs / 2)), title: `⚡ Charge & Refresh`, desc: `En route back · ~30 min rapid charge`, group: "Everyone", color: T.amber, evSearch: { from: loc, to: dayInfo.baseLoc } });
        }
        const returnArriveHr = Math.min(Math.floor(returnDepartHr + legHrs + (isEV && legHrs >= 1.5 ? 0.5 : 0)), 20);
        items.push({ time: fmtTime(returnArriveHr), title: `Back at ${dayInfo.baseStayName}`, desc: `Freshen up · Relax`, group: "Everyone", color: T.t3 });

      } else if (isTransit) {
        const legHrs = estimateTravelHours(prevPlace, loc, travelMode);
        const legLabel = legHrs >= 1 ? `~${Math.round(legHrs * 10) / 10} hrs` : `~${Math.round(legHrs * 60)} min`;
        const prevStay = dayMap[d - 1]?.stayName || "accommodation";
        items.push({ time: fmtTime(8), title: "Breakfast & check out", desc: `${prevStay} · Pack up & say goodbye to ${prevPlace}`, group: "Everyone", color: T.coral });
        items.push({ time: fmtTime(9, 30), title: `${travelMode} to ${loc}`, desc: `${prevPlace} → ${loc} · ${legLabel}${isEV ? " · Check charge level" : ""}`, group: "Everyone", color: T.a });
        if (isEV && legHrs >= 2) {
          const evHr = Math.min(9 + Math.floor(legHrs / 2), 13);
          items.push({ time: fmtTime(evHr, 30), title: `⚡ Charge & Coffee Stop`, desc: `Service station en route to ${loc} · ~30 min rapid charge · Stretch & refresh`, group: "Everyone", color: T.amber, evSearch: { from: prevPlace, to: loc } });
        }
        const arriveHr = Math.min(Math.floor(9.5 + legHrs + (isEV && legHrs >= 2 ? 0.5 : 0)), 16);
        items.push({ time: fmtTime(arriveHr), title: `Arrive ${loc}`, desc: `Check in at ${stayName} · Settle in`, group: "Everyone", color: T.a });

        const freeHr = Math.min(arriveHr + 1, 15);
        const pmAct = pickAct(locPools.afternoon, nextActIdx(loc, "a"), steepTest) || `Explore ${loc}`;
        items.push({ time: fmtTime(freeHr), title: pmAct, desc: tags(`${loc} · First impressions`), group: hasKids ? "Adults" : "Everyone", color: T.blue });
        if (hasKids) {
          const kidAct = pickAct(kidPool, nextActIdx(loc, "k"), null) || `Family time in ${loc}`;
          items.push({ time: fmtTime(freeHr), title: kidAct, desc: tags(`${loc} · Family-friendly`), group: "Kids", color: T.pink });
        }
      } else {
        items.push({ time: fmtTime(8), title: "Breakfast", desc: stayName, group: "Everyone", color: T.coral });
        const mIdx = nextActIdx(loc, "m");
        const morningAct = pickAct(locPools.morning, mIdx, steepTest) || `Explore ${loc}`;
        if (hasKids) {
          items.push({ time: fmtTime(10), title: morningAct, desc: tags(`${loc} · ${budgetTier.label}`), group: "Adults", color: T.blue });
          const kidAct = pickAct(kidPool, nextActIdx(loc, "k"), null) || `Family time in ${loc}`;
          items.push({ time: fmtTime(10), title: kidAct, desc: tags(`${loc} · Family-friendly`), group: "Kids", color: T.pink });
        } else {
          items.push({ time: fmtTime(10), title: morningAct, desc: tags(`${loc} · ${budgetTier.label}`), group: "Everyone", color: T.blue });
        }
        items.push({ time: fmtTime(12, 30), title: `Lunch — ${foodLabel}`, desc: `${budgetTier.label} ${wantsPubs ? "pub" : "restaurant"} · ${budgetTier.price}${wantsDogFriendly ? " · 🐕 Dog-friendly" : ""}`, group: "Everyone", color: T.coral });
        const pmAct = pickAct(locPools.afternoon, nextActIdx(loc, "a"), steepTest) || "Afternoon activity";
        if (hasKids) {
          items.push({ time: fmtTime(14, 30), title: pmAct, desc: tags(`${loc} · Afternoon`), group: "Adults", color: T.blue });
          const kidPmAct = pickAct(kidPool, nextActIdx(loc, "k"), null) || "Free play";
          items.push({ time: fmtTime(14, 30), title: kidPmAct, desc: tags(`${loc} · Fun for kids`), group: "Kids", color: T.pink });
        } else {
          items.push({ time: fmtTime(14, 30), title: pmAct, desc: tags(`${loc} · Afternoon`), group: "Everyone", color: T.blue });
        }
        items.push({ time: fmtTime(17), title: `Return to ${stayName}`, desc: "Relax & freshen up", group: "Everyone", color: T.t3 });
      }

      items.push({ time: fmtTime(19), title: buildDinnerTitle(loc, d - 1), desc: `${foodLabel} · ${budgetTier.label} · ${budgetTier.price}${wantsDogFriendly ? " · 🐕 Dog-friendly" : ""}`, group: "Everyone", color: T.coral });
    }

    days[d] = items;
  }
  return days;
}
