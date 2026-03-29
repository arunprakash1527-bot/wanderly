import React, { useState } from 'react';
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';
import { CONNECTORS } from '../../constants/connectors';
import { Tag } from '../common/Tag';
import { TabBar } from '../common/TabBar';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useTrip } from '../../contexts/TripContext';

export function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { navigate, prevScreen } = useNavigation();
  const { selectedCreatedTrip, syncing } = useTrip();
  const cameFromHome = prevScreen === "home";
  // settingsToggles is local to this screen
  const [settingsToggles, setSettingsToggles] = useState(() => {
    const s = {}; Object.keys(CONNECTORS).forEach(k => s[k] = CONNECTORS[k].status === "connected");
    ["booking","ev","traffic","video","poll","checkout"].forEach(k => s["n_"+k] = true);
    return s;
  });
  const connectedList = Object.entries(CONNECTORS).filter(([, c]) => c.status === "connected");
  const comingSoonList = Object.entries(CONNECTORS).filter(([, c]) => c.status === "coming_soon");
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate(cameFromHome ? "home" : selectedCreatedTrip ? "createdTrip" : "trip")}>Back</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Settings</h2>
        <div />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {/* User Profile */}
        {user && (
          <div style={{ ...css.card, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: T.a, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: 16 }}>
                {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{user.user_metadata?.full_name || user.email?.split("@")[0] || "Guest"}</p>
                <p style={{ fontSize: 12, color: T.t2 }}>{user.email || "Demo mode"}</p>
              </div>
            </div>
            {user.id !== 'demo' && (
              <div style={{ display: "flex", gap: 6 }}>
                <Tag bg={T.al} color={T.ad}>Synced to cloud</Tag>
                {syncing && <Tag bg={T.amberL} color={T.amber}>Syncing...</Tag>}
              </div>
            )}
            <button onClick={signOut} style={{ ...css.btn, ...css.btnSm, marginTop: 10, color: T.red }}>Sign out</button>
          </div>
        )}
        <div style={css.sectionTitle}>Food preferences</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {["Vegetarian", "Non-veg", "Local cuisine", "Kid-friendly"].map(o => (
            <span key={o} style={{ ...css.chip, ...css.chipActive }}>{o}</span>
          ))}
        </div>
        <div style={css.sectionTitle}>Connected services ({connectedList.length})</div>
        <p style={{ fontSize: 12, color: T.t3, marginBottom: 8 }}>Live integrations powering your trips right now.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
          {connectedList.map(([key, c]) => (
            <div key={key} onClick={() => setSettingsToggles(prev => ({ ...prev, [key]: !prev[key] }))}
              style={{ background: settingsToggles[key] ? T.s : T.s2, border: `.5px solid ${settingsToggles[key] ? T.a : T.border}`, borderRadius: T.rs, padding: "10px 8px", textAlign: "center", fontSize: 11, color: settingsToggles[key] ? T.t1 : T.t3, cursor: "pointer", transition: "all .15s", opacity: settingsToggles[key] ? 1 : 0.5 }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
              <div style={{ fontWeight: 500, fontSize: 10, lineHeight: 1.3 }}>{c.name.split(" / ")[0]}</div>
              <div style={{ fontSize: 9, color: settingsToggles[key] ? T.green : T.t3, marginTop: 2 }}>{settingsToggles[key] ? "Connected" : "Off"}</div>
            </div>
          ))}
        </div>
        <div style={css.sectionTitle}>Coming soon ({comingSoonList.length})</div>
        <p style={{ fontSize: 12, color: T.t3, marginBottom: 8 }}>Planned integrations — toggles saved for when ready.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
          {comingSoonList.map(([key, c]) => (
            <div key={key}
              style={{ background: T.s2, border: `.5px solid ${T.border}`, borderRadius: T.rs, padding: "10px 8px", textAlign: "center", fontSize: 11, color: T.t3, opacity: 0.5 }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{c.icon}</div>
              <div style={{ fontWeight: 500, fontSize: 10, lineHeight: 1.3 }}>{c.name.split(" / ")[0]}</div>
              <div style={{ fontSize: 9, color: T.t3, marginTop: 2 }}>Coming soon</div>
            </div>
          ))}
        </div>
        <div style={css.sectionTitle}>Notifications</div>
        <div style={{ background: T.blueL, padding: "8px 12px", borderRadius: T.rs, marginBottom: 8 }}>
          <p style={{ fontSize: 11, color: T.blue, fontWeight: 500 }}>📱 Coming soon — push notifications require the mobile app. Preferences saved for launch.</p>
        </div>
        {[["Booking confirmations","n_booking"], ["EV charger alerts","n_ev"], ["Traffic & closures","n_traffic"], ["Daily video generation","n_video"], ["Poll reminders","n_poll"], ["Checkout reminders","n_checkout"]].map(([n, nk]) => (
          <div key={nk} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `.5px solid ${T.border}` }}>
            <span style={{ fontSize: 14 }}>{n}</span>
            <div onClick={() => setSettingsToggles(prev => ({ ...prev, [nk]: !prev[nk] }))} style={{ width: 40, height: 22, borderRadius: 11, background: settingsToggles[nk] ? T.a : T.s3, position: "relative", cursor: "pointer", transition: "background .2s" }}>
              <div style={{ position: "absolute", top: 2, left: settingsToggles[nk] ? 20 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,.1)", transition: "left .2s" }} />
            </div>
          </div>
        ))}
      </div>
      <TabBar active={cameFromHome ? "home" : "settings"} onNav={navigate} />
    </div>
  );
}
