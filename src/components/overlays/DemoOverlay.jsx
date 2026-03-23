import React from 'react';
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';
import { useNavigation } from '../../contexts/NavigationContext';
import { useWizard } from '../../contexts/WizardContext';
import { DEMO_SLIDE_DURATIONS } from '../../constants/demo';

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
  const total = 10;
  const isLast = s === total - 1;
  // Helper: typewriter text (reveals chars based on tick)
  const typeText = (text, startTick, speed = 2) => {
    const elapsed = Math.max(0, t - startTick);
    const chars = Math.min(text.length, Math.floor(elapsed / speed));
    return text.substring(0, chars) + (chars < text.length ? "\u2502" : "");
  };
  // Helper: show element after tick
  const show = (afterTick) => t >= afterTick;
  // Helpers: return animation only during animation window, then stable static style to prevent flicker
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
  // Chat bubble — mount at delay, transition at delay+1 (flicker-free)
  const ChatBubble = ({ text, isUser, delay }) => {
    if (t < delay) return null;
    const visible = t > delay;
    return (
      <div style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: 14, fontSize: 12, lineHeight: 1.5, alignSelf: isUser ? "flex-end" : "flex-start",
        background: isUser ? T.a : T.s2, color: isUser ? "#fff" : T.t,
        opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(.96)",
        transition: "opacity .5s ease, transform .5s ease" }}>
        {text}
      </div>
    );
  };

  // ─── SLIDE RENDERERS ───
  const renderSlide = () => {
    switch (s) {
      // ─── Slide 0: Narrative intro ───
      case 0: return (
        <div style={{ textAlign: "center", maxWidth: 340 }}>
          <div style={{ fontSize: 48, marginBottom: 16, ...popIn(2) }}>{"\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66"}</div>
          <p style={{ fontFamily: T.fontD, fontSize: 22, color: "#fff", marginBottom: 8, ...slideUp(5) }}>
            Meet the Johnsons
          </p>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.7)", lineHeight: 1.6, ...slideUp(8) }}>
            4 adults, 2 kids, 1 EV, and a dream Easter trip to the Lake District.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20, ...slideUp(14) }}>
            {[["You", T.a], ["James", T.coral], ["Sarah", T.blue], ["+1", T.amber]].map(([n, c], i) => (
              <div key={i} style={{ ...popIn(16 + i * 4) }}>
                <div style={{ width: 44, height: 44, borderRadius: 22, background: c, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 600, margin: "0 auto 4px" }}>{n[0]}</div>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>{n}</span>
              </div>
            ))}
          </div>
          {show(32) && (
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
              {[{e:"\uD83D\uDC66",n:"Max, 12"},{e:"\uD83D\uDC67",n:"Ella, 8"}].map((k, i) => (
                <div key={i} style={{ padding: "6px 14px", borderRadius: 10, background: "rgba(255,255,255,.08)", ...popIn(34 + i * 5) }}>
                  <span style={{ fontSize: 16 }}>{k.e}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginLeft: 6 }}>{k.n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      );

      // ─── Slide 1: Trip creation with typing ───
      case 1: return (
        <div style={{ width: "100%", maxWidth: 320 }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 12, textAlign: "center", ...slideUp(0) }}>Step 1 · Name your trip</p>
          <div style={{ background: T.s, borderRadius: 14, padding: 16, textAlign: "left" }}>
            <div style={{ background: T.s2, borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: T.t3 }}>Trip name</span>
              <p style={{ fontSize: 14, fontWeight: 500, marginTop: 2, fontFamily: T.font, color: t < 3 ? T.t3 : T.t }}>{t < 3 ? "\u2502" : typeText("Easter Lake District", 3, 1)}</p>
            </div>
            {show(25) && (
              <div style={{ display: "flex", gap: 8, marginBottom: 10, ...slideUp(25) }}>
                <div style={{ flex: 1, background: T.s2, borderRadius: 8, padding: 10 }}>
                  <span style={{ fontSize: 10, color: T.t3 }}>Start</span>
                  <p style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>3 Apr 2026</p>
                </div>
                <div style={{ flex: 1, background: T.s2, borderRadius: 8, padding: 10 }}>
                  <span style={{ fontSize: 10, color: T.t3 }}>End</span>
                  <p style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>7 Apr 2026</p>
                </div>
              </div>
            )}
            {show(30) && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {["Windermere", "Ambleside", "Keswick", "Grasmere"].map((p, i) => (
                  show(32 + i * 3) && <span key={p} style={{ ...css.chip, ...css.chipActive, fontSize: 11, padding: "4px 10px", ...popIn(32 + i * 3) }}>{p}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      );

      // ─── Slide 2: Stays slide in ───
      case 2: return (
        <div style={{ width: "100%", maxWidth: 320 }}>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 12, textAlign: "center", ...slideUp(0) }}>Step 2 · Where are you staying?</p>
          <div style={{ background: T.s, borderRadius: 14, padding: 16, textAlign: "left" }}>
            {show(4) && (
              <div style={{ background: T.s2, borderRadius: 8, padding: 10, marginBottom: 6, display: "flex", alignItems: "center", gap: 8, ...slideUp(4) }}>
                <span style={{ fontSize: 16 }}>{"\uD83D\uDD0D"}</span>
                <span style={{ fontSize: 12, color: T.t3 }}>{typeText("Windermere hotels...", 6, 0.75)}</span>
              </div>
            )}
            {[
              { name: "Windermere Boutique Hotel", dates: "3-5 Apr", type: "Hotel", tags: ["2 rooms", "Breakfast", "EV charger"], delay: 14 },
              { name: "Keswick Lakeside Cottage", dates: "5-7 Apr", type: "Cottage", tags: ["3 beds", "Garden", "Dog friendly"], delay: 20 },
            ].map((stay, i) => (
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

      // ─── Slide 3: Day 1 chat conversation ───
      case 3: return (
        <div style={{ width: "100%", maxWidth: 320 }}>
          <div style={{ background: T.ad, borderRadius: "14px 14px 0 0", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>Chat with AI</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.15)", padding: "2px 8px", borderRadius: 8 }}>Day 1 · 3 Apr</span>
          </div>
          <div style={{ background: T.s, borderRadius: "0 0 14px 14px", padding: 12, display: "flex", flexDirection: "column", gap: 8, minHeight: 240 }}>
            <ChatBubble delay={2} text={<span>{"\uD83D\uDD0B"} <b>Travel day!</b> Manchester {"\u2192"} Windermere<br/><br/>What time would you like to leave?</span>} />
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
                <span>{"\uD83D\uDDFA\uFE0F"} <b>Route ready!</b><br/>Manchester {"\u2192"} M6 {"\u2192"} A591<br/>{"\u26A1"} EV stop: Lancaster Services<br/>{"\uD83D\uDCCD"} Arrive ~{demoInteracted.time === "8:00 AM" ? "9:30 AM" : demoInteracted.time === "10:00 AM" ? "11:30 AM" : "10:30 AM"}</span>
              } />
            )}
          </div>
        </div>
      );

      // ─── Slide 4: Activity day with animated schedule ───
      case 4: return (
        <div style={{ width: "100%", maxWidth: 320 }}>
          <div style={{ background: T.ad, borderRadius: "14px 14px 0 0", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>Chat with AI</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.15)", padding: "2px 8px", borderRadius: 8 }}>Day 2 · 4 Apr</span>
          </div>
          <div style={{ background: T.s, borderRadius: "0 0 14px 14px", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <ChatBubble delay={2} text={<span>Good morning! Day 2 in <b>Ambleside</b> · 12{"\u00B0"}C {"\u2601\uFE0F"}</span>} />
            {show(14) && (
              <div style={{ background: T.amberL, borderRadius: 8, padding: "6px 10px", fontSize: 11, ...slideUp(14) }}>
                {"\uD83C\uDFE8"} Your base: <b>Windermere Boutique Hotel</b>
              </div>
            )}
            {show(20) && (
              <div style={{ display: "flex", gap: 6, ...slideUp(20) }}>
                <div style={{ flex: 1, background: T.blueL, borderRadius: 8, padding: 8, ...slideUp(20) }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: T.blue, marginBottom: 4 }}>Adults</p>
                  {["\uD83E\uDD7E Loughrigg Fell", "\uD83D\uDC86 Low Wood Spa"].map((a, i) => show(24 + i * 4) && <p key={i} style={{ fontSize: 10, marginBottom: 2, ...slideUp(24 + i * 4) }}>{a}</p>)}
                </div>
                <div style={{ flex: 1, background: T.pinkL, borderRadius: 8, padding: 8, ...slideUp(22) }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: T.pink, marginBottom: 4 }}>Kids</p>
                  {["\uD83C\uDFA2 Brockhole Park", "\uD83E\uDD5A Easter egg trail"].map((a, i) => show(26 + i * 4) && <p key={i} style={{ fontSize: 10, marginBottom: 2, ...slideUp(26 + i * 4) }}>{a}</p>)}
                </div>
              </div>
            )}
            {show(36) && (
              <div style={{ fontSize: 11, color: T.ad, textAlign: "center", padding: 6, background: T.al, borderRadius: 8, ...popIn(36) }}>
                {"\uD83C\uDF7D\uFE0F"} Everyone meets at <b>Fellinis</b> for lunch — 12:30 PM
              </div>
            )}
          </div>
        </div>
      );

      // ─── Slide 5: Last day departure ───
      case 5: return (
        <div style={{ width: "100%", maxWidth: 320 }}>
          <div style={{ background: T.ad, borderRadius: "14px 14px 0 0", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>Chat with AI</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.15)", padding: "2px 8px", borderRadius: 8 }}>Day 5 · 7 Apr</span>
          </div>
          <div style={{ background: T.s, borderRadius: "0 0 14px 14px", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <ChatBubble delay={2} text={<span>{"\uD83C\uDFE0"} <b>Time to head home!</b> Keswick {"\u2192"} Manchester<br/><br/>When do you want to set off?</span>} />
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
                <span>{"\uD83D\uDDFA\uFE0F"} <b>Route planned!</b><br/>Keswick {"\u2192"} A66 {"\u2192"} M6<br/>{"\u2615"} Stop: Rheged Centre<br/>{"\uD83D\uDCCD"} Home by ~{demoInteracted.depart === "10:00 AM" ? "1:30 PM" : "5:00 PM"}</span>
              } />
            )}
          </div>
        </div>
      );

      // ─── Slide 6: Interactive poll ───
      case 6: {
        const pollVote = demoInteracted.poll;
        const opts = [
          { text: "The Drunken Duck", desc: "steaks \u00B7 kids free", base: 2 },
          { text: "The Unicorn", desc: "pub grills \u00B7 playground", base: 1 },
          { text: "Lake Road Kitchen", desc: "Nordic \u00B7 upscale", base: 1 },
        ];
        const totalVotes = 4 + (pollVote !== undefined ? 1 : 0);
        const getVotes = (i) => {
          let v = opts[i].base;
          if (pollVote === i) v++;
          return v;
        };
        return (
          <div style={{ width: "100%", maxWidth: 320 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 12, textAlign: "center", ...slideUp(0) }}>Group decision time</p>
            <div style={{ background: T.s, borderRadius: 14, padding: 16, textAlign: "left" }}>
              <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, ...slideUp(3) }}>{"\uD83D\uDDF3\uFE0F"} Where should we eat dinner?</p>
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

      // ─── Slide 7: Photos flying in ───
      case 7: {
        const demoPhotos = [
          { label: "Fell view", color: "#5A8C6E" }, { label: "Lake", color: "#5A7EA0" },
          { label: "Lunch", color: "#A08060" }, { label: "Ella playing", color: "#7EA060" },
          { label: "Boat trip", color: "#4A8BA0" }, { label: "Ice cream", color: "#A04A8B" },
          { label: "Pub dinner", color: "#8A7348" }, { label: "Sunset", color: "#C87040" },
        ];
        return (
          <div style={{ width: "100%", maxWidth: 320 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 12, textAlign: "center", ...slideUp(0) }}>Day 2 memories · Ambleside</p>
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

      // ─── Slide 8: AI highlights reel ───
      case 8: {
        const reelPhotos = ["#5A8C6E", "#5A7EA0", "#A08060", "#4A8BA0", "#C87040"];
        const activeReel = Math.min(reelPhotos.length - 1, Math.floor(t / 7));
        return (
          <div style={{ width: "100%", maxWidth: 320 }}>
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
                  {["Loughrigg Fell", "Windermere Lake", "Lunch at Fellinis", "Boat trip", "Sunset"][activeReel]}
                </div>
                <div style={{ position: "absolute", top: 8, right: 10, fontSize: 9, color: "rgba(255,255,255,.5)", background: "rgba(0,0,0,.3)", padding: "2px 6px", borderRadius: 4 }}>
                  Day {[2,2,2,3,4][activeReel]}
                </div>
              </div>
              <p style={{ fontFamily: T.fontD, fontSize: 16, marginBottom: 4, ...slideUp(2) }}>Easter Lake District 2026</p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,.5)", marginBottom: 10 }}>AI-curated highlights · 8 photos</p>
              <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                {["\uD83C\uDFB5 Music", "\uD83C\uDF99\uFE0F Narration", "\uD83D\uDCC5 Dates"].map((s, i) => (
                  <span key={s} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 8, background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.6)", ...popIn(4 + i * 3) }}>{s}</span>
                ))}
              </div>
            </div>
          </div>
        );
      }

      // ─── Slide 9: CTA ───
      case 9: return (
        <div style={{ textAlign: "center", maxWidth: 340 }}>
          <div style={{ fontSize: 56, marginBottom: 16, ...popIn(2) }}>{"\uD83C\uDF0D"}</div>
          <h2 style={{ fontFamily: T.fontD, fontSize: 26, color: "#fff", marginBottom: 8, ...slideUp(5) }}>Your adventure awaits</h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.6, marginBottom: 24, ...slideUp(8) }}>
            Trip With Me connects maps, weather, bookings, EV chargers, and AI — so you can focus on making memories.
          </p>
          {show(14) && (
            <button onClick={e => { e.stopPropagation(); setShowDemo(false); navigate("create"); setWizStep(0); resetWizard(); }}
              style={{ ...css.btn, ...css.btnP, width: "100%", padding: "14px 16px", justifyContent: "center", fontSize: 15, fontWeight: 500, marginBottom: 10, ...slideUp(14) }}>
              Create my first trip
            </button>
          )}
          {show(18) && (
            <p onClick={e => { e.stopPropagation(); setShowDemo(false); }}
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
    "This is their story...",
    "First, name the trip and pick destinations",
    "Then find the perfect places to stay",
    "Day 1 \u2014 the AI plans the whole drive",
    "Activity days \u2014 split plans for everyone",
    "Last day \u2014 route home with pit stops",
    "Big decisions? Let the group vote",
    "Every moment, captured and catalogued",
    "The AI turns your photos into a highlight reel",
    "",
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "linear-gradient(180deg, #0D2818 0%, #1A3C2A 50%, #0D2818 100%)", display: "flex", flexDirection: "column", fontFamily: T.font, overflow: "hidden" }}
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
      {/* Top bar: Skip + pause */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px 0", flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{s + 1} / {total}</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={e => { e.stopPropagation(); setDemoPaused(p => !p); }}
            style={{ background: "rgba(255,255,255,.1)", border: "none", color: "rgba(255,255,255,.7)", fontSize: 11, padding: "4px 12px", borderRadius: 12, cursor: "pointer", fontFamily: T.font }}>
            {demoPaused ? "\u25B6 Play" : "\u275A\u275A Pause"}
          </button>
          <button onClick={e => { e.stopPropagation(); setShowDemo(false); setDemoPaused(false); setDemoInteracted({}); }}
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
          <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", fontStyle: "italic" }}>{captions[s]}</p>
        </div>
      )}
    </div>
  );
}
