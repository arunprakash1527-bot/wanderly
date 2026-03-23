import React, { useRef } from 'react';
import { T } from '../../styles/tokens';

export function ControlledField({ label, type = "text", value, onChange, placeholder, style: wrapStyle, min, max, onKeyDown, required, error, hint, icon }) {
  const hasError = error && !value;
  const inputStyle = { width: "100%", padding: icon ? "10px 12px 10px 36px" : "10px 12px", border: `.5px solid ${hasError ? T.red + "80" : T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: hasError ? T.red + "06" : T.s, outline: "none", transition: "border-color .2s, background .2s" };
  const dateRef = useRef(null);
  return (
    <div style={{ marginBottom: 14, ...wrapStyle }}>
      <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: hasError ? T.red : T.t3, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>
        {label}{required && <span style={{ color: T.red, fontSize: 13 }}>*</span>}
      </label>
      <div style={{ position: "relative" }}>
        {icon && <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, pointerEvents: "none", opacity: 0.5 }}>{icon}</span>}
        {type === "textarea" ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} onKeyDown={onKeyDown} style={{ ...inputStyle, resize: "vertical", minHeight: 60 }} />
        ) : type === "date" ? (
          <div onClick={() => dateRef.current?.showPicker?.()} style={{ cursor: "pointer" }}>
            <input ref={dateRef} type="date" value={value} onChange={e => onChange(e.target.value)} min={min} max={max}
              placeholder={placeholder || "Select date"}
              style={{ ...inputStyle, cursor: "pointer", minHeight: 44, colorScheme: "light" }} />
          </div>
        ) : (
          <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} min={min} max={max} onKeyDown={onKeyDown} style={{ ...inputStyle, minHeight: 44 }} />
        )}
      </div>
      {hasError && <p style={{ fontSize: 10, color: T.red, marginTop: 3 }}>{error}</p>}
      {hint && !hasError && <p style={{ fontSize: 10, color: T.t3, marginTop: 3 }}>{hint}</p>}
    </div>
  );
}
