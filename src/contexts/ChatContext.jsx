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
import { getRestaurantBookingMarkdown } from "../utils/bookingLinks";
import { TEMPLATE_PROFILES } from "../constants/templateProfiles";
import { useExpenses } from "./ExpenseContext";
import { getCatInfo } from "../constants/expenses";

const ChatContext = createContext(null);

// ─── Unique message ID generator ───
let _msgIdCounter = 0;
function msgId() { return `msg_${Date.now()}_${++_msgIdCounter}`; }

// ─── Safari-safe findLastIndex polyfill ───
function findLastIdx(arr, predicate) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i], i, arr)) return i;
  }
  return -1;
}

// ─── Helper: add placeholder msg and return updater that replaces it by ID ───
function usePlaceholder(setMessages, saveFn) {
  return (text, tripDbId) => {
    const id = msgId();
    setMessages(prev => [...prev, { id, role: "ai", text }]);
    const update = (reply) => {
      setMessages(prev => {
        const updated = [...prev];
        const idx = findLastIdx(updated, m => m.id === id);
        if (idx >= 0) updated[idx] = { ...updated[idx], text: reply };
        else updated.push({ id: msgId(), role: "ai", text: reply });
        return updated;
      });
      if (saveFn && tripDbId) saveFn(tripDbId, 'ai', reply);
    };
    return update;
  };
}

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
  const { expenses, calculateSettlement } = useExpenses();

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
  const [_tripChatTyping, _setTripChatTyping] = useState(false);
  const [tripChatFlow, setTripChatFlow] = useState(null); // { step, data }
  const [typingContext, setTypingContext] = useState(""); // contextual typing label e.g. "Looking up restaurants..."
  const lastFailedMsgRef = useRef(null); // store last failed user message for retry

  // Wrapper: auto-clear typing context when typing stops
  const tripChatTyping = _tripChatTyping;
  const setTripChatTyping = (v) => { _setTripChatTyping(v); if (!v) setTypingContext(""); };

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

    // Fetch intelligence in background with cleanup guard
    let cancelled = false;
    fetchTripIntelligence(trip, selectedDay, currentLoc).then(intel => {
      if (intel && !cancelled) {
        setIntelligence(intel);
        intelligenceRef.current = intel;
        setSmartTips(buildSmartTips(intel));
      }
    });
    return () => { cancelled = true; };
  }, [selectedDay, selectedCreatedTrip, createdTrips]);

  // Reset tripChatFlow when day changes — prevents stale pick_attraction/ev flows
  useEffect(() => {
    if (tripChatFlow) {
      setTripChatFlow(null);
    }
  }, [selectedDay]);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [chatMessages]);

  // ─── Chat Persistence: Load messages from Supabase ───
  const loadTripMessages = async (tripDbId) => {
    if (!tripDbId) return;
    try {
      const { data, error } = await supabase.from('messages').select('*').eq('trip_id', tripDbId).order('created_at', { ascending: true });
      if (error) {
        // Table may not exist yet — only warn for unexpected errors
        if (!error.message?.includes('does not exist')) console.warn('Failed to load chat messages:', error.message);
        return;
      }
      if (data && data.length > 0) {
        setTripChatMessages(data.map(m => ({ id: m.id || msgId(), role: m.sender_role || 'user', text: m.text, senderName: m.sender_name })));
      }
    } catch (e) {
      console.warn('Chat message load error:', e.message);
    }
  };

  const saveChatMessage = async (tripDbId, role, text, senderName) => {
    if (!tripDbId) return;
    try {
      const { error } = await supabase.from('messages').insert({ trip_id: tripDbId, sender_role: role, text, sender_name: senderName || (role === 'ai' ? 'Trip With Me AI' : 'You') });
      if (error && !error.message?.includes('does not exist')) {
        console.warn('Failed to save chat message:', error.message);
      }
    } catch (e) {
      console.warn('Chat message save error:', e.message);
    }
  };

  // ─── Trip Chat Handler ───
  const handleTripChat = async (tripId) => {
    const msg = tripChatInput.trim();
    if (!msg) return;
    setTripChatMessages(prev => [...prev, { id: msgId(), role: "user", text: msg }]);
    setTripChatInput("");
    const addPlaceholder = usePlaceholder(setTripChatMessages, saveChatMessage);
    setTripChatTyping(true);
    setTypingContext("Thinking...");
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

    const lower = msg.toLowerCase();

    // ── Extract user-mentioned location from the message ──
    // If the user names a trip place (e.g. "near windermere"), use that instead of selectedDay location
    const mentionedLoc = (() => {
      const places = trip?.places || [];
      for (const p of places) {
        if (lower.includes(p.toLowerCase())) return p;
      }
      return null;
    })();
    const effectiveLoc = mentionedLoc || firstLoc;

    // ── Handle "pick attraction" flow — user selecting from suggested options ──
    if (tripChatFlow?.step === "pick_attraction") {
      // If user is issuing a NEW explicit command (e.g. "day 2 – Add X"), clear the flow and let it fall through
      const isNewCommand = (/\b(add|include|plug)\b/i.test(lower) && (/day\s*\d+/i.test(lower) || /first stop|morning|afternoon|evening/i.test(lower)))
        || /\b(suggest|recommend|show me|find|what|list|remove|clear|ev charger)\b/i.test(lower)
        || /\b(how|weather|forecast|temperature|rain|cost|budget|price|when|where|who|why|can you|could you|tell me|is there|are there|do we|should we|what time)\b/i.test(lower);
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
        setTripChatMessages(prev => [...prev, { id: msgId(), role: "ai", text: reply }]);
        saveChatMessage(trip?.dbId, 'ai', reply);
        return;
      } else if (cleanInput.length > 2
        && !/\b(how|what|when|where|why|who|is there|are there|can|could|should|would|weather|forecast|temperature|cost|budget|price|tell me)\b/i.test(cleanInput)
        && !/\?$/.test(msg.trim())
        // Reject conversational/filler phrases that shouldn't become itinerary items
        && !/^(ok|okay|hmm|hm|umm|um|ah|oh|great|cool|nice|good|sure|yeah|yep|nope|nah|right|fine|alright|awesome|perfect|thanks|thank you|cheers|brilliant|lovely|wow|lol|haha|interesting|maybe|perhaps|dunno|idk|not sure|no thanks|no thank you|never mind|nevermind|forget it|skip|pass|none|nothing|whatever|anyway|anyways|so|well|actually|honestly|basically|literally|totally|absolutely|exactly|indeed|certainly|definitely|obviously|clearly|fair enough|no worries|all good|sounds good|got it|understood|noted|i see|makes sense|that works|let me think|i'll think|not now|later|next time)$/i.test(cleanInput.replace(/[.!,]+$/, '').trim())
        // Must have at least one word that looks like a real activity/place name (3+ chars, not all stopwords)
        && cleanInput.split(/\s+/).filter(w => w.length >= 3 && !['the','and','for','with','some','any','but','not','this','that','its','was','has','had','are','were','been','will','can','may','let','also','too','very','just','really','quite','much','more','most','all','bit'].includes(w)).length > 0
      ) {
        // User typed something specific not in the list — add it as a custom activity (but NOT questions/conversational noise)
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
        setTripChatMessages(prev => [...prev, { id: msgId(), role: "ai", text: reply }]);
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

      setTypingContext("Finding EV chargers...");
      const updateEvFlow = addPlaceholder("⚡ Finding EV chargers with real-time details...", trip?.dbId);

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
              const addr = c.address ? `\n   📍 ${c.address}` : "";
              const operator = c.operator ? `\n   🏢 ${c.operator}` : "";
              const rating = isGoogleFallback && c.rating ? ` · ${c.rating}★` : "";
              const open = isGoogleFallback ? (c.openNow === true ? " · Open now" : c.openNow === false ? " · Closed" : "") : "";
              const zapLink = c.zapMapLink ? ` · [Zap-Map Live](${c.zapMapLink})` : "";
              return `${i + 1}. **${c.name}**${dist}${status}${rating}${open}${speed}${addr}${connectors}${points}${cost}${operator}${facilities}\n   [Navigate](${c.mapsLink})${zapLink}`;
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

      // Use the current day's location for the flow follow-up
      const flowDayLoc = locForDay(selectedDay);
      const flowDayCoords = findCoords(flowDayLoc);
      if (flowDayCoords) {
        setTripChatTyping(false);
        updateEvFlow(await handleEvResults(flowDayCoords[0], flowDayCoords[1], flowDayLoc));
      } else {
        setTripChatTyping(false);
        updateEvFlow(await handleEvResults(null, null, flowDayLoc || firstLoc));
      }
      return;
    }

    // ── Weather queries — live forecast from OpenWeatherMap ──
    // Match: "weather forecast", "rain today", "temperature", "is it sunny", "how cold", etc.
    const isWeatherQuery = /\b(weather|forecast|temperature)\b/i.test(lower)
      || (/\b(rain|cold|hot|warm|snow|wind|sunny|cloudy|storm|thunder|ice|frost|hail)\b/i.test(lower) && /\b(how|what|will|is|any|check|look|today|tomorrow|day\s*\d+|this week|expect)\b/i.test(lower));
    if (isWeatherQuery) {
      const weatherDayMatch = lower.match(/day\s*(\d+)/);
      const isTomorrow = /\btomorrow\b/i.test(lower);
      const weatherDay = weatherDayMatch ? parseInt(weatherDayMatch[1]) : isTomorrow ? selectedDay + 1 : selectedDay;
      const weatherLoc = mentionedLoc || locForDay(weatherDay) || firstLoc;
      const weatherCoords = findCoords(weatherLoc);

      setTypingContext("Checking weather...");
      const updateWeather = addPlaceholder(`🌤️ Checking weather for **${weatherLoc}**...`, trip?.dbId);

      (async () => {
        try {
          const body = weatherCoords ? { lat: weatherCoords[0], lng: weatherCoords[1], units: "metric" } : { location: weatherLoc, units: "metric" };
          const res = await authFetch(API.WEATHER, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();

          let reply;
          if (res.ok && data.current) {
            const condIcon = { Clear: "☀️", Clouds: "☁️", Rain: "🌧️", Drizzle: "🌦️", Snow: "❄️", Thunderstorm: "⛈️", Mist: "🌫️", Fog: "🌫️" }[data.current.condition] || "🌤️";
            reply = `${condIcon} **Weather in ${weatherLoc}:**\n\n**Now:** ${data.current.temp}°C (feels like ${data.current.feelsLike}°C) · ${data.current.description}\n💨 Wind: ${data.current.wind?.speed} m/s · 💧 Humidity: ${data.current.humidity}%`;

            // Add forecast for trip days
            if (data.daily?.length > 0) {
              const tripStart = trip?.rawStart ? new Date(trip.rawStart + "T12:00:00") : null;
              const forecastLines = data.daily.slice(0, 5).map(d => {
                const dayDate = new Date(d.date + "T12:00:00");
                const dayLabel = tripStart ? (() => {
                  const diff = Math.round((dayDate - tripStart) / 86400000) + 1;
                  return diff >= 1 && diff <= 10 ? `Day ${diff}` : dayDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
                })() : dayDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
                const fIcon = { Clear: "☀️", Clouds: "☁️", Rain: "🌧️", Drizzle: "🌦️", Snow: "❄️", Thunderstorm: "⛈️" }[d.condition] || "🌤️";
                const rain = d.rainMm > 0 ? ` · 🌧️ ${d.rainMm}mm` : "";
                return `${fIcon} **${dayLabel}:** ${d.high}°/${d.low}°C · ${d.condition}${rain}`;
              });
              reply += `\n\n**Forecast:**\n${forecastLines.join("\n")}`;
            }

            // Add alerts
            if (data.alerts?.length > 0) {
              reply += `\n\n⚠️ **Alerts:**\n${data.alerts.map(a => `• ${a.message}`).join("\n")}`;
            }

            // Packing tips
            const anyRain = data.daily?.some(d => d.rainMm > 1);
            const anyCold = data.daily?.some(d => d.low <= 5);
            const tips = [];
            if (anyRain) tips.push("🌂 Pack waterproofs");
            if (anyCold) tips.push("🧥 Bring warm layers");
            if (data.current.temp > 25) tips.push("🧴 Don't forget sun cream");
            if (tips.length > 0) reply += `\n\n🎒 ${tips.join(" · ")}`;
          } else {
            reply = `🌤️ Couldn't fetch weather for ${weatherLoc}. Check [BBC Weather](https://www.bbc.co.uk/weather) or your weather app for the latest forecast.`;
          }

          setTripChatTyping(false);
          updateWeather(reply);
        } catch (e) {
          setTripChatTyping(false);
          updateWeather(`🌤️ Couldn't fetch weather right now. Check [BBC Weather](https://www.bbc.co.uk/weather) for ${weatherLoc}.`);
        }
      })();
      return;
    }

    // ── EV charger queries — Open Charge Map for detailed results ──
    if (/\bev\b|charger|charging|charge point|charge station/i.test(lower) && !/add|schedule|time/.test(lower)) {
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
        setTripChatMessages(prev => [...prev, { id: msgId(), role: "ai", text: `🚗 Your trip has ${totalTravellers} travellers. How many EVs need charging? Also, what connector type do you need?\n\n• **CCS** (most common for rapid charging)\n• **CHAdeMO**\n• **Type 2** (standard AC)\n\nJust reply like: "2 cars, CCS" or "1 car, Type 2"` }]);
        return;
      }

      // Parse multi-car count from message
      const carCountMatch = lower.match(/(\d+)\s*(?:car|vehicle|ev)/);
      const carCount = carCountMatch ? parseInt(carCountMatch[1]) : 1;

      // ── Route-aware: detect "halfway", "between X and Y", "en route", "on the way" ──
      const isRouteQuery = /halfway|half\s*way|between|en\s*route|on\s*the\s*way|along\s*the\s*(way|route)|mid[\s-]*route|mid[\s-]*way|from\s+.+?\s+to\s+|start.*(?:stay|accom|hotel|destination|location)|(?:stay|accom|hotel|destination).*start/i.test(lower);
      if (isRouteQuery) {
        // Determine from/to — extract from message or use trip context
        const betweenMatch = lower.match(/between\s+(.+?)\s+and\s+(.+?)(?:\s*$|\s*for|\s*on)/i);
        const fromToMatch = !betweenMatch ? lower.match(/from\s+(.+?)\s+to\s+(.+?)(?:\s*$|\s*for|\s*on)/i) : null;
        let fromLoc, toLoc;
        if (betweenMatch) {
          fromLoc = betweenMatch[1].replace(/\b(ev|charger|charging|station|point|half\s*way)\b/gi, '').trim();
          toLoc = betweenMatch[2].replace(/\b(ev|charger|charging|station|point)\b/gi, '').trim();
        } else if (fromToMatch) {
          fromLoc = fromToMatch[1].replace(/\b(ev|charger|charging|station|point|half\s*way)\b/gi, '').trim();
          toLoc = fromToMatch[2].replace(/\b(ev|charger|charging|station|point)\b/gi, '').trim();
        }
        // Resolve special keywords to actual trip locations
        const resolveLocKeyword = (loc) => {
          const l = loc.toLowerCase();
          if (/^(start|starting|home|origin|our|my)\s*(location|point|place|town|city)?$/i.test(l)) return trip?.startLocation || firstLoc;
          if (/^(destination|stay|accom|hotel|end|arrival|the\s+(?:lake|destination|stay|hotel))$/i.test(l)) {
            // Prefer a trip place with known coordinates over a stay name
            const stayLoc = trip?.stays?.[0]?.location;
            const stayLocCoords = stayLoc ? findCoords(stayLoc) : null;
            if (stayLocCoords) return stayLoc;
            // Fall back to first trip place (e.g. "Lake District")
            return trip?.places?.[0] || firstLoc;
          }
          return loc;
        };
        if (fromLoc) fromLoc = resolveLocKeyword(fromLoc);
        if (toLoc) toLoc = resolveLocKeyword(toLoc);
        if (!fromLoc && !toLoc) {
          // Default: starting location → first destination/stay
          fromLoc = trip?.startLocation || trip?.places?.[0] || firstLoc;
          const defStayLoc = trip?.stays?.[0]?.location;
          toLoc = (defStayLoc && findCoords(defStayLoc)) ? defStayLoc : trip?.places?.[0] || firstLoc;
          // If from and to are the same, try start → first place
          if (fromLoc.toLowerCase() === toLoc.toLowerCase() && trip?.places?.length > 0) {
            toLoc = trip.places[0];
          }
        }
        const fromCoords = findCoords(fromLoc);
        const toCoords = findCoords(toLoc);

        setTypingContext("Searching route for chargers...");
        const updateRouteEv = addPlaceholder(`⚡ Finding EV chargers along the route from **${fromLoc}** to **${toLoc}**...`, trip?.dbId);

        (async () => {
          try {
            const body = { maxResults: 5 };
            if (fromCoords && toCoords) {
              body.mode = "route";
              body.fromLat = fromCoords[0]; body.fromLng = fromCoords[1];
              body.toLat = toCoords[0]; body.toLng = toCoords[1];
            } else {
              // Fallback: search near midpoint or known location (no route mode)
              const anyCoords = fromCoords || toCoords || findCoords(firstLoc);
              if (anyCoords) { body.lat = anyCoords[0]; body.lng = anyCoords[1]; }
              else { body.locationName = fromLoc; }
            }
            if (connectorType) body.connectorType = connectorType;
            if (evRangeMiles) body.rangeMiles = evRangeMiles;

            const res = await authFetch(API.EV_CHARGERS, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            const data = await res.json();

            let reply;
            if (res.ok && data.chargers?.length > 0) {
              const isGoogleFallback = data.source === "google";
              const list = data.chargers.map((c, i) => {
                const dist = c.distance ? ` · 📏 ${c.distance}` : "";
                const status = c.isOperational ? " · 🟢 Operational" : c.isOperational === false ? " · 🔴 Out of service" : "";
                const speed = c.maxPowerKW ? ` · ⚡ ${c.speedLabel} (${c.maxPowerKW}kW)` : "";
                const addr = c.address ? `\n   📍 ${c.address}` : "";
                const connectors = c.connectors?.length > 0 ? `\n   🔌 ${c.connectors.join(", ")} · ${c.totalPoints} point${c.totalPoints > 1 ? "s" : ""}` : "";
                const points = carCount > 1 && c.totalPoints ? (c.totalPoints >= carCount ? ` ✅ Can charge ${carCount} cars` : ` ⚠️ Only ${c.totalPoints} point${c.totalPoints > 1 ? "s" : ""}`) : "";
                const cost = c.usageCost ? `\n   💰 ${c.usageCost}` : c.usageType ? `\n   💰 ${c.usageType}` : "";
                const facilities = c.facilities?.length > 0 ? `\n   🏪 ${c.facilities.join(" · ")}` : "";
                const operator = c.operator ? `\n   🏢 ${c.operator}` : "";
                const rating = isGoogleFallback && c.rating ? ` · ${c.rating}★` : "";
                const open = isGoogleFallback ? (c.openNow === true ? " · Open now" : c.openNow === false ? " · Closed" : "") : "";
                const zapLink = c.zapMapLink ? ` · [Zap-Map Live](${c.zapMapLink})` : "";
                return `${i + 1}. **${c.name}**${dist}${status}${rating}${open}${speed}${addr}${connectors}${points}${cost}${operator}${facilities}\n   [Navigate](${c.mapsLink})${zapLink}`;
              }).join("\n\n");

              const vehicleNote = evModelLabel ? `\n\n🔋 Filtered for your **${evModelLabel}** (${connectorType || evDefaultConnector || "CCS"}${evRangeMiles ? ` · ${evRangeMiles}mi range` : ""})` : "";
              const zapNote = "\n\n📡 Tap **Zap-Map Live** for real-time availability and queue times.";
              const googleNote = isGoogleFallback ? "\n\n_ℹ️ Basic results shown — connector details unavailable. Check Zap-Map for full info._" : "";
              reply = `⚡ **EV Chargers along ${fromLoc} → ${toLoc}:**\n\n${list}${vehicleNote}${zapNote}${googleNote}`;
            } else {
              reply = `⚡ Couldn't find chargers along the route from ${fromLoc} to ${toLoc}. Try [Zap-Map](https://www.zap-map.com/live/) for real-time availability along your route.`;
            }

            setTripChatTyping(false);
            updateRouteEv(reply);
          } catch (e) {
            setTripChatTyping(false);
            updateRouteEv(`⚡ Error searching for route chargers. Try [Zap-Map](https://www.zap-map.com/live/) for real-time availability.`);
          }
        })();
        return;
      }

      setTypingContext("Finding EV chargers...");
      const updateEvReply = addPlaceholder("⚡ Finding EV chargers with real-time details...", trip?.dbId);

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
              const addr = c.address ? `\n   📍 ${c.address}` : "";
              const operator = c.operator ? `\n   🏢 ${c.operator}` : "";
              const rating = isGoogleFallback && c.rating ? ` · ${c.rating}★` : "";
              const open = isGoogleFallback ? (c.openNow === true ? " · Open now" : c.openNow === false ? " · Closed" : "") : "";
              const zapLink = c.zapMapLink ? ` · [Zap-Map Live](${c.zapMapLink})` : "";
              return `${i + 1}. **${c.name}**${dist}${status}${rating}${open}${speed}${addr}${connectors}${points}${cost}${operator}${facilities}\n   [Navigate](${c.mapsLink})${zapLink}`;
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

      const finishEvReply = (reply) => { setTripChatTyping(false); updateEvReply(reply); };

      if (evTargetCoords) {
        finishEvReply(await handleEvResults(evTargetCoords[0], evTargetCoords[1], evTargetLoc));
      } else if (evTargetLoc) {
        finishEvReply(await handleEvResults(null, null, evTargetLoc));
      } else if (/near me|nearby|near here|around me/i.test(lower)) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => finishEvReply(await handleEvResults(pos.coords.latitude, pos.coords.longitude, "your location")),
            async () => finishEvReply(await handleEvResults(null, null, firstLoc)),
            { enableHighAccuracy: false, timeout: 8000 }
          );
        } else {
          finishEvReply(await handleEvResults(null, null, firstLoc));
        }
      } else {
        const dayLoc = locForDay(selectedDay);
        const dayCoords = findCoords(dayLoc);
        if (dayCoords) {
          finishEvReply(await handleEvResults(dayCoords[0], dayCoords[1], dayLoc));
        } else {
          finishEvReply(await handleEvResults(null, null, dayLoc || firstLoc));
        }
      }
      return;
    }

    // ── "Nearby" queries (restaurants, food, cafes, activities, petrol) — use GPS + Places API ──
    const isNearbyQuery = /nearby|nearest|near me|near here|around me|close by|closest/i.test(lower);
    const isPlaceQuery = /restaurant|food|eat|dining|cafe|coffee|pub|bar|pizza|burger|takeaway|lunch|dinner|breakfast|brunch|supermarket|petrol|fuel|pharmacy|hospital|atm|playground|park|swimming|pool|play area/i.test(lower);
    const hasPlaceVerb = /\b(find|search|look for|where(?:'s| is| are| can))\b/i.test(lower);
    if (isNearbyQuery || (isPlaceQuery && hasPlaceVerb)) {
      // Determine search type from the query
      const searchType = /cafe|coffee/i.test(lower) ? "cafe"
        : /pub|bar/i.test(lower) ? "bar"
        : /supermarket|grocery/i.test(lower) ? "supermarket"
        : /petrol|fuel|gas station/i.test(lower) ? "gas_station"
        : /pharmacy|chemist/i.test(lower) ? "pharmacy"
        : /hospital|a&e|emergency/i.test(lower) ? "hospital"
        : /atm|cash/i.test(lower) ? "atm"
        : /playground|play area/i.test(lower) ? "playground"
        : /swimming|pool/i.test(lower) ? "swimming_pool"
        : /park\b/i.test(lower) ? "park"
        : "restaurant";
      const searchLabel = searchType === "gas_station" ? "petrol stations" : searchType === "swimming_pool" ? "swimming pools" : searchType === "play area" ? "play areas" : searchType + "s";
      const searchIcon = /cafe|coffee/i.test(lower) ? "☕" : /pub|bar/i.test(lower) ? "🍺" : /supermarket/i.test(lower) ? "🛒" : /petrol|fuel|gas/i.test(lower) ? "⛽" : /playground|park|swimming|pool/i.test(lower) ? "🏞️" : "🍽️";

      setTypingContext(`Finding ${searchLabel}...`);
      const updateNearbyChat = addPlaceholder(`📍 Finding ${searchLabel} near you...`, trip?.dbId);
      const finishNearby = (reply) => { setTripChatTyping(false); updateNearbyChat(reply); };

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

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => finishNearby(await handleNearbyResults(pos.coords.latitude, pos.coords.longitude, "your location")),
          async () => finishNearby(await handleNearbyResults(null, null, firstLoc)),
          { enableHighAccuracy: false, timeout: 8000 }
        );
      } else {
        handleNearbyResults(null, null, firstLoc).then(finishNearby);
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
      setTypingContext("Searching for charging stations...");
      const updateAddEv = addPlaceholder(`⚡ Searching for EV charging stations${evNote} between **${fromLoc}** and **${toLoc}**...`, trip?.dbId);

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
            updateAddEv(reply);
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
            updateAddEv(reply);
          }
        } catch (err) {
          console.error("EV charger add error:", err);
          setTripChatTyping(false);
          updateAddEv(`⚡ Had trouble searching for chargers. Try [Zap-Map](https://www.zap-map.com/live/) to find one along your route, then say "add [station name] to day ${targetDay}".`);
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
        setTripChatMessages(prev => [...prev, { id: msgId(), role: "ai", text: reply }]);
        saveChatMessage(trip?.dbId, 'ai', reply);
        return;
      } else {
        setSelectedDay(clearDay);
        const reply = `🗑️ Cleared all activities from **Day ${clearDay}**. You can now add new ones — try "add [activity] to day ${clearDay}" or "suggest activities for day ${clearDay}".`;
        setTripChatTyping(false);
        setTripChatMessages(prev => [...prev, { id: msgId(), role: "ai", text: reply }]);
        saveChatMessage(trip?.dbId, 'ai', reply);
        return;
      }
    }

    // ── Handle "suggest/recommend activities" queries — show location activities ──
    const isSuggestQuery = /\b(suggest|recommend|what(?:'s| is| are| can)|where(?:'s| is| are| can| should)|show me|list|things to do|activities|attractions|places to visit|can be done|ideas|best|top|what.+do\b)/i.test(lower)
      && /\b(activit|attraction|thing|place|do\b|done|visit|see|sight|experience|idea|option|lunch|dinner|breakfast|brunch|food|eat|restaurant|cafe|meal|snack|pub|bar)/i.test(lower);
    if (isSuggestQuery) {
      // Extract location from the query
      const locMatch = lower.replace(/\s+(?:on|for|during)\s+day\s*\d+/i, '').replace(/[?.!]+$/, '').match(/\b(?:in|at|near|around)\s+([a-z\s]+?)$/i);
      const dayMatch = lower.match(/day\s*(\d+)/);
      const isTomorrowSuggest = /\btomorrow\b/i.test(lower);
      const targetDay = dayMatch ? parseInt(dayMatch[1]) : isTomorrowSuggest ? selectedDay + 1 : selectedDay;
      let queryLoc = locMatch ? locMatch[1].trim() : mentionedLoc;
      const dayLoc = locForDay(targetDay);

      // ── Resolve stay names / pronouns to their actual location ──
      // e.g. "near millwood manor" → resolves to the stay's location (Windermere, Lake District, etc.)
      // Also handles "our hotel", "the hotel", "our stay", "our accommodation"
      if (queryLoc) {
        const isHotelPronoun = /\b(our|the|my)\s+(hotel|stay|accommodation|b&b|hostel|lodge|cabin|airbnb|villa|cottage)\b/i.test(queryLoc);
        if (isHotelPronoun) {
          const currentStay = (trip?.stays || []).find((s, i) => {
            if (!s.checkIn || !s.checkOut || !trip?.rawStart) return i === 0;
            const tripStart = new Date(trip.rawStart + "T12:00:00");
            const dayDate = new Date(tripStart.getTime() + (targetDay - 1) * 86400000).toISOString().split("T")[0];
            return s.checkIn <= dayDate && s.checkOut > dayDate;
          }) || (trip?.stays || [])[0];
          queryLoc = currentStay?.location || currentStay?.address || dayLoc;
        } else {
          const matchedStay = (trip?.stays || []).find(s =>
            s.name && queryLoc.toLowerCase().includes(s.name.toLowerCase().split(/\s+/).slice(0, 2).join(" ")) ||
            s.name && s.name.toLowerCase().includes(queryLoc.toLowerCase())
          );
          if (matchedStay) {
            const stayGeoLoc = matchedStay.location || matchedStay.address || (trip?.places || []).find(p => findCoords(p)) || dayLoc;
            queryLoc = stayGeoLoc;
          }
        }
      }

      const searchLoc = queryLoc || dayLoc;

      const isFoodQuery = /\b(lunch|dinner|breakfast|brunch|food|eat|restaurant|cafe|pub|bar|meal|snack|dine|dining)/i.test(lower);

      // ── Food queries: use LIVE Places API for real restaurants with ratings, cuisine, open status ──
      if (isFoodQuery) {
        const mealType = /breakfast|brunch/i.test(lower) ? "breakfast" : /lunch/i.test(lower) ? "lunch" : /dinner|supper/i.test(lower) ? "dinner" : "restaurant";
        const foodPref = trip?.prefs?.food?.length > 0 ? trip.prefs.food.join(", ") : "";
        const hasKids = (trip?.travellers?.olderKids?.length || 0) + (trip?.travellers?.youngerKids?.length || 0) + (trip?.travellers?.infants?.length || 0) > 0;
        const searchQuery = `${mealType} restaurants ${foodPref} ${hasKids ? "family friendly" : ""} in ${searchLoc}`;
        const searchCoords = findCoords(searchLoc) || findCoords(dayLoc);

        try {
          const body = { query: searchQuery, type: "restaurant" };
          if (searchCoords) { body.location = { lat: searchCoords[0], lng: searchCoords[1] }; body.radius = 8000; }
          const placesRes = await authFetch(API.PLACES, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const placesData = await placesRes.json();
          if (placesRes.ok && placesData.places?.length > 0) {
            const top6 = placesData.places.slice(0, 6);
            const placesList = top6.map((p, i) => {
              const stars = p.rating ? `${p.rating}★` : "";
              const price = p.priceLevel || "";
              const status = p.openNow === true ? "🟢 Open now" : p.openNow === false ? "🔴 Closed" : "";
              const cuisineTypes = (p.types || [])
                .filter(t => !["restaurant","food","point_of_interest","establishment","meal_takeaway","meal_delivery","store","bar","lodging"].includes(t))
                .map(t => t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()))
                .slice(0, 2);
              const cuisineLabel = cuisineTypes.length > 0 ? cuisineTypes.join(" · ") : "";
              const mapLink = `https://www.google.com/maps/place/?q=place_id:${p.placeId}`;
              const bookingMd = getRestaurantBookingMarkdown({ name: p.name, placeId: p.placeId }, { city: searchLoc, places: trip?.places });
              return `${i + 1}. **${p.name}** ${stars} ${price}${cuisineLabel ? ` · ${cuisineLabel}` : ""}${status ? ` · ${status}` : ""}\n   ${p.address}\n   [View on Maps](${mapLink})${bookingMd ? ` · ${bookingMd}` : ""}`;
            }).join("\n\n");

            const extras = [];
            if (hasKids) extras.push("👧 Kid-friendly");
            if (foodPref) extras.push(`🍽️ ${foodPref}`);
            const filterStr = extras.length > 0 ? `\nFiltering for: ${extras.join(", ")}` : "";

            const locLabel = searchLoc.charAt(0).toUpperCase() + searchLoc.slice(1);
            const reply = `🍽️ **${mealType.charAt(0).toUpperCase() + mealType.slice(1)} options near ${locLabel}** (Day ${targetDay}):${filterStr}\n\n${placesList}\n\n💡 Say **"Add [name] to Day ${targetDay}"** to plug it into your itinerary!`;
            setTripChatTyping(false);
            setTripChatMessages(prev => [...prev, { id: msgId(), role: "ai", text: reply }]);
            saveChatMessage(trip?.dbId, 'ai', reply);
            return;
          }
        } catch (e) { console.warn('Places API failed for food query:', e.message); }
        // Food query but no Places results — give a helpful response instead of falling through to activities
        const locLabel = searchLoc.charAt(0).toUpperCase() + searchLoc.slice(1);
        const fallbackReply = `🍽️ I couldn't find specific restaurants near **${locLabel}** right now. Try:\n\n• **"restaurants near ${dayLoc}"** (broader area)\n• **"restaurants nearby"** (uses your GPS)\n• Ask me for a specific cuisine: **"Italian restaurants in ${dayLoc}"**`;
        setTripChatTyping(false);
        setTripChatMessages(prev => [...prev, { id: msgId(), role: "ai", text: fallbackReply }]);
        saveChatMessage(trip?.dbId, 'ai', fallbackReply);
        return;
      }

      // ── Non-food activity queries: use static location activities ──
      const locActs = getLocationActivities(searchLoc) || getLocationActivities(dayLoc);
      if (locActs) {
        const hasKids = (trip?.travellers?.olderKids?.length || 0) + (trip?.travellers?.youngerKids?.length || 0) + (trip?.travellers?.infants?.length || 0) > 0;
        const allOptions = [...(locActs.morning || []), ...(locActs.afternoon || []), ...(hasKids ? locActs.kids || [] : [])];
        const uniqueOptions = [...new Set(allOptions)].slice(0, 8);
        const dinnerOptions = locActs.dinner ? locActs.dinner.slice(0, 3) : [];

        setTripChatFlow({ step: "pick_attraction", data: { options: uniqueOptions, targetDay, loc: dayLoc } });
        const optionsList = uniqueOptions.map((o, i) => `${i + 1}. **${o}**`).join("\n");
        const dinnerNote = dinnerOptions.length > 0 ? `\n\n🍽️ **Dinner ideas:** ${dinnerOptions.join(" · ")}` : "";
        const stayBaseLoc = trip?.stays?.[0]?.location || trip?.startLocation || dayLoc;
        const distHrs = dayLoc.toLowerCase() !== stayBaseLoc.toLowerCase() ? estimateTravelHours(stayBaseLoc, dayLoc, trip?.travel?.[0] || "car") : 0;
        const distNote = distHrs >= 0.25 ? `\n\n📍 ${searchLoc} is ~${distHrs >= 1 ? Math.round(distHrs * 10) / 10 + " hrs" : Math.round(distHrs * 60) + " min"} from ${stayBaseLoc}` : "";
        const reply = `🎯 **Activities in ${searchLoc.charAt(0).toUpperCase() + searchLoc.slice(1)}** for Day ${targetDay}:\n\n${optionsList}${dinnerNote}${distNote}\n\nReply with a number to add it, or type your own activity!`;
        setTripChatTyping(false);
        setTripChatMessages(prev => [...prev, { id: msgId(), role: "ai", text: reply }]);
        saveChatMessage(trip?.dbId, 'ai', reply);
        return;
      }
      // If no activities found locally, let it fall through to Claude API
    }

    // ── Budget / cost / spending queries — pull real expense data ──
    if (/\b(budget|cost|spend|spending|expense|money|how much|total|balance|owe|owes|settlement|split)\b/i.test(lower)
      && !/\b(add|include|plug|remove|delete)\b/i.test(lower)) {
      const tripBudget = trip?.budget || "";
      const totalSpent = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

      // Per-person spending (what each person owes based on splits)
      const perPerson = {};
      const paidBy = {};
      expenses.forEach(exp => {
        paidBy[exp.paid_by] = (paidBy[exp.paid_by] || 0) + (parseFloat(exp.amount) || 0);
        (exp.splits || []).forEach(s => {
          perPerson[s.participant_name] = (perPerson[s.participant_name] || 0) + (parseFloat(s.share_amount) || 0);
        });
      });

      // Category breakdown
      const byCategory = {};
      expenses.forEach(e => {
        byCategory[e.category] = (byCategory[e.category] || 0) + (parseFloat(e.amount) || 0);
      });
      const categoryLines = Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([cat, amt]) => {
          const info = getCatInfo(cat);
          const pct = totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0;
          return `${info.icon} **${info.label}:** £${amt.toFixed(2)} (${pct}%)`;
        });

      // Settlement
      const settlements = calculateSettlement(expenses);

      let reply;
      if (expenses.length === 0) {
        reply = `💰 **Trip Budget${tripBudget ? `: ${tripBudget}` : ""}**\n\nNo expenses logged yet. Add expenses via the **Expenses** tab to track spending.\n\nOnce you do, ask me "budget" again and I'll show:\n• Total spent vs budget\n• Per-person breakdown\n• Category split\n• Who owes whom`;
      } else {
        const budgetLine = tripBudget ? `\n📊 **Budget:** ${tripBudget}` : "";
        const budgetParsed = parseFloat(String(tripBudget).replace(/[^0-9.]/g, ''));
        const remainingLine = !isNaN(budgetParsed) && budgetParsed > 0
          ? `\n${totalSpent <= budgetParsed ? "✅" : "⚠️"} **Remaining:** £${(budgetParsed - totalSpent).toFixed(2)}${totalSpent > budgetParsed ? " (over budget!)" : ""}`
          : "";

        const personLines = Object.entries(perPerson)
          .sort((a, b) => b[1] - a[1])
          .map(([name, owes]) => {
            const paid = paidBy[name] || 0;
            return `• **${name}:** owes £${owes.toFixed(2)}${paid > 0 ? ` · paid £${paid.toFixed(2)}` : ""}`;
          });

        const settlementLines = settlements.length > 0
          ? settlements.map(s => `• **${s.from}** → **${s.to}:** £${s.amount.toFixed(2)}`)
          : ["• ✅ All settled!"];

        reply = `💰 **Trip Budget Summary**${budgetLine}\n\n`
          + `**Total spent:** £${totalSpent.toFixed(2)} across ${expenses.length} expense${expenses.length !== 1 ? "s" : ""}${remainingLine}\n\n`
          + `**📂 By category:**\n${categoryLines.join("\n")}\n\n`
          + `**👤 Per person:**\n${personLines.join("\n")}\n\n`
          + `**🤝 Settlements:**\n${settlementLines.join("\n")}`;
      }

      setTripChatTyping(false);
      setTripChatMessages(prev => [...prev, { id: msgId(), role: "ai", text: reply }]);
      saveChatMessage(trip?.dbId, 'ai', reply);
      return;
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
        setTripChatMessages(prev => [...prev, { id: msgId(), role: "ai", text: reply }]);
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
        setTripChatMessages(prev => [...prev, { id: msgId(), role: "ai", text: reply }]);
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
        setTripChatMessages(prev => [...prev, { id: msgId(), role: "ai", text: addReply }]);
        saveChatMessage(trip?.dbId, 'ai', addReply);
        return;
      }
    }

    // Try Claude API first — with SSE streaming for real-time text
    setTypingContext(/restaurant|food|eat|lunch|dinner|breakfast/i.test(lower) ? "Looking up restaurants..." : /activit|suggest|recommend|things to do/i.test(lower) ? "Finding activities..." : /budget|cost|spend/i.test(lower) ? "Crunching numbers..." : "Thinking...");
    const chatPayload = {
      message: msg,
      stream: true,
      tripContext: sanitiseTripContext({
        dates: trip?.start && trip?.end ? `${trip.start} – ${trip.end}` : null,
        places: trip?.places,
        travelMode: trip?.travel?.join(", "),
        travellers: trip?.travellers,
        stays: trip?.stays,
        prefs: trip?.prefs,
        budget,
        brief: trip?.brief || null,
        currentLocation: effectiveLoc,
        currentDay: selectedDay,
        templateStyle: (() => { const tp = TEMPLATE_PROFILES[trip?.templateKey]; return tp ? `Trip style: ${trip.templateKey}. Bias recommendations towards: ${tp.chatBias}.` : null; })(),
      }),
      intelligence: intelligenceRef.current,
      chatHistory: tripChatMessages.slice(-10),
      chatSummary: tripChatMessages.length > 10 ? (() => {
        const earlier = tripChatMessages.slice(0, -10);
        const topics = [...new Set(earlier.filter(m => m.role === 'user').map(m => m.text).filter(Boolean).map(t => t.slice(0, 60)))].slice(-5);
        return `Earlier in this conversation (${earlier.length} messages), topics discussed: ${topics.join('; ') || 'general trip planning'}`;
      })() : null,
    };
    // Helper: make the Claude API call (used for retry)
    const callChatApi = () => authFetch(API.CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(chatPayload),
    });
    try {
      let res = await callChatApi();
      // Auto-retry once on network/server failure before giving up
      if (!res.ok && res.status >= 500) {
        await new Promise(r => setTimeout(r, 1500));
        res = await callChatApi();
      }

      if (res.ok && res.headers.get("content-type")?.includes("text/event-stream")) {
        // ── SSE streaming: show text as it arrives ──
        const streamId = msgId();
        setTripChatTyping(false);
        setTypingContext("");
        setTripChatMessages(prev => [...prev, { id: streamId, role: "ai", text: "" }]);
        let fullText = "";
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop();
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") break;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.text) {
                fullText += parsed.text;
                const snapshot = fullText;
                setTripChatMessages(prev => {
                  const updated = [...prev];
                  const idx = findLastIdx(updated, m => m.id === streamId);
                  if (idx >= 0) updated[idx] = { ...updated[idx], text: snapshot };
                  return updated;
                });
              }
              if (parsed.error) { console.warn("Stream error:", parsed.error); break; }
            } catch (e) { /* skip */ }
          }
        }

        if (fullText) {
          saveChatMessage(trip?.dbId, 'ai', fullText);
          return;
        }
        // Stream ended with no text — fall through to fallback
      } else if (res.ok) {
        // ── Non-streaming fallback (server didn't support stream) ──
        const data = await res.json();
        if (data.reply) {
          setTripChatTyping(false);
          setTripChatMessages(prev => [...prev, { id: msgId(), role: "ai", text: data.reply }]);
          saveChatMessage(trip?.dbId, 'ai', data.reply);
          return;
        }
      }

      // API returned ok but empty/no reply — retry without streaming
      if (res.ok) {
        console.warn('Chat API returned ok but empty reply — retrying non-stream');
        try {
          const retryRes = await authFetch(API.CHAT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...chatPayload, stream: false }),
          });
          const retryData = await retryRes.json();
          if (retryRes.ok && retryData.reply) {
            setTripChatTyping(false);
            setTripChatMessages(prev => [...prev, { id: msgId(), role: "ai", text: retryData.reply }]);
            saveChatMessage(trip?.dbId, 'ai', retryData.reply);
            return;
          }
        } catch (e) { /* fall through */ }
        setTripChatTyping(false);
        setTypingContext("");
        setTripChatMessages(prev => [...prev, { id: msgId(), role: "ai", text: `I'm having trouble responding right now. Try rephrasing, or ask about restaurants, activities, or weather in **${effectiveLoc}**.`, failed: true }]);
        lastFailedMsgRef.current = { tripId, msg };
        return;
      }
      // API error — clear typing before falling through to local fallback
      setTripChatTyping(false);
      setTypingContext("");
    } catch (e) {
      console.warn('Chat API unavailable:', e.message);
      // Retry once on network error
      try {
        const retryRes = await authFetch(API.CHAT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...chatPayload, stream: false }),
        });
        const retryData = await retryRes.json();
        if (retryRes.ok && retryData.reply) {
          setTripChatTyping(false);
          setTripChatMessages(prev => [...prev, { id: msgId(), role: "ai", text: retryData.reply }]);
          saveChatMessage(trip?.dbId, 'ai', retryData.reply);
          return;
        }
      } catch (e2) { /* fall through to smart fallback */ }
      setTripChatTyping(false);
      setTypingContext("");
    }

    // Local fallback — Claude API was unavailable, provide a smart context-aware response
    const smartFallback = (() => {
      const locActs = getLocationActivities(effectiveLoc) || getLocationActivities(firstLoc);
      const intelData = intelligenceRef.current;

      // Weather-related follow-ups
      if (/rain|umbrella|waterproof|coat|layer|pack|packing|cold|warm/i.test(lower) && intelData?.weather) {
        const w = intelData.weather;
        const tips = [];
        if (w.today) tips.push(`Today: ${w.today.high}°/${w.today.low}°C, ${w.today.condition}${w.today.rainMm > 0 ? ` — ${w.today.rainMm}mm rain expected` : ""}`);
        if (w.daily?.length > 1) w.daily.slice(1, 3).forEach(d => tips.push(`${d.date}: ${d.high}°/${d.low}°C, ${d.condition}`));
        const packTips = [];
        if (w.daily?.some(d => d.rainMm > 1)) packTips.push("🌂 Pack waterproofs");
        if (w.daily?.some(d => d.low <= 5)) packTips.push("🧥 Bring warm layers");
        if (w.current?.temp > 25) packTips.push("🧴 Sun cream essential");
        return `Based on the forecast for **${effectiveLoc}**:\n\n${tips.join("\n")}\n\n${packTips.length > 0 ? packTips.join(" · ") : ""}`;
      }

      // Activity/trek/hike difficulty/info questions — provide what we know + suggest alternatives
      if (/difficult|easy|hard|strenuous|steep|suitable|accessible|wheelchair|kid|child|toddler|pushchair|buggy|parking|open|close|hour|time|ticket|entry|fee|price|cost|duration|long|far|distance/i.test(lower)) {
        const activityName = msg.replace(/\b(how|is|are|what|the|it|this|do|does|would|could|will|can|much|many|far|long|about|for|to|in|at|of|a|an)\b/gi, '').trim();
        let reply = `I don't have specific details about **${activityName}** offline, but here's what I can help with:\n\n`;
        if (locActs) {
          const allActs = [...new Set([...(locActs.morning || []), ...(locActs.afternoon || []), ...(locActs.kids || [])])].slice(0, 5);
          reply += `**Popular activities in ${effectiveLoc}:**\n${allActs.map(a => `• ${a}`).join("\n")}\n\n`;
        }
        if (intelData?.weather?.current) {
          reply += `**Current weather:** ${intelData.weather.current.temp}°C, ${intelData.weather.current.description}\n\n`;
        }
        reply += `Try asking:\n• **"Suggest activities in ${effectiveLoc}"** for recommendations\n• **"Weather"** to check conditions\n• **"Find restaurants"** for dining`;
        return reply;
      }

      // General question — provide trip context as best we can
      let reply = `I couldn't reach my AI assistant for a detailed answer, but here's what I know about your trip to **${effectiveLoc}**:\n\n`;
      const parts = [];
      if (intelData?.weather?.current) parts.push(`🌤️ **Weather now:** ${intelData.weather.current.temp}°C, ${intelData.weather.current.description}`);
      if (intelData?.currency?.rates) {
        const rateStr = Object.values(intelData.currency.rates).map(r => r.example).slice(0, 2).join(", ");
        if (rateStr) parts.push(`💱 **Exchange:** ${rateStr}`);
      }
      if (intelData?.language) parts.push(`🗣️ **Local language:** ${intelData.language.lang} — hello: "${intelData.language.hello}"`);
      if (locActs) {
        const topActs = [...new Set([...(locActs.morning || []), ...(locActs.afternoon || [])])].slice(0, 4);
        if (topActs.length > 0) parts.push(`🎯 **Top activities:** ${topActs.join(", ")}`);
      }
      if (parts.length > 0) reply += parts.join("\n") + "\n\n";
      reply += `For a detailed answer, tap **Retry** or try a specific question like:\n• **"Suggest activities for Day ${selectedDay}"**\n• **"Weather forecast"**\n• **"Find restaurants in ${effectiveLoc}"**`;
      return reply;
    })();
    lastFailedMsgRef.current = { tripId, msg };
    setTripChatMessages(prev => [...prev, { id: msgId(), role: "ai", text: smartFallback, failed: true }]);
    saveChatMessage(trip?.dbId, 'ai', smartFallback);
  };

  // ─── Retry last failed message ───
  const retryLastMessage = () => {
    const ref = lastFailedMsgRef.current;
    if (!ref) return;
    // Remove the failed AI response
    setTripChatMessages(prev => prev.filter(m => !m.failed));
    // Re-inject the original message and re-trigger
    setTripChatInput(ref.msg);
    lastFailedMsgRef.current = null;
    setTimeout(() => handleTripChat(ref.tripId), 50);
  };

  // ─── Generate smart follow-up chips based on last AI response ───
  const getFollowUpChips = useCallback(() => {
    if (tripChatMessages.length === 0) return [];
    const lastAi = [...tripChatMessages].reverse().find(m => m.role === "ai" && !m.failed);
    if (!lastAi) return [];
    const t = lastAi.text.toLowerCase();
    const trip = selectedCreatedTrip || createdTrips[0];
    const loc = trip?.places?.[0] || "your destination";

    if (/restaurant|dining|food|🍽️/.test(t) && /\d+\.\s*\*\*/.test(lastAi.text)) {
      return [{ label: "Show more options", icon: "🔄" }, { label: `Add to Day ${selectedDay}`, icon: "➕" }, { label: "Different cuisine", icon: "🍜" }];
    }
    if (/activit|attraction|things to do|🎯/.test(t) && /\d+\.\s*\*\*/.test(lastAi.text)) {
      return [{ label: "Show more", icon: "🔄" }, { label: "Kid-friendly options", icon: "👧" }, { label: "Indoor alternatives", icon: "🏠" }];
    }
    if (/weather|forecast|🌤️|☀️|🌧️/.test(t)) {
      return [{ label: "Packing tips", icon: "🎒" }, { label: "Indoor activities", icon: "🏠" }, { label: `Suggest activities`, icon: "🎯" }];
    }
    if (/budget|spent|expense|💰/.test(t)) {
      return [{ label: "Who owes what?", icon: "🤝" }, { label: "Set budget limit", icon: "📊" }];
    }
    if (/added.*to.*day|✅.*added/i.test(t)) {
      return [{ label: "Suggest more activities", icon: "🎯" }, { label: `Find restaurants in ${loc}`, icon: "🍽️" }, { label: "View itinerary", icon: "📋" }];
    }
    if (/ev charg|⚡/.test(t)) {
      return [{ label: "Add charging stop", icon: "➕" }, { label: "Show route chargers", icon: "🗺️" }];
    }
    return [];
  }, [tripChatMessages, selectedDay, selectedCreatedTrip, createdTrips]);

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
        setChatMessages([{ id: msgId(), role: "ai", text: greeting }]);
      } else {
        setChatMessages(prev => [...prev, { id: msgId(), role: "ai", text: `— Switching to Day ${selectedDay} —\n\n${greeting}` }]);
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
    typingContext,
    loadTripMessages,
    saveChatMessage,
    handleTripChat,
    retryLastMessage,
    getFollowUpChips,
    buildDayGreeting,
    intelligence,
    smartTips,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  return useContext(ChatContext);
}
