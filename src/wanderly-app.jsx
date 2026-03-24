import React from "react";
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
      {toast && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 9998, padding: "10px 20px", borderRadius: 20, background: toast.type === "error" ? T.red : T.ad, color: "#fff", fontSize: 13, fontFamily: T.font, boxShadow: "0 4px 12px rgba(0,0,0,.15)", animation: "reelFadeIn .3s ease" }}>
          {toast.type === "success" ? "\u2713 " : "\u26A0 "}{toast.message}
        </div>
      )}
    </div>
  );
}
