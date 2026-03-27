import React, { useEffect } from 'react';
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';
import { useTrip } from '../../contexts/TripContext';

export function ActivationModal() {
  const {
    showActivationModal, setShowActivationModal,
    createdTrips,
    pendingActivationTripId, setPendingActivationTripId,
    activationPrefs, setActivationPrefs,
    getSmartRouteOrder,
    confirmActivation,
  } = useTrip();

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showActivationModal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [showActivationModal]);

  if (!showActivationModal) return null;

  const pendTrip = createdTrips.find(t => t.id === pendingActivationTripId);
  const isEV = pendTrip?.travel?.some(m => /\bev\b/i.test(m) && !/non[\s-]*ev/i.test(m));
  const startLoc = pendTrip?.startLocation || "";
  const firstPlace = pendTrip?.places?.[0] || "";
  const routePlaces = pendTrip ? getSmartRouteOrder(pendTrip) : [];
  const startH = activationPrefs.startTime ? parseInt(activationPrefs.startTime.split(":")[0]) : 8;
  const estArrival = Math.min(startH + 2, 18);
  const fmtHr = (h) => { const s = h >= 12 ? "PM" : "AM"; return `${h > 12 ? h - 12 : h}:00 ${s}`; };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380, maxHeight: "85vh", overflowY: "auto" }}>
        <h3 style={{ fontFamily: T.fontD, fontSize: 18, fontWeight: 400, marginBottom: 4 }}>Plan your journey</h3>
        <p style={{ fontSize: 12, color: T.t2, marginBottom: 16 }}>We'll build your itinerary around your travel.</p>

        {/* Route overview */}
        {startLoc && routePlaces.length > 0 && (
          <div style={{ background: T.s2, borderRadius: T.rs, padding: 12, marginBottom: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Your route</p>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: T.t1, fontWeight: 500 }}>{startLoc}</span>
              {routePlaces.map((p, i) => (
                <React.Fragment key={i}>
                  <span style={{ fontSize: 10, color: T.t3 }}>{"\u2192"}</span>
                  <span style={{ fontSize: 12, color: T.ad, fontWeight: 500 }}>{p}</span>
                </React.Fragment>
              ))}
              <span style={{ fontSize: 10, color: T.t3 }}>{"\u2192"}</span>
              <span style={{ fontSize: 12, color: T.t1, fontWeight: 500 }}>{startLoc}</span>
            </div>
            {isEV && <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, padding: "6px 10px", background: T.amberL, borderRadius: 8 }}>
              <span style={{ fontSize: 14 }}>{"\u26A1"}</span>
              <p style={{ fontSize: 11, color: T.amber, fontWeight: 500 }}>EV detected — we'll suggest charging stops along the way</p>
            </div>}
          </div>
        )}

        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>What time do you start your journey?</label>
        <input type="time" value={activationPrefs.startTime} onChange={e => setActivationPrefs(p => ({ ...p, startTime: e.target.value }))}
          style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none", marginBottom: 4, minHeight: 44 }} />
        {startLoc && firstPlace && <p style={{ fontSize: 11, color: T.t3, marginBottom: 14 }}>Estimated arrival at {firstPlace}: ~{fmtHr(estArrival)}</p>}

        {/* Stopovers */}
        {activationPrefs.stopovers.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>Suggested stops</label>
            {activationPrefs.stopovers.map((stop, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 6, background: stop.enabled ? (stop.type === "ev_charge" ? T.amberL : T.s2) : T.s, borderRadius: T.rs, border: `.5px solid ${stop.enabled ? (stop.type === "ev_charge" ? T.amber : T.border) : T.border}`, opacity: stop.enabled ? 1 : 0.5, cursor: "pointer", transition: "all .15s" }}
                onClick={() => setActivationPrefs(p => ({ ...p, stopovers: p.stopovers.map((s, si) => si === i ? { ...s, enabled: !s.enabled } : s) }))}>
                <span style={{ fontSize: 16 }}>{stop.type === "ev_charge" ? "\u26A1" : "\u2615"}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: T.t1 }}>{stop.label}</p>
                  <p style={{ fontSize: 10, color: T.t3 }}>{stop.desc} · {stop.time}</p>
                </div>
                <div style={{ width: 18, height: 18, borderRadius: 4, border: `.5px solid ${stop.enabled ? T.a : T.border}`, background: stop.enabled ? T.a : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {stop.enabled && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>{"\u2713"}</span>}
                </div>
              </div>
            ))}
            {isEV && activationPrefs.stopovers.some(s => s.type === "ev_charge" && s.enabled && s.combineMeal) && (
              <p style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>Charging stops include a meal/coffee break</p>
            )}
          </div>
        )}

        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>Day 1 pace?</label>
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[{ id: "relaxed", label: "Relaxed", desc: "Settle in, easy start" }, { id: "balanced", label: "Balanced", desc: "Some exploring" }, { id: "packed", label: "Packed", desc: "Hit the ground running" }].map(opt => (
            <div key={opt.id} onClick={() => setActivationPrefs(p => ({ ...p, dayOnePace: opt.id }))}
              style={{ flex: 1, padding: "8px 6px", borderRadius: T.rs, border: `.5px solid ${activationPrefs.dayOnePace === opt.id ? T.a : T.border}`,
                background: activationPrefs.dayOnePace === opt.id ? T.al : T.s, cursor: "pointer", textAlign: "center", transition: "all .15s" }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: activationPrefs.dayOnePace === opt.id ? T.ad : T.t1 }}>{opt.label}</p>
              <p style={{ fontSize: 9, color: T.t3, marginTop: 2 }}>{opt.desc}</p>
            </div>
          ))}
        </div>

        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>Anything else? (optional)</label>
        <textarea value={activationPrefs.notes} onChange={e => setActivationPrefs(p => ({ ...p, notes: e.target.value }))}
          placeholder="e.g. Nap break after lunch, prefer outdoor activities..."
          style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 12, background: T.s, outline: "none", resize: "vertical", minHeight: 44, marginBottom: 16 }} />

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setShowActivationModal(false); }} style={{ ...css.btn, ...css.btnSm, flex: 1, justifyContent: "center" }}>Cancel</button>
          <button onClick={confirmActivation} style={{ ...css.btn, ...css.btnP, flex: 2, justifyContent: "center", padding: "12px 16px" }}>Generate itinerary</button>
        </div>
      </div>
    </div>
  );
}
