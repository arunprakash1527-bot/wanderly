import React from 'react';
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';
import { Avatar } from '../common/Avatar';
import { Tag } from '../common/Tag';
import { TabBar } from '../common/TabBar';
import { useNavigation } from '../../contexts/NavigationContext';

export function ShareScreen() {
  const { navigate } = useNavigation();
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("trip")}>Back</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Share trip</h2>
        <div />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <p style={{ fontSize: 14, color: T.t2, marginBottom: 14 }}>Invite friends via link. They'll see timeline, chat, polls, and memories.</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: T.s2, borderRadius: T.rs, fontSize: 13, color: T.t2, marginBottom: 16 }}>
          <code style={{ flex: 1, fontFamily: T.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>tripwithme.app/trip/easter-ld-2026</code>
          <button style={{ ...css.btn, ...css.btnSm }} onClick={() => { navigator.clipboard?.writeText("https://tripwithme.app/trip/easter-ld-2026"); alert("Link copied!"); }}>Copy</button>
        </div>
        {[["You", T.a, "Lead traveller", "Admin"], ["James M. + Ella (8)", T.coral, "Joined 2 days ago"], ["Sarah P. + Max (12)", T.blue, "Joined yesterday"], ["Raj K.", T.amber, "Joined yesterday"]].map(([name, color, sub, badge], i) => (
          <div key={i} style={{ ...css.card, display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar bg={color} label={name.slice(0, 2)} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 500 }}>{name}</p>
              <p style={{ fontSize: 12, color: T.t3 }}>{sub}</p>
            </div>
            {badge && <Tag bg={T.al} color={T.ad}>{badge}</Tag>}
          </div>
        ))}
      </div>
      <TabBar active="trip" onNav={navigate} />
    </div>
  );
}
