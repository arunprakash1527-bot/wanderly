import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { T } from "../styles/tokens";
import { API } from "../constants/api";
import { authFetch } from "../utils/authFetch";
import { useAuth } from "./AuthContext";
import { useNavigation } from "./NavigationContext";
import { useTrip } from "./TripContext";
import { fetchTripIntelligence, buildSmartGreeting, buildSmartTips } from "../utils/tripIntelligence";

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const { screen, showToast, navigate } = useNavigation();
  const { createdTrips, setCreatedTrips, selectedCreatedTrip, selectedDay, setSelectedDay, setTripDetailTab, findSmartSlot, addTimelineItem, logActivity, buildTripSummary, generateAndSetTimeline } = useTrip();

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

    // ── EV charger queries — Open Charge Map for detailed results ──
    if (/ev|charger|charging|charge point|charge station/i.test(lower) && !/add|schedule|time/.test(lower)) {
      // Extract connector type preference from message
      const connectorMatch = lower.match(/\b(ccs|chademo|type\s*2|type\s*1)\b/);
      const connectorType = connectorMatch ? connectorMatch[1].replace(/\s+/g, "") : null;

      // Check if trip has 4+ travellers — ask about multi-car charging
      const adultCount = trip?.travellers?.adults?.length || 1;
      const totalTravellers = adultCount + (trip?.travellers?.olderKids?.length || 0) + (trip?.travellers?.youngerKids?.length || 0) + (trip?.travellers?.infants?.length || 0);
      const needsMultiCarPrompt = totalTravellers > 4 && !/\d+\s*car|\d+\s*vehicle|single car|one car/i.test(lower);

      if (needsMultiCarPrompt) {
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
            return `⚡ **EV Chargers near ${locLabel}:**\n\n${list}${connectorNote}${zapNote}${googleNote}`;
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

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => updateEvReply(await handleEvResults(pos.coords.latitude, pos.coords.longitude, "your location")),
          async () => updateEvReply(await handleEvResults(null, null, firstLoc)),
          { enableHighAccuracy: false, timeout: 8000 }
        );
      } else {
        updateEvReply(await handleEvResults(null, null, firstLoc));
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

    // Try Claude API first for richer, context-aware responses
    try {
      const res = await authFetch(API.CHAT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          tripContext: {
            tripName: trip?.name,
            dates: trip?.start && trip?.end ? `${trip.start} – ${trip.end}` : null,
            places: trip?.places,
            travelMode: trip?.travel?.join(", "),
            travellers: trip?.travellers,
            stays: trip?.stays,
            prefs: trip?.prefs,
            budget,
            currentLocation: firstLoc,
            currentDay: selectedDay,
          },
          intelligence: intelligenceRef.current, // Real-time signals from connectors
          chatHistory: tripChatMessages.slice(-8),
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
              const mapLink = `https://www.google.com/maps/place/?q=place_id:${p.placeId}`;
              return `${i + 1}. **${p.name}** ${stars} ${price}\n   ${p.address}${status ? ` · ${status}` : ""}\n   [View on Maps](${mapLink})`;
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
            return { ...t, timeline: { ...tl, [targetDay]: dayTl } };
          }));
          if (replacedTitle) {
            logActivity(tripId, "🔄", `Replaced "${replacedTitle}" with "${itemTitle}" on Day ${targetDay} · ${smartSlot.time}`, "itinerary");
          } else {
            logActivity(tripId, "📍", `Added "${itemTitle}" to Day ${targetDay}`, "itinerary");
          }
          // Auto-switch to itinerary on the added day
          setTimeout(() => { setSelectedDay(targetDay); setTripDetailTab("itinerary"); }, 600);
          reply = replacedTitle
            ? `🔄 Replaced **${replacedTitle}** with **${itemTitle}** on **Day ${targetDay}** at ${smartSlot.time} (${smartSlot.label}) in ${firstLoc}. Switching to your itinerary now — tap ✏️ to adjust.`
            : `✅ Added **${itemTitle}** to **Day ${targetDay}** at ${smartSlot.time} (${smartSlot.label}) in ${firstLoc}. Switching to your itinerary now — tap ✏️ to adjust the time.`;
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
