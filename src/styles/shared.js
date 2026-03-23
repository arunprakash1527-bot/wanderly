import { T } from './tokens';

// ─── Shared Styles ───
export const css = {
  btn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: T.rs, border: `.5px solid ${T.border}`, background: T.s, fontFamily: T.font, fontSize: 13, cursor: "pointer", color: T.t1, transition: "all .15s", fontWeight: 500, outline: "none", minHeight: 44 },
  btnP: { background: T.a, color: "#fff", borderColor: T.ad },
  btnSm: { padding: "6px 14px", fontSize: 12, minHeight: 36 },
  chip: { padding: "8px 16px", borderRadius: 24, fontSize: 12, border: `.5px solid ${T.border}`, background: T.s, cursor: "pointer", transition: "all .15s", userSelect: "none", fontFamily: T.font, minHeight: 40 },
  chipActive: { background: T.al, borderColor: T.a, color: T.ad },
  card: { background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.r, padding: 16, marginBottom: 8, boxShadow: T.shadow, transition: "all .2s" },
  tag: (bg, color) => ({ display: "inline-block", padding: "4px 10px", borderRadius: 12, fontSize: 11, fontWeight: 500, background: bg, color, marginRight: 4, marginBottom: 4 }),
  avatar: (bg, size = 32) => ({ width: size, height: size, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.37, fontWeight: 500, color: "#fff", background: bg, flexShrink: 0 }),
  sectionTitle: { fontSize: 12, fontWeight: 600, color: T.t3, margin: "24px 0 8px", textTransform: "uppercase", letterSpacing: 0.8 },
};
