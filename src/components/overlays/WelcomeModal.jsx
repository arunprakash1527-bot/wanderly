import React from 'react';
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';
import { useNavigation } from '../../contexts/NavigationContext';
import { useTrip } from '../../contexts/TripContext';
import { useWizard } from '../../contexts/WizardContext';

export function WelcomeModal() {
  const { showWelcome, setShowWelcome, screen, navigate, setShowDemo, setDemoSlide } = useNavigation();
  const { createdTrips } = useTrip();
  const { resetWizard, setWizStep } = useWizard();

  if (!showWelcome || screen !== "home" || createdTrips.length !== 0) return null;

  const dismiss = () => { setShowWelcome(false); localStorage.setItem('twm_welcomed', 'true'); };

  return (
    <div onClick={dismiss} style={{ position: "fixed", inset: 0, zIndex: 9997, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", background: T.s, borderRadius: T.r, padding: 28, maxWidth: 340, width: "100%", textAlign: "center" }}>
        {/* Close button */}
        <button onClick={dismiss} aria-label="Close"
          style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", fontSize: 20, color: T.t3, cursor: "pointer", lineHeight: 1, padding: 4 }}>
          ✕
        </button>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{"\uD83C\uDF0D"}</div>
        <h2 style={{ fontFamily: T.fontD, fontSize: 22, fontWeight: 400, marginBottom: 8 }}>Welcome to Trip With Me</h2>
        <p style={{ fontSize: 13, color: T.t2, marginBottom: 20, lineHeight: 1.5 }}>Your AI travel concierge. Plan trips, invite friends, and create memories together.</p>
        <button onClick={() => { dismiss(); navigate("create"); setWizStep(0); resetWizard(); }}
          style={{ ...css.btn, ...css.btnP, width: "100%", padding: "12px 16px", justifyContent: "center", fontSize: 14, fontWeight: 500, marginBottom: 10 }}>
          Create my first trip
        </button>
        <button onClick={() => { dismiss(); setShowDemo(true); setDemoSlide(0); }}
          style={{ ...css.btn, width: "100%", padding: "12px 16px", justifyContent: "center", fontSize: 13, color: T.t2 }}>
          Explore the demo first
        </button>
      </div>
    </div>
  );
}
