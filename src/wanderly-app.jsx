import React, { useState, useEffect, useRef, useMemo } from "react";
import { T } from './styles/tokens';
import './styles/global.css';

// Screen components
import { AuthScreen } from './components/screens/AuthScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { CreateScreen } from './components/screens/CreateScreen';
import { CreatedTripScreen } from './components/screens/CreatedTripScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { JoinPreviewScreen } from './components/screens/JoinPreviewScreen';

// Overlay components
import { ActivationModal } from './components/overlays/ActivationModal';
import { ReelOverlay } from './components/overlays/ReelOverlay';
import { TripWrapped } from './components/overlays/TripWrapped';
import { WelcomeModal } from './components/overlays/WelcomeModal';
import { DemoOverlay } from './components/overlays/DemoOverlay';
import { PhotoViewer } from './components/overlays/PhotoViewer';

// Context providers and hooks
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { TripProvider, useTrip } from './contexts/TripContext';
import { WizardProvider, useWizard } from './contexts/WizardContext';
import { ChatProvider } from './contexts/ChatContext';
import { ExpenseProvider } from './contexts/ExpenseContext';
import { MemoriesProvider } from './contexts/MemoriesContext';


// ─── Main App: thin provider composition ───
export default function TripWithMeApp() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <TripProvider>
          <WizardProvider>
            <ChatProvider>
              <ExpenseProvider>
                <MemoriesProvider>
                  <AppShell />
                </MemoriesProvider>
              </ExpenseProvider>
            </ChatProvider>
          </WizardProvider>
        </TripProvider>
      </NavigationProvider>
    </AuthProvider>
  );
}


// ─── Desktop detection hook ───
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 900);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}


// ─── Desktop Side Panel ───
function DesktopSidePanel({ screen }) {
  const { wizTrip, wizTravellers, wizStays, wizStep } = useWizard();
  const { selectedCreatedTrip, createdTrips } = useTrip();

  const WIZARD_STEPS = ["Destination", "Dates & Travel", "Travellers", "Stays", "Preferences", "Review"];

  // Wizard preview content
  if (screen === "create") {
    const totalTravellers = (wizTravellers.adults?.length || 0) + (wizTravellers.olderKids?.length || 0) + (wizTravellers.youngerKids?.length || 0) + (wizTravellers.infants?.length || 0);
    const travelModes = wizTrip.travel instanceof Set ? [...wizTrip.travel] : Array.isArray(wizTrip.travel) ? wizTrip.travel : [];

    return (
      <div className="w-side-panel" style={{ height: "100%", overflow: "auto", padding: 32 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: T.a, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Trip Preview</p>
          <h2 style={{ fontFamily: T.fontD, fontSize: 26, fontWeight: 400, color: T.t1, lineHeight: 1.2 }}>
            {wizTrip.name || "Your New Trip"}
          </h2>
          {wizTrip.brief && <p style={{ fontSize: 13, color: T.t2, marginTop: 6 }}>{wizTrip.brief}</p>}
        </div>

        {/* Progress steps */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
          {WIZARD_STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 3, borderRadius: 2, background: i <= wizStep ? T.a : T.s3, marginBottom: 4, transition: "background .2s" }} />
              <p style={{ fontSize: 10, color: i <= wizStep ? T.a : T.t3 }}>{s}</p>
            </div>
          ))}
        </div>

        {/* Trip details cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {wizTrip.places.length > 0 && (
            <div style={{ padding: 16, borderRadius: 14, background: T.s, border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 8 }}>Destinations</p>
              {wizTrip.places.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < wizTrip.places.length - 1 ? 6 : 0 }}>
                  <span style={{ fontSize: 16 }}>📍</span>
                  <span style={{ fontSize: 14, color: T.t1 }}>{p}</span>
                </div>
              ))}
            </div>
          )}

          {(wizTrip.start || wizTrip.end) && (
            <div style={{ padding: 16, borderRadius: 14, background: T.s, border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 8 }}>Dates</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>📅</span>
                <span style={{ fontSize: 14, color: T.t1 }}>
                  {wizTrip.start && new Date(wizTrip.start + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  {wizTrip.start && wizTrip.end && " — "}
                  {wizTrip.end && new Date(wizTrip.end + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              {wizTrip.start && wizTrip.end && (
                <p style={{ fontSize: 12, color: T.t3, marginTop: 4, marginLeft: 24 }}>
                  {Math.round((new Date(wizTrip.end) - new Date(wizTrip.start)) / 86400000) + 1} days
                </p>
              )}
            </div>
          )}

          {totalTravellers > 1 && (
            <div style={{ padding: 16, borderRadius: 14, background: T.s, border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 8 }}>Travellers</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(wizTravellers.adults || []).map((a, i) => (
                  <span key={`a${i}`} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: T.al, color: T.ad }}>{a.name || `Adult ${i + 1}`}</span>
                ))}
                {(wizTravellers.olderKids || []).map((k, i) => (
                  <span key={`o${i}`} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: T.blueL, color: T.blue }}>{k.name || `Teen ${i + 1}`}</span>
                ))}
                {(wizTravellers.youngerKids || []).map((k, i) => (
                  <span key={`y${i}`} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: T.amberL, color: T.amber }}>{k.name || `Child ${i + 1}`}</span>
                ))}
                {(wizTravellers.infants || []).map((k, i) => (
                  <span key={`i${i}`} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: T.pinkL, color: T.pink }}>{k.name || `Baby ${i + 1}`}</span>
                ))}
              </div>
            </div>
          )}

          {wizStays.length > 0 && (
            <div style={{ padding: 16, borderRadius: 14, background: T.s, border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 8 }}>Stays</p>
              {wizStays.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < wizStays.length - 1 ? 6 : 0 }}>
                  <span style={{ fontSize: 16 }}>🏨</span>
                  <div>
                    <p style={{ fontSize: 13, color: T.t1 }}>{s.name || s.location}</p>
                    {s.checkIn && <p style={{ fontSize: 11, color: T.t3 }}>{s.checkIn} → {s.checkOut}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {travelModes.length > 0 && (
            <div style={{ padding: 16, borderRadius: 14, background: T.s, border: `1px solid ${T.border}` }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 8 }}>Travel</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {travelModes.map(m => (
                  <span key={m} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: T.s2, color: T.t1 }}>
                    {m === "Car" ? "🚗" : m === "EV" ? "⚡" : m === "Train" ? "🚆" : m === "Flight" ? "✈️" : m === "Bus" ? "🚌" : m === "Ferry" ? "⛴️" : "🚶"} {m}
                  </span>
                ))}
              </div>
              {wizTrip.budget && <p style={{ fontSize: 12, color: T.t2, marginTop: 8 }}>Budget: {wizTrip.budget}</p>}
            </div>
          )}
        </div>

        {/* Empty state */}
        {wizTrip.places.length === 0 && !wizTrip.start && totalTravellers <= 1 && (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
            <p style={{ fontSize: 14, color: T.t2 }}>Start filling in your trip details</p>
            <p style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>Your trip preview will appear here as you go</p>
          </div>
        )}
      </div>
    );
  }

  // Created trip overview
  if (screen === "createdTrip" && selectedCreatedTrip) {
    const trip = selectedCreatedTrip;
    const numDays = trip.timeline ? Object.keys(trip.timeline).length : 0;
    const totalItems = trip.timeline ? Object.values(trip.timeline).flat().length : 0;
    const allTravellers = [...(trip.travellers?.adults || []), ...(trip.travellers?.olderKids || []), ...(trip.travellers?.youngerKids || []), ...(trip.travellers?.infants || [])];

    return (
      <div className="w-side-panel" style={{ height: "100%", overflow: "auto", padding: 32 }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: T.a, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>Trip Overview</p>
          <h2 style={{ fontFamily: T.fontD, fontSize: 26, fontWeight: 400, color: T.t1 }}>{trip.name}</h2>
          {trip.brief && <p style={{ fontSize: 13, color: T.t2, marginTop: 6 }}>{trip.brief}</p>}
        </div>

        {/* Quick stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Days", value: numDays, icon: "📅" },
            { label: "Activities", value: totalItems, icon: "🎯" },
            { label: "Travellers", value: allTravellers.length, icon: "👥" },
            { label: "Stays", value: (trip.stays || []).length, icon: "🏨" },
          ].map(s => (
            <div key={s.label} style={{ padding: 14, borderRadius: 14, background: T.s, border: `1px solid ${T.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <p style={{ fontSize: 20, fontWeight: 600, color: T.t1 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: T.t3 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Destinations */}
        {trip.places?.length > 0 && (
          <div style={{ padding: 16, borderRadius: 14, background: T.s, border: `1px solid ${T.border}`, marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 8 }}>Destinations</p>
            {trip.places.map((p, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < trip.places.length - 1 ? 6 : 0 }}>
                <span style={{ fontSize: 16 }}>📍</span>
                <span style={{ fontSize: 14, color: T.t1 }}>{p}</span>
              </div>
            ))}
          </div>
        )}

        {/* Dates */}
        {trip.rawStart && (
          <div style={{ padding: 16, borderRadius: 14, background: T.s, border: `1px solid ${T.border}`, marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 8 }}>Dates</p>
            <p style={{ fontSize: 14, color: T.t1 }}>
              📅 {new Date(trip.rawStart + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              {trip.rawEnd && ` — ${new Date(trip.rawEnd + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`}
            </p>
          </div>
        )}

        {/* Travellers */}
        {allTravellers.length > 0 && (
          <div style={{ padding: 16, borderRadius: 14, background: T.s, border: `1px solid ${T.border}`, marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 8 }}>Group</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {allTravellers.map((t, i) => (
                <span key={i} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 20, background: T.al, color: T.ad }}>
                  {t.name || `Traveller ${i + 1}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Day-by-day mini timeline */}
        {numDays > 0 && (
          <div style={{ padding: 16, borderRadius: 14, background: T.s, border: `1px solid ${T.border}` }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 10 }}>Itinerary</p>
            {Object.entries(trip.timeline).map(([day, items]) => (
              <div key={day} style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: T.t1, marginBottom: 4 }}>Day {day}</p>
                {(items || []).slice(0, 4).map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: item.checkedIn ? T.a : T.s3, flexShrink: 0 }} />
                    <p style={{ fontSize: 11, color: item.checkedIn ? T.a : T.t2, textDecoration: item.checkedIn ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.time && <span style={{ color: T.t3, marginRight: 4 }}>{item.time}</span>}
                      {item.title}
                    </p>
                  </div>
                ))}
                {(items || []).length > 4 && <p style={{ fontSize: 10, color: T.t3, marginLeft: 11 }}>+{items.length - 4} more</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Home screen — trips overview
  if (screen === "home") {
    const upcoming = createdTrips.filter(t => t.rawStart && new Date(t.rawStart) >= new Date()).slice(0, 3);
    return (
      <div className="w-side-panel" style={{ height: "100%", overflow: "auto", padding: 32 }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${T.ad}, ${T.a})`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
          </div>
          <h2 style={{ fontFamily: T.fontD, fontSize: 28, fontWeight: 400, color: T.t1, lineHeight: 1.2 }}>Trip With Me</h2>
          <p style={{ fontSize: 13, color: T.t2, marginTop: 6 }}>Your AI-powered travel concierge</p>
        </div>

        {upcoming.length > 0 ? (
          <div>
            <p style={{ fontSize: 11, fontWeight: 500, color: T.a, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12 }}>Upcoming Trips</p>
            {upcoming.map(trip => (
              <div key={trip.id} style={{ padding: 16, borderRadius: 14, background: T.s, border: `1px solid ${T.border}`, marginBottom: 10 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: T.t1 }}>{trip.name}</p>
                {trip.places?.length > 0 && <p style={{ fontSize: 12, color: T.t2, marginTop: 2 }}>📍 {trip.places.join(", ")}</p>}
                {trip.rawStart && <p style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>📅 {new Date(trip.rawStart + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✈️</div>
            <p style={{ fontSize: 14, color: T.t2 }}>Plan your next adventure</p>
            <p style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>Create a trip to get started</p>
          </div>
        )}

        {/* Quick tips */}
        <div style={{ marginTop: 28, padding: 16, borderRadius: 14, background: T.al, border: `1px solid ${T.a}22` }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: T.ad, marginBottom: 8 }}>Quick Tips</p>
          {["AI builds your itinerary from your preferences", "Share trips with co-travellers to plan together", "Get real-time weather and local insights"].map((tip, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: T.a }}>•</span>
              <p style={{ fontSize: 12, color: T.ad }}>{tip}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default — generic panel
  return (
    <div className="w-side-panel" style={{ height: "100%", overflow: "auto", padding: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${T.ad}, ${T.a})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
        </div>
        <h3 style={{ fontFamily: T.fontD, fontSize: 22, fontWeight: 400, color: T.t1, marginBottom: 6 }}>Trip With Me</h3>
        <p style={{ fontSize: 12, color: T.t3 }}>Your AI travel concierge</p>
      </div>
    </div>
  );
}


// ─── AppShell: minimal routing + overlays ───
function AppShell() {
  const { user, authLoading } = useAuth();
  const { screen, toast, celebration } = useNavigation();
  const isDesktop = useIsDesktop();

  // ─── Offline detection ───
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  // PWA install prompt
  const deferredPromptRef = useRef(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      // Only show if user hasn't dismissed before
      if (!localStorage.getItem('twm_pwa_dismissed')) {
        setShowInstall(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    // Hide if already installed
    window.addEventListener('appinstalled', () => setShowInstall(false));
    // Check if running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowInstall(false);
    }
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPromptRef.current) return;
    deferredPromptRef.current.prompt();
    const result = await deferredPromptRef.current.userChoice;
    if (result.outcome === 'accepted') {
      setShowInstall(false);
    }
    deferredPromptRef.current = null;
  };

  const dismissInstall = () => {
    setShowInstall(false);
    localStorage.setItem('twm_pwa_dismissed', '1');
  };

  const phoneStyle = { maxWidth: isDesktop ? "none" : 600, width: "100%", margin: "0 auto", minHeight: "100dvh", height: "100dvh", background: T.bg, overflow: "hidden", fontFamily: T.font, color: T.t1 };
  const centeredStyle = { maxWidth: 600, width: "100%", margin: "0 auto", minHeight: "100dvh", height: "100dvh", background: T.bg, overflow: "hidden", fontFamily: T.font, color: T.t1 };

  if (authLoading) {
    return (
      <div className="w-app" style={centeredStyle}>
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontFamily: T.fontD, fontSize: 24, fontWeight: 400 }}>Trip With Me</h1>
            <p style={{ fontSize: 12, color: T.t2, marginTop: 4 }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-app" style={centeredStyle}>
        <div style={{ height: "100%" }}>
          <AuthScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="w-app" style={phoneStyle}>
      {/* Offline banner */}
      {isOffline && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 10001, textAlign: "center", padding: "6px 16px", background: "#78350f", color: "#fef3c7", fontSize: 12, fontWeight: 600, fontFamily: T.font, letterSpacing: 0.2 }}>
          {"\uD83D\uDCF4"} Offline — showing cached data
        </div>
      )}
      {/* Skip to content — accessibility */}
      <a href="#main-content" style={{ position: "absolute", left: -9999, top: "auto", width: 1, height: 1, overflow: "hidden", zIndex: 10000, padding: "12px 16px", background: T.ad, color: "#fff", fontSize: 14, fontFamily: T.font, borderRadius: "0 0 8px 0", textDecoration: "none" }}
        onFocus={e => { e.target.style.left = "0"; e.target.style.width = "auto"; e.target.style.height = "auto"; }}
        onBlur={e => { e.target.style.left = "-9999px"; e.target.style.width = "1px"; e.target.style.height = "1px"; }}>
        Skip to content
      </a>
      <div style={isDesktop ? { display: "flex", height: "100%", gap: 0 } : { height: "100%" }}>
        <main id="main-content" role="main" style={isDesktop ? { width: 480, minWidth: 480, height: "100%", borderRight: `1px solid ${T.border}`, overflow: "hidden" } : { height: "100%" }}>
          {screen === "home" && <HomeScreen />}
          {screen === "create" && <CreateScreen />}
          {screen === "createdTrip" && <CreatedTripScreen />}
          {screen === "settings" && <SettingsScreen />}
          {screen === "joinPreview" && <JoinPreviewScreen />}
        </main>
        {isDesktop && (
          <aside style={{ flex: 1, height: "100%", overflow: "hidden", background: T.bg }}>
            <DesktopSidePanel screen={screen} />
          </aside>
        )}
      </div>
      <ActivationModal />
      <ReelOverlay />
      <TripWrapped />
      <WelcomeModal />
      <DemoOverlay />
      <PhotoViewer />
      {/* PWA install banner */}
      {showInstall && (
        <div style={{ position: "fixed", bottom: 70, left: isDesktop ? 240 : "50%", transform: "translateX(-50%)", zIndex: 9997, width: "calc(100% - 32px)", maxWidth: 360, padding: "14px 16px", borderRadius: 16, background: T.s, boxShadow: "0 8px 32px rgba(0,0,0,.15), 0 2px 8px rgba(0,0,0,.08)", border: `.5px solid ${T.border}`, fontFamily: T.font, display: "flex", alignItems: "center", gap: 12, animation: "demoSlideUp .3s ease-out" }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${T.ad}, ${T.a})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>Install Trip With Me</p>
            <p style={{ fontSize: 11, color: T.t3 }}>Add to your home screen for the full experience</p>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={dismissInstall} style={{ background: "none", border: "none", fontSize: 11, color: T.t3, cursor: "pointer", padding: "6px", fontFamily: T.font }}>Later</button>
            <button onClick={handleInstall} style={{ padding: "6px 14px", borderRadius: 20, background: T.a, color: "#fff", border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>Install</button>
          </div>
        </div>
      )}
      {toast && (
        <div style={{ position: "fixed", bottom: showInstall ? 150 : 80, left: isDesktop ? 240 : "50%", transform: "translateX(-50%)", zIndex: 9998, padding: "10px 20px", borderRadius: 20, background: toast.type === "error" ? T.red : T.ad, color: "#fff", fontSize: 13, fontFamily: T.font, boxShadow: "0 4px 12px rgba(0,0,0,.15)", animation: "reelFadeIn .3s ease" }}>
          {toast.type === "success" ? "\u2713 " : "\u26A0 "}{toast.message}
        </div>
      )}
      {celebration && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Confetti particles */}
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} style={{
              position: "absolute", top: -20,
              left: `${Math.random() * 100}%`,
              width: Math.random() * 8 + 4, height: Math.random() * 8 + 4,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              background: ["#1B8F6A", "#FF6B6B", "#4ECDC4", "#FFE66D", "#A78BFA", "#F472B6", "#38BDF8"][i % 7],
              animation: `confettiFall ${Math.random() * 2 + 1.5}s ease-in ${Math.random() * 0.5}s forwards`,
              opacity: 0.9,
            }} />
          ))}
          {/* Center badge */}
          <div style={{ textAlign: "center", animation: "celebratePop .5s cubic-bezier(.34,1.56,.64,1) forwards", padding: "28px 36px", borderRadius: 24, background: "rgba(255,255,255,.95)", backdropFilter: "blur(12px)", boxShadow: "0 8px 40px rgba(0,0,0,.15)" }}>
            <span style={{ fontSize: 48, display: "block", marginBottom: 8 }}>🎉</span>
            <h3 style={{ fontFamily: T.fontD, fontSize: 22, fontWeight: 400, color: T.t1, marginBottom: 4 }}>Trip Created!</h3>
            <p style={{ fontSize: 14, color: T.t2, fontFamily: T.font }}>{celebration.tripName}</p>
          </div>
        </div>
      )}
    </div>
  );
}
