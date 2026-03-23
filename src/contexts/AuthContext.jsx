import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");

  // Ensure profile row exists for authenticated user
  const ensureProfile = async (u) => {
    if (!u) return;
    try {
      const { data } = await supabase.from('profiles').select('id').eq('id', u.id).single();
      if (!data) {
        await supabase.from('profiles').upsert({
          id: u.id,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'User',
          email: u.email,
          avatar_url: u.user_metadata?.avatar_url || null,
        }, { onConflict: 'id' });
      }
    } catch {
      // Profile check failed — try upsert anyway
      try {
        await supabase.from('profiles').upsert({
          id: u.id,
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'User',
          email: u.email,
          avatar_url: u.user_metadata?.avatar_url || null,
        }, { onConflict: 'id' });
      } catch {} // eslint-disable-line
    }
  };

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      setAuthLoading(false);
      if (u) ensureProfile(u);
    }).catch(() => {
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setAuthLoading(false);
      if (u) ensureProfile(u);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Auth functions
  const signInWithGoogle = async () => {
    setAuthError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) setAuthError(error.message);
  };

  const signInWithEmail = async () => {
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    });
    if (error) setAuthError(error.message);
  };

  const signUpWithEmail = async () => {
    setAuthError("");
    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
      options: { data: { full_name: authName || authEmail.split("@")[0] } },
    });
    if (error) setAuthError(error.message);
    else setAuthError("Check your email for a confirmation link!");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const value = {
    user, setUser,
    authLoading, setAuthLoading,
    authScreen, setAuthScreen,
    authEmail, setAuthEmail,
    authPassword, setAuthPassword,
    authName, setAuthName,
    authError, setAuthError,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
