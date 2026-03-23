import React from 'react';
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';
import { TRIP, DAYS, TIMELINE, POLLS } from '../../constants/tripData';
import { Tag } from '../common/Tag';
import { Avatar } from '../common/Avatar';
import { TabBar } from '../common/TabBar';
import { renderChatHtml } from '../../utils/chatHelpers';

export function ChatScreen({
  selectedDay, setSelectedDay,
  chatMessages, setChatMessages,
  chatInput, setChatInput,
  chatRef, chatTyping, setChatTyping,
  chatFlowStep, setChatFlowStep,
  chatFlowData, setChatFlowData,
  lastChatTopic, setLastChatTopic,
  navigate, showToast,
  createdTrips, selectedCreatedTrip, setCreatedTrips,
  findSmartSlot, addTimelineItem, logActivity,
}) {
  const chatDay = DAYS[selectedDay - 1];
  const chatLoc = chatDay.location;
  const chatItems = TIMELINE[selectedDay] || [];

  const aiResponsePatterns = [
    { keywords: ["ev", "charger", "charge", "charging", "electric", "plug"], response: "3 chargers near Ambleside:\n\n1. **Rydal Road** — 50kW CCS, 3 min walk, 2 available\n2. **Tesla Supercharger** — 8 stalls, 8 min drive\n3. **Pod Point, Co-op** — 7kW, 2 min walk\n\nShall I add a charging stop to your itinerary?" },
    { keywords: ["restaurant", "food", "eating", "dinner", "lunch", "breakfast", "cafe", "dining", "hungry", "meal"], response: "For your group near Ambleside:\n\n1. **The Drunken Duck** — 4.8★, 12 min. Steaks + veggie, kids free before 6 PM.\n\n2. **Fellinis** — 4.6★, 3 min walk. Veggie-focused, children's menu.\n\n3. **The Unicorn** — 4.4★, 5 min. Pub grills, playground out back.\n\nWant me to add any of these to your itinerary?" },
    { keywords: ["kid", "kids", "child", "children", "activities", "play", "playground", "fun", "game", "toddler", "family"], response: "**Max (12):**\n- Brockhole Adventure Park — nets, zip wire\n- Climbing Wall — indoor, ages 6+\n\n**Ella (8):**\n- Brockhole soft play — free\n- Trotters Animal Farm — pony rides\n\n**Both:** Easter egg trail at Wray Castle, 4 PM today.\n\nShall I add any to the timeline?" },
    { keywords: ["poll", "vote", "survey", "decide", "choose", "pick", "opinion"], response: "I'll set up a poll! Some options:\n\n1. **Tomorrow's activity** — Hike vs boat vs rest day\n2. **Dinner choice** — Pick from 3 restaurants\n3. **Custom question** — Write your own\n\nWhich one would you like to create?" },
    { keywords: ["weather", "rain", "sun", "forecast", "temperature", "cold", "warm", "wind"], response: "**Ambleside forecast:**\n\n🌤 Today: 12°C, cloudy, wind 8 mph. Dry until 4 PM, light rain 5-7 PM.\n☀️ Tomorrow: 14°C, partly sunny, perfect for outdoor activities.\n🌧 Day after: 10°C, rain expected from noon.\n\nOutdoor morning is best today. Easter trail at 4 PM should still be dry. Spa or climbing wall as rain backup." },
    { keywords: ["swim", "swimming", "pool", "water park", "lido", "lake swim"], response: "Swimming options near Ambleside:\n\n1. **Lake Windermere** — Wild swimming at Millerground (free, scenic). Water temp ~12°C.\n2. **Ambleside Swimming Pool** — Indoor heated, £6/adult, £3.50/child. Open 7am-9pm.\n3. **Brockhole Aqua Park** — Inflatable course on the lake! £15/person, ages 6+. Book ahead.\n4. **Low Wood Bay Spa** — Infinity pool + lake access. Day pass £45.\n\nShall I add any of these to your itinerary?" },
    { keywords: ["hike", "hiking", "walk", "walking", "trail", "trek", "mountain", "fell", "climb"], response: "Walks near Ambleside:\n\n🟢 **Easy:** Loughrigg Tarn circular — 1.5 miles, flat, great for kids\n🟡 **Medium:** Stock Ghyll Force waterfall — 2 miles, rocky but rewarding\n🔴 **Hard:** Helvellyn via Striding Edge — 8 miles, adults only, spectacular\n\n**Best for your group:** Loughrigg Tarn in the morning when it's dry. Want me to add it?" },
    { keywords: ["boat", "cruise", "ferry", "sail", "windermere", "lake"], response: "Boat trips on Windermere:\n\n⛵ **Windermere Lake Cruises** — 45 min, £12/adult, £6/child. Departs hourly from Ambleside pier.\n🚤 **Private rowing boat hire** — £20/hour, seats 4. Great for families.\n🛥️ **Cross-lake ferry** — Bowness to Far Sawrey, £7 return. Visit Beatrix Potter's house.\n\nThe 11 AM cruise has the best views. Book?" },
    { keywords: ["spa", "relax", "massage", "wellness", "pamper"], response: "Spa options near Ambleside:\n\n💆 **Low Wood Bay Spa** — 4.5★, lakeside infinity pool + treatments. Day pass £45.\n🧖 **The Samling Hotel Spa** — 4.8★, luxury. Half day from £80.\n♨️ **Ambleside Salutation Hotel** — 4.2★, small spa + pool. £25 day pass.\n\nPerfect for the rainy afternoon. Want me to book a slot?" },
    { keywords: ["shop", "shopping", "buy", "market", "souvenir", "gift"], response: "Shopping in the area:\n\n🛍 **Ambleside village** — Indie shops, outdoor gear, fudge shop, art galleries\n🏪 **Keswick Market** — Saturdays, local produce & crafts\n🎁 **World of Beatrix Potter** — Gift shop in Bowness, kids will love it\n🧀 **Hawkshead Relish** — Award-winning chutneys, great gifts\n\nAmbleside shops are walkable from your stay." },
    { keywords: ["budget", "cost", "spend", "money", "expensive", "cheap", "price"], response: "**Trip budget estimate:**\n\n🏠 Accommodation: ~£180/night × 4 = **£720**\n🍽 Food (family of 6): ~£80/day × 5 = **£400**\n🎫 Activities: ~£150 total\n⛽ EV charging: ~£30 total\n\n**Estimated total: ~£1,300**\n\nWant me to track actual costs as you go?" },
    { keywords: ["park", "parking", "car park", "where to park"], response: "Parking near Ambleside:\n\n🅿️ **Rydal Road car park** — £8/day, closest to town, has EV chargers\n🅿️ **Miller Ground** — Free after 6 PM, lakeside\n🅿️ **White Platts** — £6/day, 5 min walk to centre\n\n⚡ EV tip: Rydal Road has 50kW chargers, charge while you explore!" },
    { keywords: ["cancel", "change", "reschedule", "move", "swap", "edit", "modify", "update"], response: "Sure! What would you like to change?\n\n1. **Swap an activity** — Replace something in the timeline\n2. **Move a time slot** — Shift an activity earlier or later\n3. **Cancel a booking** — Remove a booked item\n4. **Add something new** — Insert a new activity\n\nJust tell me what to adjust and I'll update the itinerary." },
    { keywords: ["help", "what can", "how do", "explain", "guide"], response: "Here's what I can help with:\n\n🗺 **Plan** — Suggest activities, restaurants, routes\n📅 **Schedule** — Add, move, or remove timeline items\n⛅ **Weather** — Real-time forecasts and backup plans\n⚡ **EV** — Find chargers along your route\n🗳 **Polls** — Create group votes for decisions\n💰 **Budget** — Track trip spending\n📍 **Navigate** — Directions to any location\n\nJust ask in plain English!" },
    { keywords: ["thank", "thanks", "cheers", "great", "perfect", "awesome", "brilliant"], response: "You're welcome! 😊 Enjoy your Lake District adventure. I'm here whenever you need anything — just ask!" },
    { keywords: ["morning", "today", "plan for today", "what's next", "itinerary", "schedule"], response: "**Today's plan:**\n\n🕙 10:30 — Arrive Windermere, check in\n🕧 11:30 — Lake Windermere walk\n🕐 1:00 — Lunch at Francine's (veggie + non-veg)\n🕖 7:00 — Dinner at The Angel Inn\n\n⛅ Weather looks good until 4 PM. Want to adjust anything?" },
    { keywords: ["emergency", "hospital", "doctor", "pharmacy", "medical", "urgent", "police"], response: "**Emergency contacts:**\n\n🚑 **999** — Emergency services\n🏥 **Ambleside Health Centre** — 015394 32693, Mon-Fri 8am-6pm\n💊 **Ambleside Pharmacy** — 015394 33594, closes 5:30 PM\n🏥 **Nearest A&E** — Westmorland General, Kendal (20 min drive)\n🚔 **Non-emergency police** — 101\n\nStay safe out there!" },
  ];

  // Context-aware follow-up responses based on last AI message topic
  const followUpResponses = {
    poll: [
      { keywords: ["1", "tomorrow", "activity", "hike", "boat", "rest"], response: "**Poll created!** 🗳\n\n**Tomorrow's activity:**\n- 🥾 Hike around Loughrigg Tarn\n- ⛵ Boat cruise on Windermere\n- 😴 Rest day at the hotel\n\nI've shared it with all travellers. Voting closes tonight at 9 PM. You can check results in the **Polls** tab." },
      { keywords: ["2", "dinner", "restaurant", "food"], response: "**Poll created!** 🗳\n\n**Dinner choice for tonight:**\n- 🍽 The Drunken Duck (steaks + veggie)\n- 🥗 Fellinis (veggie-focused)\n- 🍺 The Unicorn (pub grills + playground)\n\nShared with all travellers. Voting closes at 5 PM so we can book!" },
      { keywords: ["3", "custom", "question", "write", "own", "add"], response: "Sure! Type your custom poll question and I'll create it.\n\nExample: **\"Should we extend the trip by one day?\"**\n\nYou can add 2-5 options for people to vote on." },
    ],
    restaurant: [
      { keywords: ["1", "first", "drunken", "duck", "steak"], response: "Great choice! **The Drunken Duck** it is.\n\n📞 I'd recommend calling ahead: 015394 36347\n⏰ Best to book for 6:30 PM (kids eat free before 6 PM)\n📍 12 min drive from Ambleside\n\nShall I add it to tonight's timeline?" },
      { keywords: ["2", "second", "fellini", "veggie"], response: "Nice pick! **Fellinis** is lovely.\n\n📍 3 min walk from the town centre\n🥗 Great veggie options + children's menu\n⏰ No booking needed, but can get busy after 7 PM\n\nShall I add it to tonight's timeline?" },
      { keywords: ["3", "third", "unicorn", "pub"], response: "**The Unicorn** — great for the kids with the playground!\n\n📍 5 min walk\n🍺 Pub grills, good portions\n🎪 Playground out back keeps kids busy\n\nShall I add it to tonight's timeline?" },
      { keywords: ["yes", "add", "please", "sure", "ok", "yeah"], response: "Added to your timeline! ✅\n\n🕖 **7:00 PM — Dinner** has been updated on today's itinerary. All travellers will see the change.\n\nDon't forget to check if you need to book ahead!" },
    ],
    charger: [
      { keywords: ["1", "first", "rydal"], response: "**Rydal Road charger** — good choice, it's the fastest!\n\n⚡ 50kW CCS connector\n📍 3 min walk to town while charging\n💰 ~£8 for a full charge\n⏱ About 45 min to 80%\n\nI've added a charging stop to your timeline." },
      { keywords: ["yes", "add", "sure", "please"], response: "Added a charging stop to your itinerary! ⚡\n\nI've scheduled it for when you arrive — charge while you check in. You'll find the charger at Rydal Road, 3 min walk from town." },
    ],
    swimming: [
      { keywords: ["1", "lake", "wild", "windermere"], response: "**Wild swimming at Millerground** — great choice!\n\n📍 10 min walk from Ambleside centre\n🌡 Water temp ~12°C — brrr but refreshing!\n🏊 Best in morning when it's calmer\n⚠️ Supervision needed for kids\n\nShall I add it to tomorrow's morning slot?" },
      { keywords: ["2", "pool", "indoor", "ambleside"], response: "**Ambleside Swimming Pool** — perfect for the family!\n\n📍 5 min walk from town\n💰 £6/adult, £3.50/child\n⏰ Open 7am-9pm\n🏊 Heated indoor pool, family sessions available\n\nWant me to add a swim session to the itinerary?" },
      { keywords: ["3", "aqua", "inflatable", "brockhole"], response: "**Brockhole Aqua Park** — the kids will love this!\n\n📍 At Brockhole visitor centre\n💰 £15/person, ages 6+\n⏰ Sessions run hourly, book ahead\n🎉 Inflatable obstacle course on the lake!\n\nShall I book a session and add it to the timeline?" },
      { keywords: ["yes", "add", "sure", "please", "book"], response: "Added to your itinerary! 🏊\n\nI've blocked out a 2-hour slot. Remember to bring towels and a change of clothes!" },
    ],
    walk: [
      { keywords: ["1", "easy", "loughrigg", "tarn", "green"], response: "**Loughrigg Tarn** — lovely choice for the family!\n\n📍 Short drive from Ambleside\n📏 1.5 miles circular, mostly flat\n👶 Pushchair-friendly in dry weather\n📸 Beautiful reflections for photos\n\nBest in the morning — shall I add it to tomorrow?" },
      { keywords: ["2", "medium", "waterfall", "stock", "ghyll"], response: "**Stock Ghyll Force waterfall** — worth the rocky scramble!\n\n📍 Starts right in Ambleside\n📏 2 miles round trip\n⚠️ Rocky path — good shoes needed, hold little ones' hands\n💧 Spectacular after rain\n\nShall I add it to the timeline?" },
      { keywords: ["yes", "add", "sure", "please"], response: "Added to your itinerary! 🥾\n\nI've scheduled it for the morning when the weather's best. Don't forget walking shoes and waterproofs!" },
    ],
    generic: [
      { keywords: ["yes", "ok", "sure", "please", "yeah", "do it", "go ahead"], response: "Done! ✅ I've updated your itinerary. You can see the changes on the **Timeline** tab.\n\nAnything else you'd like to adjust?" },
      { keywords: ["no", "nah", "not now", "later", "nevermind", "cancel"], response: "No problem! Let me know if you change your mind or want to explore other options. 😊" },
    ],
  };

  const getLastAiTopic = () => {
    const aiMsgs = chatMessages.filter(m => m.role === "ai");
    if (aiMsgs.length === 0) return null;
    const last = aiMsgs[aiMsgs.length - 1].text.toLowerCase();
    if (last.includes("poll") && (last.includes("which one") || last.includes("options"))) return "poll";
    if (last.includes("drunken duck") || last.includes("fellini") || last.includes("unicorn")) return "restaurant";
    if (last.includes("charger") || last.includes("charging")) return "charger";
    if (last.includes("swimming") || last.includes("aqua park") || last.includes("pool")) return "swimming";
    if (last.includes("loughrigg") || last.includes("stock ghyll") || last.includes("helvellyn") || last.includes("walks near")) return "walk";
    if (last.includes("shall i") || last.includes("want me to") || last.includes("would you like")) return "generic";
    return null;
  };

  // Topic-based follow-up responses for when lastChatTopic is set but no keyword/context match
  const topicFollowUpDefaults = {
    poll: "Great choice! I've created a poll for your group. You can find it in the Polls section. Want to set a deadline for voting?",
    restaurant: "I can add any of those restaurants to your itinerary. Just say which one, or I can suggest more options nearby.",
    ev: "Want me to add a charging stop to your itinerary? I can schedule it at the most convenient time.",
    charger: "Want me to add a charging stop to your itinerary? I can schedule it at the most convenient time.",
    activity: "I can add that to your itinerary. Would you like it for a specific day?",
    kids: "I can add that to your itinerary. Would you like it for a specific day?",
    weather: "I can adjust your itinerary based on the weather. Want me to suggest indoor alternatives for rainy days?",
    booking: "I can help with that booking. Would you like me to open the booking page, or mark it as confirmed?",
    swimming: "I can add that to your itinerary. Would you like it for a specific day?",
    walk: "I can add that to your itinerary. Would you like it for a specific day?",
    generic: "Done! I've updated your itinerary. You can see the changes on the **Timeline** tab.\n\nAnything else you'd like to adjust?",
  };

  const findResponse = (msg) => {
    const lower = msg.toLowerCase();
    const stay = TRIP.stays[0];
    const lastStay = TRIP.stays[TRIP.stays.length - 1];
    const travelMode = TRIP.travelMode || "car";
    const isEV = travelMode.toLowerCase().includes("ev");

    // ─── Conversational Flow Handler ───
    if (chatFlowStep === "ask_start") {
      // User is providing their start location
      const startLoc = msg.trim();
      setChatFlowData(prev => ({ ...prev, startLocation: startLoc }));
      setChatFlowStep("ask_pickups");
      return `Got it — starting from **${startLoc}**.\n\nAnyone to pick up along the way, or heading straight to **${stay ? stay.name : chatLoc}**?`;
    }

    if (chatFlowStep === "ask_pickups") {
      const noPickup = /no|nah|none|straight|direct|just us|heading straight|nope/.test(lower);
      const hasPickup = /yes|pick|stop|collect|get someone|picking/.test(lower);
      if (hasPickup) {
        setChatFlowStep("ask_pickup_detail");
        return "Where do you need to pick someone up? Enter the location or postcode.";
      }
      // No pickup or any other response — proceed to time
      setChatFlowStep("ask_time");
      const startLoc = chatFlowData.startLocation || TRIP.startLocation || "your location";
      return `No stops — straight to **${chatLoc}**.\n\nWhat time would you like to depart from ${startLoc}?`;
    }

    if (chatFlowStep === "ask_pickup_detail") {
      const pickupLoc = msg.trim();
      setChatFlowData(prev => ({ ...prev, pickups: [...(prev.pickups || []), pickupLoc] }));
      setChatFlowStep("ask_more_pickups");
      return `Added pickup at **${pickupLoc}**. Any more stops, or shall I plan the route?`;
    }

    if (chatFlowStep === "ask_more_pickups") {
      const done = /no|done|that's it|plan|route|go|nope|let's go/.test(lower);
      if (!done && lower.length > 3) {
        // Another pickup
        const pickupLoc = msg.trim();
        setChatFlowData(prev => ({ ...prev, pickups: [...(prev.pickups || []), pickupLoc] }));
        return `Added **${pickupLoc}**. Any more, or shall I plan the route?`;
      }
      setChatFlowStep("ask_time");
      const startLoc = chatFlowData.startLocation || TRIP.startLocation || "your location";
      const pickups = chatFlowData.pickups || [];
      return `Route planned with ${pickups.length} pickup${pickups.length > 1 ? "s" : ""}: ${pickups.map(p => `**${p}**`).join(" → ")}.\n\nWhat time would you like to depart from ${startLoc}?`;
    }

    if (chatFlowStep === "ask_time") {
      const startLoc = chatFlowData.startLocation || TRIP.startLocation || "your location";
      const pickups = chatFlowData.pickups || [];
      const departTime = msg.trim();
      setChatFlowStep("route_shown");
      setChatFlowData(prev => ({ ...prev, departTime }));

      // Build route summary
      const routeStops = [startLoc, ...pickups];
      const routePath = routeStops.map(s => `**${s}**`).join(" → ");
      const evSection = isEV ? `\n\n⚡ **EV charging stops:**\n• Tebay Services — 50kW CCS, farm shop while you wait\n• ${chatLoc === "Windermere" ? "Booths Windermere" : "Killington Lake"} — 50kW backup` : "";
      const stayInfo = stay ? `\n\n🏨 **Check-in:** ${stay.name}\n${stay.tags.map(t => `• ${t}`).join("\n")}` : "";

      return `🗺️ **Your Day 1 route:**\n\n${routePath} → **${chatLoc}**\n\n🕐 **Depart:** ${departTime}\n🕐 **Estimated arrival:** ~2 hours after departure\n\n**Recommended stops:**\n1. **Tebay Services** — best motorway services in UK, farm shop + cafe${pickups.length > 0 ? "\n2. Pickup" + (pickups.length > 1 ? "s" : "") + " at " + pickups.join(", ") : ""}${evSection}${stayInfo}\n\n**After arrival:**\n• Settle in and charge up${isEV ? " (EV)" : ""}\n• Lunch at a local spot\n• Gentle afternoon walk to ease into the trip\n\nLooks good? Or want to adjust the departure time?`;
    }

    if (chatFlowStep === "route_shown") {
      if (/looks good|perfect|great|yes|ok|sure|thanks|awesome/.test(lower)) {
        setChatFlowStep(null);
        return "Brilliant! Your Day 1 route is all set. 🎉\n\nSwitch to **Timeline** to see your full itinerary, or ask me anything about today's plan.";
      }
      if (/adjust|change|earlier|later|different/.test(lower)) {
        setChatFlowStep("ask_time");
        return "No problem — what departure time works better?";
      }
      setChatFlowStep(null); // Exit flow on any other message
    }

    // ─── Last Day Flow ───
    if (chatFlowStep === "ask_home") {
      const homeLoc = msg.trim();
      setChatFlowData(prev => ({ ...prev, homeLocation: homeLoc }));
      setChatFlowStep("ask_departure_time");
      return `Heading home to **${homeLoc}**. What time do you need to be back, or when would you like to leave **${chatLoc}**?`;
    }

    if (chatFlowStep === "ask_departure_time") {
      const depTime = msg.trim();
      const homeLoc = chatFlowData.homeLocation || "home";
      setChatFlowStep("departure_shown");
      setChatFlowData(prev => ({ ...prev, departTime: depTime }));
      const evSection = isEV ? `\n\n⚡ **EV charging:** Tebay Services has 50kW CCS — perfect for a 30-min top-up while you grab a coffee.` : "";

      return `🗺️ **Your journey home:**\n\n**${lastStay ? lastStay.name + ", " : ""}${chatLoc}** → **${homeLoc}**\n\n🕐 **Departure:** ${depTime}\n\n**Suggested stops:**\n1. **Tebay Services** — 30 min south, amazing farm shop + cafe\n2. **Rheged Centre** — near Penrith, food hall + playground (great for kids)\n3. **Penrith Castle** — free, quick 15-min stretch${evSection}\n\n**Before you go:**\n• Final checkout from ${lastStay ? lastStay.name : "accommodation"}\n• Last lunch in ${chatLoc}? Try **${chatItems.find(it => it.title.toLowerCase().includes("lunch"))?.title.replace("Final lunch at ", "") || "a local spot"}**\n\nLooks good, or want to adjust?`;
    }

    if (chatFlowStep === "departure_shown") {
      if (/looks good|perfect|great|yes|ok|sure|thanks|awesome/.test(lower)) {
        setChatFlowStep(null);
        return "All sorted! Safe travels home. 🏠\n\nCheck your **Timeline** for the full day, or ask me anything.";
      }
      if (/adjust|change|earlier|later|different/.test(lower)) {
        setChatFlowStep("ask_departure_time");
        return "What time works better for leaving?";
      }
      setChatFlowStep(null);
    }

    // Day-specific quick action responses
    const dayQuickResponses = {
      "Route plan": selectedDay === 1
        ? `**Getting to ${chatLoc}:**\n\nPopular routes from major cities:\n• **Manchester** — 1h 40m via M6/A591\n• **London** — 4h 30m via M6\n• **Birmingham** — 3h via M6\n\n**Recommended stops:**\n1. **Tebay Services** — best motorway services in the UK, local farm shop, EV chargers\n2. **Lancaster Services** — halfway point, Costa + M&S\n\n**EV charging en route:** Rapid chargers at Tebay (50kW), Lancaster (150kW), Killington Lake (50kW)\n\nWhat's your starting location? I can give you a tailored route.`
        : `**Route for Day ${selectedDay}:** ${chatItems[0]?.desc || "Check your timeline for today's route."}`,
      "Stops en route": selectedDay === DAYS.length
        ? `**Stops on your way home from ${chatLoc}:**\n\n1. **Tebay Services** — 30 min south, farm shop + EV chargers (50kW)\n2. **Rheged Centre** — 25 min, cinema + food hall + playground\n3. **Penrith Castle** — free, quick 20 min stop\n\nWhere are you heading home to? I'll plan the best stops.`
        : `Nearby stops from ${chatLoc}:\n\n1. **${chatLoc === "Windermere" ? "Orrest Head viewpoint" : chatLoc === "Keswick" ? "Castlerigg Stone Circle" : "Rydal Water"}** — scenic, free, 10 min\n2. **Local shops** in ${chatLoc} town centre\n3. **Lakeside cafe** for a quick break`,
      "Today's plan": (() => {
        const summary = chatItems.map(it => `**${it.time}** — ${it.title}${it.for !== "all" ? ` (${it.for})` : ""}`).join("\n");
        return `Here's your full Day ${selectedDay} in **${chatLoc}**:\n\n${summary}`;
      })(),
      "Bookings": (() => {
        const bookable = chatItems.filter(it => it.needsBooking);
        if (!bookable.length) return `No bookings needed for Day ${selectedDay} — you're all set! 🎉`;
        return `**Bookings needed for Day ${selectedDay}:**\n\n${bookable.map(it => `📋 **${it.title}** — ${it.price}\n   ${it.desc}`).join("\n\n")}\n\nWant me to help with any of these?`;
      })(),
    };

    // Check day-specific quick actions first
    if (dayQuickResponses[msg]) {
      setLastChatTopic("generic");
      return dayQuickResponses[msg];
    }

    // First check exact matches (for quick-tap buttons)
    const exactMap = { "EV chargers": 0, "Restaurants": 1, "Kids activities": 2, "Create poll": 3, "Weather": 4 };
    if (exactMap[msg] !== undefined) {
      // Set topic based on exact match
      const topicMap = { "EV chargers": "ev", "Restaurants": "restaurant", "Kids activities": "kids", "Create poll": "poll", "Weather": "weather" };
      setLastChatTopic(topicMap[msg] || "");
      return aiResponsePatterns[exactMap[msg]].response;
    }

    // Check for context-aware follow-ups based on previous AI response
    const topic = getLastAiTopic() || lastChatTopic;
    if (topic && followUpResponses[topic]) {
      const words = lower.split(/\s+/);
      for (const fu of followUpResponses[topic]) {
        const fuScore = fu.keywords.filter(kw => words.some(w => w === kw || w.startsWith(kw))).length;
        if (fuScore > 0) return fu.response;
      }
    }

    // Then do keyword matching with word boundaries — score each pattern
    const words = lower.split(/\s+/);
    let bestMatch = null;
    let bestScore = 0;
    let matchedTopic = "";
    for (const pattern of aiResponsePatterns) {
      let score = 0;
      for (const kw of pattern.keywords) {
        // Multi-word keywords: use includes
        if (kw.includes(" ")) { if (lower.includes(kw)) score += 2; }
        // Single-word keywords: match whole words only (prevents "eat" matching inside "create")
        else if (words.some(w => w === kw || w.startsWith(kw) || w.endsWith(kw + "s") || w === kw + "s" || w === kw + "ing" || w === kw + "er" || w === kw + "ed")) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        bestMatch = pattern;
        // Determine topic from matched keywords
        if (pattern.keywords.some(k => ["poll", "vote", "survey"].includes(k))) matchedTopic = "poll";
        else if (pattern.keywords.some(k => ["restaurant", "food", "dinner", "lunch", "breakfast"].includes(k))) matchedTopic = "restaurant";
        else if (pattern.keywords.some(k => ["ev", "charger", "charge", "charging"].includes(k))) matchedTopic = "ev";
        else if (pattern.keywords.some(k => ["kid", "kids", "child", "children"].includes(k))) matchedTopic = "kids";
        else if (pattern.keywords.some(k => ["weather", "rain", "forecast"].includes(k))) matchedTopic = "weather";
        else if (pattern.keywords.some(k => ["cancel", "change", "reschedule", "modify"].includes(k))) matchedTopic = "booking";
        else if (pattern.keywords.some(k => ["swim", "swimming", "pool"].includes(k))) matchedTopic = "swimming";
        else if (pattern.keywords.some(k => ["hike", "walk", "trail"].includes(k))) matchedTopic = "walk";
        else matchedTopic = "generic";
      }
    }
    if (bestMatch && bestScore > 0) {
      setLastChatTopic(matchedTopic);
      return bestMatch.response;
    }

    // Handle number responses ("1", "2", "3") and common follow-ups using lastChatTopic
    const effectiveTopic = topic || lastChatTopic;
    if (effectiveTopic && topicFollowUpDefaults[effectiveTopic]) {
      // Check if this looks like a follow-up (short message, number, or common follow-up words)
      const isFollowUp = /^[1-9]$/.test(lower.trim()) ||
        ["yes", "no", "ok", "sure", "please", "yeah", "nah", "option", "custom", "add", "do it", "go ahead"].some(w => lower.includes(w));
      if (isFollowUp) {
        // Try followUpResponses first for numbered responses
        if (effectiveTopic && followUpResponses[effectiveTopic]) {
          for (const fu of followUpResponses[effectiveTopic]) {
            const fuScore = fu.keywords.filter(kw => words.some(w => w === kw || w.startsWith(kw))).length;
            if (fuScore > 0) return fu.response;
          }
        }
        return topicFollowUpDefaults[effectiveTopic];
      }
    }

    // Smart fallback based on message length and content
    if (lower.includes("?")) return `Great question! Let me look into that for your Lake District trip.\n\nBased on your group (4 adults + 2 children) near Ambleside, I'd suggest checking the **Explore** tab for curated options, or try asking about:\n\n• Restaurants & food\n• Activities for kids or adults\n• Weather & planning\n• Boats, hikes, or attractions\n• Budget & costs`;
    return `I'm not sure about that specific request yet, but I'm getting smarter! Here's what I can help with right now:\n\n🍽️ **Restaurants** — 'find restaurants' or 'dinner options'\n⚡ **EV charging** — 'nearest chargers'\n🎯 **Activities** — 'things to do' or 'kids activities'\n🌦️ **Weather** — 'weather forecast'\n📊 **Polls** — 'create a poll'\n💰 **Budget** — 'trip cost' or 'budget'\n🚗 **Transport** — 'parking' or 'directions'\n\nTry asking about any of these!`;
  };

  const sendMessage = async (text) => {
    const msg = text || chatInput;
    if (!msg.trim()) return;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text: msg }]);
    setChatTyping(true);

    const lower = msg.trim().toLowerCase();
    const isNearby = /nearby|nearest|near me|near here|around me|close by|closest/i.test(lower);
    const isPlaceSearch = /restaurant|food|eat|dining|cafe|coffee|pub|bar|pizza|burger|takeaway|lunch|dinner|breakfast|brunch|supermarket|petrol|fuel|pharmacy|hospital|atm|ev|charger|charging/i.test(lower);

    // ── GPS-based nearby search (restaurants, EV chargers, etc.) ──
    if (isNearby || (isPlaceSearch && isNearby)) {
      const searchType = /ev|charger|charging/i.test(lower) ? "electric_vehicle_charging_station"
        : /cafe|coffee/i.test(lower) ? "cafe"
        : /pub|bar/i.test(lower) ? "bar"
        : /supermarket|grocery/i.test(lower) ? "supermarket"
        : /petrol|fuel|gas station/i.test(lower) ? "gas_station"
        : /pharmacy|chemist/i.test(lower) ? "pharmacy"
        : /hospital|a&e|emergency/i.test(lower) ? "hospital"
        : /atm|cash/i.test(lower) ? "atm"
        : "restaurant";
      const searchLabel = searchType === "gas_station" ? "petrol stations" : searchType === "electric_vehicle_charging_station" ? "EV chargers" : searchType + "s";
      const searchIcon = /ev|charger|charging/i.test(lower) ? "⚡" : /cafe|coffee/i.test(lower) ? "☕" : /pub|bar/i.test(lower) ? "🍺" : /supermarket/i.test(lower) ? "🛒" : /petrol|fuel|gas/i.test(lower) ? "⛽" : "🍽️";
      const fallbackLoc = DAYS[selectedDay - 1]?.location || TRIP.places?.[0] || "your destination";

      setChatMessages(prev => [...prev, { role: "ai", text: `📍 Finding ${searchLabel} near your current location...` }]);

      const handleResults = async (lat, lng, locLabel) => {
        try {
          const body = lat && lng
            ? { location: { lat, lng }, type: searchType, radius: 8000 }
            : { query: `${searchType} near ${fallbackLoc}`, radius: 8000 };
          const res = await fetch("/api/places", {
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
            return `${searchIcon} **${searchLabel.charAt(0).toUpperCase() + searchLabel.slice(1)} near ${locLabel}:**\n\n${list}\n\n💡 *These results are based on your ${lat ? "current GPS location" : "trip destination"}.*`;
          }
        } catch (e) { /* fallback below */ }
        return `${searchIcon} Couldn't find ${searchLabel} via search. Try [Google Maps](https://www.google.com/maps/search/${encodeURIComponent(searchType + " near me")}) for real-time results near you.`;
      };

      const updateChat = (reply) => {
        setChatTyping(false);
        setChatMessages(prev => {
          const updated = [...prev];
          const idx = updated.findLastIndex(m => m.text.includes(`Finding ${searchLabel} near`));
          if (idx >= 0) updated[idx] = { role: "ai", text: reply };
          else updated.push({ role: "ai", text: reply });
          return updated;
        });
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => updateChat(await handleResults(pos.coords.latitude, pos.coords.longitude, "your location")),
          async () => updateChat(await handleResults(null, null, fallbackLoc)),
          { enableHighAccuracy: false, timeout: 8000 }
        );
      } else {
        handleResults(null, null, fallbackLoc).then(updateChat);
      }
      return;
    }

    // ── Claude API for all other queries (with GPS context when available) ──
    const getGpsContext = () => new Promise((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 5000 }
        );
      } else resolve(null);
    });

    try {
      const gps = isPlaceSearch ? await getGpsContext() : null;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg.trim(),
          tripContext: {
            tripName: TRIP.name,
            dates: `${TRIP.start} – ${TRIP.end} ${TRIP.year}`,
            places: TRIP.places,
            travelMode: TRIP.travelMode,
            travellers: TRIP.travellers,
            stays: TRIP.stays,
            currentDay: selectedDay,
            currentLocation: DAYS[selectedDay - 1]?.location,
            ...(gps ? { gpsLocation: gps } : {}),
          },
          chatHistory: chatMessages.slice(-8),
        }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setChatTyping(false);
        setChatMessages(prev => [...prev, { role: "ai", text: data.reply }]);
        return;
      }
    } catch (e) { /* API unavailable — fall back to local */ }

    // Local fallback
    const response = findResponse(msg.trim());
    const delay = Math.min(2500, Math.max(800, response.length * 6));
    setTimeout(() => {
      setChatTyping(false);
      setChatMessages(prev => [...prev, { role: "ai", text: response }]);
    }, delay);
  };

  // Day-aware quick action chips — adapt to conversation flow
  const isFirstDay = selectedDay === 1;
  const isLastDay = selectedDay === DAYS.length;
  const getQuickActions = () => {
    if (chatFlowStep === "ask_start") return ["Manchester", "London", "Birmingham", "Enter postcode"];
    if (chatFlowStep === "ask_pickups") return ["No, heading straight there", "Yes, add a stop"];
    if (chatFlowStep === "ask_pickup_detail") return [];
    if (chatFlowStep === "ask_more_pickups") return ["No more, plan the route", "Add another stop"];
    if (chatFlowStep === "ask_time") return ["7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM"];
    if (chatFlowStep === "route_shown" || chatFlowStep === "departure_shown") return ["Looks good!", "Adjust time", "EV chargers", "Weather"];
    if (chatFlowStep === "ask_home") return ["Manchester", "London", "Birmingham", "Enter postcode"];
    if (chatFlowStep === "ask_departure_time") return ["9:00 AM", "10:00 AM", "11:00 AM", "After lunch"];
    if (isFirstDay) return ["Route plan", "EV chargers", "Stops en route", "Weather", "Today's plan"];
    if (isLastDay) return ["Stops en route", "Route plan", "EV chargers", "Today's plan", "Weather"];
    return ["Today's plan", "Restaurants", "Kids activities", "EV chargers", "Bookings", "Create poll", "Weather"];
  };
  const quickActions = getQuickActions();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ background: T.s, borderBottom: `.5px solid ${T.border}` }}>
        <div style={{ padding: "14px 20px 8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("trip")}>Back</button>
          <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Trip chat</h2>
          <div style={{ display: "flex" }}>
            {[["You", T.a], ["JM", T.coral], ["SP", T.blue]].map(([l, c], i) => (
              <Avatar key={i} bg={c} label={l} size={24} style={{ marginLeft: i ? -4 : 0, border: `1.5px solid ${T.s}` }} />
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, padding: "0 24px 8px", overflowX: "auto" }}>
          {DAYS.map(d => (
            <button key={d.day} className="w-chip" onClick={() => setSelectedDay(d.day)}
              style={{ ...css.chip, flexShrink: 0, fontSize: 11, padding: "8px 16px",
                ...(selectedDay === d.day ? { background: T.a, color: "#fff", borderColor: T.ad } : {}) }}>
              Day {d.day} · {d.location}
            </button>
          ))}
        </div>
      </div>
      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {chatMessages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12, maxWidth: "85%", ...(m.role === "user" ? { marginLeft: "auto" } : {}) }}>
            {m.role === "ai" && <div style={{ fontSize: 11, color: T.t3, marginBottom: 3 }}>Trip With Me</div>}
            <div style={{
              padding: "10px 14px", fontSize: 14, lineHeight: 1.5,
              ...(m.role === "user"
                ? { background: T.a, color: "#fff", borderRadius: "16px 16px 4px 16px" }
                : { background: T.s, border: `.5px solid ${T.border}`, borderRadius: "16px 16px 16px 4px" }),
            }} dangerouslySetInnerHTML={{ __html: renderChatHtml(m.text) }} />
          </div>
        ))}
        {chatTyping && (
          <div style={{ marginBottom: 12, maxWidth: "85%" }}>
            <div style={{ fontSize: 11, color: T.t3, marginBottom: 3 }}>Trip With Me</div>
            <div style={{ padding: "12px 18px", background: T.s, border: `.5px solid ${T.border}`, borderRadius: "16px 16px 16px 4px", display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.t3, animation: "typingDot 1.2s infinite", animationDelay: "0s" }} />
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.t3, animation: "typingDot 1.2s infinite", animationDelay: "0.2s" }} />
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.t3, animation: "typingDot 1.2s infinite", animationDelay: "0.4s" }} />
            </div>
          </div>
        )}
      </div>
      <div style={{ padding: "0 24px" }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "8px 0" }}>
          {quickActions.map(p => (
            <button key={p} className="w-chip" style={{ ...css.chip, flexShrink: 0, fontSize: 12 }} onClick={() => sendMessage(p)}>{p}</button>
          ))}
        </div>
      </div>
      <div style={{ padding: "16px 24px", background: T.s, borderTop: `.5px solid ${T.border}` }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()}
            style={{ flex: 1, padding: "12px 16px", border: `.5px solid ${T.border}`, borderRadius: 24, fontFamily: T.font, fontSize: 14, background: T.s2, outline: "none", minHeight: 48 }}
            placeholder="Ask anything about your trip..." aria-label="Chat message input" />
          <button className="w-btnP" onClick={() => sendMessage()} aria-label="Send message" style={{ width: 48, height: 48, borderRadius: "50%", background: T.a, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s", flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
          </button>
        </div>
      </div>
      <TabBar active="chat" onNav={navigate} />
    </div>
  );
}
