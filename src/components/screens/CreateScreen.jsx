import React, { useState } from "react";
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';
import { Tag } from '../common/Tag';
import { ControlledField } from '../common/ControlledField';
import { Avatar } from '../common/Avatar';
import { LOCATION_SUGGESTIONS, ACTIVITY_SUGGESTIONS, LOCATION_VIBES } from '../../constants/locations';
import { getLocationVibes, getRegion } from '../../utils/locationHelpers';
import { useNavigation } from '../../contexts/NavigationContext';
import { useTrip } from '../../contexts/TripContext';
import { useWizard } from '../../contexts/WizardContext';
import { EV_MODELS, calculateRealisticRange } from '../../utils/evPlanner';

export function CreateScreen() {
  const { navigate, showToast } = useNavigation();
  const { createTrip } = useTrip();
  const { wizStep, setWizStep, wizTrip, setWizTrip, wizShowErrors, setWizShowErrors, wizTravellers, setWizTravellers, wizStays, setWizStays, wizPrefs, setWizPrefs, placeInput, setPlaceInput, placeSuggestionsOpen, setPlaceSuggestionsOpen, staySearch, setStaySearch, staySearchOpen, setStaySearchOpen, stayPlacesResults, setStayPlacesResults, staySearching, handleStaySearchChange, foodSearch, setFoodSearch, adultActSearch, setAdultActSearch, olderActSearch, setOlderActSearch, youngerActSearch, setYoungerActSearch, expandedPrefSections, setExpandedPrefSections, placesFood, placesActivities, REGION_SUGGESTIONS, editingTripId, setEditingTripId } = useWizard();
  const [evProfile, setEvProfile] = useState(() => { try { return JSON.parse(localStorage.getItem("twm_ev_profile")); } catch { return null; } });
  const wizSteps = ["Destination", "Dates & Travel", "Travellers", "Stays", "Preferences", "Review"];

  // ─── Shared wizard styles ───
  const cardStyle = { background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.r, padding: 18, marginBottom: 14 };
  const sectionLabel = (text, required) => (
    <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: T.t2, marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>
      {text}{required && <span style={{ color: T.red, fontSize: 14 }}>*</span>}
    </label>
  );

  // ─── Wizard Step 0: Destination ───
  const renderWizDestination = () => {
    const addPlace = (p) => {
      const place = (p || placeInput).trim();
      if (!place) { setPlaceInput(""); setPlaceSuggestionsOpen(false); return; }
      if (wizTrip.places.some(existing => existing.toLowerCase() === place.toLowerCase())) {
        showToast("'" + place + "' already added", "error");
        setPlaceInput("");
        setPlaceSuggestionsOpen(false);
        return;
      }
      setWizTrip(prev => ({ ...prev, places: [...prev.places, place] }));
      setPlaceInput("");
      setPlaceSuggestionsOpen(false);
    };
    const removePlace = (place) => setWizTrip(prev => ({ ...prev, places: prev.places.filter(p => p !== place) }));
    const filteredPlaces = placeInput.trim().length > 0
      ? (() => {
          const q = placeInput.trim().toLowerCase();
          const available = LOCATION_SUGGESTIONS.filter(loc => loc.toLowerCase().includes(q) && !wizTrip.places.includes(loc));
          const startsWith = available.filter(loc => loc.toLowerCase().startsWith(q));
          const contains = available.filter(loc => !loc.toLowerCase().startsWith(q));
          return [...startsWith, ...contains].slice(0, 8);
        })()
      : [];
    const templates = [
      { icon: "🏖️", name: "Weekend Getaway", desc: "2–3 day short break", prefill: { budget: "Mid-range" } },
      { icon: "👨‍👩‍👧‍👦", name: "Family Holiday", desc: "Kid-friendly adventures", prefill: { budget: "Mid-range" }, addKids: true },
      { icon: "🎒", name: "Backpacking", desc: "Multi-stop on a budget", prefill: { budget: "Budget", travel: new Set(["Train"]) } },
      { icon: "💍", name: "Romantic Trip", desc: "Just the two of you", prefill: { budget: "Luxury" } },
      { icon: "🎉", name: "Lads/Girls Trip", desc: "Friends & fun", prefill: { budget: "Mid-range" } },
      { icon: "🚗", name: "Road Trip", desc: "Multi-stop drive", prefill: { budget: "Mid-range", travel: new Set(["Non-EV vehicle"]) } },
      { icon: "🏔️", name: "Active Adventure", desc: "Outdoor & sporty", prefill: { budget: "Mid-range" } },
      { icon: "🏛️", name: "Cultural Explorer", desc: "History & art", prefill: { budget: "Mid-range" } },
    ];
    const applyTemplate = (t) => {
      setWizTrip(prev => ({ ...prev, ...t.prefill, travel: t.prefill.travel || prev.travel, templateKey: t.name }));
      if (t.addKids) {
        setWizTravellers(prev => ({ ...prev, youngerKids: prev.youngerKids.length === 0 ? [{ name: "", age: 7 }] : prev.youngerKids }));
      } else {
        // Clear auto-added kids when switching away from Family Holiday
        setWizTravellers(prev => ({ ...prev, youngerKids: prev.youngerKids.filter(k => k.name) }));
      }
      if (t.name === "Romantic Trip") setWizTravellers(prev => prev.adults.length < 2 ? { ...prev, adults: [...prev.adults, { name: "", email: "" }] } : prev);
    };
    return (
      <>
        <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
          <span style={{ fontSize: 36 }}>✈️</span>
          <h3 style={{ fontFamily: T.fontD, fontSize: 22, fontWeight: 400, marginTop: 8 }}>Where are you going?</h3>
          <p style={{ fontSize: 14, color: T.t3, marginTop: 4 }}>Pick a template or start from scratch</p>
        </div>

        {/* Quick-start templates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {templates.map(t => {
            const isSelected = wizTrip.templateKey === t.name;
            return (
            <div key={t.name} onClick={() => applyTemplate(t)}
              style={{ padding: "14px 12px", borderRadius: T.r, border: isSelected ? `2px solid ${T.a}` : `.5px solid ${T.border}`, background: isSelected ? T.al : T.s, cursor: "pointer", transition: "all .15s", textAlign: "center" }}
              onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = T.a; e.currentTarget.style.background = T.al; } }}
              onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.s; } }}>
              <span style={{ fontSize: 28, display: "block", marginBottom: 6 }}>{t.icon}</span>
              <p style={{ fontSize: 13, fontWeight: 600, color: T.t1, fontFamily: T.font }}>{t.name}</p>
              <p style={{ fontSize: 11, color: T.t3, fontFamily: T.font }}>{t.desc}</p>
            </div>
          ); })}
        </div>

        <div style={cardStyle}>
          <ControlledField label="Trip name" value={wizTrip.name} onChange={v => setWizTrip(prev => ({ ...prev, name: v }))} placeholder="e.g. Easter Lake District" required error={wizShowErrors && !wizTrip.name.trim() ? "Give your trip a name" : undefined} inputStyle={{ fontSize: 15, padding: "12px 14px", minHeight: 44 }} />
        </div>

        <div style={cardStyle}>
          <ControlledField label="Starting from" value={wizTrip.startLocation} onChange={v => setWizTrip(prev => ({ ...prev, startLocation: v }))}
            placeholder="e.g. Manchester, M1 2AB" hint="Helps plan your Day 1 departure" inputStyle={{ fontSize: 15, padding: "12px 14px", minHeight: 44 }} />
        </div>

        <div style={{ ...cardStyle, position: "relative" }}>
          {sectionLabel("Destinations", true)}
          {wizTrip.places.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {wizTrip.places.map(p => (
                <span key={p} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px 8px 14px", borderRadius: 22, fontSize: 14, background: T.al, color: T.ad, fontWeight: 500, fontFamily: T.font }}>
                  {p} <span onClick={() => removePlace(p)} style={{ width: 20, height: 20, borderRadius: "50%", background: T.ad + "20", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 12, lineHeight: 1 }}>×</span>
                </span>
              ))}
            </div>
          )}
          <input value={placeInput}
            onChange={e => { setPlaceInput(e.target.value); setPlaceSuggestionsOpen(true); }}
            onKeyDown={e => { if (e.key === "Enter" || e.key === "Tab") { if (placeInput.trim()) { e.preventDefault(); addPlace(); } } }}
            onFocus={() => { if (placeInput.trim()) setPlaceSuggestionsOpen(true); }}
            onBlur={() => setTimeout(() => setPlaceSuggestionsOpen(false), 200)}
            style={{ width: "100%", padding: "12px 14px", border: `.5px solid ${wizShowErrors && !wizTrip.places.length ? T.red + "80" : T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 15, background: T.s2, outline: "none", minHeight: 44, transition: "border-color .2s" }}
            placeholder="Search destinations..." />
          {wizShowErrors && !wizTrip.places.length && <p style={{ fontSize: 12, color: T.red, marginTop: 6 }}>Add at least one destination</p>}
          {placeSuggestionsOpen && filteredPlaces.length > 0 && (
            <div style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 20, background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.rs, boxShadow: "0 4px 16px rgba(0,0,0,.1)", maxHeight: 220, overflowY: "auto", marginTop: 2 }}>
              {filteredPlaces.map(loc => (
                <div key={loc} onMouseDown={e => e.preventDefault()} onClick={() => addPlace(loc)}
                  style={{ padding: "12px 14px", fontSize: 14, cursor: "pointer", borderBottom: `.5px solid ${T.border}`, fontFamily: T.font, transition: "background .1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.s2}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  {loc}
                </div>
              ))}
            </div>
          )}
          {placeSuggestionsOpen && placeInput.trim().length > 0 && filteredPlaces.length === 0 && (
            <div style={{ position: "absolute", left: 0, right: 0, top: "100%", zIndex: 20, background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.rs, boxShadow: "0 4px 16px rgba(0,0,0,.1)", marginTop: 2 }}>
              <div onMouseDown={e => e.preventDefault()} onClick={() => addPlace()}
                style={{ padding: "12px 14px", fontSize: 14, cursor: "pointer", fontFamily: T.font, color: T.a }}
                onMouseEnter={e => e.currentTarget.style.background = T.s2}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                + Add "{placeInput.trim()}"
              </div>
            </div>
          )}
        </div>
      </>
    );
  };

  // ─── Wizard Step 1: Dates & Travel ───
  const renderWizDatesTravel = () => {
    const tripDays = wizTrip.start && wizTrip.end ? Math.max(1, Math.round((new Date(wizTrip.end + "T12:00:00") - new Date(wizTrip.start + "T12:00:00")) / 86400000) + 1) : null;
    return (
      <>
        {/* ── When ── */}
        <div style={cardStyle}>
          {sectionLabel("When are you going")}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 0 }}>
            <label htmlFor="wiz-start-date"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: `.5px solid ${wizTrip.start ? T.a : T.border}`, borderRadius: T.rs, background: wizTrip.start ? T.al : T.s2, cursor: "pointer", transition: "all .15s", minHeight: 52, position: "relative" }}>
              <span style={{ fontSize: 20 }}>🛫</span>
              <div style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 2 }}>START DATE</span>
                {wizTrip.start ? (
                  <span style={{ fontSize: 15, fontWeight: 500, color: T.t1, fontFamily: T.font }}>{new Date(wizTrip.start + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                ) : (
                  <span style={{ fontSize: 14, color: T.t3, fontFamily: T.font }}>Tap to pick a date</span>
                )}
              </div>
              <input id="wiz-start-date" type="date" value={wizTrip.start} onChange={e => setWizTrip(prev => ({ ...prev, start: e.target.value }))}
                style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", zIndex: 2, fontSize: 16 }} />
              <span style={{ fontSize: 14, color: T.t3, pointerEvents: "none" }}>📅</span>
            </label>
            <label htmlFor="wiz-end-date"
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", border: `.5px solid ${wizTrip.end ? T.a : T.border}`, borderRadius: T.rs, background: wizTrip.end ? T.al : T.s2, cursor: "pointer", transition: "all .15s", minHeight: 52, position: "relative" }}>
              <span style={{ fontSize: 20 }}>🛬</span>
              <div style={{ flex: 1 }}>
                <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 2 }}>END DATE</span>
                {wizTrip.end ? (
                  <span style={{ fontSize: 15, fontWeight: 500, color: T.t1, fontFamily: T.font }}>{new Date(wizTrip.end + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                ) : (
                  <span style={{ fontSize: 14, color: T.t3, fontFamily: T.font }}>Tap to pick a date</span>
                )}
              </div>
              <input id="wiz-end-date" type="date" value={wizTrip.end} onChange={e => setWizTrip(prev => ({ ...prev, end: e.target.value }))}
                min={wizTrip.start || undefined}
                style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", zIndex: 2, fontSize: 16 }} />
              <span style={{ fontSize: 14, color: T.t3, pointerEvents: "none" }}>📅</span>
            </label>
          </div>
          {tripDays && <p style={{ fontSize: 13, color: T.ad, fontWeight: 500, marginTop: 10 }}>{tripDays} day{tripDays > 1 ? "s" : ""}</p>}
          <p style={{ fontSize: 12, color: T.t3, marginTop: 6 }}>Optional — you can add dates later</p>
        </div>

        {/* ── How ── */}
        <div style={cardStyle}>
          {sectionLabel("How are you getting there")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[["Flight", "✈️"], ["EV vehicle", "⚡"], ["Non-EV vehicle", "🚗"], ["Train", "🚆"], ["Walking", "🚶"], ["Bicycle", "🚲"]].map(([o, icon]) => {
              const active = wizTrip.travel.has(o);
              return (
                <div key={o} onClick={() => setWizTrip(prev => { const s = new Set(prev.travel); s.has(o) ? s.delete(o) : s.add(o); return { ...prev, travel: s }; })}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px", borderRadius: T.rs, border: `.5px solid ${active ? T.a : T.border}`, background: active ? T.al : T.s2, cursor: "pointer", transition: "all .15s" }}>
                  <span style={{ fontSize: 24 }}>{icon}</span>
                  <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? T.ad : T.t2, fontFamily: T.font }}>{o}</span>
                </div>
              );
            })}
          </div>
          {wizTrip.travel.has("EV vehicle") && (
            <div style={{ marginTop: 12, padding: "12px 16px", borderRadius: 12, background: T.greenL, border: `.5px solid ${T.border}` }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: T.ad, marginBottom: 8 }}>⚡ EV Vehicle Profile</p>
              <select
                value={evProfile?.id || ""}
                onChange={e => {
                  const selected = EV_MODELS.find(m => m.id === e.target.value);
                  if (selected) {
                    setEvProfile(selected);
                    localStorage.setItem("twm_ev_profile", JSON.stringify(selected));
                  }
                }}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `.5px solid ${T.border}`, fontSize: 13, fontFamily: T.font, background: T.s }}>
                <option value="">Select your vehicle...</option>
                {EV_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.make} {m.model} ({m.rangeMiles} mi range)</option>
                ))}
              </select>
              {evProfile && (
                <p style={{ fontSize: 11, color: T.t2, marginTop: 6 }}>
                  {evProfile.make} {evProfile.model} · {calculateRealisticRange(evProfile).realisticRange} mi realistic range · {evProfile.connectors?.join(", ")}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Budget ── */}
        <div style={cardStyle}>
          {sectionLabel("Budget")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["Budget", "💰", "Keep it lean"], ["Mid-range", "💳", "Balanced spend"], ["Luxury", "💎", "Treat yourself"], ["No limit", "✨", "Sky's the limit"]].map(([o, icon, desc]) => {
              const active = wizTrip.budget === o;
              return (
                <div key={o} onClick={() => setWizTrip(prev => ({ ...prev, budget: prev.budget === o ? "" : o }))}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: T.rs, border: `.5px solid ${active ? T.a : T.border}`, background: active ? T.al : T.s2, cursor: "pointer", transition: "all .15s" }}>
                  <span style={{ fontSize: 22 }}>{icon}</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: active ? 600 : 400, color: active ? T.ad : T.t, fontFamily: T.font }}>{o}</p>
                    <p style={{ fontSize: 11, color: T.t3, fontFamily: T.font }}>{desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Optional brief ── */}
        {wizTrip.brief || wizTrip._showBrief ? (
          <div style={cardStyle}>
            <ControlledField label="Trip brief" type="textarea" value={wizTrip.brief} onChange={v => setWizTrip(prev => ({ ...prev, brief: v }))} placeholder="e.g. Family trip with 2 kids (ages 5 & 9). We love outdoor adventures, local food markets, and easy hikes. Prefer late morning starts — not early risers! Dog-friendly stops a bonus." hint="Helps the AI personalise your itinerary" inputStyle={{ fontSize: 15, padding: "12px 14px" }} />
          </div>
        ) : (
          <button onClick={() => setWizTrip(prev => ({ ...prev, _showBrief: true }))}
            style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "14px 18px", background: T.s2, border: `.5px dashed ${T.border}`, borderRadius: T.r, cursor: "pointer", fontFamily: T.font, fontSize: 14, color: T.t2, marginBottom: 14, transition: "background .15s" }}
            onMouseEnter={e => e.currentTarget.style.background = T.s3}
            onMouseLeave={e => e.currentTarget.style.background = T.s2}>
            + Add a trip description <span style={{ fontSize: 12, color: T.t3, marginLeft: "auto" }}>Optional</span>
          </button>
        )}
      </>
    );
  };

  // ─── Wizard Step: Travellers ───
  const renderWizTravellers = () => {
    const addAdult = () => {
      setWizTravellers(prev => ({ ...prev, adults: [...prev.adults, { name: "", email: "", isLead: false }] }));
    };
    const updateAdult = (idx, field, val) => {
      setWizTravellers(prev => ({ ...prev, adults: prev.adults.map((a, i) => i === idx ? { ...a, [field]: val } : a) }));
    };
    const removeAdult = (idx) => {
      setWizTravellers(prev => ({ ...prev, adults: prev.adults.filter((_, i) => i !== idx) }));
    };
    const addChild = (group) => {
      setWizTravellers(prev => ({ ...prev, [group]: [...prev[group], { name: "", age: group === "olderKids" ? 15 : group === "infants" ? 0 : 7 }] }));
    };
    const updateChild = (group, idx, field, val) => {
      setWizTravellers(prev => ({ ...prev, [group]: prev[group].map((c, i) => i === idx ? { ...c, [field]: val } : c) }));
    };
    const removeChild = (group, idx) => {
      setWizTravellers(prev => ({ ...prev, [group]: prev[group].filter((_, i) => i !== idx) }));
    };
    const getInitials = (name) => {
      if (!name) return "?";
      const parts = name.trim().split(/\s+/);
      return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
    };
    const adultColors = [T.a, T.coral, T.blue, T.amber, T.purple, T.pink];
    return (
      <>
        <div style={{ background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.r, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.blueL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧑</div>
              <div><h4 style={{ fontSize: 14, fontWeight: 500 }}>Adults</h4><p style={{ fontSize: 12, color: T.t2 }}>Ages 18+</p></div>
            </div>
            <button style={{ ...css.btn, ...css.btnSm }} onClick={addAdult}>+ Add</button>
          </div>
          <div style={{ padding: "0 14px 10px", borderTop: `.5px solid ${T.border}` }}>
            {wizTravellers.adults.map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < wizTravellers.adults.length - 1 ? `.5px solid ${T.border}` : "none" }}>
                <Avatar bg={adultColors[i % adultColors.length]} label={getInitials(a.name)} size={32} />
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                    <input value={a.name} onChange={e => updateAdult(i, "name", e.target.value)} placeholder={a.isLead ? "Your name" : "Name"}
                      style={{ flex: 1, padding: "6px 10px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 13, background: T.s2, outline: "none" }} />
                    {a.isLead && <span style={{ ...css.tag(T.al, T.ad), fontSize: 9, padding: "2px 6px", whiteSpace: "nowrap" }}>Lead</span>}
                </div>
                {!a.isLead && <span onClick={() => removeAdult(i)} style={{ cursor: "pointer", color: T.red, fontSize: 16, flexShrink: 0 }}>×</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.r, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.pinkL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧒</div>
              <div><h4 style={{ fontSize: 14, fontWeight: 500 }}>Teenagers</h4><p style={{ fontSize: 12, color: T.t2 }}>Ages 12–17</p></div>
            </div>
            <button style={{ ...css.btn, ...css.btnSm }} onClick={() => addChild("olderKids")}>+ Add</button>
          </div>
          {wizTravellers.olderKids.length > 0 && (
            <div style={{ padding: "0 14px 10px", borderTop: `.5px solid ${T.border}` }}>
              {wizTravellers.olderKids.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                  <Avatar bg={T.pink} label={c.name ? c.name[0].toUpperCase() : "?"} size={28} />
                  <input value={c.name} onChange={e => updateChild("olderKids", i, "name", e.target.value)} placeholder="Name"
                    style={{ flex: 1, padding: "6px 10px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 13, background: T.s2, outline: "none" }} />
                  <select value={c.age} onChange={e => updateChild("olderKids", i, "age", +e.target.value)}
                    style={{ padding: "6px 8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 12, background: T.s, outline: "none", width: 56 }}>
                    {[12,13,14,15,16,17].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <span onClick={() => removeChild("olderKids", i)} style={{ cursor: "pointer", color: T.red, fontSize: 16 }}>×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.r, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.coralL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧒</div>
              <div><h4 style={{ fontSize: 14, fontWeight: 500 }}>Children</h4><p style={{ fontSize: 12, color: T.t2 }}>Ages 2–11</p></div>
            </div>
            <button style={{ ...css.btn, ...css.btnSm }} onClick={() => addChild("youngerKids")}>+ Add</button>
          </div>
          {wizTravellers.youngerKids.length > 0 && (
            <div style={{ padding: "0 14px 10px", borderTop: `.5px solid ${T.border}` }}>
              {wizTravellers.youngerKids.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                  <Avatar bg={T.coral} label={c.name ? c.name[0].toUpperCase() : "?"} size={28} />
                  <input value={c.name} onChange={e => updateChild("youngerKids", i, "name", e.target.value)} placeholder="Name"
                    style={{ flex: 1, padding: "6px 10px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 13, background: T.s2, outline: "none" }} />
                  <select value={c.age} onChange={e => updateChild("youngerKids", i, "age", +e.target.value)}
                    style={{ padding: "6px 8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 12, background: T.s, outline: "none", width: 56 }}>
                    {[2,3,4,5,6,7,8,9,10,11].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <span onClick={() => removeChild("youngerKids", i)} style={{ cursor: "pointer", color: T.red, fontSize: 16 }}>×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.r, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: T.amberL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👶</div>
              <div><h4 style={{ fontSize: 14, fontWeight: 500 }}>Infants</h4><p style={{ fontSize: 12, color: T.t2 }}>Ages 0–1</p></div>
            </div>
            <button style={{ ...css.btn, ...css.btnSm }} onClick={() => addChild("infants")}>+ Add</button>
          </div>
          {wizTravellers.infants.length > 0 && (
            <div style={{ padding: "0 14px 10px", borderTop: `.5px solid ${T.border}` }}>
              {wizTravellers.infants.map((c, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
                  <Avatar bg={T.amber} label={c.name ? c.name[0].toUpperCase() : "?"} size={28} />
                  <input value={c.name} onChange={e => updateChild("infants", i, "name", e.target.value)} placeholder="Name"
                    style={{ flex: 1, padding: "6px 10px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 13, background: T.s2, outline: "none" }} />
                  <select value={c.age} onChange={e => updateChild("infants", i, "age", +e.target.value)}
                    style={{ padding: "6px 8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 12, background: T.s, outline: "none", width: 56 }}>
                    {[0,1].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <span onClick={() => removeChild("infants", i)} style={{ cursor: "pointer", color: T.red, fontSize: 16 }}>×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "10px 14px", background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.r, alignItems: "center" }}>
          {wizTravellers.adults.map((a, i) => (
            <Avatar key={`a-${i}`} bg={adultColors[i % adultColors.length]} label={getInitials(a.name)} size={28} style={{ border: `2px solid ${T.s}` }} />
          ))}
          {wizTravellers.olderKids.map((c, i) => (
            <Avatar key={`ok-${i}`} bg={T.pink} label={c.name ? c.name[0].toUpperCase() : "?"} size={28} style={{ border: `2px solid ${T.s}` }} />
          ))}
          {wizTravellers.youngerKids.map((c, i) => (
            <Avatar key={`yk-${i}`} bg={T.coral} label={c.name ? c.name[0].toUpperCase() : "?"} size={28} style={{ border: `2px solid ${T.s}` }} />
          ))}
          {wizTravellers.infants.map((c, i) => (
            <Avatar key={`inf-${i}`} bg={T.amber} label={c.name ? c.name[0].toUpperCase() : "?"} size={28} style={{ border: `2px solid ${T.s}` }} />
          ))}
          <span style={{ fontSize: 12, color: T.t3, marginLeft: 4 }}>
            {wizTravellers.adults.length} adult{wizTravellers.adults.length !== 1 ? "s" : ""}
            {wizTravellers.olderKids.length > 0 ? ` · ${wizTravellers.olderKids.length} teen${wizTravellers.olderKids.length > 1 ? "s" : ""}` : ""}
            {wizTravellers.youngerKids.length > 0 ? ` · ${wizTravellers.youngerKids.length} child${wizTravellers.youngerKids.length > 1 ? "ren" : ""}` : ""}
            {wizTravellers.infants.length > 0 ? ` · ${wizTravellers.infants.length} infant${wizTravellers.infants.length > 1 ? "s" : ""}` : ""}
          </span>
        </div>

        {/* Contextual nudges based on group composition */}
        {wizTravellers.adults.length >= 2 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: `${T.a}08`, border: `.5px solid ${T.a}20`, borderRadius: T.r, marginTop: 10 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>💷</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 500, color: T.t1 }}>Split expenses easily</p>
              <p style={{ fontSize: 11, color: T.t3, lineHeight: 1.4 }}>Track who paid what and settle up automatically — available once your trip is live</p>
            </div>
          </div>
        )}
        {(wizTravellers.youngerKids.length > 0 || wizTravellers.infants.length > 0) && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: `${T.pink}08`, border: `.5px solid ${T.pink}20`, borderRadius: T.r, marginTop: 10 }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>🎯</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 500, color: T.t1 }}>Kid-friendly activities included</p>
              <p style={{ fontSize: 11, color: T.t3, lineHeight: 1.4 }}>Your itinerary will feature age-appropriate activities alongside adult plans</p>
            </div>
          </div>
        )}
      </>
    );
  };

  // ─── Wizard Step: Stays ───
  const renderWizStays = () => {
    const locationName = wizTrip.places.length > 0 ? wizTrip.places.join(", ") : "";

    const addStay = (accom) => {
      const lastStay = wizStays.length > 0 ? wizStays[wizStays.length - 1] : null;
      const defaultCheckIn = (lastStay?.checkOut) || wizTrip.start || "";
      let defaultCheckOut = wizTrip.end || "";
      if (!defaultCheckOut && defaultCheckIn) {
        try {
          const d = new Date(defaultCheckIn + "T12:00:00");
          d.setDate(d.getDate() + 1);
          defaultCheckOut = d.toISOString().split("T")[0];
        } catch { defaultCheckOut = ""; }
      }
      setWizStays(prev => [...prev, { ...accom, checkIn: defaultCheckIn, checkOut: defaultCheckOut, bookingRef: "", cost: "", confirmationLink: "" }]);
      setStaySearch("");
      setStaySearchOpen(false);
      setStayPlacesResults([]);
    };

    const removeStay = (idx) => setWizStays(prev => prev.filter((_, i) => i !== idx));

    const updateStayField = (idx, field, val) => {
      setWizStays(prev => prev.map((s, i) => i === idx ? { ...s, [field]: val } : s));
    };

    return (
      <>
        {/* Added stays */}
        {wizStays.map((s, i) => (
          <div key={i} style={css.card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</h4>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {s.rating && <span style={{ fontSize: 11, color: T.amber }}>{"★"} {s.rating}</span>}
                  {s.address && <span style={{ fontSize: 10, color: T.t3 }}>· {s.address.length > 40 ? s.address.slice(0, 40) + "..." : s.address}</span>}
                  {!s.address && s.location && <span style={{ fontSize: 10, color: T.t3 }}>· {s.location}</span>}
                </div>
              </div>
              <button style={{ ...css.btn, ...css.btnSm, fontSize: 11, color: T.red }} onClick={() => removeStay(i)}>Remove</button>
            </div>
            {/* Dates */}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 10, color: T.t3, marginBottom: 3 }}>Check-in</label>
                <input type="date" value={s.checkIn} min={wizTrip.start || undefined} max={wizTrip.end || undefined}
                  onChange={e => updateStayField(i, "checkIn", e.target.value)}
                  onClick={e => e.target.showPicker?.()}
                  style={{ width: "100%", padding: "8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none", cursor: "pointer", minHeight: 40, colorScheme: "light" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 10, color: T.t3, marginBottom: 3 }}>Check-out</label>
                <input type="date" value={s.checkOut} min={s.checkIn || wizTrip.start || undefined} max={wizTrip.end || undefined}
                  onChange={e => updateStayField(i, "checkOut", e.target.value)}
                  onClick={e => e.target.showPicker?.()}
                  style={{ width: "100%", padding: "8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none", cursor: "pointer", minHeight: 40, colorScheme: "light" }} />
              </div>
            </div>
            {/* Extra fields */}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 10, color: T.t3, marginBottom: 3 }}>Total cost (£)</label>
                <input type="text" inputMode="decimal" value={s.cost || ""} placeholder="0.00"
                  onChange={e => updateStayField(i, "cost", e.target.value.replace(/[^0-9.]/g, ''))}
                  style={{ width: "100%", padding: "8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none", minHeight: 40 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 10, color: T.t3, marginBottom: 3 }}>Booking ref</label>
                <input type="text" value={s.bookingRef || ""} placeholder="e.g. BK-123456"
                  onChange={e => updateStayField(i, "bookingRef", e.target.value)}
                  style={{ width: "100%", padding: "8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none", minHeight: 40 }} />
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 10, color: T.t3, marginBottom: 3 }}>Confirmation link (optional)</label>
              <input type="url" value={s.confirmationLink || ""} placeholder="https://booking.com/..."
                onChange={e => updateStayField(i, "confirmationLink", e.target.value)}
                style={{ width: "100%", padding: "8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none", minHeight: 40 }} />
            </div>
            {s.type && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Tag bg={T.purpleL} color={T.purple}>{s.type}</Tag>
                {s.cost && parseFloat(s.cost) > 0 && <Tag bg={T.al} color={T.ad}>{"£"}{parseFloat(s.cost).toFixed(2)}</Tag>}
                {s.bookingRef && <Tag bg={T.blueL} color={T.blue}>Ref: {s.bookingRef}</Tag>}
              </div>
            )}
          </div>
        ))}

        {/* Search / Add section */}
        {staySearchOpen ? (
          <div style={{ ...css.card, padding: 12 }}>
            <input value={staySearch} onChange={e => handleStaySearchChange(e.target.value)} autoFocus
              style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s2, outline: "none", marginBottom: 8 }}
              placeholder={locationName ? `Search hotels near ${locationName}...` : "Search hotels, B&Bs, cottages..."} />

            {staySearching && (
              <p style={{ fontSize: 12, color: T.t3, textAlign: "center", padding: 8 }}>Searching...</p>
            )}

            {/* Places API results */}
            {stayPlacesResults.map((place, i) => (
              <div key={i} onClick={() => addStay({
                name: place.name,
                type: "Hotel",
                tags: [place.rating ? `★ ${place.rating}` : null, place.priceLevel ? "£".repeat(place.priceLevel) : null].filter(Boolean),
                rating: place.rating || null,
                price: place.priceLevel ? "£".repeat(place.priceLevel) : null,
                address: place.address || "",
                location: place.address ? place.address.split(",").slice(-2).join(",").trim() : "",
                placeId: place.placeId,
              })} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", cursor: "pointer", borderRadius: T.rs, border: `.5px solid ${T.border}`, marginBottom: 6, background: T.s, transition: "background .15s" }}>
                {place.photo ? (
                  <img src={place.photo} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: T.purpleL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🏨</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{place.name}</p>
                  <p style={{ fontSize: 11, color: T.t3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {place.rating && `★ ${place.rating}`}{place.address && ` · ${place.address.length > 35 ? place.address.slice(0, 35) + "..." : place.address}`}
                  </p>
                </div>
                <span style={{ fontSize: 11, color: T.a, fontWeight: 500, flexShrink: 0 }}>+ Add</span>
              </div>
            ))}

            {/* Custom add option */}
            {staySearch.trim().length >= 2 && (
              <div onClick={() => addStay({ name: staySearch.trim(), type: "Custom", tags: [], rating: null, price: null, address: "", location: "" })}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 8px", cursor: "pointer", borderRadius: T.rs, border: `1.5px dashed ${T.a}`, marginBottom: 8, background: T.al, transition: "background .15s" }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: T.a, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, color: "#fff" }}>+</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>Add "{staySearch.trim()}" manually</p>
                  <p style={{ fontSize: 11, color: T.t3 }}>Enter your own booking details</p>
                </div>
              </div>
            )}

            {/* External search links */}
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <button onClick={() => {
                const q = staySearch.trim() || (locationName ? `hotels near ${locationName}` : "hotels");
                let url = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(q)}`;
                if (wizTrip.start) url += `&checkin=${wizTrip.start}`;
                if (wizTrip.end) url += `&checkout=${wizTrip.end}`;
                const numAdults = wizTravellers.adults?.length || 1;
                const numChildren = (wizTravellers.olderKids?.length || 0) + (wizTravellers.youngerKids?.length || 0) + (wizTravellers.infants?.length || 0);
                url += `&group_adults=${numAdults}`;
                if (numChildren > 0) url += `&group_children=${numChildren}`;
                window.open(url, "_blank");
              }} style={{ ...css.btn, ...css.btnP, ...css.btnSm, flex: 1, justifyContent: "center", fontSize: 11 }}>
                Search Booking.com
              </button>
              <button onClick={() => {
                const q = staySearch.trim() || (locationName ? `accommodation near ${locationName}` : "accommodation");
                let url = `https://www.google.com/travel/hotels?q=${encodeURIComponent(q)}`;
                if (wizTrip.start) url += `&checkin=${wizTrip.start}`;
                if (wizTrip.end) url += `&checkout=${wizTrip.end}`;
                window.open(url, "_blank");
              }} style={{ ...css.btn, ...css.btnSm, flex: 1, justifyContent: "center", fontSize: 11 }}>
                Google Hotels
              </button>
            </div>
            <button onClick={() => { setStaySearchOpen(false); setStaySearch(""); setStayPlacesResults([]); }}
              style={{ ...css.btn, ...css.btnSm, width: "100%", justifyContent: "center", marginTop: 6, fontSize: 11 }}>Cancel</button>
          </div>
        ) : (
          <div>
            <button onClick={() => setStaySearchOpen(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, border: `1.5px dashed ${T.border}`, borderRadius: T.r, color: T.t3, fontSize: 13, cursor: "pointer", background: "none", width: "100%", fontFamily: T.font }}>+ Add accommodation</button>
            {wizStays.length === 0 && (
              <p style={{ textAlign: "center", padding: "8px 10px", color: T.t3, fontSize: 12, marginTop: 4 }}>
                Search for real hotels or add your own booking details.
                {locationName && ` We'll search near ${locationName}.`}
              </p>
            )}
          </div>
        )}

        {!wizTrip.start && !wizTrip.end && wizStays.length > 0 && (
          <div style={{ marginTop: 8, padding: "8px 12px", background: T.amberL, borderRadius: T.rs, fontSize: 12, color: T.amber }}>
            Set trip dates in "Dates & Travel" to constrain accommodation dates.
          </div>
        )}
      </>
    );
  };

  // ─── Wizard Step: Preferences ───
  const renderWizPrefs = () => {
    const region = wizTrip.places.length > 0 ? getRegion(wizTrip.places) : null;
    const regionSugg = region && REGION_SUGGESTIONS[region] ? REGION_SUGGESTIONS[region] : null;
    const regionLabel = region ? region.charAt(0).toUpperCase() + region.slice(1) : "";
    const locationName = wizTrip.places.length > 0 ? wizTrip.places[0] : "";
    const vibes = wizTrip.places.length > 0 ? getLocationVibes(wizTrip.places) : [];

    // Build food options: Places API real restaurants -> vibe suggestions -> region suggestions -> dietary defaults
    const dietaryDefaults = ["Vegetarian", "Non-veg", "Local cuisine", "Kid-friendly menus", "Vegan", "Halal", "Gluten-free", "Pescatarian", "Dairy-free", "Nut-free", "Organic", "Street food"];
    const regionFoodOpts = regionSugg ? regionSugg.food : [];
    const vibeFoodOpts = vibes.flatMap(v => LOCATION_VIBES[v]?.food || []);
    const allFoodOpts = [...new Set([...placesFood, ...vibeFoodOpts, ...regionFoodOpts, ...dietaryDefaults])];

    // Build activity options: Places API real activities -> vibe suggestions -> region suggestions -> generic defaults
    const regionActOpts = regionSugg ? regionSugg.activities : [];
    const vibeActOpts = vibes.flatMap(v => LOCATION_VIBES[v]?.activities || []);
    const genericActs = ACTIVITY_SUGGESTIONS.default.adults;
    const allAdultActs = [...new Set([...placesActivities, ...vibeActOpts, ...regionActOpts, ...genericActs])];

    // Build location-aware kids activity options
    const vibeOlderKids = vibes.flatMap(v => LOCATION_VIBES[v]?.olderKids || []);
    const regionOlderKids = regionSugg?.olderKids || [];
    const allOlderKids = [...new Set([...vibeOlderKids, ...regionOlderKids, ...ACTIVITY_SUGGESTIONS.default.olderKids])];

    const vibeYoungerKids = vibes.flatMap(v => LOCATION_VIBES[v]?.youngerKids || []);
    const regionYoungerKids = regionSugg?.youngerKids || [];
    const allYoungerKids = [...new Set([...vibeYoungerKids, ...regionYoungerKids, ...ACTIVITY_SUGGESTIONS.default.youngerKids])];

    const suggestions = { ...ACTIVITY_SUGGESTIONS.default, adults: allAdultActs, olderKids: allOlderKids, youngerKids: allYoungerKids };

    const togglePref = (key, item) => {
      setWizPrefs(prev => { const s = new Set(prev[key]); s.has(item) ? s.delete(item) : s.add(item); return { ...prev, [key]: s }; });
    };

    const addCustomPref = (key, val, clearFn) => {
      if (val.trim()) { setWizPrefs(prev => { const s = new Set(prev[key]); s.add(val.trim()); return { ...prev, [key]: s }; }); clearFn(""); }
    };

    const filterOpts = (opts, search, selected) => {
      const all = [...new Set([...opts, ...selected])];
      return search.trim() ? all.filter(o => o.toLowerCase().includes(search.toLowerCase())) : all;
    };

    const INITIAL_VISIBLE = 8;
    const renderPrefSection = (label, key, allOpts, searchVal, setSearchVal, placeholder, hasPlacesData) => {
      const isExpanded = expandedPrefSections.has(key) || searchVal.trim().length > 0;
      const filtered = filterOpts(allOpts, searchVal, wizPrefs[key]);
      // Always show selected items first, then fill remaining slots
      const selected = filtered.filter(o => wizPrefs[key].has(o));
      const unselected = filtered.filter(o => !wizPrefs[key].has(o));
      const visible = isExpanded ? filtered : [...selected, ...unselected.slice(0, Math.max(0, INITIAL_VISIBLE - selected.length))];
      const hiddenCount = filtered.length - visible.length;

      return (
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: T.t2, marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>{label}</label>
          <input value={searchVal} onChange={e => setSearchVal(e.target.value)}
            onKeyDown={e => { if ((e.key === "Enter" || e.key === "Tab") && searchVal.trim()) { e.preventDefault(); addCustomPref(key, searchVal, setSearchVal); } }}
            style={{ width: "100%", padding: "10px 14px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 14, background: T.s2, outline: "none", marginBottom: 8, minHeight: 44 }}
            placeholder={placeholder} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {visible.map(o => (
              <span key={o} onClick={() => togglePref(key, o)} style={{ ...css.chip, ...(wizPrefs[key].has(o) ? css.chipActive : {}) }}>
                {o}
              </span>
            ))}
            {searchVal.trim() && !allOpts.includes(searchVal.trim()) && !wizPrefs[key].has(searchVal.trim()) && (
              <span onClick={() => addCustomPref(key, searchVal, setSearchVal)} style={{ ...css.chip, borderStyle: "dashed", color: T.a }}>+ Add "{searchVal.trim()}"</span>
            )}
          </div>
          {hiddenCount > 0 && (
            <button onClick={() => setExpandedPrefSections(prev => { const s = new Set(prev); s.add(key); return s; })}
              style={{ background: "none", border: "none", color: T.a, fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: T.font, padding: "6px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
              Show {hiddenCount} more options ▾
            </button>
          )}
          {isExpanded && filtered.length > INITIAL_VISIBLE && (
            <button onClick={() => setExpandedPrefSections(prev => { const s = new Set(prev); s.delete(key); return s; })}
              style={{ background: "none", border: "none", color: T.t3, fontSize: 11, cursor: "pointer", fontFamily: T.font, padding: "4px 0 0" }}>
              Show less ▴
            </button>
          )}
        </div>
      );
    };

    return (
      <>
        {locationName && <p style={{ fontSize: 11, color: T.t3, marginBottom: 8 }}>Suggestions based on <span style={{ fontWeight: 600, color: T.t }}>{locationName}</span>{vibes.length > 0 ? ` · ${vibes.join(", ")}` : ""}</p>}
        {renderPrefSection("Food preferences", "food", allFoodOpts, foodSearch, setFoodSearch, "Search or type a food preference...", placesFood.length > 0)}
        {renderPrefSection("Activities — Adults", "adultActs", suggestions.adults, adultActSearch, setAdultActSearch, "Search or add an activity...", placesActivities.length > 0)}
        {wizTravellers.olderKids.length > 0 && renderPrefSection("Activities — Teenagers 12-17", "olderActs", suggestions.olderKids, olderActSearch, setOlderActSearch, "Search or add a teen activity...", false)}
        {wizTravellers.youngerKids.length > 0 && renderPrefSection("Activities — Children 2-11", "youngerActs", suggestions.youngerKids, youngerActSearch, setYoungerActSearch, "Search or add a kids activity...", false)}
      </>
    );
  };

  // ─── Wizard Step: Review ───
  const renderWizReview = () => {
    // Build auto-summary from all wizard data
    const parts = [];
    const fmtDateShort = (d) => { try { return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return d; } };
    // Smart numDays: prefer stay date span if available (protects against user date entry errors)
    let numDays = null;
    let effectiveStart = wizTrip.start;
    let effectiveEnd = wizTrip.end;
    if (wizStays.length > 0 && !wizTrip.start && !wizTrip.end) {
      const checkIns = wizStays.map(s => s.checkIn).filter(Boolean).sort();
      const checkOuts = wizStays.map(s => s.checkOut).filter(Boolean).sort();
      if (checkIns.length > 0 && checkOuts.length > 0) {
        effectiveStart = checkIns[0];
        effectiveEnd = checkOuts[checkOuts.length - 1];
        numDays = Math.max(1, Math.round((new Date(effectiveEnd + "T12:00:00") - new Date(effectiveStart + "T12:00:00")) / 86400000) + 1);
      }
    }
    if (!numDays && wizTrip.start && wizTrip.end) {
      numDays = Math.max(1, Math.round((new Date(wizTrip.end + "T12:00:00") - new Date(wizTrip.start + "T12:00:00")) / 86400000) + 1);
    }
    if (numDays && wizTrip.places.length > 0) {
      const dateRange = effectiveStart && effectiveEnd ? ` (${fmtDateShort(effectiveStart)} – ${fmtDateShort(effectiveEnd)})` : "";
      parts.push(`${numDays}-day trip to ${wizTrip.places.join(", ")}${dateRange}`);
    }
    if (wizTrip.travel.size > 0) parts.push(`travelling by ${[...wizTrip.travel].join(" + ").toLowerCase()}`);
    if (wizTrip.startLocation) parts.push(`starting from ${wizTrip.startLocation}`);
    const na = wizTravellers.adults.length, nok = wizTravellers.olderKids.length, nyk = wizTravellers.youngerKids.length;
    const groupParts = [];
    if (na > 0) groupParts.push(`${na} adult${na > 1 ? "s" : ""}`);
    if (nok > 0) groupParts.push(`${nok} teen${nok > 1 ? "s" : ""} (${wizTravellers.olderKids.map(k => `${k.name || "teen"}, ${k.age}`).join("; ")})`);
    if (nyk > 0) groupParts.push(`${nyk} child${nyk > 1 ? "ren" : ""} (${wizTravellers.youngerKids.map(k => `${k.name || "child"}, ${k.age}`).join("; ")})`);
    const ninf = wizTravellers.infants.length;
    if (ninf > 0) groupParts.push(`${ninf} infant${ninf > 1 ? "s" : ""} (${wizTravellers.infants.map(k => `${k.name || "baby"}, ${k.age}`).join("; ")})`);
    if (groupParts.length) parts.push(`group: ${groupParts.join(", ")}`);
    if (wizTrip.budget) parts.push(`${wizTrip.budget.toLowerCase()} budget`);
    if (wizPrefs.food.size > 0) parts.push(`food: ${[...wizPrefs.food].join(", ")}`);
    if (wizPrefs.adultActs.size > 0) parts.push(`adult activities: ${[...wizPrefs.adultActs].join(", ")}`);
    if (wizPrefs.olderActs.size > 0) parts.push(`teen activities: ${[...wizPrefs.olderActs].join(", ")}`);
    if (wizPrefs.youngerActs.size > 0) parts.push(`children activities: ${[...wizPrefs.youngerActs].join(", ")}`);
    if (wizStays.length > 0) parts.push(`staying at ${wizStays.map(s => `${s.name}${s.location ? ` (${s.location})` : ""}`).join(", ")}`);
    if (ninf > 0) parts.push("infant in group — plan for nap breaks, pram-friendly routes, baby-changing facilities");
    if (nok + nyk > 0) {
      const ages = [...wizTravellers.olderKids, ...wizTravellers.youngerKids, ...wizTravellers.infants].map(k => parseInt(k.age) || 0);
      const youngest = Math.min(...ages);
      if (youngest <= 5) parts.push("plan for short activity blocks — young children in group");
      else if (youngest <= 10) parts.push("mix family-friendly activities with some adult time");
    }
    const autoSummary = parts.length > 0 ? parts.join(". ") + "." : "";

    // Auto-fill on first visit to this step
    if (autoSummary && !wizPrefs.instructions) {
      setTimeout(() => setWizPrefs(prev => prev.instructions ? prev : { ...prev, instructions: autoSummary }), 0);
    }

    return (
      <>
        <p style={{ fontSize: 13, color: T.t2, lineHeight: 1.6, marginBottom: 16 }}>
          This summary is generated from everything you've entered. It guides the AI when building your itinerary. Edit freely to add specific preferences.
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5 }}>Trip summary</label>
          {autoSummary && wizPrefs.instructions !== autoSummary && (
            <button onClick={() => setWizPrefs(prev => ({ ...prev, instructions: autoSummary }))}
              style={{ fontSize: 10, color: T.a, background: "none", border: "none", cursor: "pointer", fontFamily: T.font, fontWeight: 500 }}>↻ Reset to auto</button>
          )}
        </div>
        <textarea value={wizPrefs.instructions} onChange={e => setWizPrefs(prev => ({ ...prev, instructions: e.target.value }))}
          placeholder="Your trip summary will appear here..."
          ref={el => { if (el) { el.style.height = "auto"; el.style.height = Math.max(140, el.scrollHeight + 4) + "px"; } }}
          style={{ width: "100%", padding: "12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none", resize: "vertical", minHeight: 140, maxHeight: 300, lineHeight: 1.6, overflow: "auto" }} />
        <p style={{ fontSize: 10, color: T.t3, marginTop: 4, marginBottom: 16 }}>Add keywords like "dog-friendly", "avoid steep trails", "late starts", "accessible" to influence your itinerary</p>

        {/* Quick glance at what's included */}
        <div style={{ background: T.s2, borderRadius: T.rs, padding: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Included in this trip</p>

          {/* Places */}
          {wizTrip.places.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 9, fontWeight: 600, color: T.t3, marginBottom: 4, textTransform: "uppercase", letterSpacing: .3 }}>Places</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {wizTrip.places.map(p => <Tag key={p} bg={T.purpleL} color={T.purple}>{p}</Tag>)}
              </div>
            </div>
          )}

          {/* Stays */}
          {wizStays.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 9, fontWeight: 600, color: T.t3, marginBottom: 4, textTransform: "uppercase", letterSpacing: .3 }}>Stays</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {wizStays.map((s, i) => <Tag key={i} bg={T.amberL} color={T.amber}>{s.name}{s.location ? ` · ${s.location}` : ""}</Tag>)}
              </div>
            </div>
          )}

          {/* Travel & Budget */}
          {(wizTrip.travel.size > 0 || wizTrip.budget) && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 9, fontWeight: 600, color: T.t3, marginBottom: 4, textTransform: "uppercase", letterSpacing: .3 }}>Travel & Budget</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {[...wizTrip.travel].map(t => <Tag key={t} bg={T.blueL} color={T.blue}>{t}</Tag>)}
                {wizTrip.budget && <Tag bg={T.greenL} color={T.green}>{wizTrip.budget}</Tag>}
              </div>
            </div>
          )}

          {/* Preferences — food, activities, kids */}
          {(wizPrefs.food.size > 0 || wizPrefs.adultActs.size > 0 || wizPrefs.olderActs.size > 0 || wizPrefs.youngerActs.size > 0) && (
            <div>
              <p style={{ fontSize: 9, fontWeight: 600, color: T.t3, marginBottom: 4, textTransform: "uppercase", letterSpacing: .3 }}>Preferences</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {[...wizPrefs.food].map(f => <Tag key={f} bg={T.coralL} color={T.coral}>{f}</Tag>)}
                {[...wizPrefs.adultActs].map(a => <Tag key={`aa-${a}`} bg={T.blueL} color={T.blue}>{a}</Tag>)}
                {[...wizPrefs.olderActs].map(a => <Tag key={`oa-${a}`} bg={T.pinkL || "#fce4ec"} color={T.pink || "#e91e63"}>{a} (teen)</Tag>)}
                {[...wizPrefs.youngerActs].map(a => <Tag key={`ya-${a}`} bg={T.pinkL || "#fce4ec"} color={T.pink || "#e91e63"}>{a} (child)</Tag>)}
              </div>
            </div>
          )}
        </div>

        {/* What happens next — feature preview */}
        <div style={{ background: `linear-gradient(135deg, ${T.al}60, ${T.al})`, border: `.5px solid ${T.a}30`, borderRadius: T.rs, padding: 14, marginTop: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: T.ad, marginBottom: 10 }}>What happens after you create this trip</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { icon: "📋", text: "AI builds a personalised day-by-day itinerary" },
              { icon: "💬", text: "Chat with your concierge to refine the plan" },
              ...(wizTravellers.adults.length >= 2 ? [{ icon: "💷", text: `Split expenses across ${wizTravellers.adults.length} travellers` }] : []),
              ...(wizTravellers.adults.length >= 2 ? [{ icon: "📊", text: "Create polls for group decisions" }] : []),
              { icon: "🎒", text: "Get a smart packing list for your trip" },
              { icon: "📸", text: "Capture memories & create trip reels" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <p style={{ fontSize: 11, color: T.t2, lineHeight: 1.3 }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  };

  // ─── Main render ───
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => { if (editingTripId) { setEditingTripId(null); navigate("createdTrip"); } else navigate("home"); }}>Cancel</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>{editingTripId ? "Edit trip" : "New trip"}</h2>
        <span style={{ fontSize: 11, color: T.t3 }}>Step {wizStep + 1} of {wizSteps.length}</span>
      </div>
      <div style={{ display: "flex", gap: 4, padding: "10px 20px", background: T.s, borderBottom: `.5px solid ${T.border}` }}>
        {wizSteps.map((step, i) => (
          <div key={i} onClick={() => { if (i <= wizStep) setWizStep(i); }}
            style={{ flex: 1, height: 4, borderRadius: 2, background: i <= wizStep ? T.a : T.s3, cursor: i <= wizStep ? "pointer" : "default", transition: "background .2s" }} />
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {(() => { const stepSubs = ["Name your trip and pick destinations", "Set dates, travel mode, and budget", "Add your travel group", "Where you're staying", "Food and activities", "Review your trip summary"];
        return wizStep > 0 ? (
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 2 }}>{wizSteps[wizStep]}</h3>
            <p style={{ fontSize: 12, color: T.t3 }}>{stepSubs[wizStep]}</p>
          </div>
        ) : null; })()}
        {wizStep > 0 && (wizTrip.places.length > 0 || wizTrip.name) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, padding: "8px 12px", background: T.s2, borderRadius: T.rs }}>
            {wizTrip.name && <span style={{ fontSize: 11, color: T.t2 }}>✏️ {wizTrip.name}</span>}
            {wizTrip.places.length > 0 && <span style={{ fontSize: 11, color: T.t2 }}>📍 {wizTrip.places.join(", ")}</span>}
            {wizTrip.start && <span style={{ fontSize: 11, color: T.t2 }}>📅 {new Date(wizTrip.start + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}{wizTrip.end ? ` – ${new Date(wizTrip.end + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}</span>}
            {wizTrip.budget && <span style={{ fontSize: 11, color: T.t2 }}>{wizTrip.budget === "Budget" ? "💰" : wizTrip.budget === "Mid-range" ? "💳" : wizTrip.budget === "Luxury" ? "💎" : "🤑"} {wizTrip.budget}</span>}
          </div>
        )}
        {wizStep === 0 && renderWizDestination()}
        {wizStep === 1 && renderWizDatesTravel()}
        {wizStep === 2 && renderWizTravellers()}
        {wizStep === 3 && renderWizStays()}
        {wizStep === 4 && renderWizPrefs()}
        {wizStep === 5 && renderWizReview()}
      </div>
      <div style={{ display: "flex", gap: 8, padding: "16px 24px", background: T.s, borderTop: `.5px solid ${T.border}` }}>
        {wizStep > 0 && <button className="w-btn" style={{ ...css.btn, flex: 1, justifyContent: "center" }} onClick={() => setWizStep(wizStep - 1)}>Back</button>}
        <button className="w-btn w-btnP" style={{ ...css.btn, ...css.btnP, flex: 1, justifyContent: "center" }} onClick={() => {
          // Mandatory field validation on step 0 (Destination)
          if (wizStep === 0) {
            if (!wizTrip.name.trim() || !wizTrip.places.length) { setWizShowErrors(true); showToast(!wizTrip.name.trim() ? "Give your trip a name" : "Add at least one destination", "error"); return; }
          }
          // Date validation on step 1 (Dates & Travel)
          if (wizStep === 1 && wizTrip.start && wizTrip.end) {
            if (wizTrip.end < wizTrip.start) { alert("End date must be after start date."); return; }
            const days = Math.round((new Date(wizTrip.end + "T12:00:00") - new Date(wizTrip.start + "T12:00:00")) / 86400000) + 1;
            if (days > 30) { alert(`Trip is ${days} days — max 30 days supported. Please adjust dates.`); return; }
          }
          // Stay date validation on step 3 (Stays)
          if (wizStep === 3 && wizStays.length > 0) {
            for (const s of wizStays) {
              if (s.checkIn && s.checkOut && s.checkOut <= s.checkIn) { alert(`"${s.name}" — check-out must be after check-in.`); return; }
              if (wizTrip.start && s.checkIn && s.checkIn < wizTrip.start) { alert(`"${s.name}" check-in (${s.checkIn}) is before trip start.`); return; }
            }
          }
          setWizShowErrors(false);
          wizStep < 5 ? setWizStep(wizStep + 1) : createTrip({ wizTrip, wizTravellers, wizStays, wizPrefs, editingTripId });
        }}>
          {wizStep < 5 ? `Next: ${wizSteps[wizStep + 1]}` : editingTripId ? "Save changes" : "Create trip"}
        </button>
      </div>
    </div>
  );
}
