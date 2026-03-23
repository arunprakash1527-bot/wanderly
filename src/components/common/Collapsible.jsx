import React from 'react';
import { T } from '../../styles/tokens';

export const Collapsible = ({ title, icon, defaultOpen = false, sectionKey, expandedSections, setExpandedSections, count, children }) => {
  const isOpen = expandedSections[sectionKey] !== undefined ? expandedSections[sectionKey] : defaultOpen;
  const toggle = () => setExpandedSections(prev => ({ ...prev, [sectionKey]: !isOpen }));
  return (
    <div style={{ marginTop: 16 }}>
      <div className="w-expand" onClick={toggle} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderRadius: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
          <span style={{ fontSize: 12, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: 0.8 }}>{title}</span>
          {count !== undefined && <span style={{ fontSize: 10, color: T.t3, background: T.s2, padding: "2px 8px", borderRadius: 12 }}>{count}</span>}
        </div>
        <span style={{ fontSize: 12, color: T.t3, transition: "transform .2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
      </div>
      <div style={{ maxHeight: isOpen ? 1000 : 0, overflow: "hidden", transition: "max-height .3s ease" }}>
        {children}
      </div>
    </div>
  );
};
