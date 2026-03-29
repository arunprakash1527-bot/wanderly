import React from 'react';
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';
import { useNavigation } from '../../contexts/NavigationContext';
import { useWizard } from '../../contexts/WizardContext';
import { DEMO_SLIDE_DURATIONS } from '../../constants/demo';
import { TRIP, DAYS, TIMELINE } from '../../constants/tripData';

// ─── Demo slide config — driven by active demo data ───
function getDemoConfig() {
  const t = TRIP;
  const d = DAYS;
  const tl = TIMELINE;
  const adultsArr = t.travellers?.adults || [];
  const kidsArr = [...(t.travellers?.older || []), ...(t.travellers?.younger || [])];
  const adultNames = adultsArr.map(a => typeof a === 'object' ? a.name : 'Adult');
  const adultAvatars = adultNames.slice(0, 3).map(n => n === "You" ? ["You", T.a] : [n.split(" ").map(w=>w[0]).join(""), [T.coral, T.blue, T.amber, T.purple][adultNames.indexOf(n) % 4]]);
  if (adultsArr.length > 3) adultAvatars.push([`+${adultsArr.length - 3}`, T.amber]);
  const day1 = d[0] || {};
  const day2 = d[1] || {};
  const dayLast = d[d.length - 1] || {};
  const tl1 = tl[1] || [];
  const tl2 = tl[2] || [];
  const tlLast = tl[d.length] || [];
  const adultActs2 = tl2.filter(i => i.for === "adults").slice(0, 2).map(i => i.title);
  const kidActs2 = tl2.filter(i => i.for === "kids").slice(0, 2).map(i => i.title);
  const lunchAll2 = tl2.find(i => i.for === "all" && /lunch/i.test(i.title));
  const startLoc = t.startLocation || t.places?.[0] || "Home";
  const firstPlace = t.places?.[0] || d[0]?.location || "Destination";
  const lastPlace = d[d.length - 1]?.location?.split("—")[0]?.trim() || t.places?.[t.places.length - 1] || "Home";
  // EV charger stop from timeline
  const evStop1 = tl1.find(i => i.evCharger || /EV charge|charger/i.test(i.desc));
  const evStopLast = tlLast.find(i => i.evCharger || /EV charge|charger/i.test(i.desc));
  // Route info
  const routeVia = t.places?.length > 1 ? t.places.slice(0, 2).join(" → ") : firstPlace;

  return {
    tripName: t.name, startLoc, firstPlace, lastPlace, routeVia,
    year: t.year, travelMode: t.travelMode || "car",
    brief: t.brief || "",
    budget: t.budget || "",
    places: t.places || [],
    stays: t.stays || [],
    adults: adultsArr, adultAvatars, adultNames,
    kids: kidsArr,
    kidsDisplay: kidsArr.map(k => ({ e: (k.age || 0) < 10 ? "\uD83D\uDC67" : "\uD83D\uDC66", n: `${k.name}, ${k.age}` })),
    day1, day2, dayLast, days: d,
    tl1, tl2, tlLast,
    adultActs2: adultActs2.length ? adultActs2 : ["Explore the area", "Relax"],
    kidActs2: kidActs2.length ? kidActs2 : ["Kids activity", "Fun zone"],
    lunchAll2: lunchAll2 ? lunchAll2.title.replace(/^lunch at /i, "") : "local restaurant",
    evStop1Name: evStop1 ? evStop1.title.replace(/^EV charge at /i, "") : "Charging station",
    evStopLastName: evStopLast ? evStopLast.title.replace(/^EV charge at /i, "") : "Charging station",
    // Packing items — contextual
    packClothing: [
      { name: t.places?.some(p => /paris|france/i.test(p)) ? "Light layers" : "Rain jackets", for: "Everyone", reason: `${firstPlace} weather` },
      { name: "Walking shoes", for: "Adults", reason: adultActs2[0] || "Exploring" },
      { name: kidsArr.length ? `Comfy shoes for ${kidsArr.map(k=>k.name).join(" & ")}` : "Comfortable shoes", for: kidsArr.map(k=>k.name).join(" & ") || "Everyone", reason: kidActs2[0] || "Activities" },
    ],
    packElectronics: [
      { name: /EV/i.test(t.travelMode || "") ? "EV charging cable" : "Car charger", for: "Driver", reason: t.travelMode || "Road trip" },
      { name: "Portable charger", for: "Everyone", reason: "Trip essential" },
    ],
    packDocs: [
      { name: t.stays?.length ? `${t.stays[0]?.type || "Hotel"} confirmation` : "Booking confirmation", for: "Lead", reason: `${t.stays?.length || 0} bookings` },
      { name: t.places?.some(p => /paris|france|spain|italy/i.test(p)) ? "Passports" : "Travel insurance", for: "Everyone", reason: "Family trip" },
      { name: kidsArr.length ? `Activity passes for ${kidsArr.map(k=>k.name).join(" & ")}` : "Activity tickets", for: kidsArr.map(k=>k.name).join(" & ") || "Everyone", reason: kidActs2[0] || "Booked activities" },
    ],
    // Expenses
    expenses: [
      { icon: "⛽", cat: "Fuel", desc: evStop1 ? evStop1.title : "EV charge", amount: t.budget ? "£12.40" : "£12.40", by: adultNames[0] || "You" },
      { icon: "🍽️", cat: "Food", desc: lunchAll2 ? lunchAll2.title : "Lunch", amount: "£68.50", by: adultNames[1] || "You" },
      { icon: "🎟️", cat: "Activities", desc: kidActs2[0] || "Activity tickets", amount: "£32.00", by: adultNames[2] || adultNames[0] || "You" },
      { icon: "☕", cat: "Food", desc: `Coffee & cake, ${day2.location?.split("—")[0]?.trim() || firstPlace}`, amount: "£18.20", by: adultNames[0] || "You" },
    ],
    // Polls
    pollQuestion: `Where should we eat dinner?`,
    pollOpts: tlLast.filter(i => /dinner/i.test(i.title)).length ? [
      { text: tlLast.find(i => /dinner/i.test(i.title))?.title.replace(/^dinner at /i, "") || "Option 1", desc: "tonight's pick", base: 2 },
      { text: "Something casual", desc: "quick & easy", base: 1 },
      { text: "Local favourite", desc: "authentic cuisine", base: 1 },
    ] : [
      { text: "Restaurant A", desc: "popular choice", base: 2 },
      { text: "Restaurant B", desc: "family favourite", base: 1 },
      { text: "Restaurant C", desc: "local gem", base: 1 },
    ],
    // Photos
    photos: [
      { label: adultActs2[0]?.split("·")[0]?.trim() || "Scenery", color: "#5A8C6E" },
      { label: day1.location?.split("—")[0]?.trim() || "Arrival", color: "#5A7EA0" },
      { label: "Lunch", color: "#A08060" },
      { label: kidsArr[0]?.name ? `${kidsArr[0].name} playing` : "Fun times", color: "#7EA060" },
      { label: "Boat trip", color: "#4A8BA0" },
      { label: "Ice cream", color: "#A04A8B" },
      { label: "Dinner", color: "#8A7348" },
      { label: "Sunset", color: "#C87040" },
    ],
    reelLabels: [adultActs2[0] || "Day out", day1.location?.split("—")[0]?.trim() || "Arrival", lunchAll2?.title || "Lunch", "Exploring", "Sunset"],
  };
}

export function DemoOverlay() {
  const {
    showDemo, setShowDemo,
    demoSlide, setDemoSlide,
    demoTick, setDemoTick,
    demoPaused, setDemoPaused,
    demoInteracted, setDemoInteracted,
    navigate, showToast,
  } = useNavigation();
  const { resetWizard, setWizStep } = useWizard();

  if (!showDemo) return null;

  const t = demoTick;
  const s = demoSlide;
  const total = 12;
  const isLast = s === total - 1;

  // Helper: typewriter text
  const typeText = (text, startTick, speed = 2) => {
    const elapsed = Math.max(0, t - startTick);
    const chars = Math.min(text.length, Math.floor(elapsed / speed));
    return text.substring(0, chars) + (chars < text.length ? "\u2502" : "");
  };
  const show = (afterTick) => t >= afterTick;
  const popIn = (delay) => {
    if (t < delay) return { opacity: 0, transform: "scale(0)" };
    if (t < delay + 4) return { animation: "demoPop .6s cubic-bezier(.34,1.56,.64,1) forwards" };
    return { opacity: 1, transform: "scale(1)" };
  };
  const slideUp = (delay) => {
    if (t < delay) return { opacity: 0, transform: "translateY(16px)" };
    if (t < delay + 4) return { animation: "demoSlideUp .55s ease-out forwards" };
    return { opacity: 1, transform: "translateY(0)" };
  };
  const bounceIn = (delay) => {
    if (t < delay) return { opacity: 0, transform: "translateY(-16px)" };
    if (t < delay + 4) return { animation: "demoBounce .65s ease-out forwards" };
    return { opacity: 1, transform: "translateY(0)" };
  };
  const ChatBubble = ({ text, isUser, delay }) => {
    if (t < delay) return null;
    const visible = t > delay;
    return (
      <div style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: 14, fontSize: 12, lineHeight: 1.5, alignSelf: isUser ? "flex-end" : "flex-start",
        background: isUser ? T.a : T.s2, color: isUser ? "#fff" : T.t1,
        opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(.96)",
        transition: "opacity .5s ease, transform .5s ease" }}>
        {text}
      </div>
    );
  };

  // ─── Phase labels for narrative flow ───
  const phaseLabel = (emoji, phase, step) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14, ...slideUp(0) }}>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: 1.5 }}>{phase}</span>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,.25)" }}>·</span>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>{step}</span>
    </div>
  );

  // ─── SLIDE RENDERERS ───
  const D = getDemoConfig();
  const renderSlide = () => {
    switch (s) {
      // ─── Slide 0: Narrative intro ───
      case 0: return (
        <div style={{ textAlign: "center", maxWidth: 340 }}>
          <div style={{ fontSize: 48, marginBottom: 16, ...popIn(2) }}>{"\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66"}</div>
          <p style={{ fontFamily: T.fontD, fontSize: 22, color: "#fff", marginBottom: 8, ...slideUp(5) }}>
            {D.tripName}
          </p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.7)", lineHeight: 1.6, ...slideUp(8) }}>
            {D.adults.length} adults, {D.kids.length} kids, 1 {/EV/i.test(D.travelMode) ? "EV" : "car"}, and a trip to {D.firstPlace}.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20, ...slideUp(14) }}>
            {D.adultAvatars.map(([n, c], i) => (
              <div key={i} style={{ ...popIn(16 + i * 4) }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, background: c, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 600, margin: "0 auto 4px" }}>{n[0]}</div>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>{n}</span>
              </div>
            ))}
          </div>
          {show(32) && D.kidsDisplay.length > 0 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
              {D.kidsDisplay.map((k, i) => (
                <div key={i} style={{ padding: "6px 14px", borderRadius: 10, background: "rgba(255,255,255,.08)", ...popIn(34 + i * 5) }}>
                  <span style={{ fontSize: 16 }}>{k.e}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginLeft: 6 }}>{k.n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );

      // ─── Slide 1: Trip creation ───
      case 1: return (
        <div style={{ width: "100%", maxWidth: 320 }}>
          {phaseLabel("📋", "Planning", "Create trip")}
          <div style={{ background: T.s, borderRadius: 14, padding: 16, textAlign: "left" }}>
            <div style={{ background: T.s2, borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: T.t3 }}>Trip name</span>
              <p style={{ fontSize: 14, fontWeight: 500, marginTop: 2, fontFamily: T.font, color: t < 3 ? T.t3 : T.t1 }}>{t < 3 ? "\u2502" : typeText(D.tripName, 3, 1)}</p>
            </div>
            {show(25) && (
              <div style={{ display: "flex", gap: 8, marginBottom: 10, ...slideUp(25) }}>
                <div style={{ flex: 1, background: T.s2, borderRadius: 8, padding: 10 }}>
                  <span style={{ fontSize: 10, color: T.t3 }}>Start</span>
                  <p style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{D.day1.date} {D.year}</p>
                </div>
                <div style={{ flex: 1, background: T.s2, borderRadius: 8, padding: 10 }}>
                  <span style={{ fontSize: 10, color: T.t3 }}>End</span>
                  <p style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>{D.dayLast.date} {D.year}</p>
                </div>
              </div>
            )}
            {show(30) && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {D.places.map((p, i) => (
                  show(32 + i * 3) && <span key={p} style={{ ...css.chip, ...css.chipActive, fontSize: 11, padding: "4px 10px", ...popIn(32 + i * 3) }}>{p}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      );

      // ─── Slide 2: Stays ───
      case 2: return (
        <div style={{ width: "100%", maxWidth: 320 }}>
          {phaseLabel("🏨", "Planning", "Find stays")}
          <div style={{ background: T.s, borderRadius: 14, padding: 16, textAlign: "left" }}>
            {show(4) && (
              <div style={{ background: T.s2, borderRadius: 8, padding: 10, marginBottom: 6, display: "flex", alignItems: "center", gap: 8, ...slideUp(4) }}>
                <span style={{ fontSize: 16 }}>{"\uD83D\uDD0D"}</span>
                <span style={{ fontSize: 12, color: T.t3 }}>{typeText(`${D.firstPlace} hotels...`, 6, 0.75)}</span>
              </div>
            )}
            {D.stays.slice(0, 2).map((st, i) => ({ name: st.name, dates: st.dates, type: st.type, tags: st.tags || [], delay: 14 + i * 6 })).map((stay, i) => (
              show(stay.delay) && <div key={i} style={{ background: T.s2, borderRadius: 8, padding: 12, marginBottom: 6, ...slideUp(stay.delay) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{stay.name}</span>
                  <span style={{ fontSize: 9, color: T.amber, background: T.amberL, padding: "2px 8px", borderRadius: 8 }}>{stay.type}</span>
                </div>
                <span style={{ fontSize: 10, color: T.t3 }}>{stay.dates}</span>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                  {stay.tags.map((tag, j) => show(stay.delay + 3 + j * 2) && <span key={tag} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 8, background: T.al, color: T.ad, ...popIn(stay.delay + 3 + j * 2) }}>{tag}</span>)}
                </div>
              </div>
            ))}
            {show(28) && <div style={{ textAlign: "center", marginTop: 4, ...popIn(28) }}><span style={{ fontSize: 10, color: T.ad }}>{"\u2713"} 2 stays added</span></div>}
          </div>
        </div>
      );

      // ─── Slide 3: Packing list ───
      case 3: return (
        <div style={{ width: "100%", maxWidth: 320 }}>
          {phaseLabel("🎒", "Before you go", "Pack smart")}
          <div style={{ background: T.s, borderRadius: 14, padding: 16, textAlign: "left" }}>
            {/* Progress bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, ...slideUp(2) }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>Packing List</span>
              <span style={{ fontSize: 11, color: T.t3 }}>{show(30) ? `${Math.min(6, Math.floor((t - 30) / 3))}/8 packed` : "0/8 packed"}</span>
            </div>
            {show(4) && (
              <div style={{ height: 4, borderRadius: 2, background: T.s2, marginBottom: 14, overflow: "hidden", ...slideUp(4) }}>
                <div style={{ height: "100%", borderRadius: 2, background: T.a, width: show(30) ? `${Math.min(75, (t - 30) * 2.5)}%` : "0%", transition: "width .4s ease" }} />
              </div>
            )}
            {/* AI suggestion badge */}
            {show(6) && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: T.al, marginBottom: 12, ...slideUp(6) }}>
                <span style={{ fontSize: 12 }}>✨</span>
                <span style={{ fontSize: 10, color: T.ad }}>AI-suggested based on your trip, weather & kids</span>
              </div>
            )}
            {/* Categories with items */}
            {[
              { cat: "👕 Clothing", items: D.packClothing.map((item, i) => ({ ...item, delay: 10 + i * 3 })) },
              { cat: "🔌 Electronics", items: D.packElectronics.map((item, i) => ({ ...item, delay: 19 + i * 3 })) },
              { cat: "📋 Documents", items: D.packDocs.map((item, i) => ({ ...item, delay: 25 + i * 2 })) },
            ].map((group, gi) => (
              show(group.items[0].delay) && (
                <div key={gi} style={{ marginBottom: 10, ...slideUp(group.items[0].delay) }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: "uppercase", marginBottom: 4 }}>{group.cat}</p>
                  {group.items.map((item, ii) => {
                    const checked = show(30) && (item.delay < 24);
                    return show(item.delay) && (
                      <div key={ii} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", opacity: checked ? 0.5 : 1, transition: "opacity .3s", ...slideUp(item.delay) }}>
                        <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${checked ? T.a : T.border}`,
                          background: checked ? T.a : "transparent", display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all .3s", flexShrink: 0 }}>
                          {checked && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 12, color: T.t1, textDecoration: checked ? "line-through" : "none" }}>{item.name}</span>
                          <span style={{ fontSize: 9, color: T.ad, marginLeft: 6 }}>{item.for}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ))}
          </div>
        </div>
      );

      // ─── Slide 4: Day 1 chat ───
      case 4: return (
        <div style={{ width: "100%", maxWidth: 320 }}>
          {phaseLabel("🚗", "On the trip", "Day 1 · Travel")}
          <div style={{ background: T.ad, borderRadius: "14px 14px 0 0", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>AI Concierge</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.15)", padding: "2px 8px", borderRadius: 8 }}>Day 1 · {D.day1.date}</span>
          </div>
          <div style={{ background: T.s, borderRadius: "0 0 14px 14px", padding: 12, display: "flex", flexDirection: "column", gap: 8, minHeight: 240 }}>
            <ChatBubble delay={2} text={<span>{"\uD83D\uDD0B"} <b>Travel day!</b> {D.startLoc} {"\u2192"} {D.firstPlace}<br/><br/>What time would you like to leave?</span>} />
            {show(14) && (
              <div style={{ display: "flex", gap: 6, ...slideUp(14) }}>
                {["8:00 AM", "9:00 AM", "10:00 AM"].map((time, i) => (
                  <span key={time} style={{ ...css.chip, fontSize: 10, padding: "5px 12px",
                    ...(demoInteracted.time === time ? css.chipActive : {}),
                    cursor: "pointer", ...popIn(16 + i * 3) }}
                    onClick={e => { e.stopPropagation(); setDemoInteracted(p => ({...p, time})); setDemoPaused(true); setTimeout(() => setDemoPaused(false), 1500); }}>
                    {time}
                  </span>
                ))}
              </div>
            )}
            <ChatBubble delay={demoInteracted.time ? 0 : 28} isUser text={demoInteracted.time || "9:00 AM"} />
            {(demoInteracted.time || show(34)) && (
              <ChatBubble delay={demoInteracted.time ? 2 : 34} text={
                <span>{"\uD83D\uDDFA\uFE0F"} <b>Route ready!</b><br/>{D.startLoc} {"\u2192"} {D.firstPlace}<br/>{"\u26A1"} EV stop: {D.evStop1Name}<br/>{"\uD83D\uDCCD"} Arrive ~{demoInteracted.time === "8:00 AM" ? "9:30 AM" : demoInteracted.time === "10:00 AM" ? "11:30 AM" : "10:30 AM"}</span>
              } />
            )}
          </div>
        </div>
      );

      // ─── Slide 5: Day 2 activities ───
      case 5: return (
        <div style={{ width: "100%", maxWidth: 320 }}>
          {phaseLabel("🥾", "On the trip", "Day 2 · Activities")}
          <div style={{ background: T.ad, borderRadius: "14px 14px 0 0", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>AI Concierge</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.15)", padding: "2px 8px", borderRadius: 8 }}>Day 2 · {D.day2.date}</span>
          </div>
          <div style={{ background: T.s, borderRadius: "0 0 14px 14px", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <ChatBubble delay={2} text={<span>Good morning! Day 2 in <b>{D.day2.location?.split("—")[0]?.trim()}</b> · {D.day2.weather?.temp}{"\u00B0"}C {D.day2.weather?.icon}</span>} />
            {show(14) && (
              <div style={{ background: T.amberL, borderRadius: 8, padding: "6px 10px", fontSize: 11, ...slideUp(14) }}>
                {"\uD83C\uDFE8"} Your base: <b>{D.stays[0]?.name || "Hotel"}</b>
              </div>
            )}
            {show(20) && (
              <div style={{ display: "flex", gap: 6, ...slideUp(20) }}>
                <div style={{ flex: 1, background: T.blueL, borderRadius: 8, padding: 8, ...slideUp(20) }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: T.blue, marginBottom: 4 }}>Adults</p>
                  {D.adultActs2.map((a, i) => show(24 + i * 4) && <p key={i} style={{ fontSize: 10, marginBottom: 2, ...slideUp(24 + i * 4) }}>{a}</p>)}
                </div>
                <div style={{ flex: 1, background: T.pinkL, borderRadius: 8, padding: 8, ...slideUp(22) }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: T.pink, marginBottom: 4 }}>Kids</p>
                  {D.kidActs2.map((a, i) => show(26 + i * 4) && <p key={i} style={{ fontSize: 10, marginBottom: 2, ...slideUp(26 + i * 4) }}>{a}</p>)}
                </div>
              </div>
            )}
            {show(36) && (
              <div style={{ fontSize: 11, color: T.ad, textAlign: "center", padding: 6, background: T.al, borderRadius: 8, ...popIn(36) }}>
                {"\uD83C\uDF7D\uFE0F"} Everyone meets at <b>{D.lunchAll2}</b> for lunch
              </div>
            )}
          </div>
        </div>
      );

      // ─── Slide 6: Expenses ───
      case 6: {
        const expenseItems = D.expenses.map((e, i) => ({ ...e, delay: 8 + i * 6 }));
        const catBreakdown = [
          { cat: "Food", color: T.coral, pct: 54, amount: "£86.70" },
          { cat: "Activities", color: T.blue, pct: 25, amount: "£32.00" },
          { cat: "Fuel", color: T.amber, pct: 10, amount: "£12.40" },
          { cat: "Other", color: T.purple, pct: 11, amount: "£14.00" },
        ];
        return (
          <div style={{ width: "100%", maxWidth: 320 }}>
            {phaseLabel("💷", "On the trip", "Split expenses")}
            <div style={{ background: T.s, borderRadius: 14, padding: 16, textAlign: "left" }}>
              {/* Total hero */}
              <div style={{ textAlign: "center", marginBottom: 14, ...slideUp(2) }}>
                <p style={{ fontSize: 28, fontWeight: 700, color: T.t1, fontFamily: T.font }}>
                  £{show(6) ? "131.10" : "0.00"}
                </p>
                <p style={{ fontSize: 11, color: T.t3 }}>Total spent · £32.78 per person</p>
              </div>

              {/* Category bar */}
              {show(6) && (
                <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 12, ...slideUp(6) }}>
                  {catBreakdown.map((c, i) => (
                    <div key={i} style={{ width: `${c.pct}%`, background: c.color, transition: "width .5s ease" }} />
                  ))}
                </div>
              )}

              {/* Expense items */}
              {expenseItems.map((exp, i) => (
                show(exp.delay) && (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                    borderBottom: i < expenseItems.length - 1 ? `1px solid ${T.border}` : "none", ...slideUp(exp.delay) }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: T.s2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                      {exp.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: T.t1 }}>{exp.desc}</p>
                      <p style={{ fontSize: 10, color: T.t3 }}>{exp.by} paid · split 4 ways</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: T.t1, flexShrink: 0 }}>{exp.amount}</span>
                  </div>
                )
              ))}

              {/* Settlement preview */}
              {show(32) && (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 10, background: T.amberL, border: `1px solid ${T.amber}22`, ...slideUp(32) }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: T.amber, marginBottom: 6 }}>💸 Settle up</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.t2 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 10, background: T.a, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600 }}>{D.adultAvatars[0]?.[0]?.[0] || "Y"}</div>
                    <span>→</span>
                    <div style={{ width: 20, height: 20, borderRadius: 10, background: T.coral, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 600 }}>{D.adultAvatars[1]?.[0]?.[0] || "?"}</div>
                    <span style={{ fontWeight: 500 }}>£14.35</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      // ─── Slide 7: Polls ───
      case 7: {
        const pollVote = demoInteracted.poll;
        const opts = D.pollOpts;
        const totalVotes = 4 + (pollVote !== undefined ? 1 : 0);
        const getVotes = (i) => {
          let v = opts[i].base;
          if (pollVote === i) v++;
          return v;
        };
        return (
          <div style={{ width: "100%", maxWidth: 320 }}>
            {phaseLabel("🗳️", "On the trip", "Group vote")}
            <div style={{ background: T.s, borderRadius: 14, padding: 16, textAlign: "left" }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, ...slideUp(3) }}>{"\uD83C\uDF7D\uFE0F"} Where should we eat dinner?</p>
              <p style={{ fontSize: 10, color: T.t3, marginBottom: 12, ...slideUp(5) }}>4 travellers · {pollVote !== undefined ? "You voted!" : "Tap to vote"}</p>
              {opts.map((o, i) => {
                const pct = Math.round(getVotes(i) / totalVotes * 100);
                const voted = pollVote === i;
                return show(8 + i * 4) && (
                  <div key={i} style={{ marginBottom: 8, position: "relative", borderRadius: 10, overflow: "hidden",
                    border: `1.5px solid ${voted ? T.a : T.border}`, cursor: pollVote === undefined ? "pointer" : "default", ...slideUp(8 + i * 4) }}
                    onClick={e => { if (pollVote !== undefined) return; e.stopPropagation(); setDemoInteracted(p => ({...p, poll: i})); setDemoPaused(true); setTimeout(() => setDemoPaused(false), 2000); }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pollVote !== undefined ? `${pct}%` : "0%",
                      background: voted ? T.al : T.s2, transition: "width 1s ease" }} />
                    <div style={{ position: "relative", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: voted ? 600 : 400 }}>{voted ? "\u2713 " : ""}{o.text}</span>
                        <span style={{ fontSize: 10, color: T.t3, marginLeft: 6 }}>{o.desc}</span>
                      </div>
                      {pollVote !== undefined && <span style={{ fontSize: 12, fontWeight: 600, color: voted ? T.ad : T.t3 }}>{pct}%</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      // ─── Slide 8: Last day departure ───
      case 8: return (
        <div style={{ width: "100%", maxWidth: 320 }}>
          {phaseLabel("🏠", "On the trip", `Day ${D.days.length} · Head home`)}
          <div style={{ background: T.ad, borderRadius: "14px 14px 0 0", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>AI Concierge</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.15)", padding: "2px 8px", borderRadius: 8 }}>Day {D.days.length} · {D.dayLast.date}</span>
          </div>
          <div style={{ background: T.s, borderRadius: "0 0 14px 14px", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <ChatBubble delay={2} text={<span>{"\uD83C\uDFE0"} <b>Time to head home!</b> {D.lastPlace} {"\u2192"} {D.startLoc}<br/><br/>When do you want to set off?</span>} />
            {show(14) && (
              <div style={{ display: "flex", gap: 6, ...slideUp(14) }}>
                {["10:00 AM", "After lunch"].map((opt, i) => (
                  <span key={opt} style={{ ...css.chip, fontSize: 10, padding: "5px 12px", cursor: "pointer", ...popIn(16 + i * 3),
                    ...(demoInteracted.depart === opt ? css.chipActive : {}) }}
                    onClick={e => { e.stopPropagation(); setDemoInteracted(p => ({...p, depart: opt})); setDemoPaused(true); setTimeout(() => setDemoPaused(false), 1500); }}>
                    {opt}
                  </span>
                ))}
              </div>
            )}
            <ChatBubble delay={demoInteracted.depart ? 0 : 26} isUser text={demoInteracted.depart || "After lunch"} />
            {(demoInteracted.depart || show(32)) && (
              <ChatBubble delay={demoInteracted.depart ? 2 : 32} text={
                <span>{"\uD83D\uDDFA\uFE0F"} <b>Route planned!</b><br/>{D.lastPlace} {"\u2192"} {D.startLoc}<br/>{"\u26A1"} Stop: {D.evStopLastName}<br/>{"\uD83D\uDCCD"} Home by ~{demoInteracted.depart === "10:00 AM" ? "1:30 PM" : "5:00 PM"}</span>
              } />
            )}
          </div>
        </div>
      );

      // ─── Slide 9: Photos ───
      case 9: {
        const demoPhotos = D.photos;
        return (
          <div style={{ width: "100%", maxWidth: 320 }}>
            {phaseLabel("📸", "After the trip", "Memories")}
            <div style={{ background: T.s, borderRadius: 14, padding: 14, textAlign: "left" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5 }}>
                {demoPhotos.map((p, i) => (
                  <div key={i} style={{ aspectRatio: "1", borderRadius: 8, background: show(4 + i * 3) ? p.color : T.s2,
                    display: "flex", alignItems: "flex-end", padding: 4, transition: "background .5s ease",
                    ...(show(4 + i * 3) ? bounceIn(4 + i * 3) : { opacity: .2 }) }}>
                    {show(4 + i * 3) && <span style={{ fontSize: 8, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,.5)" }}>{p.label}</span>}
                  </div>
                ))}
              </div>
              {show(30) && (
                <div style={{ textAlign: "center", marginTop: 10, ...popIn(30) }}>
                  <span style={{ fontSize: 11, color: T.ad }}>{"\uD83D\uDCF8"} {Math.min(8, Math.max(0, Math.floor((t - 4) / 3)))} photos added</span>
                </div>
              )}
            </div>
          </div>
        );
      }

      // ─── Slide 10: AI reel ───
      case 10: {
        const reelPhotos = ["#5A8C6E", "#5A7EA0", "#A08060", "#4A8BA0", "#C87040"];
        const activeReel = Math.min(reelPhotos.length - 1, Math.floor(t / 7));
        return (
          <div style={{ width: "100%", maxWidth: 320 }}>
            {phaseLabel("🎬", "After the trip", "Highlight reel")}
            <div style={{ background: "#1a1a1a", borderRadius: 14, padding: 16, textAlign: "center", color: "#fff", overflow: "hidden" }}>
              <div style={{ display: "flex", gap: 3, marginBottom: 14 }}>
                {reelPhotos.map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,.15)", overflow: "hidden" }}>
                    <div style={{ height: "100%", background: T.a, width: i < activeReel ? "100%" : i === activeReel ? `${(t % 7) / 7 * 100}%` : "0%", transition: "width .12s linear" }} />
                  </div>
                ))}
              </div>
              <div style={{ width: "100%", aspectRatio: "16/10", borderRadius: 8, background: reelPhotos[activeReel], marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .5s ease", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", bottom: 8, left: 10, fontSize: 10, color: "rgba(255,255,255,.7)" }}>
                  {D.reelLabels[activeReel] || "Highlight"}
                </div>
                <div style={{ position: "absolute", top: 8, right: 10, fontSize: 9, color: "rgba(255,255,255,.5)", background: "rgba(0,0,0,.3)", padding: "2px 6px", borderRadius: 4 }}>
                  Day {[2,2,2,3,4][activeReel]}
                </div>
              </div>
              <p style={{ fontFamily: T.fontD, fontSize: 16, marginBottom: 4, ...slideUp(2) }}>{D.tripName} {D.year}</p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,.5)", marginBottom: 10 }}>AI-curated highlights · 8 photos</p>
              <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                {["\uD83C\uDFB5 Music", "\uD83C\uDF99\uFE0F Narration", "\uD83D\uDCC5 Dates"].map((label, i) => (
                  <span key={label} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 8, background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.6)", ...popIn(4 + i * 3) }}>{label}</span>
                ))}
              </div>
            </div>
          </div>
        );
      }

      // ─── Slide 11: CTA ───
      case 11: return (
        <div style={{ textAlign: "center", maxWidth: 340 }}>
          <div style={{ fontSize: 56, marginBottom: 16, ...popIn(2) }}>{"\uD83C\uDF0D"}</div>
          <h2 style={{ fontFamily: T.fontD, fontSize: 26, color: "#fff", marginBottom: 8, ...slideUp(5) }}>Your adventure awaits</h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.6, marginBottom: 24, ...slideUp(8) }}>
            Trip With Me connects maps, weather, bookings, EV chargers, and AI — so you can focus on making memories.
          </p>
          {show(14) && (
            <button onClick={e => { e.stopPropagation(); localStorage.setItem('twm_demo_seen', 'true'); setShowDemo(false); navigate("create"); setWizStep(0); resetWizard(); }}
              style={{ ...css.btn, ...css.btnP, width: "100%", padding: "14px 16px", justifyContent: "center", fontSize: 15, fontWeight: 500, marginBottom: 10, ...slideUp(14) }}>
              Create my first trip
            </button>
          )}
          {show(18) && (
            <p onClick={e => { e.stopPropagation(); localStorage.setItem('twm_demo_seen', 'true'); setShowDemo(false); }}
              style={{ fontSize: 12, color: "rgba(255,255,255,.4)", cursor: "pointer", marginTop: 4, ...slideUp(18) }}>
              or explore the demo trip {"\u2192"}
            </p>
          )}
        </div>
      );

      default: return null;
    }
  };

  // Narrative captions per slide
  const captions = [
    `${D.tripName} — their story...`,
    "First, name the trip and pick destinations",
    "Then find the perfect places to stay",
    "AI suggests what to pack based on your trip",
    `Day 1 \u2014 ${D.startLoc} to ${D.firstPlace}`,
    "Activity days \u2014 split plans for everyone",
    "Track every expense, split costs fairly",
    "Big decisions? Let the group vote",
    `Last day \u2014 ${D.lastPlace} back to ${D.startLoc}`,
    "Every moment, captured and catalogued",
    "The AI turns your photos into a highlight reel",
    "",
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label="Trip With Me interactive demo" style={{ position: "fixed", inset: 0, zIndex: 9999, background: "linear-gradient(180deg, #0D2818 0%, #1A3C2A 50%, #0D2818 100%)", display: "flex", flexDirection: "column", fontFamily: T.font, overflow: "hidden" }}
      onClick={e => {
        if (isLast) return;
        const x = e.clientX;
        const w = window.innerWidth;
        if (x < w * 0.25) { setDemoSlide(Math.max(0, s - 1)); }
        else if (x > w * 0.75) { setDemoSlide(Math.min(total - 1, s + 1)); }
      }}>
      {/* Progress bar */}
      <div style={{ display: "flex", gap: 3, padding: "12px 16px 0", flexShrink: 0 }}>
        {Array.from({length: total}).map((_, i) => {
          const dur = DEMO_SLIDE_DURATIONS[i] || 50;
          return (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,.15)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 2, background: i < s ? "rgba(255,255,255,.8)" : i === s ? T.a : "transparent",
                width: i < s ? "100%" : i === s ? `${Math.min(100, (t / dur) * 100)}%` : "0%", transition: i === s ? "width .12s linear" : "none" }} />
            </div>
          );
        })}
      </div>
      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px 0", flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{s + 1} / {total}{s === 0 ? " · ~2 min" : ""}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={e => { e.stopPropagation(); setDemoPaused(p => !p); }}
            style={{ background: "rgba(255,255,255,.1)", border: "none", color: "rgba(255,255,255,.7)", fontSize: 11, padding: "4px 12px", borderRadius: 12, cursor: "pointer", fontFamily: T.font }}>
            {demoPaused ? "\u25B6 Play" : "\u275A\u275A Pause"}
          </button>
          <button onClick={e => { e.stopPropagation(); localStorage.setItem('twm_demo_seen', 'true'); setShowDemo(false); setDemoPaused(false); setDemoInteracted({}); }}
            style={{ background: "rgba(255,255,255,.1)", border: "none", color: "rgba(255,255,255,.7)", fontSize: 11, padding: "4px 12px", borderRadius: 12, cursor: "pointer", fontFamily: T.font }}>
            Skip
          </button>
        </div>
      </div>
      {/* Slide content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", overflow: "hidden" }} key={`slide-${s}`}>
        {renderSlide()}
      </div>
      {/* Bottom caption */}
      {captions[s] && (
        <div style={{ textAlign: "center", padding: "12px 24px 24px", flexShrink: 0 }}>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.85)", fontStyle: "italic" }}>{captions[s]}</p>
        </div>
      )}
    </div>
  );
}
