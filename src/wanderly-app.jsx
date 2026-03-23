import React from "react";
import { T } from './styles/tokens';
import { css } from './styles/shared';
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
import { WelcomeModal } from './components/overlays/WelcomeModal';
import { DemoOverlay } from './components/overlays/DemoOverlay';

// Context providers and hooks
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { TripProvider, useTrip } from './contexts/TripContext';
import { WizardProvider } from './contexts/WizardContext';
import { ChatProvider } from './contexts/ChatContext';
import { ExpenseProvider } from './contexts/ExpenseContext';
import { MemoriesProvider, useMemories } from './contexts/MemoriesContext';


// ─── Bridge: ExpenseProvider needs props from other contexts ───
function ExpenseProviderBridge({ children }) {
  const { user } = useAuth();
  const { showToast } = useNavigation();
  const { logActivity } = useTrip();
  return (
    <ExpenseProvider user={user} showToast={showToast} logActivity={logActivity}>
      {children}
    </ExpenseProvider>
  );
}


// ─── Main App: thin provider composition ───
export default function TripWithMeApp() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <TripProvider>
          <WizardProvider>
            <ChatProvider>
              <ExpenseProviderBridge>
                <MemoriesProvider>
                  <AppShell />
                </MemoriesProvider>
              </ExpenseProviderBridge>
            </ChatProvider>
          </WizardProvider>
        </TripProvider>
      </NavigationProvider>
    </AuthProvider>
  );
}


// ─── AppShell: reads only what it directly needs ───
function AppShell() {
  const { user, authLoading } = useAuth();
  const { screen, toast } = useNavigation();
  const { selectedCreatedTrip, createdTrips } = useTrip();
  const {
    uploadedPhotos, setUploadedPhotos,
    viewingPhoto, setViewingPhoto,
    updatePhotoInSupabase,
    deletePhotoFromSupabase,
  } = useMemories();

  // ── Render constants ──
  const phoneStyle = { maxWidth: 600, width: "100%", margin: "0 auto", minHeight: "100dvh", height: "100dvh", background: T.bg, overflow: "hidden", fontFamily: T.font, color: T.t1 };

  // ── Loading state ──
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

  // ── Auth screen (not logged in) ──
  if (!user) {
    return (
      <div className="w-app" style={phoneStyle}>
        <div style={{ height: "100%" }}>
          <AuthScreen />
        </div>
      </div>
    );
  }

  // ── Main app (logged in) ──
  return (
    <div className="w-app" style={phoneStyle}>
      <div style={{ height: "100%" }}>
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
      </div>
      <ActivationModal />
      <ReelOverlay />
      <WelcomeModal />
      <DemoOverlay />
      {toast && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 9998, padding: "10px 20px", borderRadius: 20, background: toast.type === "error" ? T.red : T.ad, color: "#fff", fontSize: 13, fontFamily: T.font, boxShadow: "0 4px 12px rgba(0,0,0,.15)", animation: "reelFadeIn .3s ease" }}>
          {toast.type === "success" ? "\u2713 " : "\u26A0 "}{toast.message}
        </div>
      )}
      {viewingPhoto && (() => {
        const photo = viewingPhoto;
        return (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", flexDirection: "column", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px" }}>
              <button onClick={() => setViewingPhoto(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 16px", gap: 12 }}>
              <img src={photo.url} alt={photo.name} style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: T.rs }} />
              <div style={{ width: "100%", maxWidth: 400 }}>
                <p style={{ color: "#fff", fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{photo.name}</p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginBottom: 10 }}>Uploaded {photo.uploadDate || "\u2014"}</p>
                <input
                  type="text"
                  value={photo.caption || ""}
                  placeholder="Add a caption..."
                  onChange={(e) => {
                    const val = e.target.value;
                    setUploadedPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, caption: val } : p));
                    setViewingPhoto(prev => ({ ...prev, caption: val }));
                  }}
                  onBlur={() => { updatePhotoInSupabase(photo.id, { caption: photo.caption || '' }); }}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: T.rs, border: `.5px solid rgba(255,255,255,0.2)`, background: "rgba(255,255,255,0.1)", color: "#fff", fontFamily: T.font, fontSize: 13, outline: "none", marginBottom: 10 }}
                />
                <div style={{ marginBottom: 12 }}>
                  <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, display: "block", marginBottom: 4 }}>Assign to day</label>
                  <select
                    value={photo.day || "Untagged"}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUploadedPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, day: val } : p));
                      setViewingPhoto(prev => ({ ...prev, day: val }));
                      updatePhotoInSupabase(photo.id, { day_tag: val });
                    }}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: T.rs, border: `.5px solid rgba(255,255,255,0.2)`, background: "rgba(255,255,255,0.15)", color: "#fff", fontFamily: T.font, fontSize: 13, outline: "none" }}
                  >
                    <option value="Untagged" style={{ color: "#000" }}>Untagged</option>
                    {(() => {
                      const tp = selectedCreatedTrip || createdTrips[0];
                      const dc = tp?.start && tp?.end ? Math.max(1, Math.ceil((new Date(tp.end) - new Date(tp.start)) / 86400000) + 1) : 5;
                      return Array.from({ length: Math.min(dc, 30) }, (_, i) => (
                        <option key={i} value={`Day ${i + 1}`} style={{ color: "#000" }}>Day {i + 1}</option>
                      ));
                    })()}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button
                    onClick={() => {
                      setUploadedPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, liked: !p.liked } : p));
                      setViewingPhoto(prev => ({ ...prev, liked: !prev.liked }));
                      updatePhotoInSupabase(photo.id, { liked: !photo.liked });
                    }}
                    style={{ ...css.btn, background: photo.liked ? T.redL : "rgba(255,255,255,0.1)", color: photo.liked ? T.red : "#fff", borderColor: photo.liked ? T.red : "rgba(255,255,255,0.2)" }}
                  >
                    {photo.liked ? "\u2764\uFE0F Liked" : "\uD83E\uDD0D Like"}
                  </button>
                  <button
                    onClick={() => {
                      deletePhotoFromSupabase(photo);
                      setUploadedPhotos(prev => prev.filter(p => p.id !== photo.id));
                      setViewingPhoto(null);
                    }}
                    style={{ ...css.btn, background: "rgba(217,62,62,0.15)", color: T.red, borderColor: T.red }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
