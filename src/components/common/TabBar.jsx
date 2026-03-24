import React from 'react';
import { T } from '../../styles/tokens';

const icons = {
  home: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="7" width="12" height="13" rx="2"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/><line x1="6" y1="12" x2="18" y2="12"/></svg>,
  trip: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="8" y2="18.01"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>,
  chat: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  explore: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
  memories: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  settings: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
};

export function TabBar({ active, onNav }) {
  const tabStyle = (isActive) => ({ flex: 1, padding: "8px 0 6px", minHeight: 48, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontSize: 11, color: isActive ? T.a : T.t3, cursor: "pointer", border: "none", background: "none", fontFamily: T.font, fontWeight: isActive ? 600 : 500, transition: "all .15s", borderTop: isActive ? `2px solid ${T.a}` : "2px solid transparent" });
  const tabs = [
    { id: "trip", label: "Timeline", screen: "trip" },
    { id: "chat", label: "Chat", screen: "chat" },
    { id: "explore", label: "Explore", screen: "explore" },
    { id: "memories", label: "Memories", screen: "memories" },
    { id: "settings", label: "Settings", screen: "settings" },
  ];
  if (active === "home") {
    return (
      <nav role="navigation" aria-label="Main navigation" style={{ display: "flex", background: T.s, borderTop: `.5px solid ${T.border}`, flexShrink: 0 }}>
        {[["home", "Trips"], ["settings", "Settings"]].map(([id, label]) => (
          <button key={id} className="w-tab" onClick={() => onNav(id)} style={tabStyle(active === id)} aria-label={label} aria-current={active === id ? "page" : undefined}>{icons[id]}<span>{label}</span></button>
        ))}
      </nav>
    );
  }
  return (
    <nav role="navigation" aria-label="Trip navigation" style={{ display: "flex", background: T.s, borderTop: `.5px solid ${T.border}`, flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.id} className="w-tab" onClick={() => onNav(t.screen)} style={tabStyle(active === t.id)} aria-label={t.label} aria-current={active === t.id ? "page" : undefined}>{icons[t.id]}<span>{t.label}</span></button>
      ))}
    </nav>
  );
}
