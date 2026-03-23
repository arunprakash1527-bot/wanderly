import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

const NavigationContext = createContext(null);

const DEMO_SLIDE_DURATIONS = [62, 56, 54, 72, 58, 62, 58, 56, 54, 999];

export function NavigationProvider({ children }) {
  const [screen, setScreen] = useState("home");
  const [toast, setToast] = useState(null);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('twm_welcomed'));
  const [showDemo, setShowDemo] = useState(false);
  const [demoSlide, setDemoSlide] = useState(0);
  const [demoTick, setDemoTick] = useState(0);
  const [demoPaused, setDemoPaused] = useState(false);
  const [demoInteracted, setDemoInteracted] = useState({});
  const demoTimerRef = useRef(null);
  const demoTickRef = useRef(null);

  const navigate = useCallback((target) => {
    setScreen(target);
  }, []);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Demo animation tick — drives all animations
  useEffect(() => {
    if (showDemo && !demoPaused) {
      demoTickRef.current = setInterval(() => setDemoTick(t => t + 1), 220);
    }
    return () => { if (demoTickRef.current) clearInterval(demoTickRef.current); };
  }, [showDemo, demoPaused]);

  // Demo auto-advance slides (ticks at 220ms each)
  useEffect(() => {
    if (!showDemo) return;
    const dur = DEMO_SLIDE_DURATIONS[demoSlide] || 50;
    if (demoTick >= dur && demoSlide < 9) {
      setDemoSlide(s => s + 1);
      setDemoTick(0);
    }
  }, [showDemo, demoTick, demoSlide]);

  // Reset tick on slide change
  useEffect(() => { setDemoTick(0); }, [demoSlide]);

  const value = {
    screen,
    toast,
    showWelcome,
    setShowWelcome,
    showDemo,
    setShowDemo,
    demoSlide,
    setDemoSlide,
    demoTick,
    setDemoTick,
    demoPaused,
    setDemoPaused,
    demoInteracted,
    setDemoInteracted,
    demoTimerRef,
    demoTickRef,
    navigate,
    showToast,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
