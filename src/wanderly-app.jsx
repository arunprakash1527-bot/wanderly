import React, { useState, useEffect, useRef } from "react";
import { T } from './styles/tokens';
import './styles/global.css';

// Screen components
import { AuthScreen } from './components/screens/AuthScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { CreateScreen } from './components/screens/CreateScreen';
import { CreatedTripScreen } from './components/screens/CreatedTripScreen';
import { TripScreen } from './components/screens/TripScreen';
import { ChatScreen } from './components/screens/ChatScreen';
import { VoteScreen } from './components/screens/VoteScreen';
import { MemoriesScreen } from './components/screens/MemoriesScreen';
import { ShareScreen } from './components/screens/ShareScreen';
import { ExploreScreen } from './components/screens/ExploreScreen';
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
import { TripProvider } from './contexts/TripContext';
import { WizardProvider } from './contexts/WizardContext';
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


// ─── AppShell: minimal routing + overlays ───
function AppShell() {
  const { user, authLoading } = useAuth();
  const { screen, toast } = useNavigation();

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

  const phoneStyle = { maxWidth: 600, width: "100%", margin: "0 auto", minHeight: "100dvh", height: "100dvh", background: T.bg, overflow: "hidden", fontFamily: T.font, color: T.t1 };

  if (authLoading) {
    return (
      <div className="w-app" style={phoneStyle}>
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
      <div className="w-app" style={phoneStyle}>
        <div style={{ height: "100%" }}>
          <AuthScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="w-app" style={phoneStyle}>
      {/* Skip to content — accessibility */}
      <a href="#main-content" style={{ position: "absolute", left: -9999, top: "auto", width: 1, height: 1, overflow: "hidden", zIndex: 10000, padding: "12px 16px", background: T.ad, color: "#fff", fontSize: 14, fontFamily: T.font, borderRadius: "0 0 8px 0", textDecoration: "none" }}
        onFocus={e => { e.target.style.left = "0"; e.target.style.width = "auto"; e.target.style.height = "auto"; }}
        onBlur={e => { e.target.style.left = "-9999px"; e.target.style.width = "1px"; e.target.style.height = "1px"; }}>
        Skip to content
      </a>
      <main id="main-content" role="main" style={{ height: "100%" }}>
        {screen === "home" && <HomeScreen />}
        {screen === "create" && <CreateScreen />}
        {screen === "createdTrip" && <CreatedTripScreen />}
        {screen === "trip" && <TripScreen />}
        {screen === "chat" && <ChatScreen />}
        {screen === "vote" && <VoteScreen />}
        {screen === "memories" && <MemoriesScreen />}
        {screen === "share" && <ShareScreen />}
        {screen === "explore" && <ExploreScreen />}
        {screen === "settings" && <SettingsScreen />}
        {screen === "joinPreview" && <JoinPreviewScreen />}
      </main>
      <ActivationModal />
      <ReelOverlay />
      <TripWrapped />
      <WelcomeModal />
      <DemoOverlay />
      <PhotoViewer />
      {/* PWA install banner */}
      {showInstall && (
        <div style={{ position: "fixed", bottom: 70, left: "50%", transform: "translateX(-50%)", zIndex: 9997, width: "calc(100% - 32px)", maxWidth: 360, padding: "14px 16px", borderRadius: 16, background: T.s, boxShadow: "0 8px 32px rgba(0,0,0,.15), 0 2px 8px rgba(0,0,0,.08)", border: `.5px solid ${T.border}`, fontFamily: T.font, display: "flex", alignItems: "center", gap: 12, animation: "demoSlideUp .3s ease-out" }}>
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
        <div style={{ position: "fixed", bottom: showInstall ? 150 : 80, left: "50%", transform: "translateX(-50%)", zIndex: 9998, padding: "10px 20px", borderRadius: 20, background: toast.type === "error" ? T.red : T.ad, color: "#fff", fontSize: 13, fontFamily: T.font, boxShadow: "0 4px 12px rgba(0,0,0,.15)", animation: "reelFadeIn .3s ease" }}>
          {toast.type === "success" ? "\u2713 " : "\u26A0 "}{toast.message}
        </div>
      )}
    </div>
  );
}
