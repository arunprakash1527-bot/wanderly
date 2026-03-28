import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { T } from "../styles/tokens";
import { API } from "../constants/api";
import { authFetch } from "../utils/authFetch";
import { useAuth } from "./AuthContext";
import { useNavigation } from "./NavigationContext";
import { useTrip } from "./TripContext";
import { fetchTripIntelligence, buildSmartGreeting, buildSmartTips } from "../utils/tripIntelligence";
import { getLocationActivities, estimateTravelHours, findCoords } from "../utils/locationHelpers";
import { TEMPLATE_PROFILES } from "../constants/templateProfiles";

const ChatContext = createContext(null);

// ─── PII Sanitisation Helper ───
// Strips personally identifiable information from trip data before sending to the Claude API.
// Keeps: places, dates, travel mode, budget range, template style, activities/preferences, day, weather.
// Strips: real names, specific stay names/addresses (keeps type), special instructions text.
function sanitiseTripContext(ctx) {
  if (!ctx) return ctx;
  const sanitised = { ...ctx };

  // Sanitise travellers — replace names with generic labels, keep counts and ages
  if (sanitised.travellers) {
    const t = sanitised.travellers;
    const cleaned = {};
    // Adults
    if (Array.isArray(t.adults) && t.adults.length > 0) {
      cleaned.adults = t.adults.map((a, i) => {
        const label = { name: `Traveller ${i + 1}` };
        // Keep age if present
        if (a.age !== undefined) label.age = a.age;
        return label;
      });
    } else if (typeof t.adults === "number") {
      cleaned.adults = t.adults;
    }
    // Older kids
    if (Array.isArray(t.olderKids) && t.olderKids.length > 0) {
      cleaned.olderKids = t.olderKids.map((k, i) => ({
        name: `Child ${i + 1}`,
        age: k.age,
      }));
    }
    // Younger kids
    if (Array.isArray(t.youngerKids) && t.youngerKids.length > 0) {
      const offset = (t.olderKids || []).length;
      cleaned.youngerKids = t.youngerKids.map((k, i) => ({
        name: `Child ${offset + i + 1}`,
        age: k.age,
      }));
    }
    // Infants
    if (Array.isArray(t.infants) && t.infants.length > 0) {
      cleaned.infants = t.infants.map((k, i) => ({
        name: `Infant ${i + 1}`,
        age: k.age,
      }));
    }
    sanitised.travellers = cleaned;
  }

  // Sanitise stays — keep type/dates/location, strip specific names and addresses
  if (Array.isArray(sanitised.stays)) {
    sanitised.stays = sanitised.stays.map(s => {
      const clean = {};
      // Infer accommodation type from the name or fallback to "Accommodation"
      const typePat = /hotel|resort|cottage|hostel|airbnb|villa|apartment|motel|b&b|guesthouse|cabin|lodge|camp/i;
      const typeMatch = (s.name || "").match(typePat) || (s.type || "").match(typePat);
      clean.type = typeMatch ? typeMatch[0].charAt(0).toUpperCase() + typeMatch[0].slice(1).toLowerCase() : (s.type || "Accommodation");
      if (s.location) clean.location = s.location;
      if (s.checkIn) clean.checkIn = s.checkIn;
      if (s.checkOut) clean.checkOut = s.checkOut;
      return clean;
    });
  }

  // Strip special instructions from prefs (may contain personal/medical info)
  if (sanitised.prefs) {
    const cleanPrefs = { ...sanitised.prefs };
    delete cleanPrefs.instructions;
    // Keep food preferences, activities, etc.
    sanitised.prefs = cleanPrefs;
  }

  // Strip trip name (may contain family name / personal reference)
  delete sanitised.tripName;

  return sanitised;
}

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const { screen, showToast, navigate } = useNavigation();
  const { createdTrips, setCreatedTrips, selectedCreatedTrip, selectedDay, setSelectedDay, setTripDetailTab, findSmartSlot, addTimelineItem, logActivity, buildTripSummary, generateAndSetTimeline, saveTimelineToDB } = useTrip();

  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const chatRef = useRef(null);
  const [chatTyping, setChatTyping] = useState(false);
  const [chatFlowStep, setChatFlowStep] = useState(null);
  const [chatFlowData, setChatFlowData] = useState({});
  const [chatDayInit, setChatDayInit] = useState(null);
  const [chatAddDayPicker, setChatAddDayPicker] = useState(null);
  const [lastChatTopic, setLastChatTopic] = useState("");

  // Trip chat state
  const [tripChatInput, setTripChatInput] = useState("");
  const [tripChatMessages, setTripChatMessages] = useState([]);
  const tripChatEndRef = useRef(null);
  const [tripChatTyping, setTripChatTyping] = useState(false);
  const [tripChatFlow, setTripChatFlow] = useState(null); // { step, data }

  // Trip Intelligence state
  const [intelligence, setIntelligence] = useState(null);
  const [smartTips, setSmartTips] = useState([]);
  const intelligenceRef = useRef(null); // stable ref for use in handlers

  // Auto-scroll trip chat to bottom when messages change
  useEffect(() => {
    if (tripChatEndRef.current) tripChatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [tripChatMessages, tripChatTyping]);

  // ─── Fetch Trip Intelligence on day/trip change ───
  useEffect(() => {
    const trip = selectedCreatedTrip || createdTrips[0];
    if (!trip || !selectedDay) return;

    // Determine current location for this day
    const stays = trip.stays || [];
    const places = trip.places || [];
    let currentLoc = places[0] || "your destination";
    if (stays.length > 0 && trip.rawStart) {
      const sorted = [...stays].filter(s => s.checkIn && s.location).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
      const tripStart = new Date(trip.rawStart + "T12:00:00");
      const dayDateStr = new Date(tripStart.getTime() + (selectedDay - 1) * 86400000).toISOString().split("T")[0];
      const matched = sorted.find(s => s.checkIn <= dayDateStr && s.checkOut > dayDateStr) || sorted.find(s => s.checkIn === dayDateStr) || (selectedDay === 1 ? sorted[0] : null);
      if (matched?.location) currentLoc = matched.location;
      else if (places.length > 0) currentLoc = places[(selectedDay - 1) % places.length];
    } else if (places.length > 0) {
      currentLoc = places[(selectedDay - 1) % places.length];
    }

    // Fetch intelligence in background
    fetchTripIntelligence(trip, selectedDay, currentLoc).then(intel => {
      if (intel) {
        setIntelligence(intel);
        intelligenceRef.current = intel;
        setSmartTips(buildSmartTips(intel));
      }
    });
  }, [selectedDay, selectedCreatedTrip, createdTrips]);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [chatMessages]);

  // ─── Chat Persistence: Load messages from Supabase ───
  const loadTripMessages = async (tripDbId) => {
    if (!tripDbId) return;
    try {
      const { data } = await supabase.from('messages').select('*').eq('trip_id', tripDbId).order('created_at', { ascending: true });
      if (data && data.length > 0) {
        setTripChatMessages(data.map(m => ({ id: m.id, role: m.sender_role || 'user', text: m.text, senderName: m.sender_name })));
      }
    } catch (e) { /* messages table may not exist yet — silent fail */ }
  };

  const saveChatMessage = async (tripDbId, role, text, senderName) => {
    if (!tripDbId) return;
    try {
      await supabase.from('messages').insert({ trip_id: tripDbId, sender_role: role, text, sender_name: senderName || (role === 'ai' ? 'Trip With Me AI' : 'You') });
    } catch (e) { /* silent fail if table doesn't exist */ }
  };

  // ─── Trip Chat Handler ───
  const handleTripChat = async (tripId) => {
    const msg = tripChatInput.trim();
    if (!msg) return;
    setTripChatMessages(prev => [...prev, { role: "user", text: msg }]);
    setTripChatInput("");
    setTripChatTyping(true);
    const trip = createdTrips.find(t => t.id === tripId);
    saveChatMessage(trip?.dbId, 'user', msg, user?.user_metadata?.full_name || user?.email || 'You');
    const loc = trip?.places?.join(", ") || "your destination";
    // Determine current location based on selected day + stays (not always first place)
    const currentDayLoc = (() => {
      const stays = trip?.stays || [];
      if (stays.length > 0 && trip?.rawStart) {
        const sorted = [...stays].filter(s => s.checkIn && s.location).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
        const tripStart = new Date(trip.rawStart + "T12:00:00");
        const dayDateStr = new Date(tripStart.getTime() + (selectedDay - 1) * 86400000).toISOString().split("T")[0];
        let matched = sorted.find(s => s.checkIn <= dayDateStr && s.checkOut > dayDateStr);
        if (!matched) matched = sorted.find(s => s.checkIn === dayDateStr);
        if (!matched && selectedDay === 1) matched = sorted[0];
        if (matched?.location) return matched.location;
      }
      // Fallback: cycle through places by day
      const places = trip?.places || [];
      if (places.length > 0) return places[(selectedDay - 1) % places.length];
      return "your destination";
    })();
    const firstLoc = currentDayLoc;
    // Helper: resolve location for a specific day (not just selectedDay)
    const locForDay = (dayNum) => {
      const stays = trip?.stays || [];
      const places = trip?.places || [];
      const inferLoc = (s) => s.location || (s.name && places.find(p => s.name.toLowerCase().includes(p.toLowerCase()))) || places[0] || "";
      if (stays.length > 0 && trip?.rawStart) {
        const sorted = [...stays].filter(s => s.checkIn).map(s => ({ ...s, location: inferLoc(s) })).filter(s => s.location).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
        const uniqueStayLocs = [...new Set(sorted.map(s => s.location.toLowerCase().trim()))];
        const isBaseCamp = sorted.length >= 1 && uniqueStayLocs.length === 1 && places.length > 1;
        if (isBaseCamp) {
          const baseLoc = sorted[0].location;
          const dayTrips = places.filter(p => p.toLowerCase().trim() !== baseLoc.toLowerCase().trim());
          const numDays = trip.timeline ? Object.keys(trip.timeline).length : Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1);
          if (dayNum === 1 || dayNum === numDays) return baseLoc;
          if (dayTrips.length > 0) return dayTrips[(dayNum - 2) % dayTrips.length];
          return baseLoc;
        }
        const tripStart = new Date(trip.rawStart + "T12:00:00");
        const dayDateStr = new Date(tripStart.getTime() + (dayNum - 1) * 86400000).toISOString().split("T")[0];
        let matched = sorted.find(s => s.checkIn <= dayDateStr && s.checkOut > dayDateStr);
        if (!matched) matched = sorted.find(s => s.checkIn === dayDateStr);
        if (!matched && dayNum === 1) matched = sorted[0];
        if (matched?.location) return matched.location;
      }
      if (places.length > 0) return places[(dayNum - 1) % places.length];
      return firstLoc;
    };
    // ── Load EV vehicle profile (if user selected one during trip creation) ──
    let evProfile = null;
    try { evProfile = JSON.parse(localStorage.getItem("twm_ev_profile")); } catch {}
    const isEvTrip = (trip?.travel || []).some(m => /ev/i.test(m));
    const evConnectors = evProfile?.connectors || [];
    const evDefaultConnector = evConnectors[0] || null; // e.g. "CCS"
    const evRangeMiles = evProfile?.rangeMiles || null;
    const evModelLabel = evProfile ? `${evProfile.make} ${evProfile.model}` : null;

    const budget = trip?.budget || "";
    const summary = trip?.summary || buildTripSummary(trip || {});
    const instructions = trip?.prefs?.instructions || "";
    const allKids = [...(trip?.travellers?.olderKids || []), ...(trip?.travellers?.youngerKids || []), ...(trip?.travellers?.infants || [])];
    const hasKids = allKids.length > 0;
    const kidNames = allKids.map(k => `${k.name} (${k.age})`).join(", ");
    const budgetLabel = { "Budget": "budget-friendly", "Mid-range": "mid-range", "Luxury": "upscale", "No limit": "top-rated" }[budget] || "local";
    const foodPref = trip?.prefs?.food?.length > 0 ? trip.prefs.food.join(", ") : "local cuisine";
    const ctxLower = summary.toLowerCase();
    const wantsDog = /dog|pet/.test(ctxLower);
    const wantsAccessible = /accessible|wheelchair|mobility/.test(ctxLower);
    const wantsPubs = /pub|pubs|tavern/.test(ctxLower);

    // Keep context line short — don't dump full summary into every message
    const placesStr = trip?.places?.join(", ") || "your trip";
    const contextLine = "";
    const lower = msg.toLowerCase();

    // ── Handle "pick attraction" flow — user selecting from suggested options ──
    if (tripChatFlow?.step === "pick_attraction") {
      // If user is issuing a NEW explicit command (e.g. "day 2 – Add X"), clear the flow and let it fall through
      const isNewCommand = (/\b(add|include|plug)\b/i.test(lower) && (/day\s*\d+/i.test(lower) || /first stop|morning|afternoon|evening/i.test(lower)))
        || /\b(suggest|recommend|show me|find|what|list|remove|clear|ev charger)\b/i.test(lower);
      if (isNewCommand) {
        setTripChatFlow(null);
        // Fall through to the appropriate handler below
      } else {
      const { options, targetDay, loc: flowLoc } = tripChatFlow.data;
      // Check if user typed a number (1-based), exact name, or keyword match
      const numMatch = lower.match(/^(\d+)$/);
      const cleanInput = lower.replace(/^(how about|what about|maybe|i'd like|i want|let's do|yes|yeah)\s*/i, '').replace(/\?$/,'').trim();
      const picked = numMatch
        ? options[parseInt(numMatch[1]) - 1]
        : options.find(o => lower.includes(o.toLowerCase()) || o.toLowerCase().includes(cleanInput))
          || (() => {
            // Keyword matching: find option that shares significant words with user input
            const inputWords = cleanInput.split(/\s+/).filter(w => w.length > 2 && !['the','and','for','with','some','any'].includes(w));
            if (inputWords.length === 0) return null;
            const scored = options.map(o => {
              const oWords = o.toLowerCase().split(/\s+/);
              const matches = inputWords.filter(w => oWords.some(ow => ow.includes(w) || w.includes(ow)));
              return { option: o, score: matches.length };
            }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);
            return scored.length > 0 ? scored[0].option : null;
          })();
      if (picked) {
        setTripChatFlow(null);
        const smartSlot = findSmartSlot(tripId, targetDay, "add " + picked.toLowerCase());
        // Include distance from stay/base if applicable
        const baseLoc = trip?.stays?.[0]?.location || trip?.startLocation || flowLoc;
        const distHrs = flowLoc !== baseLoc ? estimateTravelHours(baseLoc, flowLoc, trip?.travel?.[0] || "car") : 0;
        const distDesc = distHrs >= 0.5 ? ` · ~${distHrs >= 1 ? Math.round(distHrs * 10) / 10 + " hrs" : Math.round(distHrs * 60) + " min"} from ${baseLoc}` : "";
        const newItem = { time: smartSlot.time, title: picked, desc: `${flowLoc}${distDesc}`, group: "Everyone", color: T.blue };
        const parseT = (s) => { const m = s?.match(/(\d+):(\d+)\s*(AM|PM)/i); if (!m) return 0; let h = parseInt(m[1]); if (m[3].toUpperCase() === "PM" && h !== 12) h += 12; if (m[3].toUpperCase() === "AM" && h === 12) h = 0; return h * 60 + parseInt(m[2]); };
        setCreatedTrips(prev => prev.map(t => {
          if (t.id !== tripId) return t;
          const tl = t.timeline || {};
          let dayTl = [...(tl[targetDay] || []), newItem];
          dayTl.sort((a, b) => parseT(a.time) - parseT(b.time));
          const newTimeline = { ...tl, [targetDay]: dayTl };
          saveTimelineToDB(t.dbId || t.id, newTimeline);
          return { ...t, timeline: newTimeline };
        }));
        logActivity(tripId, "📍", `Added "${picked}" to Day ${targetDay}`, "itinerary");
        setSelectedDay(targetDay);
        const reply = `✅ Added **${picked}** to **Day ${targetDay}** at ${smartSlot.time} in ${flowLoc}. Check your itinerary to see it!`;
        setTripChatTyping(false);
        setTripChatMessages(prev => [...prev, { role: "ai", text: reply }]);
        saveChatMessage(trip?.dbId, 'ai', reply);
        return;
      } else if (cleanInput.length > 2) {
        // User typed something specific not in the list — add it as a custom activity
        setTripChatFlow(null);
        const smartSlot = findSmartSlot(tripId, targetDay, "add " + cleanInput);
        const customTitle = cleanInput.charAt(0).toUpperCase() + cleanInput.slice(1);
        const newItem = { time: smartSlot.time, title: customTitle, desc: `${flowLoc} · Added via chat`, group: "Everyone", color: T.blue };
        const parseT = (s) => { const m = s?.match(/(\d+):(\d+)\s*(AM|PM)/i); if (!m) return 0; let h = parseInt(m[1]); if (m[3].toUpperCase() === "PM" && h !== 12) h += 12; if (m[3].toUpperCase() === "AM" && h === 12) h = 0; return h * 60 + parseInt(m[2]); };
        setCreatedTrips(prev => prev.map(t => {
          if (t.id !== tripId) return t;
          const tl = t.timeline || {};
          let dayTl = [...(tl[targetDay] || []), newItem];
          dayTl.sort((a, b) => parseT(a.time) - parseT(b.time));
          const newTimeline = { ...tl, [targetDay]: dayTl };
          saveTimelineToDB(t.dbId || t.id, newTimeline);
          return { ...t, timeline: newTimeline };
        }));
        logActivity(tripId, "📍", `Added "${customTitle}" to Day ${targetDay}`, "itinerary");
        setSelectedDay(targetDay);
        const reply = `✅ Added **${customTitle}** to **Day ${targetDay}** at ${smartSlot.time} in ${flowLoc}. Check your itinerary to see it!`;
        setTripChatTyping(false);
        setTripChatMessages(prev => [...prev, { role: "ai", text: reply }]);
        saveChatMessage(trip?.dbId, 'ai', reply);
        return;
      } else {
        setTripChatFlow(null); // Clear flow if user typed something else
      }
      } // end else (not a new command)
    }

    // ── Handle EV charger flow follow-up — user replying with connector type / car count ──
    if (tripChatFlow?.step === "ev_charger_details") {
      setTripChatFlow(null);
      // Merge the original query context with the follow-up reply
      const connectorMatch = lower.match(/\b(ccs|chademo|type\s*2|type\s*1)\b/i);
      // Fall back to EV profile's connector type if user didn't specify one
      const connectorType = connectorMatch ? connectorMatch[1].replace(/\s+/g, "").toLowerCase() : evDefaultConnector;
      const carCountMatch = lower.match(/(\d+)\s*(?:car|vehicle|ev)/i);
      const carCount = carCountMatch ? parseInt(carCountMatch[1]) : 1;

      setTripChatMessages(prev => [...prev, { role: "ai", text: "⚡ Finding EV chargers with real-time details..." }]);

      const handleEvResults = async (lat, lng, locLabel) => {
        try {
          const body = { maxResults: 5 };
          if (lat && lng) { body.lat = lat; body.lng = lng; }
          else { body.locationName = firstLoc; }
          if (connectorType) body.connectorType = connectorType;

          const res = await authFetch(API.EV_CHARGERS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();

          if (res.ok && data.chargers?.length > 0) {
            const isGoogleFallback = data.source === "google";
            const list = data.chargers.map((c, i) => {
              const dist = c.distance ? ` · 📏 ${c.distance}` : "";
              const status = c.isOperational ? " · 🟢 Operational" : c.isOperational === false ? " · 🔴 Out of service" : "";
              const speed = c.maxPowerKW ? ` · ⚡ ${c.speedLabel} (${c.maxPowerKW}kW)` : "";
              const connectors = c.connectors?.length > 0 ? `\n   🔌 ${c.connectors.join(", ")} · ${c.totalPoints} point${c.totalPoints > 1 ? "s" : ""}` : "";
              const points = carCount > 1 && c.totalPoints ? (c.totalPoints >= carCount ? ` ✅ Can charge ${carCount} cars` : ` ⚠️ Only ${c.totalPoints} point${c.totalPoints > 1 ? "s" : ""}`) : "";
              const cost = c.usageCost ? `\n   💰 ${c.usageCost}` : c.usageType ? `\n   💰 ${c.usageType}` : "";
              const facilities = c.facilities?.length > 0 ? `\n   🏪 ${c.facilities.join(" · ")}` : "";
              const operator = c.operator ? `\n   🏢 ${c.operator}` : "";
              const rating = isGoogleFallback && c.rating ? ` · ${c.rating}★` : "";
              const open = isGoogleFallback ? (c.openNow === true ? " · Open now" : c.openNow === false ? " · Closed" : "") : "";
              const zapLink = c.zapMapLink ? ` · [Zap-Map Live](${c.zapMapLink})` : "";
              return `${i + 1}. **${c.name}**${dist}${status}${rating}${open}${speed}${connectors}${points}${cost}${operator}${facilities}\n   [Navigate](${c.mapsLink})${zapLink}`;
            }).join("\n\n");

            const connectorNote = !connectorType ? "\n\n🔌 **Need a specific connector?** Ask me for CCS, CHAdeMO, or Type 2 chargers." : "";
            const zapNote = "\n\n📡 Tap **Zap-Map Live** for real-time availability and queue times.";
            const googleNote = isGoogleFallback ? "\n\n_ℹ️ Basic results shown — connector details unavailable. Check Zap-Map for full info._" : "";
            const vehicleNote = evModelLabel ? `\n\n🔋 Showing results for your **${evModelLabel}** (${connectorType || evDefaultConnector || "all types"}${evRangeMiles ? ` · ${evRangeMiles}mi range` : ""})` : "";
            return `⚡ **EV Chargers${connectorType ? ` (${connectorType.toUpperCase()})` : ""} near ${locLabel}:**\n\n${list}${vehicleNote}${connectorNote}${zapNote}${googleNote}`;
          }
        } catch (e) { /* fallback below */ }
        return `⚡ I couldn't find chargers near ${locLabel}. Try [Zap-Map](https://www.zap-map.com/live/) or [Open Charge Map](https://openchargemap.org/) for real-time availability.`;
      };

      const updateEvReply = (reply) => {
        setTripChatTyping(false);
        setTripChatMessages(prev => {
          const updated = [...prev];
          const idx = updated.findLastIndex(m => m.text === "⚡ Finding EV chargers with real-time details...");
          if (idx >= 0) updated[idx] = { role: "ai", text: reply };
          else updated.push({ role: "ai", text: reply });
          return updated;
        });
      };

      // Use the current day's location for the flow follow-up
      const flowDayLoc = locForDay(selectedDay);
      const flowDayCoords = findCoords(flowDayLoc);
      if (flowDayCoords) {
        updateEvReply(await handleEvResults(flowDayCoords[0], flowDayCoords[1], flowDayLoc));
      } else {
        updateEvReply(await handleEvResults(null, null, flowDayLoc || firstLoc));
      }
      return;
    }

    // ── EV charger queries — Open Charge Map for detailed results ──
    if (/ev|charger|charging|charge point|charge station/i.test(lower) && !/add|schedule|time/.test(lower)) {
      // Extract connector type preference from message, fall back to EV profile
      const connectorMatch = lower.match(/\b(ccs|chademo|type\s*2|type\s*1)\b/);
      const connectorType = connectorMatch ? connectorMatch[1].replace(/\s+/g, "") : evDefaultConnector;

      // Extract location from the message (e.g. "near windermere", "in keswick", "for day 2")
      const evLocMatch = lower.match(/\b(?:near|in|at|around)\s+([a-z\s]+?)(?:\s+(?:for|on)\s+day\s*\d+)?$/i);
      const evDayMatch = lower.match(/day\s*(\d+)/);
      const evRequestedLoc = evLocMatch ? evLocMatch[1].trim().replace(/\b(ev|charger|charging|station|point)\b/gi, '').trim() : null;
      // If user specified a location or day, use that instead of GPS
      const evTargetLoc = evRequestedLoc && evRequestedLoc.length > 1 ? evRequestedLoc : (evDayMatch ? locForDay(parseInt(evDayMatch[1])) : null);
      const evTargetCoords = evTargetLoc ? findCoords(evTargetLoc) : null;

      // Check if trip has 4+ travellers — ask about multi-car charging
      // But skip the prompt if EV profile already gives us the connector type
      const adultCount = trip?.travellers?.adults?.length || 1;
      const totalTravellers = adultCount + (trip?.travellers?.olderKids?.length || 0) + (trip?.travellers?.youngerKids?.length || 0) + (trip?.travellers?.infants?.length || 0);
      const needsMultiCarPrompt = totalTravellers > 4 && !evDefaultConnector && !/\d+\s*car|\d+\s*vehicle|single car|one car/i.test(lower);

      if (needsMultiCarPrompt) {
        setTripChatFlow({ step: "ev_charger_details", data: { query: lower } });
        setTripChatTyping(false);
        setTripChatMessages(prev => [...prev, { role: "ai", text: `🚗 Your trip has ${totalTravellers} travellers. How many EVs need charging? Also, what connector type do you need?\n\n• **CCS** (most common for rapid charging)\n• **CHAdeMO**\n• **Type 2** (standard AC)\n\nJust reply like: "2 cars, CCS" or "1 car, Type 2"` }]);
        return;
      }

      // Parse multi-car count from message
      const carCountMatch = lower.match(/(\d+)\s*(?:car|vehicle|ev)/);
      const carCount = carCountMatch ? parseInt(carCountMatch[1]) : 1;

      setTripChatMessages(prev => [...prev, { role: "ai", text: "⚡ Finding EV chargers with real-time details..." }]);

      const handleEvResults = async (lat, lng, locLabel) => {
        try {
          const body = { maxResults: 5 };
          if (lat && lng) { body.lat = lat; body.lng = lng; }
          else { body.locationName = firstLoc; }
          if (connectorType) body.connectorType = connectorType;

          const res = await authFetch(API.EV_CHARGERS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();

          if (res.ok && data.chargers?.length > 0) {
            const isGoogleFallback = data.source === "google";
            const list = data.chargers.map((c, i) => {
              const dist = c.distance ? ` · 📏 ${c.distance}` : "";
              const status = c.isOperational ? " · 🟢 Operational" : c.isOperational === false ? " · 🔴 Out of service" : "";
              const speed = c.maxPowerKW ? ` · ⚡ ${c.speedLabel} (${c.maxPowerKW}kW)` : "";
              const connectors = c.connectors?.length > 0 ? `\n   🔌 ${c.connectors.join(", ")} · ${c.totalPoints} point${c.totalPoints > 1 ? "s" : ""}` : "";
              const points = carCount > 1 && c.totalPoints ? (c.totalPoints >= carCount ? ` ✅ Can charge ${carCount} cars` : ` ⚠️ Only ${c.totalPoints} point${c.totalPoints > 1 ? "s" : ""}`) : "";
              const cost = c.usageCost ? `\n   💰 ${c.usageCost}` : c.usageType ? `\n   💰 ${c.usageType}` : "";
              const facilities = c.facilities?.length > 0 ? `\n   🏪 ${c.facilities.join(" · ")}` : "";
              const operator = c.operator ? `\n   🏢 ${c.operator}` : "";
              const rating = isGoogleFallback && c.rating ? ` · ${c.rating}★` : "";
              const open = isGoogleFallback ? (c.openNow === true ? " · Open now" : c.openNow === false ? " · Closed" : "") : "";
              const zapLink = c.zapMapLink ? ` · [Zap-Map Live](${c.zapMapLink})` : "";
              return `${i + 1}. **${c.name}**${dist}${status}${rating}${open}${speed}${connectors}${points}${cost}${operator}${facilities}\n   [Navigate](${c.mapsLink})${zapLink}`;
            }).join("\n\n");

            const connectorNote = !connectorType ? "\n\n🔌 **Need a specific connector?** Ask me for CCS, CHAdeMO, or Type 2 chargers." : "";
            const zapNote = "\n\n📡 Tap **Zap-Map Live** for real-time availability and queue times.";
            const googleNote = isGoogleFallback ? "\n\n_ℹ️ Basic results shown — connector details unavailable. Check Zap-Map for full info._" : "";
            const vehicleNote = evModelLabel && connectorType === evDefaultConnector ? `\n\n🔋 Filtered for your **${evModelLabel}** (${evDefaultConnector}${evRangeMiles ? ` · ${evRangeMiles}mi range` : ""})` : "";
            return `⚡ **EV Chargers${connectorType ? ` (${connectorType.toUpperCase()})` : ""} near ${locLabel}:**\n\n${list}${vehicleNote}${connectorNote}${zapNote}${googleNote}`;
          }
        } catch (e) { /* fallback below */ }
        return `⚡ I couldn't find chargers near ${locLabel}. Try [Zap-Map](https://www.zap-map.com/live/) or [Open Charge Map](https://openchargemap.org/) for real-time availability.`;
      };

      const updateEvReply = (reply) => {
        setTripChatTyping(false);
        setTripChatMessages(prev => {
          const updated = [...prev];
          const idx = updated.findLastIndex(m => m.text === "⚡ Finding EV chargers with real-time details...");
          if (idx >= 0) updated[idx] = { role: "ai", text: reply };
          else updated.push({ role: "ai", text: reply });
          return updated;
        });
      };

      if (evTargetCoords) {
        // User specified a location — use its coordinates directly, no GPS
        updateEvReply(await handleEvResults(evTargetCoords[0], evTargetCoords[1], evTargetLoc));
      } else if (evTargetLoc) {
        // Location name but no coordinates — pass as location name
        updateEvReply(await handleEvResults(null, null, evTargetLoc));
      } else if (/near me|nearby|near here|around me/i.test(lower)) {
        // User explicitly asked for nearby — use GPS
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => updateEvReply(await handleEvResults(pos.coords.latitude, pos.coords.longitude, "your location")),
            async () => updateEvReply(await handleEvResults(null, null, firstLoc)),
            { enableHighAccuracy: false, timeout: 8000 }
          );
        } else {
          updateEvReply(await handleEvResults(null, null, firstLoc));
        }
      } else {
        // No location specified — use the current day's location
        const dayLoc = locForDay(selectedDay);
        const dayCoords = findCoords(dayLoc);
        if (dayCoords) {
          updateEvReply(await handleEvResults(dayCoords[0], dayCoords[1], dayLoc));
        } else {
          updateEvReply(await handleEvResults(null, null, dayLoc || firstLoc));
        }
      }
      return;
    }

    // ── "Nearby" queries (restaurants, food, cafes, activities, petrol) — use GPS + Places API ──
    const isNearbyQuery = /nearby|nearest|near me|near here|around me|close by|closest/i.test(lower);
    const isPlaceQuery = /restaurant|food|eat|dining|cafe|coffee|pub|bar|pizza|burger|takeaway|lunch|dinner|breakfast|brunch|supermarket|petrol|fuel|pharmacy|hospital|atm/i.test(lower);
    if (isNearbyQuery || (isPlaceQuery && isNearbyQuery)) {
      // Determine search type from the query
      const searchType = /cafe|coffee/i.test(lower) ? "cafe"
        : /pub|bar/i.test(lower) ? "bar"
        : /supermarket|grocery/i.test(lower) ? "supermarket"
        : /petrol|fuel|gas station/i.test(lower) ? "gas_station"
        : /pharmacy|chemist/i.test(lower) ? "pharmacy"
        : /hospital|a&e|emergency/i.test(lower) ? "hospital"
        : /atm|cash/i.test(lower) ? "atm"
        : "restaurant";
      const searchLabel = searchType === "gas_station" ? "petrol stations" : searchType + "s";
      const searchIcon = /cafe|coffee/i.test(lower) ? "☕" : /pub|bar/i.test(lower) ? "🍺" : /supermarket/i.test(lower) ? "🛒" : /petrol|fuel|gas/i.test(lower) ? "⛽" : "🍽️";

      setTripChatMessages(prev => [...prev, { role: "ai", text: `📍 Finding ${searchLabel} near you...` }]);

      const handleNearbyResults = async (lat, lng, locLabel) => {
        try {
          const body = lat && lng
            ? { location: { lat, lng }, type: searchType, radius: 5000 }
            : { query: `${searchType} near ${firstLoc}`, radius: 5000 };
          const res = await authFetch(API.PLACES, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (res.ok && data.places?.length > 0) {
            const results = data.places.slice(0, 6);
            const list = results.map((p, i) => {
              const stars = p.rating ? ` · ${p.rating}★` : "";
              const price = p.priceLevel || "";
              const status = p.openNow === true ? " · **Open now**" : p.openNow === false ? " · Closed" : "";
              const mapLink = `https://www.google.com/maps/place/?q=place_id:${p.placeId}`;
              return `${i + 1}. **${p.name}** ${price}${stars}${status}\n   ${p.address}\n   [Navigate in Maps](${mapLink})`;
            }).join("\n\n");
            return `${searchIcon} **${searchLabel.charAt(0).toUpperCase() + searchLabel.slice(1)} near ${locLabel}:**\n\n${list}\n\n💡 *Say "Add [name] to Day ${selectedDay}" to include in your itinerary*`;
          }
        } catch (e) { /* fallback below */ }
        return `${searchIcon} Couldn't find ${searchLabel} via search. Try [Google Maps](https://www.google.com/maps/search/${encodeURIComponent(searchType + " near me")}) for real-time results near you.`;
      };

      const updateNearbyChat = (reply) => {
        setTripChatTyping(false);
        setTripChatMessages(prev => {
          const updated = [...prev];
          const idx = updated.findLastIndex(m => m.text.includes(`Finding ${searchLabel} near you`));
          if (idx >= 0) updated[idx] = { role: "ai", text: reply };
          else updated.push({ role: "ai", text: reply });
          return updated;
        });
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => updateNearbyChat(await handleNearbyResults(pos.coords.latitude, pos.coords.longitude, "your location")),
          async () => updateNearbyChat(await handleNearbyResults(null, null, firstLoc)),
          { enableHighAccuracy: false, timeout: 8000 }
        );
      } else {
        handleNearbyResults(null, null, firstLoc).then(updateNearbyChat);
      }
      return;
    }

    // ── Handle "add EV charger to day X" — live Places API lookup at route midpoint ──
    if (/\b(add|include|plug|put|insert)\b/i.test(lower) && /ev|charger|charging|charge\s*point/i.test(lower)) {
      const dayMatch = lower.match(/day\s*(\d+)/);
      const targetDay = dayMatch ? parseInt(dayMatch[1]) : selectedDay;
      const dayLoc = locForDay(targetDay);
      const origin = trip?.startLocation || trip?.places?.[0] || "origin";
      // For day 1, origin is start location; for other days, use previous day location or stay
      const fromLoc = targetDay === 1 ? origin : (locForDay(targetDay - 1) || origin);
      const toLoc = dayLoc;

      const evNote = evModelLabel ? ` for your ${evModelLabel}` : "";
      setTripChatMessages(prev => [...prev, { role: "ai", text: `⚡ Searching for EV charging stations${evNote} between **${fromLoc}** and **${toLoc}**...` }]);

      (async () => {
        try {
          const fromCoords = findCoords(fromLoc);
          const toCoords = findCoords(toLoc);
          const connectorQuery = evDefaultConnector ? ` ${evDefaultConnector}` : "";
          let body = { radius: 50000, maxResults: 5 };
          if (fromCoords && toCoords) {
            body.location = { lat: (fromCoords[0] + toCoords[0]) / 2, lng: (fromCoords[1] + toCoords[1]) / 2 };
            body.query = `EV${connectorQuery} rapid charging station motorway services`;
          } else {
            body.query = `EV${connectorQuery} charging station between ${fromLoc} and ${toLoc}`;
            body.locationName = fromLoc;
          }

          const res = await authFetch(API.PLACES, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();

          let station = null;
          if (res.ok && data.places?.length > 0) {
            // Filter out stations at origin or destination
            const fromN = fromLoc.toLowerCase();
            const toN = toLoc.toLowerCase();
            const filtered = data.places.filter(p => {
              const addr = (p.address || "").toLowerCase();
              const name = (p.name || "").toLowerCase();
              return !addr.includes(fromN) && !addr.includes(toN) && !name.includes(fromN) && !name.includes(toN);
            });
            station = filtered[0] || data.places[0];
          }

          if (station) {
            const stationTitle = `⚡ ${station.name}`;
            const stationDesc = station.address ? `${station.address} · EV Charging Stop` : "EV Charging Stop";
            const smartSlot = findSmartSlot(tripId, targetDay, "ev charging break");
            const newItem = { time: smartSlot.time, title: stationTitle, desc: stationDesc, group: "Everyone", color: "#22c55e" };
            const mapLink = station.placeId ? `https://www.google.com/maps/place/?q=place_id:${station.placeId}` : null;
            if (mapLink) newItem.mapLink = mapLink;

            const parseT = (s) => { const m = s?.match(/(\d+):(\d+)\s*(AM|PM)/i); if (!m) return 0; let h = parseInt(m[1]); if (m[3].toUpperCase() === "PM" && h !== 12) h += 12; if (m[3].toUpperCase() === "AM" && h === 12) h = 0; return h * 60 + parseInt(m[2]); };
            setCreatedTrips(prev => prev.map(t => {
              if (t.id !== tripId) return t;
              const tl = t.timeline || {};
              let dayTl = [...(tl[targetDay] || []), newItem];
              dayTl.sort((a, b) => parseT(a.time) - parseT(b.time));
              const newTimeline = { ...tl, [targetDay]: dayTl };
              saveTimelineToDB(t.dbId || t.id, newTimeline);
              return { ...t, timeline: newTimeline };
            }));
            logActivity(tripId, "⚡", `Added EV charging stop "${station.name}" to Day ${targetDay}`, "itinerary");
            setSelectedDay(targetDay);

            const rating = station.rating ? ` · ${station.rating}★` : "";
            const addr = station.address ? `\n📍 ${station.address}` : "";
            const nav = mapLink ? `\n🗺️ [Navigate in Maps](${mapLink})` : "";
            const evInfo = evModelLabel ? `\n🔋 Matched for your **${evModelLabel}**${evDefaultConnector ? ` (${evDefaultConnector})` : ""} · ${evRangeMiles ? `${evRangeMiles}mi range` : ""}` : "";
            const reply = `⚡ Found a charging station!\n\n**${station.name}**${rating}${addr}${nav}${evInfo}\n\n✅ Added to **Day ${targetDay}** at ${smartSlot.time}. Check your itinerary to see it!`;
            setTripChatTyping(false);
            setTripChatMessages(prev => {
              const updated = [...prev];
              const idx = updated.findLastIndex(m => m.text.includes("Searching for EV charging stations"));
              if (idx >= 0) updated[idx] = { role: "ai", text: reply };
              else updated.push({ role: "ai", text: reply });
              return updated;
            });
            saveChatMessage(trip?.dbId, 'ai', reply);
          } else {
            // Fallback — no results, add a generic placeholder
            const smartSlot = findSmartSlot(tripId, targetDay, "ev charging break");
            const fallbackItem = { time: smartSlot.time, title: "⚡ EV Charging Stop", desc: `Mid-route between ${fromLoc} & ${toLoc} · Added via chat`, group: "Everyone", color: "#22c55e" };
            const parseT = (s) => { const m = s?.match(/(\d+):(\d+)\s*(AM|PM)/i); if (!m) return 0; let h = parseInt(m[1]); if (m[3].toUpperCase() === "PM" && h !== 12) h += 12; if (m[3].toUpperCase() === "AM" && h === 12) h = 0; return h * 60 + parseInt(m[2]); };
            setCreatedTrips(prev => prev.map(t => {
              if (t.id !== tripId) return t;
              const tl = t.timeline || {};
              let dayTl = [...(tl[targetDay] || []), fallbackItem];
              dayTl.sort((a, b) => parseT(a.time) - parseT(b.time));
              const newTimeline = { ...tl, [targetDay]: dayTl };
              saveTimelineToDB(t.dbId || t.id, newTimeline);
              return { ...t, timeline: newTimeline };
            }));
            const reply = `⚡ Couldn't find a specific charger between ${fromLoc} and ${toLoc}, but I've added a charging stop placeholder to **Day ${targetDay}** at ${smartSlot.time}. Check [Zap-Map](https://www.zap-map.com/live/) for real-time availability along your route.`;
            setTripChatTyping(false);
            setTripChatMessages(prev => {
              const updated = [...prev];
              const idx = updated.findLastIndex(m => m.text.includes("Searching for EV charging stations"));
              if (idx >= 0) updated[idx] = { role: "ai", text: reply };
              else updated.push({ role: "ai", text: reply });
              return updated;
            });
            saveChatMessage(trip?.dbId, 'ai', reply);
          }
        } catch (err) {
          console.error("EV charger add error:", err);
          setTripChatTyping(false);
          const errReply = `⚡ Had trouble searching for chargers. Try [Zap-Map](https://www.zap-map.com/live/) to find one along your route, then say "add [station name] to day ${targetDay}".`;
          setTripChatMessages(prev => {
            const updated = [...prev];
            const idx = updated.findLastIndex(m => m.text.includes("Searching for EV charging stations"));
            if (idx >= 0) updated[idx] = { role: "ai", text: errReply };
            else updated.push({ role: "ai", text: errReply });
            return updated;
          });
        }
      })();
      return;
    }

    // ── Handle "remove/clear/replace itinerary for day X" requests ──
    const isClearRequest = /\b(remove|clear|delete|wipe|reset|replace|redo|rebuild)\b/i.test(lower) && /\b(all|itinerary|activities|everything|schedule)\b/i.test(lower) && /day\s*(\d+)/i.test(lower);
    if (isClearRequest) {
      const clearDayMatch = lower.match(/day\s*(\d+)/i);
      const clearDay = clearDayMatch ? parseInt(clearDayMatch[1]) : selectedDay;

      // Extract specific activities the user wants in the new itinerary
      const includeMatch = msg.match(/(?:including|with|featuring|having)\s+(.+?)$/i);
      let requestedItems = [];
      if (includeMatch) {
        // Parse "visit to roe island and boat trip to piel island" style
        requestedItems = includeMatch[1]
          .split(/\s+(?:and|,|&)\s+/)
          .map(s => s.replace(/^\s*(a\s+|the\s+)?/i, '').trim())
          .filter(s => s.length > 2 && !/^(also|then|maybe|please)$/i.test(s));
      }

      // Clear the day's timeline
      setCreatedTrips(prev => prev.map(t => {
        if (t.id !== tripId) return t;
        const tl = { ...(t.timeline || {}) };
        tl[clearDay] = [];
        saveTimelineToDB(t.dbId || t.id, tl);
        return { ...t, timeline: tl };
      }));
      logActivity(tripId, "🗑️", `Cleared all activities from Day ${clearDay}`, "itinerary");

      if (requestedItems.length > 0) {
        // Add the requested items with smart time slots
        const dayLoc = locForDay(clearDay);
        const parseT = (s) => { const m = s?.match(/(\d+):(\d+)\s*(AM|PM)/i); if (!m) return 0; let h = parseInt(m[1]); if (m[3].toUpperCase() === "PM" && h !== 12) h += 12; if (m[3].toUpperCase() === "AM" && h === 12) h = 0; return h * 60 + parseInt(m[2]); };
        const baseSlots = ["9:00 AM", "10:30 AM", "12:00 PM", "1:30 PM", "3:00 PM", "4:30 PM"];
        const newItems = requestedItems.map((item, idx) => ({
          time: baseSlots[idx] || `${3 + idx}:00 PM`,
          title: item.charAt(0).toUpperCase() + item.slice(1),
          desc: `${dayLoc} · Added via chat`,
          group: "Everyone",
          color: T.blue,
        }));

        setCreatedTrips(prev => prev.map(t => {
          if (t.id !== tripId) return t;
          const tl = { ...(t.timeline || {}) };
          tl[clearDay] = newItems;
          saveTimelineToDB(t.dbId || t.id, tl);
          return { ...t, timeline: tl };
        }));

        const itemsList = newItems.map(n => `• **${n.title}** at ${n.time}`).join("\n");
        setSelectedDay(clearDay);
        const reply = `🗑️ Cleared Day ${clearDay} itinerary.\n\n✅ Added your requested activities:\n${itemsList}\n\nTap the Itinerary tab to see them — tap ✏️ to adjust times.`;
        setTripChatTyping(false);
        setTripChatMessages(prev => [...prev, { role: "ai", text: reply }]);
        saveChatMessage(trip?.dbId, 'ai', reply);
        return;
      } else {
        setSelectedDay(clearDay);
        const reply = `🗑️ Cleared all activities from **Day ${clearDay}**. You can now add new ones — try "add [activity] to day ${clearDay}" or "suggest activities for day ${clearDay}".`;
        setTripChatTyping(false);
        setTripChatMessages(prev => [...prev, { role: "ai", text: reply }]);
        saveChatMessage(trip?.dbId, 'ai', reply);
        return;
      }
    }

    // ── Handle "suggest/recommend activities" queries — show location activities ──
    const isSuggestQuery = /\b(suggest|recommend|what(?:'s| is| are| can)|show me|list|things to do|activities|attractions|places to visit|can be done|ideas|what.+do\b)/i.test(lower)
      && /\b(activit|attraction|thing|place|do\b|done|visit|see|sight|experience|idea|option|lunch|dinner|breakfast|brunch|food|eat|restaurant|cafe|meal|snack|pub|bar)/i.test(lower);
    if (isSuggestQuery) {
      // Extract location from the query
      const locMatch = lower.replace(/\s+(?:on|for|during)\s+day\s*\d+/i, '').match(/\b(?:in|at|near|around)\s+([a-z\s]+?)$/i);
      const dayMatch = lower.match(/day\s*(\d+)/);
      const targetDay = dayMatch ? parseInt(dayMatch[1]) : selectedDay;
      const queryLoc = locMatch ? locMatch[1].trim() : null;
      const dayLoc = locForDay(targetDay);
      const searchLoc = queryLoc || dayLoc;

      const isFoodQuery = /\b(lunch|dinner|breakfast|brunch|food|eat|restaurant|cafe|pub|bar|meal|snack|dine|dining)/i.test(lower);
      const locActs = getLocationActivities(searchLoc) || getLocationActivities(dayLoc);
      if (locActs) {
        const hasKids = (trip?.travellers?.olderKids?.length || 0) + (trip?.travellers?.youngerKids?.length || 0) + (trip?.travellers?.infants?.length || 0) > 0;

        let uniqueOptions, headerEmoji, headerLabel;
        if (isFoodQuery) {
          // Prioritise food/dining suggestions
          const foodOptions = [...(locActs.dinner || []), ...(locActs.lunch || [])];
          uniqueOptions = [...new Set(foodOptions)].slice(0, 8);
          if (uniqueOptions.length === 0) {
            // Fallback to all activities if no food-specific entries
            const allOptions = [...(locActs.morning || []), ...(locActs.afternoon || []), ...(hasKids ? locActs.kids || [] : [])];
            uniqueOptions = [...new Set(allOptions)].slice(0, 8);
          }
          headerEmoji = "🍽️"; headerLabel = "Dining options";
        } else {
          const allOptions = [...(locActs.morning || []), ...(locActs.afternoon || []), ...(hasKids ? locActs.kids || [] : [])];
          uniqueOptions = [...new Set(allOptions)].slice(0, 8);
          headerEmoji = "🎯"; headerLabel = "Activities";
        }
        // Also include dinner suggestions if not already a food query
        const dinnerOptions = !isFoodQuery && locActs.dinner ? locActs.dinner.slice(0, 3) : [];

        setTripChatFlow({ step: "pick_attraction", data: { options: uniqueOptions, targetDay, loc: dayLoc } });
        const optionsList = uniqueOptions.map((o, i) => `${i + 1}. **${o}**`).join("\n");
        const dinnerNote = dinnerOptions.length > 0 ? `\n\n🍽️ **Dinner ideas:** ${dinnerOptions.join(" · ")}` : "";
        const stayBaseLoc = trip?.stays?.[0]?.location || trip?.startLocation || dayLoc;
        const distHrs = dayLoc.toLowerCase() !== stayBaseLoc.toLowerCase() ? estimateTravelHours(stayBaseLoc, dayLoc, trip?.travel?.[0] || "car") : 0;
        const distNote = distHrs >= 0.25 ? `\n\n📍 ${searchLoc} is ~${distHrs >= 1 ? Math.round(distHrs * 10) / 10 + " hrs" : Math.round(distHrs * 60) + " min"} from ${stayBaseLoc}` : "";
        const reply = `${headerEmoji} **${headerLabel} in ${searchLoc.charAt(0).toUpperCase() + searchLoc.slice(1)}** for Day ${targetDay}:\n\n${optionsList}${dinnerNote}${distNote}\n\nReply with a number to add it, or type your own activity!`;
        setTripChatTyping(false);
        setTripChatMessages(prev => [...prev, { role: "ai", text: reply }]);
        saveChatMessage(trip?.dbId, 'ai', reply);
        return;
      }
      // If no activities found locally, let it fall through to Claude API
    }

    // ── Handle "add to itinerary" commands locally BEFORE API call ──
    // This ensures the timeline is actually mutated, not just acknowledged in text.
    if (/\b(add|include|plug)\b/i.test(lower)) {
      const dayMatch = lower.match(/day\s*(\d+)/);
      const targetDay = dayMatch ? parseInt(dayMatch[1]) : selectedDay;
      const addMatch = msg.match(/(?:add|include|plug(?:\s*in)?)\s+(.+?)(?:\s+(?:to|into|on|for)\s+day\s*\d+)?$/i);
      let itemTitle = addMatch ? addMatch[1].trim().replace(/(?:to|into|on|for)\s+day\s*\d+$/i, '').trim() : null;

      // ── Compound request: "add X and suggest/recommend other activities in Y" ──
      const compoundMatch = itemTitle && itemTitle.match(/^(.+?)\s+(?:and|&|also|,)\s*(?:suggest|recommend|show|list|what about|other)\s+(?:other\s+)?(?:activit|thing|place|attraction|option)/i);
      if (compoundMatch) {
        const namedActivity = compoundMatch[1].replace(/^activities\s+/i, '').replace(/\b(such\s*(as)?|like|e\.?g\.?)\s*/i, '').trim();
        // Extract location hint from the rest of the message
        const locHint = itemTitle.match(/\b(?:in|at|near|around)\s+([a-z\s]+)$/i);
        const suggestLoc = locHint ? locHint[1].trim() : locForDay(targetDay);
        const dayLoc = locForDay(targetDay);

        // Add the named activity first
        if (namedActivity.length > 2) {
          const smartSlot = findSmartSlot(tripId, targetDay, "add " + namedActivity.toLowerCase());
          const newItem = { time: smartSlot.time, title: namedActivity, desc: `${dayLoc} · Added via chat`, group: "Everyone", color: T.blue };
          const parseT = (s) => { const m = s?.match(/(\d+):(\d+)\s*(AM|PM)/i); if (!m) return 0; let h = parseInt(m[1]); if (m[3].toUpperCase() === "PM" && h !== 12) h += 12; if (m[3].toUpperCase() === "AM" && h === 12) h = 0; return h * 60 + parseInt(m[2]); };
          setCreatedTrips(prev => prev.map(t => {
            if (t.id !== tripId) return t;
            const tl = t.timeline || {};
            let dayTl = [...(tl[targetDay] || []), newItem];
            dayTl.sort((a, b) => parseT(a.time) - parseT(b.time));
            const newTimeline = { ...tl, [targetDay]: dayTl };
            saveTimelineToDB(t.dbId || t.id, newTimeline);
            return { ...t, timeline: newTimeline };
          }));
          logActivity(tripId, "📍", `Added "${namedActivity}" to Day ${targetDay}`, "itinerary");
        }

        // Now suggest other activities for the location
        const locActs = getLocationActivities(suggestLoc) || getLocationActivities(dayLoc);
        const hasKids = (trip?.travellers?.olderKids?.length || 0) + (trip?.travellers?.youngerKids?.length || 0) + (trip?.travellers?.infants?.length || 0) > 0;
        const allOptions = locActs
          ? [...(locActs.morning || []), ...(locActs.afternoon || []), ...(hasKids ? locActs.kids || [] : [])].filter(a => a.toLowerCase() !== namedActivity.toLowerCase())
          : [`Explore ${suggestLoc}`, `Walking tour of ${suggestLoc}`, `Local market`, `Sightseeing walk`, `Museum visit`];
        const uniqueOptions = [...new Set(allOptions)].slice(0, 6);
        setTripChatFlow({ step: "pick_attraction", data: { options: uniqueOptions, targetDay, loc: dayLoc } });
        const optionsList = uniqueOptions.map((o, i) => `${i + 1}. **${o}**`).join("\n");
        const addedNote = namedActivity.length > 2 ? `✅ Added **${namedActivity}** to Day ${targetDay}.\n\n` : "";
        const reply = `${addedNote}Here are more activities in **${suggestLoc}** for Day ${targetDay}:\n\n${optionsList}\n\nReply with a number to add it, or type something specific!`;
        setTripChatTyping(false);
        setTripChatMessages(prev => [...prev, { role: "ai", text: reply }]);
        saveChatMessage(trip?.dbId, 'ai', reply);
        setSelectedDay(targetDay);
        return;
      }

      // Strip "such as" / "like" phrasing from simple add requests too
      if (itemTitle) {
        itemTitle = itemTitle.replace(/^activities\s+(?:such\s+as|like)\s+/i, '').replace(/^(?:such\s+as|like)\s+/i, '').trim();
      }

      // For generic/vague items — present location-specific options for the user to pick
      const isGeneric = itemTitle && /^(famous|popular|top|best|must.?see|local|nearby|good)\s+(attraction|activit|restaurant|place|thing|spot|sight|landmark|experience)/i.test(itemTitle);
      if (isGeneric) {
        const dayLoc = locForDay(targetDay);
        const locActs = getLocationActivities(dayLoc);
        const allOptions = locActs ? [...(locActs.morning || []), ...(locActs.afternoon || []), ...(locActs.kids || [])].slice(0, 6) : [`Explore ${dayLoc}`, `Walking tour of ${dayLoc}`, `Local market in ${dayLoc}`, `${dayLoc} sightseeing walk`, `Museum visit`, `Photography walk`];
        const uniqueOptions = [...new Set(allOptions)].slice(0, 6);
        // Include distance context if day location differs from base/stay
        const stayBaseLoc = trip?.stays?.[0]?.location || (trip?.stays?.[0]?.name && places.find(p => trip.stays[0].name.toLowerCase().includes(p.toLowerCase()))) || null;
        const distBase = stayBaseLoc || firstLoc;
        const distHrs = dayLoc.toLowerCase() !== distBase.toLowerCase() ? estimateTravelHours(distBase, dayLoc, trip?.travel?.[0] || "car") : 0;
        const distNote = distHrs >= 0.25 ? `\n\n📍 ${dayLoc} is ~${distHrs >= 1 ? Math.round(distHrs * 10) / 10 + " hrs" : Math.round(distHrs * 60) + " min"} from ${distBase}` : "";
        setTripChatFlow({ step: "pick_attraction", data: { options: uniqueOptions, targetDay, loc: dayLoc } });
        const optionsList = uniqueOptions.map((o, i) => `${i + 1}. **${o}**`).join("\n");
        const reply = `Here are popular attractions in **${dayLoc}** for Day ${targetDay}:\n\n${optionsList}${distNote}\n\nReply with a number to add it, or type something specific!`;
        setTripChatTyping(false);
        setTripChatMessages(prev => [...prev, { role: "ai", text: reply }]);
        saveChatMessage(trip?.dbId, 'ai', reply);
        return;
      }
      if (itemTitle && itemTitle.length > 2) {
        // Extract explicit time from the request (e.g. "at 11:00 am", "at 2pm", "for 3:30 PM")
        const explicitTimeMatch = itemTitle.match(/\b(?:at|for|@)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i);
        let explicitTime = null;
        if (explicitTimeMatch) {
          let raw = explicitTimeMatch[1].trim().toUpperCase();
          // Normalise: "11am" → "11:00 AM", "2pm" → "2:00 PM", "3:30 PM" stays
          if (!raw.includes(":")) raw = raw.replace(/(\d+)\s*(AM|PM)/, "$1:00 $2");
          else raw = raw.replace(/(\d+:\d+)\s*(AM|PM)/, "$1 $2");
          explicitTime = raw;
          // Strip the time clause from the title
          itemTitle = itemTitle.replace(/\s*\b(?:at|for|@)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i, '').trim();
        }
        // Also check for "first stop", "morning", "afternoon", "evening" hints
        const isFirstStop = /first\s*stop|first\s*thing|start\s*with/i.test(lower);
        if (isFirstStop && !explicitTime) explicitTime = "9:00 AM";
        // Strip "first stop as" / "as first stop" / "from [location]" from title
        itemTitle = itemTitle.replace(/\b(as\s+)?first\s+stop(\s+as)?\b/i, '').replace(/\bfrom\s+\S+(\s+\S+)?\s*$/i, '').trim();
        // Clean up any leading/trailing "as"
        itemTitle = itemTitle.replace(/^as\s+/i, '').replace(/\s+as$/i, '').trim();

        const dayLoc = locForDay(targetDay);
        const smartSlot = explicitTime ? { time: explicitTime, label: "Requested time" } : findSmartSlot(tripId, targetDay, lower);
        const newItem = { time: smartSlot.time, title: itemTitle, desc: `${dayLoc} · Added via chat`, group: "Everyone", color: T.blue };
        const parseT = (s) => { const m = s?.match(/(\d+):(\d+)\s*(AM|PM)/i); if (!m) return 0; let h = parseInt(m[1]); if (m[3].toUpperCase() === "PM" && h !== 12) h += 12; if (m[3].toUpperCase() === "AM" && h === 12) h = 0; return h * 60 + parseInt(m[2]); };
        let replacedTitle = null;
        setCreatedTrips(prev => prev.map(t => {
          if (t.id !== tripId) return t;
          const tl = t.timeline || {};
          let dayTl = [...(tl[targetDay] || [])];
          const slotMins = parseT(smartSlot.time);
          const existIdx = dayTl.findIndex(it => Math.abs(parseT(it.time) - slotMins) < 30);
          if (existIdx >= 0) {
            replacedTitle = dayTl[existIdx].title;
            dayTl[existIdx] = { ...dayTl[existIdx], ...newItem };
          } else {
            dayTl = [...dayTl, newItem];
          }
          dayTl.sort((a, b) => parseT(a.time) - parseT(b.time));
          const newTimeline = { ...tl, [targetDay]: dayTl };
          saveTimelineToDB(t.dbId || t.id, newTimeline);
          return { ...t, timeline: newTimeline };
        }));
        if (replacedTitle) {
          logActivity(tripId, "🔄", `Replaced "${replacedTitle}" with "${itemTitle}" on Day ${targetDay} · ${smartSlot.time}`, "itinerary");
        } else {
          logActivity(tripId, "📍", `Added "${itemTitle}" to Day ${targetDay}`, "itinerary");
        }
        setSelectedDay(targetDay);
        const addReply = replacedTitle
          ? `🔄 Replaced **${replacedTitle}** with **${itemTitle}** on **Day ${targetDay}** at ${smartSlot.time} (${smartSlot.label}) in ${firstLoc}. Tap the Itinerary tab to see it — tap ✏️ to adjust.`
          : `✅ Added **${itemTitle}** to **Day ${targetDay}** at ${smartSlot.time} (${smartSlot.label}) in ${firstLoc}. Tap the Itinerary tab to see it — tap ✏️ to adjust the time.`;
        setTripChatTyping(false);
        setTripChatMessages(prev => [...prev, { role: "ai", text: addReply }]);
        saveChatMessage(trip?.dbId, 'ai', addReply);
        return;
      }
    }

    // Try Claude API first for richer, context-aware responses
    try {
      const res = await authFetch(API.CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          tripContext: sanitiseTripContext({
            dates: trip?.start && trip?.end ? `${trip.start} – ${trip.end}` : null,
            places: trip?.places,
            travelMode: trip?.travel?.join(", "),
            travellers: trip?.travellers,
            stays: trip?.stays,
            prefs: trip?.prefs,
            budget,
            currentLocation: firstLoc,
            currentDay: selectedDay,
            templateStyle: (() => { const tp = TEMPLATE_PROFILES[trip?.templateKey]; return tp ? `Trip style: ${trip.templateKey}. Bias recommendations towards: ${tp.chatBias}.` : null; })(),
          }),
          intelligence: intelligenceRef.current, // Real-time signals from connectors
          chatHistory: tripChatMessages.slice(-10),
          chatSummary: tripChatMessages.length > 10 ? (() => {
            const earlier = tripChatMessages.slice(0, -10);
            const topics = [...new Set(earlier.filter(m => m.role === 'user').map(m => m.text).filter(Boolean).map(t => t.slice(0, 60)))].slice(-5);
            return `Earlier in this conversation (${earlier.length} messages), topics discussed: ${topics.join('; ') || 'general trip planning'}`;
          })() : null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setTripChatTyping(false);
        setTripChatMessages(prev => [...prev, { role: "ai", text: data.reply }]);
        saveChatMessage(trip?.dbId, 'ai', data.reply);
        return;
      }
    } catch (e) { /* API unavailable — fall back to local */ }

    // Local fallback
    setTimeout(async () => {
      let reply = "";
      const lower = msg.toLowerCase();
      if (lower.includes("restaurant") || lower.includes("food") || lower.includes("eat") || lower.includes("lunch") || lower.includes("dinner") || lower.includes("nearby")) {
        // Use Places API for real restaurant search — always try GPS first
        const extras = [];
        if (wantsDog) extras.push("🐕 dog-friendly");
        if (wantsAccessible) extras.push("♿ accessible");
        if (hasKids) extras.push("👧 kids' menus");
        const filterStr = extras.length > 0 ? `\nFiltering for: ${extras.join(", ")}` : "";
        const searchQuery = `${budgetLabel} ${foodPref} restaurants ${hasKids ? "family friendly" : ""} in ${firstLoc}`;

        // Always try GPS first for restaurant searches — traveller might be en route
        const doPlacesSearch = async (gpsLat, gpsLng) => {
          const body = { query: searchQuery, type: "restaurant" };
          if (gpsLat && gpsLng) { body.location = { lat: gpsLat, lng: gpsLng }; body.radius = 5000; }
          const placesRes = await authFetch(API.PLACES, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          return placesRes;
        };

        // Try Places API — always attempt GPS first, fall back to location name
        try {
          let placesRes;
          let usedGps = false;
          if (navigator.geolocation) {
            try {
              const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }));
              placesRes = await doPlacesSearch(pos.coords.latitude, pos.coords.longitude);
              usedGps = true;
            } catch (gpsErr) {
              placesRes = await doPlacesSearch(null, null);
            }
          } else {
            placesRes = await doPlacesSearch(null, null);
          }
          const placesData = await placesRes.json();
          if (placesRes.ok && placesData.places?.length > 0) {
            const top5 = placesData.places.slice(0, 5);
            const placesList = top5.map((p, i) => {
              const stars = p.rating ? `${p.rating}★` : "";
              const price = p.priceLevel || "";
              const status = p.openNow === true ? "Open now" : p.openNow === false ? "Closed" : "";
              // Extract cuisine/type from types array
              const cuisineTypes = (p.types || [])
                .filter(t => !["restaurant","food","point_of_interest","establishment","meal_takeaway","meal_delivery","store","bar"].includes(t))
                .map(t => t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()))
                .slice(0, 2);
              const cuisineLabel = cuisineTypes.length > 0 ? cuisineTypes.join(" · ") : "";
              const mapLink = `https://www.google.com/maps/place/?q=place_id:${p.placeId}`;
              return `${i + 1}. **${p.name}** ${stars} ${price}${cuisineLabel ? ` · ${cuisineLabel}` : ""}\n   ${p.address}${status ? ` · ${status}` : ""}\n   [View on Maps](${mapLink})`;
            }).join("\n\n");

            const locNote = usedGps ? "your current location" : firstLoc;
            reply = `🍽️ **Top restaurants near ${locNote}** (Day ${selectedDay}, ${foodPref}):${filterStr}\n\n${placesList}\n\n📍 *Results based on ${usedGps ? "your GPS location" : "trip destination"}*\n\n💡 Say **"Add [name] to Day ${selectedDay}"** to plug it into your itinerary!`;
            setTripChatTyping(false);
            setTripChatMessages(prev => [...prev, { role: "ai", text: reply }]);
            return;
          }
        } catch (e) { /* Places API unavailable — use static fallback */ }

        reply = `For ${budgetLabel} dining in ${firstLoc} (${foodPref}):${filterStr}\n\n🍽️ I'd suggest ${budgetLabel} ${wantsPubs ? "pubs & gastropubs" : "restaurants"} with ${foodPref} options.${hasKids ? `\n👧 With ${kidNames}, look for family-friendly spots.` : ""}\n\nTap ✏️ on any meal to update.`;
      } else if (lower.includes("earlier") || lower.includes("later") || lower.includes("time") || lower.includes("move")) {
        reply = `${contextLine}Tap ✏️ on any timeline item to adjust times.`;
        if (hasKids) {
          const youngest = Math.min(...allKids.map(k => parseInt(k.age) || 10));
          reply += youngest <= 7 ? `\n\n💡 With young kids (${kidNames}), I'd recommend:\n• Dinner by 5:30 PM\n• Rest breaks every 2 hours\n• Late starts if mornings are tough` : `\n\n💡 With ${kidNames}, earlier dinner (6 PM) works well.`;
        }
      } else if (lower.includes("add") || lower.includes("include") || lower.includes("plug")) {
        // Check if user wants to add a specific item (e.g., "add Oink to day 2")
        const dayMatch = lower.match(/day\s*(\d+)/);
        const targetDay = dayMatch ? parseInt(dayMatch[1]) : selectedDay;
        // Extract what to add — text after "add"/"include"/"plug"
        const addMatch = msg.match(/(?:add|include|plug(?:\s*in)?)\s+(.+?)(?:\s+(?:to|into|on|for)\s+day\s*\d+)?$/i);
        const itemTitle = addMatch ? addMatch[1].trim().replace(/(?:to|into|on|for)\s+day\s*\d+$/i, '').trim() : null;
        if (itemTitle && itemTitle.length > 2) {
          // Add a specific named item to the specified day — smart time slot, replace if conflict
          const smartSlot = findSmartSlot(tripId, targetDay, lower);
          const newItem = { time: smartSlot.time, title: itemTitle, desc: `${firstLoc} · Added via chat`, group: "Everyone", color: T.blue };
          const parseT = (s) => { const m = s?.match(/(\d+):(\d+)\s*(AM|PM)/i); if (!m) return 0; let h = parseInt(m[1]); if (m[3].toUpperCase() === "PM" && h !== 12) h += 12; if (m[3].toUpperCase() === "AM" && h === 12) h = 0; return h * 60 + parseInt(m[2]); };
          let replacedTitle = null;
          setCreatedTrips(prev => prev.map(t => {
            if (t.id !== tripId) return t;
            const tl = t.timeline || {};
            let dayTl = [...(tl[targetDay] || [])];
            const slotMins = parseT(smartSlot.time);
            const existIdx = dayTl.findIndex(it => Math.abs(parseT(it.time) - slotMins) < 30);
            if (existIdx >= 0) {
              replacedTitle = dayTl[existIdx].title;
              dayTl[existIdx] = { ...dayTl[existIdx], ...newItem };
            } else {
              dayTl = [...dayTl, newItem];
            }
            dayTl.sort((a, b) => parseT(a.time) - parseT(b.time));
            const newTimeline = { ...tl, [targetDay]: dayTl };
            saveTimelineToDB(t.dbId || t.id, newTimeline);
            return { ...t, timeline: newTimeline };
          }));
          if (replacedTitle) {
            logActivity(tripId, "🔄", `Replaced "${replacedTitle}" with "${itemTitle}" on Day ${targetDay} · ${smartSlot.time}`, "itinerary");
          } else {
            logActivity(tripId, "📍", `Added "${itemTitle}" to Day ${targetDay}`, "itinerary");
          }
          // Auto-switch to itinerary on the added day
          setSelectedDay(targetDay);
          reply = replacedTitle
            ? `🔄 Replaced **${replacedTitle}** with **${itemTitle}** on **Day ${targetDay}** at ${smartSlot.time} (${smartSlot.label}) in ${firstLoc}. Tap the Itinerary tab to see it — tap ✏️ to adjust.`
            : `✅ Added **${itemTitle}** to **Day ${targetDay}** at ${smartSlot.time} (${smartSlot.label}) in ${firstLoc}. Tap the Itinerary tab to see it — tap ✏️ to adjust the time.`;
        } else {
          addTimelineItem(tripId);
          reply = `${contextLine}Added a new activity slot for ${firstLoc}.`;
          if (hasKids) reply += `\n\n👧 Tip: Split adult/kid activities — ${kidNames} might enjoy something different!`;
          if (wantsDog) reply += `\n🐕 Remember: check venue is dog-friendly before booking.`;
          reply += `\n\nTap ✏️ to customise.`;
        }
      } else if (lower.includes("remove") || lower.includes("delete") || lower.includes("cancel")) {
        reply = `Tap ✏️ on any item, then 🗑️ to remove it. Which activity would you like to remove?`;
      } else if (lower.includes("budget") || lower.includes("cost") || lower.includes("spend") || lower.includes("price")) {
        reply = `${contextLine}Your **${budget || "unspecified"}** budget shapes all recommendations:\n• 🍽️ ${budgetLabel} restaurants (${foodPref})\n• 🎯 ${budgetLabel} activities\n• 🏨 Stays: ${trip?.stayNames?.join(", ") || "not set"}\n\nTrack actual costs by marking items as "Booked" and entering the price.`;
      } else if (lower.includes("suggest") || lower.includes("activit") || lower.includes("things to do") || lower.includes("what can") || lower.includes("what should") || lower.includes("recommend") || lower.includes("ideas")) {
        const dayLoc = locForDay(selectedDay);
        const locActs = getLocationActivities(dayLoc);
        if (locActs) {
          const morning = locActs.morning || [];
          const afternoon = locActs.afternoon || [];
          const kidsActs = (hasKids && locActs.kids) ? locActs.kids : [];
          const allOptions = [...morning.slice(0, 3), ...afternoon.slice(0, 3), ...kidsActs.slice(0, 2)];
          const uniqueOptions = [...new Set(allOptions)].slice(0, 6);
          setTripChatFlow({ step: "pick_attraction", data: { options: uniqueOptions, targetDay: selectedDay, loc: dayLoc } });
          const optionsList = uniqueOptions.map((o, i) => `${i + 1}. **${o}**`).join("\n");
          reply = `Here are activities I'd recommend in **${dayLoc}** for Day ${selectedDay}:\n\n${optionsList}\n\nReply with a number to add it to your itinerary, or type something specific!`;
        } else {
          reply = `${contextLine}For activities in **${dayLoc}**, try saying:\n• "Add [activity name] to Day ${selectedDay}"\n• "Add popular attractions"\n\nOr ask about restaurants, timing, or budget!`;
        }
      } else if (lower.includes("summary") || lower.includes("plan") || lower.includes("overview")) {
        reply = `${contextLine}All itinerary items above are tailored to this context. Ask me about restaurants, activities, timing, or budget — I'll factor in everything.`;
      } else if (lower.includes("regenerate") || lower.includes("refresh") || lower.includes("redo")) {
        generateAndSetTimeline(tripId);
        reply = `${contextLine}Done! I've regenerated your itinerary based on all your preferences. The timeline above is updated.`;
      } else {
        reply = `${contextLine}I'm using all of the above to personalise your ${firstLoc} trip. Ask me about:\n• 🍽️ Restaurants & food\n• ⏰ Timing adjustments\n• 🎯 Activities to add\n• 💰 Budget & costs\n• 🔄 Regenerate itinerary`;
      }
      setTripChatTyping(false);
      setTripChatMessages(prev => [...prev, { role: "ai", text: reply }]);
      saveChatMessage(trip?.dbId, 'ai', reply);
    }, Math.min(2500, Math.max(800, 1200)));
  };

  // ─── Day-Aware Chat Greeting (uses real trip data) ───
  const buildDayGreeting = useCallback((dayNum) => {
    const trip = selectedCreatedTrip || createdTrips[0];
    if (!trip) return `Welcome to Trip With Me! Create a trip to get started.`;

    const places = trip.places || [];
    const stays = trip.stays || [];
    const travelModes = trip.travel || [];
    const travelMode = Array.isArray(travelModes) ? travelModes[0] : (travelModes instanceof Set ? [...travelModes][0] : travelModes) || "car";
    const modeIcon = String(travelMode).toLowerCase().includes("ev") ? "\uD83D\uDD0B" : String(travelMode).toLowerCase().includes("flight") ? "\u2708\uFE0F" : String(travelMode).toLowerCase().includes("train") ? "\uD83D\uDE86" : "\uD83D\uDE97";

    // Calculate total days
    const numDays = trip.rawStart && trip.rawEnd
      ? Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1)
      : places.length || 3;
    const isFirstDay = dayNum === 1;
    const isLastDay = dayNum >= numDays;

    // Figure out today's location from stays or places
    const currentLocation = places[Math.min(dayNum - 1, places.length - 1)] || places[0] || "your destination";
    const currentStay = stays.find((s, i) => {
      if (!s.checkIn || !s.checkOut) return i === 0;
      const ci = new Date(s.checkIn + "T12:00:00");
      const co = new Date(s.checkOut + "T12:00:00");
      const tripStart = trip.rawStart ? new Date(trip.rawStart + "T12:00:00") : ci;
      const dayDate = new Date(tripStart.getTime() + (dayNum - 1) * 86400000);
      return dayDate >= ci && dayDate < co;
    }) || stays[0];

    // Timeline items for this day
    const dayTimeline = trip.timeline?.[dayNum] || [];
    const highlights = dayTimeline.slice(0, 3).map(it => `${it.time || ""} ${it.title}`).join("\n").trim();

    if (isFirstDay) {
      setChatFlowStep(trip.startLocation ? "ask_pickups" : "ask_start");
      setChatFlowData(trip.startLocation ? { startLocation: trip.startLocation } : {});
      let msg = `${modeIcon} **Travel day \u2014 heading to ${currentLocation}!**\n\n`;
      if (trip.startLocation) msg += `**From:** ${trip.startLocation}\n`;
      if (currentStay) msg += `**Staying at:** ${currentStay.name}\n`;
      msg += `**Mode:** ${travelMode}\n`;

      // Inject weather + intelligence for destination
      const smartGreeting = buildSmartGreeting(intelligenceRef.current, dayNum, currentLocation, currentStay?.name);
      if (smartGreeting) msg += `\n${smartGreeting}\n`;

      if (trip.startLocation) {
        msg += `\nAnyone to pick up along the way?`;
      } else {
        msg += `\nWhere are you starting from? Enter your postcode or city so I can plan your route.`;
      }
      return msg;
    }

    if (isLastDay) {
      setChatFlowStep(trip.startLocation ? "ask_departure_time" : "ask_home");
      setChatFlowData(trip.startLocation ? { homeLocation: trip.startLocation } : {});
      let msg = `\uD83C\uDFE0 **Final day \u2014 ${trip.startLocation ? `heading back to ${trip.startLocation}!` : "time to head home!"}**\n\n`;
      msg += `${modeIcon} **From:** ${currentStay ? currentStay.name + ", " : ""}${currentLocation}\n`;
      if (trip.startLocation) msg += `**To:** ${trip.startLocation}\n`;
      msg += `\n${trip.startLocation ? "What time would you like to leave?" : "Where are you heading home to? I'll plan your departure with the best stops."}`;
      return msg;
    }

    // Middle days
    setChatFlowStep(null);
    setChatFlowData({});
    let msg = `Good morning! Day ${dayNum} in **${currentLocation}**\n\n`;
    if (currentStay) {
      msg += `\uD83C\uDFE8 Your base today: **${currentStay.name}**${currentStay.type ? ` (${currentStay.type})` : ""}\n\n`;
    }

    // Inject real-time intelligence if available
    const smartGreeting = buildSmartGreeting(intelligenceRef.current, dayNum, currentLocation, currentStay?.name);
    if (smartGreeting) {
      msg += smartGreeting + "\n\n";
    }

    if (highlights) {
      msg += highlights + "\n";
    } else {
      msg += `Ask me for restaurant recommendations, activities, or anything else in **${currentLocation}**!`;
    }
    return msg;
  }, [selectedCreatedTrip, createdTrips]);

  // Initialize chat greeting when entering chat or switching days
  useEffect(() => {
    if (screen === "chat" && chatDayInit !== selectedDay) {
      const greeting = buildDayGreeting(selectedDay);
      if (chatDayInit === null) {
        setChatMessages([{ role: "ai", text: greeting }]);
      } else {
        setChatMessages(prev => [...prev, { role: "ai", text: `— Switching to Day ${selectedDay} —\n\n${greeting}` }]);
      }
      setChatDayInit(selectedDay);
    }
  }, [screen, selectedDay, chatDayInit, buildDayGreeting]);

  const value = {
    chatMessages, setChatMessages,
    chatInput, setChatInput,
    chatRef,
    chatTyping, setChatTyping,
    chatFlowStep, setChatFlowStep,
    chatFlowData, setChatFlowData,
    chatDayInit, setChatDayInit,
    chatAddDayPicker, setChatAddDayPicker,
    lastChatTopic, setLastChatTopic,
    tripChatInput, setTripChatInput,
    tripChatMessages, setTripChatMessages,
    tripChatEndRef,
    tripChatTyping, setTripChatTyping,
    tripChatFlow,
    loadTripMessages,
    saveChatMessage,
    handleTripChat,
    buildDayGreeting,
    intelligence,
    smartTips,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  return useContext(ChatContext);
}
