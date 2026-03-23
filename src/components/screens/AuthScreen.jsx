import React from 'react';
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';
import { useAuth } from '../../contexts/AuthContext';

export function AuthScreen() {
  const { signInWithGoogle, signUpWithEmail, signInWithEmail, authScreen, setAuthScreen, authEmail, setAuthEmail, authPassword, setAuthPassword, authName, setAuthName, authError, setAuthError, setUser, setAuthLoading } = useAuth();
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: T.bg }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <h1 style={{ fontFamily: T.fontD, fontSize: 32, fontWeight: 400, color: T.t1, marginBottom: 4 }}>Trip With Me</h1>
        <p style={{ fontSize: 13, color: T.t2, marginBottom: 30 }}>Your travel concierge</p>

        <div style={{ width: "100%", maxWidth: 340 }}>
          {/* Google Sign-in */}
          <button onClick={signInWithGoogle}
            style={{ ...css.btn, width: "100%", padding: "12px 16px", marginBottom: 16, justifyContent: "center", gap: 10, background: T.s, border: `.5px solid ${T.border}`, borderRadius: T.r, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
            <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: T.border }} />
            <span style={{ fontSize: 12, color: T.t3 }}>or</span>
            <div style={{ flex: 1, height: 1, background: T.border }} />
          </div>

          {/* Email auth */}
          {authScreen === "signup" && (
            <div style={{ marginBottom: 10 }}>
              <input value={authName} onChange={e => setAuthName(e.target.value)} placeholder="Your name"
                style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
            </div>
          )}
          <input value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="Email" type="email"
            style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none", marginBottom: 8, boxSizing: "border-box" }} />
          <input value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Password" type="password"
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); authScreen === "signup" ? signUpWithEmail() : signInWithEmail(); } }}
            style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none", marginBottom: 12, boxSizing: "border-box" }} />

          <button onClick={authScreen === "signup" ? signUpWithEmail : signInWithEmail}
            style={{ ...css.btn, ...css.btnP, width: "100%", padding: "12px 16px", justifyContent: "center", fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 10 }}>
            {authScreen === "signup" ? "Create account" : "Sign in"}
          </button>

          {authError && (
            <p style={{ fontSize: 12, color: authError.includes("Check your email") ? T.a : T.red, textAlign: "center", marginBottom: 8 }}>{authError}</p>
          )}

          <p style={{ fontSize: 12, color: T.t2, textAlign: "center" }}>
            {authScreen === "signup" ? "Already have an account? " : "Don't have an account? "}
            <span onClick={() => { setAuthScreen(authScreen === "signup" ? "login" : "signup"); setAuthError(""); }}
              style={{ color: T.a, cursor: "pointer", fontWeight: 500 }}>
              {authScreen === "signup" ? "Sign in" : "Sign up"}
            </span>
          </p>

          {/* Skip login for demo */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `.5px solid ${T.border}`, textAlign: "center" }}>
            <button onClick={() => { setUser({ id: 'demo', email: 'demo@tripwithme.app' }); setAuthLoading(false); }}
              style={{ ...css.btn, fontSize: 12, color: T.t3, cursor: "pointer", margin: "0 auto" }}>
              Skip — explore as guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
