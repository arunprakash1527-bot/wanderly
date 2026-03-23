import React from 'react';
import { T } from '../../styles/tokens';

export function TabBar({ active, onNav }) {
  const tabStyle = (isActive) => ({ flex: 1, padding: "12px 0", minHeight: 48, textAlign: "center", fontSize: 11, color: isActive ? T.a : T.t3, cursor: "pointer", border: "none", background: "none", fontFamily: T.font, fontWeight: isActive ? 600 : 500, transition: "all .15s", borderTop: isActive ? `2px solid ${T.a}` : "2px solid transparent" });
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
          <button key={id} className="w-tab" onClick={() => onNav(id)} style={tabStyle(active === id)} aria-label={label} aria-current={active === id ? "page" : undefined}>{label}</button>
        ))}
      </nav>
    );
  }
  return (
    <nav role="navigation" aria-label="Trip navigation" style={{ display: "flex", background: T.s, borderTop: `.5px solid ${T.border}`, flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.id} className="w-tab" onClick={() => onNav(t.screen)} style={tabStyle(active === t.id)} aria-label={t.label} aria-current={active === t.id ? "page" : undefined}>{t.label}</button>
      ))}
    </nav>
  );
}
