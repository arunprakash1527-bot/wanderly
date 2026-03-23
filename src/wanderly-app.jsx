import React, { useState, useEffect, useRef, useCallback } from "react";

// ─── Extracted Modules ───
import { supabase } from './supabaseClient';
import { T } from './styles/tokens';
import { css } from './styles/shared';
import { CONNECTORS } from './constants/connectors';
import { TRIP, DAYS, TIMELINE, POLLS, MEMORIES } from './constants/tripData';
import { LOCATION_SUGGESTIONS, ACTIVITY_SUGGESTIONS, LOCATION_VIBES, TRAVEL_TIMES, LOCATION_ACTIVITIES } from './constants/locations';
import { ACCOM_TEMPLATES, REGION_ACCOM_TEMPLATES } from './constants/accommodations';
import { EXPENSE_CATEGORIES, getCatInfo } from './constants/expenses';
import { getLocationVibes, getRegion, estimateTravelHours, getLocationActivities, generateLocalAccommodations } from './utils/locationHelpers';
import { sanitizeForHtml, renderChatHtml } from './utils/chatHelpers';
import { GOOGLE_MAPS_KEY, loadGoogleMaps, decodePolyline } from './utils/maps';
import { mapTripFromDB, mapTripForInsert, mapTravellersForInsert, mapStaysForInsert, mapPrefsForInsert } from './utils/tripMappers';
import { Avatar } from './components/common/Avatar';
import { Tag, GroupTag } from './components/common/Tag';
import { Collapsible } from './components/common/Collapsible';
import { ControlledField } from './components/common/ControlledField';
import { TripMap } from './components/map/TripMap';
import { TabBar } from './components/common/TabBar';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { ExploreScreen } from './components/screens/ExploreScreen';
import { AuthScreen } from './components/screens/AuthScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { ShareScreen } from './components/screens/ShareScreen';
import { JoinPreviewScreen } from './components/screens/JoinPreviewScreen';
import { CreateScreen } from './components/screens/CreateScreen';
import { CreatedTripScreen } from './components/screens/CreatedTripScreen';
import { TripScreen } from './components/screens/TripScreen';
import { ChatScreen } from './components/screens/ChatScreen';
import { VoteScreen } from './components/screens/VoteScreen';
import { MemoriesScreen } from './components/screens/MemoriesScreen';


// ─── Main App ───
export default function TripWithMeApp() {
  const [screen, setScreen] = useState("home");
  const [wizStep, setWizStep] = useState(0);
  const [selectedDay, setSelectedDay] = useState(1);
  const [expandedItem, setExpandedItem] = useState(null);
  const [photos, setPhotos] = useState(MEMORIES);
  const [videoState, setVideoState] = useState("idle");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatAddDayPicker, setChatAddDayPicker] = useState(null);
  const [chatDayInit, setChatDayInit] = useState(null);
  const [bookingStates, setBookingStates] = useState({});
  const chatRef = useRef(null);
  const photoInputRef = useRef(null);
  const reelTimerRef = useRef(null);
  const [chatInput, setChatInput] = useState("");
  const [pollData, setPollData] = useState(POLLS);
  const [createdTrips, setCreatedTrips] = useState([]);
  const [selectedCreatedTrip, setSelectedCreatedTrip] = useState(null);
  const [editingTimelineIdx, setEditingTimelineIdx] = useState(null);
  const [editingTripId, setEditingTripId] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [tripChatInput, setTripChatInput] = useState("");
  const [tripChatMessages, setTripChatMessages] = useState([]);
  const tripChatEndRef = useRef(null);
  const [tripDetailTab, setTripDetailTab] = useState("itinerary");
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationPrefs, setActivationPrefs] = useState({ startTime: "08:00", dayOnePace: "balanced", notes: "", stopovers: [] });
  const [pendingActivationTripId, setPendingActivationTripId] = useState(null);
  const [settingsToggles, setSettingsToggles] = useState(() => {
    const s = {}; Object.keys(CONNECTORS).forEach(k => s[k] = true);
    ["booking","ev","traffic","video","poll","checkout"].forEach(k => s["n_"+k] = true);
    return s;
  });

  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [videoSettings, setVideoSettings] = useState(new Set(["Music overlay", "AI narration", "Date stamps"]));
  const [reelPlaying, setReelPlaying] = useState(false);
  const [reelIndex, setReelIndex] = useState(0);
  const [reelPaused, setReelPaused] = useState(false);
  const [reelStyle, setReelStyle] = useState("cinematic"); // "cinematic" | "slideshow" | "energetic"
  const [tripDirections, setTripDirections] = useState(null);
  const [showMap, setShowMap] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastSeenActivity, setLastSeenActivity] = useState(() => {
    try { return JSON.parse(localStorage.getItem("twm_lastSeen") || "{}"); } catch { return {}; }
  });

  // ─── Expense Tracking State ───
  const [expenses, setExpenses] = useState([]);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('food');
  const [expensePaidBy, setExpensePaidBy] = useState('');
  const [expenseSplitMethod, setExpenseSplitMethod] = useState('equal');
  const [expenseParticipants, setExpenseParticipants] = useState([]);
  const [expenseCustomSplits, setExpenseCustomSplits] = useState({});
  const [showSettlement, setShowSettlement] = useState(false);

  // Auth state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [joinShareCode, setJoinShareCode] = useState("");

  // ─── New Trip Wizard State ───
  const [wizTrip, setWizTrip] = useState({ name: "", brief: "", start: "", end: "", places: [], travel: new Set(), budget: "", startLocation: "" });
  const [wizTravellers, setWizTravellers] = useState({ adults: [{ name: "You", email: "", isLead: true }], olderKids: [], youngerKids: [] });
  const [wizStays, setWizStays] = useState([]);
  const [wizPrefs, setWizPrefs] = useState({ food: new Set(), adultActs: new Set(), olderActs: new Set(), youngerActs: new Set(), instructions: "" });
  const [staySearch, setStaySearch] = useState("");
  const [staySearchOpen, setStaySearchOpen] = useState(false);
  const [placeInput, setPlaceInput] = useState("");
  const [placeSuggestionsOpen, setPlaceSuggestionsOpen] = useState(false);
  const [foodSearch, setFoodSearch] = useState("");
  const [adultActSearch, setAdultActSearch] = useState("");
  const [olderActSearch, setOlderActSearch] = useState("");
  const [youngerActSearch, setYoungerActSearch] = useState("");
  const [expandedPrefSections, setExpandedPrefSections] = useState(new Set());
  const [wizShowErrors, setWizShowErrors] = useState(false);
  const [lastChatTopic, setLastChatTopic] = useState("");
  const [chatTyping, setChatTyping] = useState(false);
  const [tripChatTyping, setTripChatTyping] = useState(false);
  const [chatFlowStep, setChatFlowStep] = useState(null); // null | "ask_start" | "ask_pickups" | "ask_time" | "route_shown" | "ask_home" | "ask_departure_time" | "departure_shown"
  const [chatFlowData, setChatFlowData] = useState({});
  const [toast, setToast] = useState(null);
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem('twm_welcomed'));
  const [showDemo, setShowDemo] = useState(false);
  const [demoSlide, setDemoSlide] = useState(0);
  const [demoTick, setDemoTick] = useState(0);
  const [demoPaused, setDemoPaused] = useState(false);
  const [demoInteracted, setDemoInteracted] = useState({});
  const demoTimerRef = useRef(null);
  const demoTickRef = useRef(null);

  // Auto-scroll trip chat to bottom when messages change
  useEffect(() => {
    if (tripChatEndRef.current) tripChatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [tripChatMessages, tripChatTyping]);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const resetWizard = useCallback(() => {
    setWizTrip({ name: "", brief: "", start: "", end: "", places: [], travel: new Set(), budget: "", startLocation: "" });
    setWizTravellers({ adults: [{ name: "You", email: "", isLead: true }], olderKids: [], youngerKids: [] });
    setWizStays([]);
    setWizPrefs({ food: new Set(), adultActs: new Set(), olderActs: new Set(), youngerActs: new Set(), instructions: "" });
    setStaySearch("");
    setStaySearchOpen(false);
    setPlaceInput("");
    setPlaceSuggestionsOpen(false);
    setFoodSearch("");
    setAdultActSearch("");
    setOlderActSearch("");
    setYoungerActSearch("");
    setWizStep(0);
  }, []);

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Check for share code in URL and fetch trip data
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setJoinShareCode(joinCode);
      // Fetch trip by share code from Supabase
      lookupTripByShareCode(joinCode).then(data => {
        if (data) {
          const mapped = mapTripFromDB(data);
          setSelectedCreatedTrip(mapped);
          setScreen('joinPreview');
        } else {
          setScreen('joinPreview');
        }
      });
    }
  }, []);

  // ─── Real-time Sync — Supabase Realtime subscriptions ───
  useEffect(() => {
    if (!user || user.id === 'demo') return;

    const channel = supabase.channel('trip-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, (payload) => {
        if (payload.eventType === 'UPDATE' && payload.new) {
          const updated = payload.new;
          setCreatedTrips(prev => prev.map(t => {
            if (t.dbId === updated.id) {
              return { ...t, name: updated.name || t.name, status: updated.status || t.status,
                start: updated.start_date || t.start, end: updated.end_date || t.end,
                places: updated.places || t.places, travel: updated.travel_modes || t.travel };
            }
            return t;
          }));
          // Update selected trip if it's the one being viewed
          setSelectedCreatedTrip(prev => {
            if (prev?.dbId === updated.id) {
              return { ...prev, name: updated.name || prev.name, status: updated.status || prev.status,
                start: updated.start_date || prev.start, end: updated.end_date || prev.end,
                places: updated.places || prev.places, travel: updated.travel_modes || prev.travel };
            }
            return prev;
          });
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trip_travellers' }, (payload) => {
        if (payload.new) {
          const newTraveller = payload.new;
          setCreatedTrips(prev => prev.map(t => {
            if (t.dbId === newTraveller.trip_id) {
              const role = newTraveller.role;
              const entry = { name: newTraveller.name, dbId: newTraveller.id, email: newTraveller.email || "" };
              const travellers = { ...t.travellers };
              if (role === 'lead' || role === 'adult') {
                travellers.adults = [...(travellers.adults || []), { ...entry, isLead: role === 'lead', isClaimed: newTraveller.is_claimed }];
              } else if (role === 'child_older') {
                travellers.olderKids = [...(travellers.olderKids || []), { ...entry, age: newTraveller.age || 10 }];
              } else if (role === 'child_younger') {
                travellers.youngerKids = [...(travellers.youngerKids || []), { ...entry, age: newTraveller.age || 5 }];
              }
              return { ...t, travellers };
            }
            return t;
          }));
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'trip_travellers' }, (payload) => {
        if (payload.new?.is_claimed) {
          // A co-traveller claimed their slot — show a toast
          showToast(`${payload.new.name || "Someone"} joined the trip!`);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ─── Chat Persistence: Load messages from Supabase ───
  const loadTripMessages = async (tripDbId) => {
    if (!tripDbId) return;
    try {
      const { data } = await supabase.from('messages').select('*').eq('trip_id', tripDbId).order('created_at', { ascending: true });
      if (data && data.length > 0) {
        setTripChatMessages(data.map(m => ({ id: m.id, role: m.sender_role || 'user', text: m.text, senderName: m.sender_name })));
      }
    } catch (e) { /* messages table may not exist yet — silent fail */ }
  };
  const saveChatMessage = async (tripDbId, role, text, senderName) => {
    if (!tripDbId) return;
    try {
      await supabase.from('messages').insert({ trip_id: tripDbId, sender_role: role, text, sender_name: senderName || (role === 'ai' ? 'Trip With Me AI' : 'You') });
    } catch (e) { /* silent fail if table doesn't exist */ }
  };

  // ─── Expense Functions ───
  const getExpenseParticipantDefaults = (trip) => {
    // Default: all adults (one per family, kids aren't expense participants)
    return (trip?.travellers?.adults || []).map(a => a.name).filter(Boolean);
  };

  const loadExpenses = async (tripDbId) => {
    if (!tripDbId) return;
    try {
      const { data } = await supabase.from('expenses').select('*, expense_splits(*)').eq('trip_id', tripDbId).order('created_at', { ascending: false });
      setExpenses((data || []).map(e => ({ ...e, splits: e.expense_splits || [] })));
    } catch (e) { setExpenses([]); }
  };

  const loadTripPhotos = async (tripId) => {
    if (!tripId) return;
    try {
      const { data } = await supabase.from('trip_photos').select('*').eq('trip_id', tripId).order('sort_order', { ascending: true });
      if (data && data.length > 0) {
        setUploadedPhotos(data.map(p => ({
          id: p.id, url: p.file_url, name: p.file_name, day: p.day_tag || "Untagged",
          liked: p.liked || false, caption: p.caption || "", sortOrder: p.sort_order || 0,
          filePath: p.file_path, uploadDate: new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        })));
      }
    } catch (e) { /* table may not exist */ }
  };

  const updatePhotoInSupabase = async (photoId, updates) => {
    try { await supabase.from('trip_photos').update(updates).eq('id', photoId); } catch (e) { /* ignore */ }
  };

  const deletePhotoFromSupabase = async (photo) => {
    try {
      if (photo.filePath) await supabase.storage.from('trip-photos').remove([photo.filePath]);
      await supabase.from('trip_photos').delete().eq('id', photo.id);
    } catch (e) { /* ignore */ }
  };

  const resetExpenseForm = () => {
    setExpenseDesc(''); setExpenseAmount(''); setExpenseCategory('food');
    setExpensePaidBy(''); setExpenseSplitMethod('equal'); setExpenseParticipants([]);
    setExpenseCustomSplits({}); setShowAddExpense(false); setEditingExpense(null);
  };

  const saveExpense = async (trip) => {
    const amount = parseFloat(expenseAmount);
    if (!expenseDesc.trim() || isNaN(amount) || amount <= 0 || !expensePaidBy || expenseParticipants.length === 0) {
      showToast("Fill in all fields", "error"); return;
    }
    const tripDbId = trip.dbId || trip.id;
    let splits;
    const selected = expenseParticipants;
    if (expenseSplitMethod === 'equal') {
      const share = Math.round((amount / selected.length) * 100) / 100;
      splits = selected.map((name, i) => ({
        participant_name: name,
        share_amount: i === selected.length - 1 ? Math.round((amount - share * (selected.length - 1)) * 100) / 100 : share,
      }));
    } else if (expenseSplitMethod === 'percentage') {
      const totalPct = selected.reduce((s, n) => s + (parseFloat(expenseCustomSplits[n]) || 0), 0);
      if (Math.abs(totalPct - 100) > 0.5) { showToast("Percentages must add up to 100%", "error"); return; }
      splits = selected.map(name => ({
        participant_name: name,
        share_amount: Math.round(amount * (parseFloat(expenseCustomSplits[name]) || 0) / 100 * 100) / 100,
        share_percentage: parseFloat(expenseCustomSplits[name]) || 0,
      }));
    } else {
      const totalCustom = selected.reduce((s, n) => s + (parseFloat(expenseCustomSplits[n]) || 0), 0);
      if (Math.abs(totalCustom - amount) > 0.01) { showToast(`Custom amounts must add up to \u00A3${amount.toFixed(2)}`, "error"); return; }
      splits = selected.map(name => ({
        participant_name: name,
        share_amount: parseFloat(expenseCustomSplits[name]) || 0,
      }));
    }
    if (editingExpense) {
      // Update existing — update local state first (optimistic)
      const updatedExpense = { ...editingExpense, description: expenseDesc.trim(), amount, category: expenseCategory, paid_by: expensePaidBy, split_method: expenseSplitMethod, updated_at: new Date().toISOString(), splits };
      setExpenses(prev => prev.map(e => e.id === editingExpense.id ? updatedExpense : e));
      try {
        await supabase.from('expense_splits').delete().eq('expense_id', editingExpense.id);
        await supabase.from('expenses').update({
          description: expenseDesc.trim(), amount, category: expenseCategory,
          paid_by: expensePaidBy, split_method: expenseSplitMethod, updated_at: new Date().toISOString(),
        }).eq('id', editingExpense.id);
        await supabase.from('expense_splits').insert(splits.map(s => ({ expense_id: editingExpense.id, ...s })));
      } catch (e) { /* local state already updated */ }
      showToast("Expense updated");
    } else {
      // Add new — add to local state first (optimistic), then try Supabase
      const localExpense = {
        id: `local_${Date.now()}`, trip_id: tripDbId, description: expenseDesc.trim(), amount, category: expenseCategory,
        paid_by: expensePaidBy, split_method: expenseSplitMethod, created_at: new Date().toISOString(),
        created_by: user?.user_metadata?.full_name || user?.email || 'You', splits,
      };
      setExpenses(prev => [localExpense, ...prev]);
      try {
        const { data: exp } = await supabase.from('expenses').insert({
          trip_id: tripDbId, description: expenseDesc.trim(), amount, category: expenseCategory,
          paid_by: expensePaidBy, split_method: expenseSplitMethod,
          created_by: user?.user_metadata?.full_name || user?.email || 'You',
        }).select().single();
        if (exp) {
          await supabase.from('expense_splits').insert(splits.map(s => ({ expense_id: exp.id, ...s })));
          // Replace local placeholder with server data
          setExpenses(prev => prev.map(e => e.id === localExpense.id ? { ...exp, splits: splits.map(s => ({ expense_id: exp.id, ...s })) } : e));
        }
      } catch (e) { /* local state already has the expense */ }
      showToast("Expense added");
      const expTrip = selectedCreatedTrip || createdTrips[0];
      if (expTrip?.id) logActivity(expTrip.id, "💰", `Added expense: ${expenseTitle} (${expenseCurrency}${expenseAmount})`, "expense");
    }
    resetExpenseForm();
  };

  const deleteExpense = async (expenseId, tripDbId) => {
    try {
      await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
      await supabase.from('expenses').delete().eq('id', expenseId);
      showToast("Expense removed");
      loadExpenses(tripDbId);
    } catch (e) { showToast("Failed to delete", "error"); }
  };

  const calculateSettlement = (expensesList) => {
    const balances = {};
    expensesList.forEach(exp => {
      balances[exp.paid_by] = (balances[exp.paid_by] || 0) + exp.amount;
      (exp.splits || []).forEach(s => {
        balances[s.participant_name] = (balances[s.participant_name] || 0) - s.share_amount;
      });
    });
    const creditors = [], debtors = [];
    Object.entries(balances).forEach(([name, bal]) => {
      if (bal > 0.01) creditors.push({ name, amount: bal });
      else if (bal < -0.01) debtors.push({ name, amount: -bal });
    });
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
    const settlements = [];
    let ci = 0, di = 0;
    while (ci < creditors.length && di < debtors.length) {
      const amt = Math.min(creditors[ci].amount, debtors[di].amount);
      if (amt > 0.01) settlements.push({ from: debtors[di].name, to: creditors[ci].name, amount: Math.round(amt * 100) / 100 });
      creditors[ci].amount -= amt; debtors[di].amount -= amt;
      if (creditors[ci].amount < 0.01) ci++;
      if (debtors[di].amount < 0.01) di++;
    }
    return settlements;
  };

  const getCategoryBreakdown = (expensesList) => {
    const byCategory = {};
    expensesList.forEach(e => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
    const total = Object.values(byCategory).reduce((a, b) => a + b, 0);
    return Object.entries(byCategory).map(([cat, amount]) => ({
      ...getCatInfo(cat), amount, percentage: total > 0 ? (amount / total) * 100 : 0,
    })).sort((a, b) => b.amount - a.amount);
  };

  // Trip Reel auto-advance timer
  useEffect(() => {
    if (reelPlaying && !reelPaused && uploadedPhotos.length > 0) {
      const baseDuration = reelStyle === "energetic" ? 2000 : reelStyle === "slideshow" ? 3000 : 4000;
      const reelDuration = videoSettings.has("Slow-mo") ? baseDuration * 1.5 : baseDuration;
      reelTimerRef.current = setInterval(() => {
        setReelIndex(prev => {
          if (prev >= uploadedPhotos.length - 1) {
            setReelPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, reelDuration);
    }
    return () => { if (reelTimerRef.current) clearInterval(reelTimerRef.current); };
  }, [reelPlaying, reelPaused, uploadedPhotos.length, reelStyle, videoSettings]);

  // Demo animation tick — drives all animations
  useEffect(() => {
    if (showDemo && !demoPaused) {
      demoTickRef.current = setInterval(() => setDemoTick(t => t + 1), 220);
    }
    return () => { if (demoTickRef.current) clearInterval(demoTickRef.current); };
  }, [showDemo, demoPaused]);

  // Demo auto-advance slides (ticks at 220ms each)
  const DEMO_SLIDE_DURATIONS = [62, 56, 54, 72, 58, 62, 58, 56, 54, 999];
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

  const signInWithGoogle = async () => {
    setAuthError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
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
      options: { data: { full_name: authName || authEmail.split("@")[0] } }
    });
    if (error) setAuthError(error.message);
    else setAuthError("Check your email for a confirmation link!");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("home");
  };

  // Load trips from Supabase
  const loadTripsFromDB = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const { data: trips, error } = await supabase
        .from('trips')
        .select('*, trip_travellers(*), trip_stays(*), trip_preferences(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (trips && trips.length > 0) {
        const mapped = trips.map(t => mapTripFromDB(t));
        setCreatedTrips(mapped);
      }
    } catch (err) {
      console.error('Error loading trips:', err);
      showToast("Failed to save — check connection", "error");
    }
    setSyncing(false);
  }, [user, showToast]);

  // Save trip to Supabase
  const saveTripToDB = async (tripData) => {
    if (!user || user.id === 'demo') return tripData;

    try {
      const { data: trip, error: tripError } = await supabase
        .from('trips')
        .insert(mapTripForInsert(tripData, user.id))
        .select()
        .single();

      if (tripError) throw tripError;

      const travellerRows = mapTravellersForInsert(tripData, trip.id, user.id);
      if (travellerRows.length > 0) {
        await supabase.from('trip_travellers').insert(travellerRows);
      }

      const stayRows = mapStaysForInsert(tripData.stays, trip.id);
      if (stayRows.length > 0) {
        await supabase.from('trip_stays').insert(stayRows);
      }

      const prefsRow = mapPrefsForInsert(tripData.prefs, trip.id);
      if (prefsRow) {
        await supabase.from('trip_preferences').insert(prefsRow);
      }

      return { ...tripData, id: trip.id, shareCode: trip.share_code, dbId: trip.id };
    } catch (err) {
      console.error('Error saving trip:', err);
      showToast("Failed to save — check connection", "error");
      return tripData;
    }
  };

  // Update trip status in Supabase
  const updateTripStatusInDB = async (tripId, status) => {
    if (!user || user.id === 'demo' || !tripId) return;
    try {
      await supabase.from('trips').update({ status, updated_at: new Date().toISOString() }).eq('id', tripId);
    } catch (err) {
      console.error('Error updating trip status:', err);
    }
  };

  // Look up trip by share code
  const lookupTripByShareCode = async (code) => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*, trip_travellers(*), trip_stays(*), trip_preferences(*)')
        .eq('share_code', code.toUpperCase())
        .single();
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error looking up trip:', err);
      return null;
    }
  };

  // Join trip as traveller
  const joinTripAsTraveller = async (tripId, travellerId, userName) => {
    if (!user || user.id === 'demo') return false;
    try {
      await supabase.from('trip_travellers')
        .update({ user_id: user.id, is_claimed: true, name: userName, joined_at: new Date().toISOString() })
        .eq('id', travellerId);
      return true;
    } catch (err) {
      console.error('Error joining trip:', err);
      return false;
    }
  };

  // Load trips when user logs in
  useEffect(() => {
    if (user && user.id !== 'demo') {
      loadTripsFromDB();
    }
  }, [user, loadTripsFromDB]);

  const buildTripSummary = (trip) => {
    const parts = [];
    // Smart numDays: prefer stay date span if available
    let numDays = null;
    const stays = trip.stays || [];
    if (stays.length > 0) {
      const checkIns = stays.map(s => s.checkIn).filter(Boolean).sort();
      const checkOuts = stays.map(s => s.checkOut).filter(Boolean).sort();
      if (checkIns.length > 0 && checkOuts.length > 0) {
        const stayStart = checkIns[0];
        const stayEnd = checkOuts[checkOuts.length - 1];
        const stayDays = Math.max(1, Math.round((new Date(stayEnd + "T12:00:00") - new Date(stayStart + "T12:00:00")) / 86400000) + 1);
        const rawDays = trip.rawStart && trip.rawEnd ? Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1) : null;
        if (rawDays && stayDays < rawDays && stayDays <= 30) {
          numDays = stayDays;
        } else {
          numDays = rawDays;
        }
      }
    }
    if (!numDays) {
      numDays = trip.rawStart && trip.rawEnd ? Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1) : null;
    }
    if (numDays && trip.places?.length > 0) parts.push(`${numDays}-day trip to ${trip.places.join(", ")}`);
    if (trip.travel?.length > 0) parts.push(`travelling by ${trip.travel.join(" + ").toLowerCase()}`);
    if (trip.startLocation) parts.push(`starting from ${trip.startLocation}`);
    const na = trip.travellers?.adults?.length || 0, nok = trip.travellers?.olderKids?.length || 0, nyk = trip.travellers?.youngerKids?.length || 0;
    const gp = [];
    if (na > 0) gp.push(`${na} adult${na > 1 ? "s" : ""}`);
    if (nok > 0) gp.push(`${nok} older kid${nok > 1 ? "s" : ""} (${trip.travellers.olderKids.map(k => `${k.name || "child"}, ${k.age}`).join("; ")})`);
    if (nyk > 0) gp.push(`${nyk} younger kid${nyk > 1 ? "s" : ""} (${trip.travellers.youngerKids.map(k => `${k.name || "child"}, ${k.age}`).join("; ")})`);
    if (gp.length) parts.push(`group: ${gp.join(", ")}`);
    if (trip.budget) parts.push(`${trip.budget.toLowerCase()} budget`);
    if (trip.prefs?.food?.length > 0) parts.push(`food preferences: ${trip.prefs.food.join(", ")}`);
    if (trip.prefs?.adultActs?.length > 0) parts.push(`adult activities: ${trip.prefs.adultActs.join(", ")}`);
    if (trip.prefs?.olderActs?.length > 0) parts.push(`older kids activities: ${trip.prefs.olderActs.join(", ")}`);
    if (trip.prefs?.youngerActs?.length > 0) parts.push(`younger kids activities: ${trip.prefs.youngerActs.join(", ")}`);
    if (trip.stayNames?.length > 0) parts.push(`staying at ${trip.stayNames.join(", ")}`);
    const allKids = [...(trip.travellers?.olderKids || []), ...(trip.travellers?.youngerKids || [])];
    if (allKids.length > 0) {
      const ages = allKids.map(k => parseInt(k.age) || 0);
      const youngest = Math.min(...ages);
      if (youngest <= 5) parts.push("young children in group — plan short activity blocks and rest breaks");
      else if (youngest <= 10) parts.push("children in group — mix family-friendly with adult activities");
    }
    if (trip.prefs?.instructions) parts.push(trip.prefs.instructions);
    return parts.join(". ") + (parts.length ? "." : "");
  };

  const createTrip = async () => {
    if (wizTrip.name.trim().length < 2) {
      alert("Please enter a trip name (at least 2 characters)");
      return;
    }
    setSaving(true);
    const name = wizTrip.name.trim();
    const formatDate = (d) => { if (!d) return ""; const dt = new Date(d + "T12:00:00"); return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
    // Smart dates: if stays exist and their span is shorter than entered dates, use stay dates
    let effectiveStart = wizTrip.start;
    let effectiveEnd = wizTrip.end;
    if (wizStays.length > 0 && !wizTrip.start && !wizTrip.end) {
      const cis = wizStays.map(s => s.checkIn).filter(Boolean).sort();
      const cos = wizStays.map(s => s.checkOut).filter(Boolean).sort();
      if (cis.length > 0 && cos.length > 0) {
        effectiveStart = cis[0];
        effectiveEnd = cos[cos.length - 1];
      }
    }
    const tripData = {
      name,
      brief: wizTrip.brief,
      start: formatDate(effectiveStart),
      end: formatDate(effectiveEnd),
      rawStart: effectiveStart,
      rawEnd: effectiveEnd,
      year: effectiveStart ? new Date(effectiveStart + "T12:00:00").getFullYear() : new Date().getFullYear(),
      places: [...wizTrip.places],
      travel: [...wizTrip.travel],
      budget: wizTrip.budget,
      startLocation: wizTrip.startLocation,
      travellers: { adults: wizTravellers.adults.map(a => ({ ...a })), olderKids: wizTravellers.olderKids.map(c => ({ ...c })), youngerKids: wizTravellers.youngerKids.map(c => ({ ...c })) },
      stays: [...wizStays],
      stayNames: wizStays.map(s => s.name || s),
      prefs: { food: [...wizPrefs.food], activities: [...wizPrefs.adultActs, ...wizPrefs.olderActs, ...wizPrefs.youngerActs], adultActs: [...wizPrefs.adultActs], olderActs: [...wizPrefs.olderActs], youngerActs: [...wizPrefs.youngerActs], instructions: wizPrefs.instructions || "" },
    };
    tripData.summary = buildTripSummary(tripData);
    if (editingTripId) {
      // Update existing trip, preserve status and timeline
      setCreatedTrips(prev => prev.map(t => {
        if (t.id !== editingTripId) return t;
        const updated = { ...t, ...tripData };
        // Regenerate timeline if live
        if (t.status === "live") updated.timeline = generateMultiDayTimeline(updated);
        return updated;
      }));
      const updatedTrip = { ...createdTrips.find(t => t.id === editingTripId), ...tripData };
      setSelectedCreatedTrip(updatedTrip);
      setEditingTripId(null);
      setSaving(false);
      navigate("createdTrip");
    } else {
      const newTrip = { id: Date.now(), ...tripData, status: "new", timeline: [], polls: [], activity: [], shareCode: Math.random().toString(36).substring(2, 8).toUpperCase() };
      setCreatedTrips(prev => [newTrip, ...prev]);
      // Save to Supabase
      if (user && user.id !== 'demo') {
        saveTripToDB(newTrip).then(savedTrip => {
          if (savedTrip.dbId) {
            setCreatedTrips(prev => prev.map(t => t.id === newTrip.id ? { ...t, dbId: savedTrip.dbId, shareCode: savedTrip.shareCode } : t));
            showToast("Saved to cloud", "success");
          }
        }).catch(() => {
          showToast("Failed to save — check connection", "error");
        });
      }
      setEditingTripId(null);
      setSaving(false);
      showToast("Trip created!");
      setSelectedCreatedTrip(newTrip);
      navigate("createdTrip");
    }
  };

  // ─── Activity log helper ───
  const logActivity = (tripId, icon, text, type = "info") => {
    const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "You";
    const entry = { id: Date.now(), icon, text, by: userName, time: new Date().toISOString(), type };
    setCreatedTrips(prev => prev.map(t => t.id === tripId ? { ...t, activity: [entry, ...(t.activity || [])].slice(0, 50) } : t));
  };

  // ─── Notification helpers ───
  const getUnreadCount = useCallback((tripId) => {
    const trip = createdTrips.find(t => t.id === tripId);
    if (!trip) return 0;
    const lastSeen = lastSeenActivity[tripId] || 0;
    return (trip.activity || []).filter(a => new Date(a.time).getTime() > lastSeen).length;
  }, [createdTrips, lastSeenActivity]);

  const totalUnread = createdTrips.reduce((sum, t) => sum + getUnreadCount(t.id), 0);

  const markTripSeen = useCallback((tripId) => {
    setLastSeenActivity(prev => {
      const next = { ...prev, [tripId]: Date.now() };
      try { localStorage.setItem("twm_lastSeen", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const allRecentActivity = createdTrips
    .flatMap(t => (t.activity || []).map(a => ({ ...a, tripId: t.id, tripName: t.name })))
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 30);

  // ─── Smart time slot finder for chat additions ───
  const findSmartSlot = useCallback((tripId, day, itemType) => {
    const trip = createdTrips.find(t => t.id === tripId);
    const dayItems = (trip?.timeline || {})[day] || [];
    const existingTimes = dayItems.map(item => {
      const m = item.time?.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!m) return null;
      let h = parseInt(m[1]); const min = parseInt(m[2]); const ampm = m[3].toUpperCase();
      if (ampm === "PM" && h !== 12) h += 12; if (ampm === "AM" && h === 12) h = 0;
      return h * 60 + min;
    }).filter(Boolean);

    const isRestaurant = /restaurant|food|eat|cafe|dinner|lunch|breakfast|brunch/i.test(itemType);
    if (isRestaurant) {
      // Try lunch first (12:30), then dinner (7:00), then breakfast (8:30)
      const slots = [
        { time: "12:30 PM", mins: 750, label: "Lunch" },
        { time: "7:00 PM", mins: 1140, label: "Dinner" },
        { time: "8:30 AM", mins: 510, label: "Breakfast" },
        { time: "1:00 PM", mins: 780, label: "Lunch" },
        { time: "6:30 PM", mins: 1110, label: "Dinner" },
      ];
      for (const slot of slots) {
        if (!existingTimes.some(t => Math.abs(t - slot.mins) < 60)) return slot;
      }
      return { time: "12:30 PM", mins: 750, label: "Meal" };
    }
    // Activity — try morning, afternoon, evening
    const actSlots = [
      { time: "10:00 AM", mins: 600, label: "Morning" },
      { time: "2:30 PM", mins: 870, label: "Afternoon" },
      { time: "4:00 PM", mins: 960, label: "Afternoon" },
      { time: "11:00 AM", mins: 660, label: "Morning" },
    ];
    for (const slot of actSlots) {
      if (!existingTimes.some(t => Math.abs(t - slot.mins) < 45)) return slot;
    }
    return { time: "2:00 PM", mins: 840, label: "Activity" };
  }, [createdTrips]);

  // ─── WhatsApp share helper ───
  const shareToWhatsApp = (tripName, message, tripId) => {
    const link = `${window.location.origin}/join/${tripId}`;
    const text = `${message}\n\n${tripName} on TripWithMe\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const deleteCreatedTrip = async (id) => {
    const trip = createdTrips.find(t => t.id === id);
    if (!window.confirm("Remove '" + (trip?.name || "this trip") + "'? This cannot be undone.")) return;
    // Sync deletion to Supabase if user is authenticated and trip has a DB ID
    if (user && user.id !== 'demo' && trip?.dbId) {
      try {
        await supabase.from('trip_preferences').delete().eq('trip_id', trip.dbId);
        await supabase.from('trip_stays').delete().eq('trip_id', trip.dbId);
        await supabase.from('trip_travellers').delete().eq('trip_id', trip.dbId);
        await supabase.from('trips').delete().eq('id', trip.dbId);
      } catch (err) {
        console.error('Error deleting trip from DB:', err);
        showToast("Failed to delete from cloud", "error");
      }
    }
    setCreatedTrips(prev => prev.filter(t => t.id !== id));
    showToast("Trip removed");
  };

  const generateTimeline = (trip) => {
    const items = [];
    const loc = trip.places[0] || "your destination";
    const stayName = trip.stayNames[0] || "accommodation";
    const food = trip.prefs.food.length > 0 ? trip.prefs.food : ["Local cuisine"];
    const foodLabel = food.join(" + ");
    const travelMode = trip.travel[0] || "Travel";
    const adultActs = trip.prefs.adultActs || [];
    const olderActs = trip.prefs.olderActs || [];
    const youngerActs = trip.prefs.youngerActs || [];
    const kidActs = [...new Set([...olderActs, ...youngerActs])];
    const allKids = [...(trip.travellers?.olderKids || []), ...(trip.travellers?.youngerKids || [])];
    const hasKids = allKids.length > 0;
    const budgetTier = { "Budget": { label: "budget-friendly", price: "£" }, "Mid-range": { label: "mid-range", price: "££" }, "Luxury": { label: "upscale", price: "£££" }, "No limit": { label: "top-rated", price: "££££" } }[trip.budget] || { label: "local", price: "££" };
    const ctx = (trip.summary || "") + " " + (trip.prefs.instructions || "");
    const ctxLower = ctx.toLowerCase();

    // Parse instruction keywords for modifiers
    const wantsDogFriendly = /dog|pet/.test(ctxLower);
    const wantsAccessible = /accessible|wheelchair|mobility|pushchair|buggy|pram/.test(ctxLower);
    const wantsLateStart = /late start|sleep in|no rush|relaxed morning/.test(ctxLower);
    const wantsShortBlocks = /short.*block|short.*activit|restless|young child|toddler/.test(ctxLower);
    const wantsAvoidSteep = /avoid.*steep|no.*steep|gentle|easy.*walk|flat/.test(ctxLower);
    const wantsPubs = /pub|pubs|tavern|inn/.test(ctxLower);

    // Timing modifiers
    const arriveTime = wantsLateStart ? "11:00 AM" : "9:00 AM";
    const morningTime = wantsLateStart ? "12:00 PM" : "10:30 AM";
    const lunchTime = wantsLateStart ? "1:30 PM" : "12:30 PM";
    const afternoonTime = wantsLateStart ? "3:00 PM" : "2:30 PM";
    const returnTime = "5:00 PM";
    const dinnerTime = "7:00 PM";

    // Tag builder
    const tags = (base) => {
      const t = [base];
      if (wantsDogFriendly) t.push("🐕 Dog-friendly");
      if (wantsAccessible) t.push("♿ Accessible");
      return t.join(" · ");
    };

    // Arrival
    const arriveDesc = trip.startLocation ? `${travelMode} from ${trip.startLocation} · Check in at ${stayName}` : `${travelMode} · Check in at ${stayName}`;
    items.push({ time: arriveTime, title: `Arrive ${loc}`, desc: arriveDesc, group: "Everyone", color: T.a });

    // Morning activity
    let morningAct = adultActs[0] || "Explore the area";
    if (wantsAvoidSteep && /hik|trail|climb|trek/.test(morningAct.toLowerCase())) morningAct = "Gentle walking tour";
    const morningDesc = tags(`${loc} · ${budgetTier.label}`);
    if (hasKids && kidActs.length > 0) {
      items.push({ time: morningTime, title: morningAct, desc: morningDesc, group: "Adults", color: T.blue });
      items.push({ time: morningTime, title: kidActs[0], desc: tags(`${loc} · Family-friendly`), group: "Kids", color: T.pink });
    } else {
      items.push({ time: morningTime, title: morningAct, desc: morningDesc, group: "Everyone", color: T.blue });
    }

    // Rest break for young kids
    if (wantsShortBlocks && hasKids) {
      const youngest = allKids.map(k => `${k.name || "child"}`).join(" & ");
      items.push({ time: wantsLateStart ? "1:00 PM" : "11:45 AM", title: `Rest break`, desc: `Snack stop for ${youngest} · Keep energy up`, group: "Kids", color: T.amber });
    }

    // Lunch
    const lunchDesc = wantsPubs ? `${budgetTier.label} pub · ${budgetTier.price}` : `${budgetTier.label} restaurant · ${budgetTier.price}`;
    const dietaryTags = [];
    if (food.some(f => /vegetarian|vegan/i.test(f))) dietaryTags.push("🥬 Veggie options");
    if (food.some(f => /halal/i.test(f))) dietaryTags.push("Halal");
    if (food.some(f => /gluten/i.test(f))) dietaryTags.push("GF options");
    if (hasKids && food.some(f => /kid/i.test(f))) dietaryTags.push("Kids menu");
    const lunchExtra = dietaryTags.length > 0 ? ` · ${dietaryTags.join(", ")}` : "";
    items.push({ time: lunchTime, title: `Lunch — ${foodLabel}`, desc: `${lunchDesc}${lunchExtra}${wantsDogFriendly ? " · 🐕 Dog-friendly" : ""}`, group: "Everyone", color: T.coral });

    // Afternoon activity
    let afternoonAdult = adultActs[1] || "Walking tour & sightseeing";
    if (wantsAvoidSteep && /hik|trail|climb|trek/.test(afternoonAdult.toLowerCase())) afternoonAdult = "Scenic drive & viewpoints";
    if (hasKids && kidActs.length > 1) {
      items.push({ time: afternoonTime, title: afternoonAdult, desc: tags(`${loc} · Afternoon`), group: "Adults", color: T.blue });
      items.push({ time: afternoonTime, title: kidActs[1] || "Playground & free time", desc: tags(`${loc} · Fun for kids`), group: "Kids", color: T.pink });
    } else if (hasKids && wantsShortBlocks) {
      items.push({ time: afternoonTime, title: afternoonAdult, desc: tags(`${loc} · Short session (1hr)`), group: "Everyone", color: T.blue });
      items.push({ time: "3:30 PM", title: "Free time & play", desc: `Let kids recharge · ${stayName} area`, group: "Everyone", color: T.pink });
    } else {
      items.push({ time: afternoonTime, title: afternoonAdult, desc: tags(`${loc} · Afternoon`), group: "Everyone", color: T.blue });
    }

    // Return + Dinner
    items.push({ time: returnTime, title: `Return to ${stayName}`, desc: "Relax & freshen up", group: "Everyone", color: T.t3 });
    const dinnerDesc = wantsPubs ? `${foodLabel} · ${budgetTier.label} pub · ${budgetTier.price}` : `${foodLabel} · ${budgetTier.label} · ${budgetTier.price}`;
    items.push({ time: dinnerTime, title: wantsPubs ? "Dinner at local pub" : "Dinner", desc: `${dinnerDesc}${wantsDogFriendly ? " · 🐕 Dog-friendly" : ""}${lunchExtra}`, group: "Everyone", color: T.coral });

    return items;
  };

  // Multi-day timeline: returns { 1: [...], 2: [...], ... }
  const generateMultiDayTimeline = (trip) => {
    // Smart numDays: prefer stay date span if stays indicate shorter trip
    let numDays = 1;
    const stays = trip.stays || [];
    if (stays.length > 0) {
      const checkIns = stays.map(s => s.checkIn).filter(Boolean).sort();
      const checkOuts = stays.map(s => s.checkOut).filter(Boolean).sort();
      if (checkIns.length > 0 && checkOuts.length > 0) {
        const stayStart = checkIns[0];
        const stayEnd = checkOuts[checkOuts.length - 1];
        const stayDays = Math.max(1, Math.round((new Date(stayEnd + "T12:00:00") - new Date(stayStart + "T12:00:00")) / 86400000) + 1);
        const rawDays = trip.rawStart && trip.rawEnd ? Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1) : null;
        if (rawDays && stayDays < rawDays && stayDays <= 30) {
          numDays = stayDays;
        } else {
          numDays = rawDays || stayDays;
        }
      }
    }
    if (numDays <= 1 && trip.rawStart && trip.rawEnd) {
      numDays = Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1);
    }
    const food = trip.prefs.food.length > 0 ? trip.prefs.food : ["Local cuisine"];
    const foodLabel = food.join(" + ");
    const travelMode = trip.travel[0] || "Travel";
    const allKids = [...(trip.travellers?.olderKids || []), ...(trip.travellers?.youngerKids || [])];
    const hasKids = allKids.length > 0;
    const budgetTier = { "Budget": { label: "budget-friendly", price: "£" }, "Mid-range": { label: "mid-range", price: "££" }, "Luxury": { label: "upscale", price: "£££" }, "No limit": { label: "top-rated", price: "££££" } }[trip.budget] || { label: "local", price: "££" };
    const ctx = (trip.summary || "") + " " + (trip.prefs.instructions || "");
    const ctxLower = ctx.toLowerCase();
    const wantsDogFriendly = /dog|pet/.test(ctxLower);
    const wantsAccessible = /accessible|wheelchair|mobility|pushchair|buggy|pram/.test(ctxLower);
    const wantsPubs = /pub|pubs|tavern|inn/.test(ctxLower);
    const wantsAvoidSteep = /avoid.*steep|no.*steep|gentle|easy.*walk|flat/.test(ctxLower);
    const prefs = trip.activationPrefs || {};
    const startHour = prefs.startTime ? parseInt(prefs.startTime.split(":")[0]) : 8;
    const startMin = prefs.startTime ? parseInt(prefs.startTime.split(":")[1] || "0") : 0;
    const isPacked = prefs.dayOnePace === "packed";
    const isRelaxed = prefs.dayOnePace === "relaxed";
    const isEV = trip.travel?.some(m => /ev/i.test(m));
    const enabledStops = (prefs.stopovers || []).filter(s => s.enabled);
    const tags = (base) => { const t = [base]; if (wantsDogFriendly) t.push("🐕 Dog-friendly"); if (wantsAccessible) t.push("♿ Accessible"); return t.join(" · "); };
    const fmtTime = (h, m = 0) => { const hh = Math.floor(h); const mm = m || Math.round((h - hh) * 60); const suffix = hh >= 12 ? "PM" : "AM"; const hr = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh; return `${hr}:${mm.toString().padStart(2, "0")} ${suffix}`; };

    // ─── BUILD DAY-TO-PLACE MAP ───
    // 3 patterns:
    //   A) Multiple stays → road trip: each day mapped to its stay's location
    //   B) 1 stay + multiple places → base camp: day trips from accommodation
    //   C) No stays → spread places evenly across days
    const sortedStays = [...(trip.stays || [])].filter(s => s.checkIn && s.location).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    const tripStartDate = trip.rawStart ? new Date(trip.rawStart + "T12:00:00") : new Date();
    const places = trip.places || [];

    // Detect unique stay locations
    const uniqueStayLocations = [...new Set(sortedStays.map(s => s.location.toLowerCase().trim()))];
    const isBaseCamp = sortedStays.length >= 1 && uniqueStayLocations.length === 1 && places.length > 1;

    const dayMap = {};
    if (isBaseCamp) {
      // ─── BASE CAMP PATTERN ───
      // Single accommodation, multiple places to visit as day trips
      // Day 1: Travel to base + explore base location
      // Middle days: Day trips to other places (return to base each night)
      // Last day: Explore base or return journey
      const baseStay = sortedStays[0];
      const baseLoc = baseStay.location;
      const baseStayName = baseStay.name;
      // Places to visit as day trips (exclude the base location itself)
      const dayTripPlaces = places.filter(p => p.toLowerCase().trim() !== baseLoc.toLowerCase().trim());
      // All places including base for activity generation
      const allVisitPlaces = [baseLoc, ...dayTripPlaces];

      for (let d = 1; d <= numDays; d++) {
        const isFirst = d === 1;
        const isLast = d === numDays;
        let dayPlace, isDayTrip = false;

        if (isFirst) {
          // Day 1: arrive at base, explore base location
          dayPlace = baseLoc;
        } else if (isLast) {
          // Last day: base location (pack up + return journey)
          dayPlace = baseLoc;
        } else {
          // Middle days: cycle through day trip destinations
          const dtIdx = (d - 2) % Math.max(1, dayTripPlaces.length);
          if (dayTripPlaces.length > 0) {
            dayPlace = dayTripPlaces[dtIdx];
            isDayTrip = true;
          } else {
            dayPlace = baseLoc; // No other places, stay at base
          }
        }

        const prevDay = dayMap[d - 1];
        dayMap[d] = {
          place: dayPlace,
          stayName: baseStayName,
          prevPlace: prevDay ? prevDay.place : null,
          isTransit: false, // Not moving accommodation
          isBaseCamp: true,
          isDayTrip,
          baseLoc,
          baseStayName,
        };
      }
    } else if (sortedStays.length > 1) {
      // ─── ROAD TRIP PATTERN ───
      // Multiple stays: each day mapped to the covering stay's location
      for (let d = 1; d <= numDays; d++) {
        const dayDateStr = new Date(tripStartDate.getTime() + (d - 1) * 86400000).toISOString().split("T")[0];
        let matchedStay = sortedStays.find(s => s.checkIn <= dayDateStr && s.checkOut > dayDateStr);
        if (!matchedStay) matchedStay = sortedStays.find(s => s.checkIn === dayDateStr);
        if (!matchedStay && d === 1) matchedStay = sortedStays[0];
        if (!matchedStay) {
          matchedStay = sortedStays.reduce((best, s) => {
            const diff = Math.abs(new Date(s.checkIn + "T12:00:00") - new Date(dayDateStr + "T12:00:00"));
            return (!best || diff < best.diff) ? { ...s, diff } : best;
          }, null);
        }
        const place = matchedStay?.location || places[0] || "your destination";
        const stayName = matchedStay?.name || "accommodation";
        const prevDay = dayMap[d - 1];
        const prevPlace = prevDay ? prevDay.place : null;
        const isTransit = prevPlace && prevPlace.toLowerCase() !== place.toLowerCase();
        dayMap[d] = { place, stayName, prevPlace, isTransit };
      }
    } else if (places.length > 0) {
      // ─── NO STAYS: spread locations evenly across days ───
      // e.g. 3 places over 5 days → Edinburgh(2), Inverness(2), Isle of Skye(1)
      const daysPerPlace = Math.floor(numDays / places.length);
      const extraDays = numDays % places.length;
      let dayIdx = 1;
      for (let p = 0; p < places.length; p++) {
        const daysForThis = daysPerPlace + (p < extraDays ? 1 : 0);
        for (let dd = 0; dd < daysForThis; dd++) {
          const prevDay = dayMap[dayIdx - 1];
          const prevPlace = prevDay ? prevDay.place : null;
          const isTransit = prevPlace && prevPlace.toLowerCase() !== places[p].toLowerCase();
          dayMap[dayIdx] = { place: places[p], stayName: `accommodation in ${places[p]}`, prevPlace, isTransit };
          dayIdx++;
        }
      }
    } else {
      // No places at all — fallback
      for (let d = 1; d <= numDays; d++) {
        dayMap[d] = { place: "your destination", stayName: "accommodation", prevPlace: null, isTransit: false };
      }
    }

    // ─── ACTIVITY & DINNER BUILDERS ───
    const getLocPools = (loc) => {
      const locActs = getLocationActivities(loc);
      if (locActs) return locActs;
      return {
        morning: [`Explore ${loc}`, `Walking tour of ${loc}`, `Local market in ${loc}`, "Scenic viewpoint", "Cultural tour"],
        afternoon: [`${loc} sightseeing walk`, "Shopping & souvenirs", "Museum visit", "Garden walk", "Photography walk"],
        dinner: wantsPubs ? [`Local pub in ${loc}`, "Pub supper", "Gastropub dinner"] : [`Dinner in ${loc}`, "Evening meal", "Dinner out"],
        kids: [`${loc} playground`, `Nature walk in ${loc}`, "Soft play", "Family activity"],
      };
    };

    const buildDinnerTitle = (loc, dayIdx) => {
      const locActs = getLocationActivities(loc);
      if (locActs?.dinner?.length > 0) return locActs.dinner[dayIdx % locActs.dinner.length];
      if (food.length > 0 && food[0] !== "Local cuisine") {
        const cuisine = food[dayIdx % food.length];
        return `${cuisine} ${wantsPubs ? "pub" : "restaurant"} in ${loc}`;
      }
      return wantsPubs ? "Dinner at local pub" : `Dinner in ${loc}`;
    };

    const pickAct = (pool, dayIdx, avoid) => {
      if (!pool || pool.length === 0) return null;
      let act = pool[dayIdx % pool.length];
      if (avoid && avoid.test(act.toLowerCase())) {
        act = pool.find(a => !avoid.test(a.toLowerCase())) || act;
      }
      return act;
    };
    const steepTest = wantsAvoidSteep ? /hik|trail|climb|trek|summit|ridge/ : null;

    // ─── GENERATE EACH DAY ───
    const days = {};
    // Track which activities we've used per location to avoid repeats
    const usedActIdx = {};
    const nextActIdx = (loc, pool) => {
      const key = loc + pool;
      usedActIdx[key] = (usedActIdx[key] || 0) + 1;
      return usedActIdx[key] - 1;
    };

    for (let d = 1; d <= numDays; d++) {
      const items = [];
      const isFirst = d === 1;
      const isLast = d === numDays;
      const { place: loc, stayName, prevPlace, isTransit } = dayMap[d];
      const locPools = getLocPools(loc);
      const kidPool = locPools.kids || [`Family activity in ${loc}`, "Nature walk", "Playground"];

      if (isFirst) {
        // ── Day 1: Journey + arrival ──
        const travelHrs = estimateTravelHours(trip.startLocation || "", loc);
        const evTime = isEV ? (enabledStops.filter(s => s.type === "ev_charge" && s.enabled).length * 0.5) : 0;
        const totalTravelHrs = travelHrs + evTime;
        const arrivalHour = Math.min(Math.floor(startHour + startMin / 60 + totalTravelHrs), 22);
        const arrivalMin = Math.round((totalTravelHrs % 1) * 60);
        const remainingHours = 22 - arrivalHour;

        if (trip.startLocation) {
          const tLabel = travelHrs >= 1 ? `~${Math.round(travelHrs * 10) / 10} hrs` : `~${Math.round(travelHrs * 60)} min`;
          items.push({ time: fmtTime(startHour, startMin), title: `Depart ${trip.startLocation}`, desc: `${travelMode} · ${tLabel} to ${loc}${isEV ? " · Full charge before departure" : ""}`, group: "Everyone", color: T.a });
        }

        // Stopovers
        const midHour = startHour + Math.floor(travelHrs / 2);
        const firstLegStops = enabledStops.filter(s => s.desc && s.desc.includes(trip.startLocation) && s.desc.includes(loc));
        firstLegStops.filter(s => s.type === "ev_charge").forEach((stop, si) => {
          items.push({ time: fmtTime(Math.max(Math.min(midHour + si, arrivalHour - 1), startHour + 1)), title: `⚡ Charge & Refresh`, desc: `${stop.desc} · ~30 min rapid charge · Grab coffee & snacks while charging`, group: "Everyone", color: T.amber, evSearch: { from: trip.startLocation, to: loc } });
        });
        firstLegStops.filter(s => s.type === "rest").forEach((stop, si) => {
          items.push({ time: fmtTime(Math.max(Math.min(midHour + si, arrivalHour - 1), startHour + 1)), title: `☕ Rest stop`, desc: `${stop.desc} · Quick break`, group: "Everyone", color: T.amber });
        });

        items.push({ time: fmtTime(arrivalHour, arrivalMin), title: `Arrive ${loc}`, desc: `Check in at ${stayName} · Drop bags, freshen up`, group: "Everyone", color: T.a });

        // Afternoon activities based on remaining time + pace
        if (!isRelaxed && remainingHours >= 2) {
          const exploreHr = Math.min(arrivalHour + 1, 18);
          const idx = nextActIdx(loc, "m");
          const act = pickAct(locPools.morning, idx, steepTest) || `Explore ${loc}`;
          items.push({ time: fmtTime(exploreHr), title: act, desc: tags(`${loc} · ${budgetTier.label}`), group: hasKids ? "Adults" : "Everyone", color: T.blue });
          if (hasKids) {
            const kidAct = pickAct(kidPool, nextActIdx(loc, "k"), null) || `Family time in ${loc}`;
            items.push({ time: fmtTime(exploreHr), title: kidAct, desc: tags(`${loc} · Family-friendly`), group: "Kids", color: T.pink });
          }
          if (isPacked && remainingHours >= 4) {
            const lunchHr = Math.min(exploreHr + 2, 15);
            items.push({ time: fmtTime(lunchHr), title: `Lunch — ${foodLabel}`, desc: `${budgetTier.label} ${wantsPubs ? "pub" : "restaurant"} · ${budgetTier.price}`, group: "Everyone", color: T.coral });
            if (remainingHours >= 6) {
              const pmAct = pickAct(locPools.afternoon, nextActIdx(loc, "a"), steepTest) || `Stroll around ${loc}`;
              items.push({ time: fmtTime(Math.min(lunchHr + 2, 17)), title: pmAct, desc: tags(`${loc} · Afternoon`), group: "Everyone", color: T.blue });
            }
          }
        } else if (isRelaxed && remainingHours >= 3) {
          items.push({ time: fmtTime(Math.min(arrivalHour + 1, 18)), title: `Gentle stroll around ${loc}`, desc: tags(`Take it easy after the journey`), group: "Everyone", color: T.blue });
        }

        const dinnerHr = Math.max(arrivalHour + 2, 18);
        items.push({ time: fmtTime(Math.min(dinnerHr, 20)), title: buildDinnerTitle(loc, 0), desc: `${foodLabel} · ${budgetTier.label} · ${budgetTier.price}${wantsDogFriendly ? " · 🐕 Dog-friendly" : ""}`, group: "Everyone", color: T.coral });

      } else if (isLast && numDays > 1) {
        // ── Last day: Departure ──
        // For base camp: depart from base location, not the last day-trip place
        const dayInfo = dayMap[d];
        const departureLoc = dayInfo.isBaseCamp ? dayInfo.baseLoc : loc;
        const departureStay = dayInfo.isBaseCamp ? dayInfo.baseStayName : stayName;
        const returnHrs = estimateTravelHours(departureLoc, trip.startLocation || "");
        const rLabel = returnHrs >= 1 ? `~${Math.round(returnHrs * 10) / 10} hrs` : `~${Math.round(returnHrs * 60)} min`;
        items.push({ time: fmtTime(8), title: "Breakfast", desc: departureStay, group: "Everyone", color: T.coral });
        items.push({ time: fmtTime(9, 30), title: "Check out & pack", desc: `${departureStay} · Bags ready`, group: "Everyone", color: T.t3 });
        const lastAct = pickAct(locPools.morning, nextActIdx(departureLoc, "m"), steepTest) || `Farewell stroll in ${departureLoc}`;
        items.push({ time: fmtTime(10), title: lastAct, desc: tags(`${departureLoc} · Final morning`), group: "Everyone", color: T.blue });
        if (hasKids) {
          const kidAct = pickAct(kidPool, nextActIdx(departureLoc, "k"), null);
          if (kidAct) items.push({ time: fmtTime(10), title: kidAct, desc: tags(`${departureLoc} · Last day fun`), group: "Kids", color: T.pink });
        }
        items.push({ time: fmtTime(12), title: "Lunch & depart", desc: `${foodLabel} · ${budgetTier.price} · Then ${travelMode.toLowerCase()} home (${rLabel})`, group: "Everyone", color: T.coral });
        if (trip.startLocation) {
          items.push({ time: fmtTime(14), title: `🚗 ${travelMode} home`, desc: `${departureLoc} → ${trip.startLocation} · ${rLabel}${isEV ? " · Plan charging stop" : ""}`, group: "Everyone", color: T.a });
          if (isEV) {
            items.push({ time: fmtTime(14 + Math.floor(returnHrs / 2)), title: `⚡ Charge & Lunch Stop`, desc: `Service station en route · ~30 min rapid charge · Grab a meal while charging`, group: "Everyone", color: T.amber, evSearch: { from: departureLoc, to: trip.startLocation } });
          }
          const arriveHomeHr = Math.min(14 + Math.ceil(returnHrs) + (isEV ? 1 : 0), 23);
          items.push({ time: fmtTime(arriveHomeHr), title: `🏠 Arrive home`, desc: `Back in ${trip.startLocation} · Trip complete! Unpack & rest`, group: "Everyone", color: "#1B8F6A" });
        }

      } else {
        // ── Middle day: base camp day trip, transit, or full exploration ──
        const dayInfo = dayMap[d];

        if (dayInfo.isDayTrip && dayInfo.baseLoc) {
          // ── BASE CAMP DAY TRIP ──
          // Drive from base → visit place → drive back to base
          const legHrs = estimateTravelHours(dayInfo.baseLoc, loc);
          const legLabel = legHrs >= 1 ? `~${Math.round(legHrs * 10) / 10} hrs` : `~${Math.round(legHrs * 60)} min`;
          const departHr = startHour;

          items.push({ time: fmtTime(departHr), title: "Breakfast", desc: dayInfo.baseStayName, group: "Everyone", color: T.coral });
          items.push({ time: fmtTime(departHr + 1), title: `🚗 Day trip to ${loc}`, desc: `${dayInfo.baseLoc} → ${loc} · ${legLabel}${isEV ? " · Check charge level" : ""}`, group: "Everyone", color: T.a });

          if (isEV && legHrs >= 1.5) {
            const evHr = departHr + 1 + Math.floor(legHrs / 2);
            items.push({ time: fmtTime(evHr), title: `⚡ Charge & Coffee Stop`, desc: `En route to ${loc} · ~30 min rapid charge`, group: "Everyone", color: T.amber, evSearch: { from: dayInfo.baseLoc, to: loc } });
          }

          const arriveHr = Math.min(Math.floor(departHr + 1 + legHrs + (isEV && legHrs >= 1.5 ? 0.5 : 0)), 13);
          items.push({ time: fmtTime(arriveHr), title: `Arrive ${loc}`, desc: `Day trip — exploring ${loc}`, group: "Everyone", color: T.a });

          // Activities at the day trip destination
          const mIdx = nextActIdx(loc, "m");
          const morningAct = pickAct(locPools.morning, mIdx, steepTest) || `Explore ${loc}`;
          items.push({ time: fmtTime(Math.min(arriveHr + 0.5, 12)), title: morningAct, desc: tags(`${loc} · ${budgetTier.label}`), group: hasKids ? "Adults" : "Everyone", color: T.blue });
          if (hasKids) {
            const kidAct = pickAct(kidPool, nextActIdx(loc, "k"), null) || `Family time in ${loc}`;
            items.push({ time: fmtTime(Math.min(arriveHr + 0.5, 12)), title: kidAct, desc: tags(`${loc} · Family-friendly`), group: "Kids", color: T.pink });
          }

          items.push({ time: fmtTime(13), title: `Lunch in ${loc}`, desc: `${foodLabel} · ${budgetTier.label} · ${budgetTier.price}`, group: "Everyone", color: T.coral });

          const pmAct = pickAct(locPools.afternoon, nextActIdx(loc, "a"), steepTest) || `Afternoon in ${loc}`;
          items.push({ time: fmtTime(14, 30), title: pmAct, desc: tags(`${loc} · Afternoon`), group: hasKids ? "Adults" : "Everyone", color: T.blue });
          if (hasKids) {
            const kidPmAct = pickAct(kidPool, nextActIdx(loc, "k"), null) || "Free play";
            items.push({ time: fmtTime(14, 30), title: kidPmAct, desc: tags(`${loc} · Fun for kids`), group: "Kids", color: T.pink });
          }

          // Return to base
          const returnDepartHr = 16;
          items.push({ time: fmtTime(returnDepartHr), title: `🚗 Return to ${dayInfo.baseLoc}`, desc: `${loc} → ${dayInfo.baseLoc} · ${legLabel}`, group: "Everyone", color: T.a });
          if (isEV && legHrs >= 1.5) {
            items.push({ time: fmtTime(returnDepartHr + Math.floor(legHrs / 2)), title: `⚡ Charge & Refresh`, desc: `En route back · ~30 min rapid charge`, group: "Everyone", color: T.amber, evSearch: { from: loc, to: dayInfo.baseLoc } });
          }
          const returnArriveHr = Math.min(Math.floor(returnDepartHr + legHrs + (isEV && legHrs >= 1.5 ? 0.5 : 0)), 20);
          items.push({ time: fmtTime(returnArriveHr), title: `Back at ${dayInfo.baseStayName}`, desc: `Freshen up · Relax`, group: "Everyone", color: T.t3 });

        } else if (isTransit) {
          // ── Transit day: move to new location + explore afternoon ──
          const legHrs = estimateTravelHours(prevPlace, loc);
          const legLabel = legHrs >= 1 ? `~${Math.round(legHrs * 10) / 10} hrs` : `~${Math.round(legHrs * 60)} min`;
          const prevStay = dayMap[d - 1]?.stayName || "accommodation";
          items.push({ time: fmtTime(8), title: "Breakfast & check out", desc: `${prevStay} · Pack up & say goodbye to ${prevPlace}`, group: "Everyone", color: T.coral });
          items.push({ time: fmtTime(9, 30), title: `${travelMode} to ${loc}`, desc: `${prevPlace} → ${loc} · ${legLabel}${isEV ? " · Check charge level" : ""}`, group: "Everyone", color: T.a });
          if (isEV && legHrs >= 2) {
            const evHr = Math.min(9 + Math.floor(legHrs / 2), 13);
            items.push({ time: fmtTime(evHr, 30), title: `⚡ Charge & Coffee Stop`, desc: `Service station en route to ${loc} · ~30 min rapid charge · Stretch & refresh`, group: "Everyone", color: T.amber, evSearch: { from: prevPlace, to: loc } });
          }
          const arriveHr = Math.min(Math.floor(9.5 + legHrs + (isEV && legHrs >= 2 ? 0.5 : 0)), 16);
          items.push({ time: fmtTime(arriveHr), title: `Arrive ${loc}`, desc: `Check in at ${stayName} · Settle in`, group: "Everyone", color: T.a });

          // Afternoon in new location
          const freeHr = Math.min(arriveHr + 1, 15);
          const pmAct = pickAct(locPools.afternoon, nextActIdx(loc, "a"), steepTest) || `Explore ${loc}`;
          items.push({ time: fmtTime(freeHr), title: pmAct, desc: tags(`${loc} · First impressions`), group: hasKids ? "Adults" : "Everyone", color: T.blue });
          if (hasKids) {
            const kidAct = pickAct(kidPool, nextActIdx(loc, "k"), null) || `Family time in ${loc}`;
            items.push({ time: fmtTime(freeHr), title: kidAct, desc: tags(`${loc} · Family-friendly`), group: "Kids", color: T.pink });
          }
        } else {
          // ── Full day in same location ──
          items.push({ time: fmtTime(8), title: "Breakfast", desc: stayName, group: "Everyone", color: T.coral });
          const mIdx = nextActIdx(loc, "m");
          const morningAct = pickAct(locPools.morning, mIdx, steepTest) || `Explore ${loc}`;
          if (hasKids) {
            items.push({ time: fmtTime(10), title: morningAct, desc: tags(`${loc} · ${budgetTier.label}`), group: "Adults", color: T.blue });
            const kidAct = pickAct(kidPool, nextActIdx(loc, "k"), null) || `Family time in ${loc}`;
            items.push({ time: fmtTime(10), title: kidAct, desc: tags(`${loc} · Family-friendly`), group: "Kids", color: T.pink });
          } else {
            items.push({ time: fmtTime(10), title: morningAct, desc: tags(`${loc} · ${budgetTier.label}`), group: "Everyone", color: T.blue });
          }
          items.push({ time: fmtTime(12, 30), title: `Lunch — ${foodLabel}`, desc: `${budgetTier.label} ${wantsPubs ? "pub" : "restaurant"} · ${budgetTier.price}${wantsDogFriendly ? " · 🐕 Dog-friendly" : ""}`, group: "Everyone", color: T.coral });
          const pmAct = pickAct(locPools.afternoon, nextActIdx(loc, "a"), steepTest) || "Afternoon activity";
          if (hasKids) {
            items.push({ time: fmtTime(14, 30), title: pmAct, desc: tags(`${loc} · Afternoon`), group: "Adults", color: T.blue });
            const kidPmAct = pickAct(kidPool, nextActIdx(loc, "k"), null) || "Free play";
            items.push({ time: fmtTime(14, 30), title: kidPmAct, desc: tags(`${loc} · Fun for kids`), group: "Kids", color: T.pink });
          } else {
            items.push({ time: fmtTime(14, 30), title: pmAct, desc: tags(`${loc} · Afternoon`), group: "Everyone", color: T.blue });
          }
          items.push({ time: fmtTime(17), title: `Return to ${stayName}`, desc: "Relax & freshen up", group: "Everyone", color: T.t3 });
        }

        items.push({ time: fmtTime(19), title: buildDinnerTitle(loc, d - 1), desc: `${foodLabel} · ${budgetTier.label} · ${budgetTier.price}${wantsDogFriendly ? " · 🐕 Dog-friendly" : ""}`, group: "Everyone", color: T.coral });
      }

      days[d] = items;
    }
    return days;
  };

  const generateAndSetTimeline = async (id) => {
    const trip = createdTrips.find(t => t.id === id);
    if (!trip) return;
    const timeline = generateMultiDayTimeline(trip);

    // Enrich EV charging stops with real locations from Places API
    const evItems = [];
    Object.entries(timeline).forEach(([day, items]) => {
      items.forEach((item, idx) => {
        if (item.evSearch) evItems.push({ day: parseInt(day), idx, from: item.evSearch.from, to: item.evSearch.to });
      });
    });

    if (evItems.length > 0) {
      try {
        const enriched = await Promise.all(evItems.map(async (ev) => {
          const query = `EV charging station with cafe between ${ev.from} and ${ev.to}`;
          const res = await fetch("/api/places", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, type: "electric_vehicle_charging_station" }),
          });
          const data = await res.json();
          if (res.ok && data.places?.length > 0) {
            const station = data.places[0];
            return { ...ev, station };
          }
          return ev;
        }));

        enriched.forEach(ev => {
          if (ev.station) {
            const s = ev.station;
            const rating = s.rating ? ` · ${s.rating}★` : "";
            timeline[ev.day][ev.idx].title = `⚡ ${s.name}`;
            timeline[ev.day][ev.idx].desc = `${s.address} · Rapid charge ~30 min · Grab food & coffee while charging${rating}`;
          }
        });
      } catch (e) { /* Places API unavailable — keep generic descriptions */ }
    }

    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== id) return t;
      return { ...t, timeline };
    }));
    showToast("Itinerary generated!");
  };

  // Smart route ordering: use stay check-in dates to order places logically
  const getSmartRouteOrder = (trip) => {
    const places = trip?.places || [];
    const stays = trip?.stays || [];
    if (places.length <= 1 || stays.length === 0) return places;
    // Build a map of place → earliest check-in date from stays
    const placeCheckIn = {};
    stays.forEach(s => {
      if (s.location && s.checkIn) {
        const loc = s.location.toLowerCase();
        const existing = placeCheckIn[loc];
        if (!existing || s.checkIn < existing) placeCheckIn[loc] = s.checkIn;
      }
    });
    // Sort places by their stay check-in date; places without stays go last
    const sorted = [...places].sort((a, b) => {
      const dateA = placeCheckIn[a.toLowerCase()];
      const dateB = placeCheckIn[b.toLowerCase()];
      if (dateA && dateB) return dateA.localeCompare(dateB);
      if (dateA) return -1;
      if (dateB) return 1;
      return 0;
    });
    return sorted;
  };

  // Build the FULL route from stays (includes locations not in trip.places)
  // Returns ordered unique locations derived from stays sorted by check-in
  const getFullRouteFromStays = (trip) => {
    const stays = trip?.stays || [];
    if (stays.length === 0) return trip?.places || [];
    // Sort stays by check-in date
    const sorted = [...stays].filter(s => s.checkIn && s.location).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    if (sorted.length === 0) return trip?.places || [];
    // Extract unique locations in order
    const seen = new Set();
    const route = [];
    sorted.forEach(s => {
      const loc = s.location;
      const key = loc.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        route.push(loc);
      }
    });
    // Also include any trip.places not covered by stays (append at end)
    (trip?.places || []).forEach(p => {
      if (!seen.has(p.toLowerCase())) {
        seen.add(p.toLowerCase());
        route.push(p);
      }
    });
    return route;
  };

  const makeTripLive = (id) => {
    const trip = createdTrips.find(t => t.id === id);
    const isEV = trip?.travel?.some(m => /ev\s*vehicle/i.test(m));
    const isDriving = isEV || trip?.travel?.some(m => /non-ev\s*vehicle/i.test(m));
    const places = getSmartRouteOrder(trip);
    const startLoc = trip?.startLocation || "";
    // Build smart stopovers only for driving trips (not train/flight/walking/bicycle)
    const autoStops = [];
    if (isDriving && places.length > 0 && startLoc) {
      if (isEV) {
        autoStops.push({ type: "ev_charge", label: `EV charge & refreshments`, desc: `Service station between ${startLoc} and ${places[0]}`, time: "~1.5 hrs into journey", enabled: true, combineMeal: true });
      } else {
        autoStops.push({ type: "rest", label: "Rest & coffee stop", desc: `Between ${startLoc} and ${places[0]}`, time: "~1.5 hrs into journey", enabled: true, combineMeal: false });
      }
    }
    // If multi-place driving trip, suggest EV charging stops between places
    if (isDriving) {
      for (let i = 0; i < places.length - 1; i++) {
        if (isEV) {
          autoStops.push({ type: "ev_charge", label: `EV charge & refreshments`, desc: `Service station between ${places[i]} and ${places[i + 1]}`, time: "En route", enabled: true, combineMeal: true });
        }
      }
    }
    setPendingActivationTripId(id);
    setActivationPrefs({ startTime: "08:00", dayOnePace: "balanced", notes: "", stopovers: autoStops });
    setShowActivationModal(true);
  };

  const confirmActivation = async () => {
    const id = pendingActivationTripId;
    if (!id) return;
    const trip = createdTrips.find(t => t.id === id);
    if (!trip) return;

    updateTripStatusInDB(trip.dbId || trip.id, 'live');
    const updated = { ...trip, status: "live", activationPrefs: { ...activationPrefs } };
    updated.timeline = generateMultiDayTimeline(updated);

    // Enrich EV charging stops with real locations
    const evItems = [];
    Object.entries(updated.timeline).forEach(([day, items]) => {
      items.forEach((item, idx) => {
        if (item.evSearch) evItems.push({ day: parseInt(day), idx, from: item.evSearch.from, to: item.evSearch.to });
      });
    });
    if (evItems.length > 0) {
      try {
        const enriched = await Promise.all(evItems.map(async (ev) => {
          const query = `EV charging station with cafe between ${ev.from} and ${ev.to}`;
          const res = await fetch("/api/places", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query, type: "electric_vehicle_charging_station" }),
          });
          const data = await res.json();
          if (res.ok && data.places?.length > 0) return { ...ev, station: data.places[0] };
          return ev;
        }));
        enriched.forEach(ev => {
          if (ev.station) {
            const s = ev.station;
            const rating = s.rating ? ` · ${s.rating}★` : "";
            updated.timeline[ev.day][ev.idx].title = `⚡ ${s.name}`;
            updated.timeline[ev.day][ev.idx].desc = `${s.address} · Rapid charge ~30 min · Grab food & coffee while charging${rating}`;
          }
        });
      } catch (e) { /* fallback to generic */ }
    }

    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== id) return { ...t, status: t.status === "live" ? "new" : t.status };
      return updated;
    }));
    logActivity(id, "🚀", "Trip activated — itinerary generated!", "milestone");
    setShowActivationModal(false);
    setPendingActivationTripId(null);
    setSelectedDay(1);
    setTripDetailTab("itinerary");
    // Navigate to trip detail
    setSelectedCreatedTrip(updated);
    setEditingTimelineIdx(null);
    setTripChatMessages([]);
    setTripChatInput("");
    loadTripMessages(updated.dbId);
    loadExpenses(updated.dbId);
    loadTripPhotos(updated.dbId);
    navigate("createdTrip");
    // Chat nudge — delayed so the user sees the itinerary first
    setTimeout(() => {
      showToast("Want to refine this itinerary? Switch to the Chat tab and tell me what to change!");
    }, 1500);
  };

  const viewCreatedTrip = (trip) => {
    setSelectedCreatedTrip(trip);
    setEditingTimelineIdx(null);
    setTripChatMessages([]);
    setTripChatInput("");
    setTripDetailTab("itinerary");
    setSelectedDay(1);
    setShowNotifications(false);
    loadTripMessages(trip.dbId);
    loadExpenses(trip.dbId);
    loadTripPhotos(trip.dbId);
    navigate("createdTrip");
  };

  const updateTimelineItem = (tripId, idx, field, value) => {
    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const tl = t.timeline || {};
      const dayItems = (tl[selectedDay] || []).map((item, i) => i === idx ? { ...item, [field]: value } : item);
      return { ...t, timeline: { ...tl, [selectedDay]: dayItems } };
    }));
  };

  const deleteTimelineItem = (tripId, idx) => {
    const trip = createdTrips.find(t => t.id === tripId);
    const item = trip?.timeline?.[selectedDay]?.[idx];
    if (!window.confirm(`Remove "${item?.title || "this item"}" from Day ${selectedDay}?`)) return;
    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const tl = t.timeline || {};
      return { ...t, timeline: { ...tl, [selectedDay]: (tl[selectedDay] || []).filter((_, i) => i !== idx) } };
    }));
    setEditingTimelineIdx(null);
    showToast("Item removed");
  };

  const moveTimelineItem = (tripId, idx, direction) => {
    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const tl = t.timeline || {};
      const items = [...(tl[selectedDay] || [])];
      const newIdx = idx + direction;
      if (newIdx < 0 || newIdx >= items.length) return t;
      [items[idx], items[newIdx]] = [items[newIdx], items[idx]];
      return { ...t, timeline: { ...tl, [selectedDay]: items } };
    }));
    setEditingTimelineIdx(null);
  };

  const addTimelineItem = (tripId) => {
    let newIdx = 0;
    setCreatedTrips(prev => prev.map(t => {
      if (t.id !== tripId) return t;
      const tl = t.timeline || {};
      const existing = tl[selectedDay] || [];
      newIdx = existing.length;
      const newItem = { time: "12:00 PM", title: "New activity", desc: "Tap to edit details", group: "Everyone", color: T.blue };
      return { ...t, timeline: { ...tl, [selectedDay]: [...existing, newItem] } };
    }));
    // Open the new item for editing and scroll to it
    setEditingTimelineIdx(newIdx);
    setTimeout(() => {
      const el = document.querySelector(`[data-timeline-idx="${newIdx}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // Helper: get items for current day from timeline (supports both old array and new day-keyed format)
  const getDayItems = (timeline, day) => {
    if (!timeline) return [];
    if (Array.isArray(timeline)) return day === 1 ? timeline : [];
    return timeline[day] || [];
  };

  const getNumDays = (trip) => {
    if (!trip.timeline) return 0;
    if (Array.isArray(trip.timeline)) return trip.timeline.length > 0 ? 1 : 0;
    return Object.keys(trip.timeline).length;
  };

  const hasTimeline = (trip) => {
    if (!trip.timeline) return false;
    if (Array.isArray(trip.timeline)) return trip.timeline.length > 0;
    return Object.keys(trip.timeline).length > 0 && Object.values(trip.timeline).some(d => d.length > 0);
  };

  const handleTripChat = async (tripId) => {
    const msg = tripChatInput.trim();
    if (!msg) return;
    setTripChatMessages(prev => [...prev, { role: "user", text: msg }]);
    setTripChatInput("");
    setTripChatTyping(true);
    const trip = createdTrips.find(t => t.id === tripId);
    saveChatMessage(trip?.dbId, 'user', msg, user?.user_metadata?.full_name || user?.email || 'You');
    const loc = trip?.places?.join(", ") || "your destination";
    // Determine current location based on selected day + stays (not always first place)
    const currentDayLoc = (() => {
      const stays = trip?.stays || [];
      if (stays.length > 0 && trip?.rawStart) {
        const sorted = [...stays].filter(s => s.checkIn && s.location).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
        const tripStart = new Date(trip.rawStart + "T12:00:00");
        const dayDateStr = new Date(tripStart.getTime() + (selectedDay - 1) * 86400000).toISOString().split("T")[0];
        let matched = sorted.find(s => s.checkIn <= dayDateStr && s.checkOut > dayDateStr);
        if (!matched) matched = sorted.find(s => s.checkIn === dayDateStr);
        if (!matched && selectedDay === 1) matched = sorted[0];
        if (matched?.location) return matched.location;
      }
      // Fallback: cycle through places by day
      const places = trip?.places || [];
      if (places.length > 0) return places[(selectedDay - 1) % places.length];
      return "your destination";
    })();
    const firstLoc = currentDayLoc;
    const budget = trip?.budget || "";
    const summary = trip?.summary || buildTripSummary(trip || {});
    const instructions = trip?.prefs?.instructions || "";
    const allKids = [...(trip?.travellers?.olderKids || []), ...(trip?.travellers?.youngerKids || [])];
    const hasKids = allKids.length > 0;
    const kidNames = allKids.map(k => `${k.name} (${k.age})`).join(", ");
    const budgetLabel = { "Budget": "budget-friendly", "Mid-range": "mid-range", "Luxury": "upscale", "No limit": "top-rated" }[budget] || "local";
    const foodPref = trip?.prefs?.food?.length > 0 ? trip.prefs.food.join(", ") : "local cuisine";
    const ctxLower = summary.toLowerCase();
    const wantsDog = /dog|pet/.test(ctxLower);
    const wantsAccessible = /accessible|wheelchair|mobility/.test(ctxLower);
    const wantsPubs = /pub|pubs|tavern/.test(ctxLower);

    // Keep context line short — don't dump full summary into every message
    const placesStr = trip?.places?.join(", ") || "your trip";
    const contextLine = "";
    const lower = msg.toLowerCase();

    // ── EV charger queries — always use current GPS location + Places API ──
    if (/ev|charger|charging|charge point|charge station/i.test(lower) && !/add|schedule|time/.test(lower)) {
      setTripChatMessages(prev => [...prev, { role: "ai", text: "📍 Finding EV chargers near you..." }]);
      const handleEvResults = async (lat, lng, locLabel) => {
        try {
          // If we have GPS coords, use nearby search (location + type, no query)
          // If no GPS, use text search with location name in query (no type filter)
          const body = lat && lng
            ? { location: { lat, lng }, type: "electric_vehicle_charging_station", radius: 15000 }
            : { query: `EV charging stations near ${firstLoc}`, radius: 15000 };
          const res = await fetch("/api/places", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (res.ok && data.places?.length > 0) {
            const chargers = data.places.slice(0, 5);
            const list = chargers.map((p, i) => {
              const stars = p.rating ? ` · ${p.rating}★` : "";
              const status = p.openNow === true ? " · Open now" : p.openNow === false ? " · Closed" : "";
              const mapLink = `https://www.google.com/maps/place/?q=place_id:${p.placeId}`;
              return `${i + 1}. **${p.name}**${stars}${status}\n   ${p.address}\n   [Navigate in Maps](${mapLink})`;
            }).join("\n\n");
            return `⚡ **EV Chargers near ${locLabel}:**\n\n${list}\n\n💡 **Tips:**\n• Check connector type (CCS/CHAdeMO/Type 2) before heading there\n• Rapid chargers (50kW+) get you to 80% in ~30 min\n• Use Zap-Map app for real-time availability`;
          }
        } catch (e) { /* fallback below */ }
        return `⚡ I couldn't find chargers via search. Try [Zap-Map](https://www.zap-map.com/live/) or [Open Charge Map](https://openchargemap.org/) for real-time EV charger availability near ${locLabel}.`;
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const reply = await handleEvResults(pos.coords.latitude, pos.coords.longitude, "your location");
            setTripChatTyping(false);
            setTripChatMessages(prev => {
              const updated = [...prev];
              const idx = updated.findLastIndex(m => m.text === "📍 Finding EV chargers near you...");
              if (idx >= 0) updated[idx] = { role: "ai", text: reply };
              else updated.push({ role: "ai", text: reply });
              return updated;
            });
          },
          async () => {
            // Location denied — search near trip destination instead
            const reply = await handleEvResults(null, null, firstLoc);
            setTripChatTyping(false);
            setTripChatMessages(prev => {
              const updated = [...prev];
              const idx = updated.findLastIndex(m => m.text === "📍 Finding EV chargers near you...");
              if (idx >= 0) updated[idx] = { role: "ai", text: reply };
              else updated.push({ role: "ai", text: reply });
              return updated;
            });
          },
          { enableHighAccuracy: false, timeout: 8000 }
        );
      } else {
        const reply = await handleEvResults(null, null, firstLoc);
        setTripChatTyping(false);
        setTripChatMessages(prev => {
          const updated = [...prev];
          const idx = updated.findLastIndex(m => m.text === "📍 Finding EV chargers near you...");
          if (idx >= 0) updated[idx] = { role: "ai", text: reply };
          else updated.push({ role: "ai", text: reply });
          return updated;
        });
      }
      return; // Handled — don't fall through to Claude API
    }

    // ── "Nearby" queries (restaurants, food, cafes, activities, petrol) — use GPS + Places API ──
    const isNearbyQuery = /nearby|nearest|near me|near here|around me|close by|closest/i.test(lower);
    const isPlaceQuery = /restaurant|food|eat|dining|cafe|coffee|pub|bar|pizza|burger|takeaway|lunch|dinner|breakfast|brunch|supermarket|petrol|fuel|pharmacy|hospital|atm/i.test(lower);
    if (isNearbyQuery || (isPlaceQuery && isNearbyQuery)) {
      // Determine search type from the query
      const searchType = /cafe|coffee/i.test(lower) ? "cafe"
        : /pub|bar/i.test(lower) ? "bar"
        : /supermarket|grocery/i.test(lower) ? "supermarket"
        : /petrol|fuel|gas station/i.test(lower) ? "gas_station"
        : /pharmacy|chemist/i.test(lower) ? "pharmacy"
        : /hospital|a&e|emergency/i.test(lower) ? "hospital"
        : /atm|cash/i.test(lower) ? "atm"
        : "restaurant";
      const searchLabel = searchType === "gas_station" ? "petrol stations" : searchType + "s";
      const searchIcon = /cafe|coffee/i.test(lower) ? "☕" : /pub|bar/i.test(lower) ? "🍺" : /supermarket/i.test(lower) ? "🛒" : /petrol|fuel|gas/i.test(lower) ? "⛽" : "🍽️";

      setTripChatMessages(prev => [...prev, { role: "ai", text: `📍 Finding ${searchLabel} near you...` }]);

      const handleNearbyResults = async (lat, lng, locLabel) => {
        try {
          const body = lat && lng
            ? { location: { lat, lng }, type: searchType, radius: 5000 }
            : { query: `${searchType} near ${firstLoc}`, radius: 5000 };
          const res = await fetch("/api/places", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (res.ok && data.places?.length > 0) {
            const results = data.places.slice(0, 6);
            const list = results.map((p, i) => {
              const stars = p.rating ? ` · ${p.rating}★` : "";
              const price = p.priceLevel || "";
              const status = p.openNow === true ? " · **Open now**" : p.openNow === false ? " · Closed" : "";
              const mapLink = `https://www.google.com/maps/place/?q=place_id:${p.placeId}`;
              return `${i + 1}. **${p.name}** ${price}${stars}${status}\n   ${p.address}\n   [Navigate in Maps](${mapLink})`;
            }).join("\n\n");
            return `${searchIcon} **${searchLabel.charAt(0).toUpperCase() + searchLabel.slice(1)} near ${locLabel}:**\n\n${list}\n\n💡 *Say "Add [name] to Day ${selectedDay}" to include in your itinerary*`;
          }
        } catch (e) { /* fallback below */ }
        return `${searchIcon} Couldn't find ${searchLabel} via search. Try [Google Maps](https://www.google.com/maps/search/${encodeURIComponent(searchType + " near me")}) for real-time results near you.`;
      };

      const updateNearbyChat = (reply) => {
        setTripChatTyping(false);
        setTripChatMessages(prev => {
          const updated = [...prev];
          const idx = updated.findLastIndex(m => m.text.includes(`Finding ${searchLabel} near you`));
          if (idx >= 0) updated[idx] = { role: "ai", text: reply };
          else updated.push({ role: "ai", text: reply });
          return updated;
        });
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => updateNearbyChat(await handleNearbyResults(pos.coords.latitude, pos.coords.longitude, "your location")),
          async () => updateNearbyChat(await handleNearbyResults(null, null, firstLoc)),
          { enableHighAccuracy: false, timeout: 8000 }
        );
      } else {
        handleNearbyResults(null, null, firstLoc).then(updateNearbyChat);
      }
      return;
    }

    // Try Claude API first for richer, context-aware responses
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          tripContext: {
            tripName: trip?.name,
            dates: trip?.start && trip?.end ? `${trip.start} – ${trip.end}` : null,
            places: trip?.places,
            travelMode: trip?.travel?.join(", "),
            travellers: trip?.travellers,
            stays: trip?.stays,
            prefs: trip?.prefs,
            budget,
            currentLocation: firstLoc,
            currentDay: selectedDay,
          },
          chatHistory: tripChatMessages.slice(-8),
        }),
      });
      const data = await res.json();
      if (res.ok && data.reply) {
        setTripChatTyping(false);
        setTripChatMessages(prev => [...prev, { role: "ai", text: data.reply }]);
        saveChatMessage(trip?.dbId, 'ai', data.reply);
        return;
      }
    } catch (e) { /* API unavailable — fall back to local */ }

    // Local fallback
    setTimeout(async () => {
      let reply = "";
      const lower = msg.toLowerCase();
      if (lower.includes("restaurant") || lower.includes("food") || lower.includes("eat") || lower.includes("lunch") || lower.includes("dinner") || lower.includes("nearby")) {
        // Use Places API for real restaurant search — always try GPS first
        const extras = [];
        if (wantsDog) extras.push("🐕 dog-friendly");
        if (wantsAccessible) extras.push("♿ accessible");
        if (hasKids) extras.push("👧 kids' menus");
        const filterStr = extras.length > 0 ? `\nFiltering for: ${extras.join(", ")}` : "";
        const searchQuery = `${budgetLabel} ${foodPref} restaurants ${hasKids ? "family friendly" : ""} in ${firstLoc}`;

        // Always try GPS first for restaurant searches — traveller might be en route
        const doPlacesSearch = async (gpsLat, gpsLng) => {
          const body = { query: searchQuery, type: "restaurant" };
          if (gpsLat && gpsLng) { body.location = { lat: gpsLat, lng: gpsLng }; body.radius = 5000; }
          const placesRes = await fetch("/api/places", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          return placesRes;
        };

        // Try Places API — always attempt GPS first, fall back to location name
        try {
          let placesRes;
          let usedGps = false;
          if (navigator.geolocation) {
            try {
              const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }));
              placesRes = await doPlacesSearch(pos.coords.latitude, pos.coords.longitude);
              usedGps = true;
            } catch (gpsErr) {
              placesRes = await doPlacesSearch(null, null);
            }
          } else {
            placesRes = await doPlacesSearch(null, null);
          }
          const placesData = await placesRes.json();
          if (placesRes.ok && placesData.places?.length > 0) {
            const top5 = placesData.places.slice(0, 5);
            const placesList = top5.map((p, i) => {
              const stars = p.rating ? `${p.rating}★` : "";
              const price = p.priceLevel || "";
              const status = p.openNow === true ? "Open now" : p.openNow === false ? "Closed" : "";
              const mapLink = `https://www.google.com/maps/place/?q=place_id:${p.placeId}`;
              return `${i + 1}. **${p.name}** ${stars} ${price}\n   ${p.address}${status ? ` · ${status}` : ""}\n   [View on Maps](${mapLink})`;
            }).join("\n\n");

            const locNote = usedGps ? "your current location" : firstLoc;
            reply = `🍽️ **Top restaurants near ${locNote}** (Day ${selectedDay}, ${foodPref}):${filterStr}\n\n${placesList}\n\n📍 *Results based on ${usedGps ? "your GPS location" : "trip destination"}*\n\n💡 Say **"Add [name] to Day ${selectedDay}"** to plug it into your itinerary!`;
            setTripChatTyping(false);
            setTripChatMessages(prev => [...prev, { role: "ai", text: reply }]);
            return;
          }
        } catch (e) { /* Places API unavailable — use static fallback */ }

        reply = `For ${budgetLabel} dining in ${firstLoc} (${foodPref}):${filterStr}\n\n🍽️ I'd suggest ${budgetLabel} ${wantsPubs ? "pubs & gastropubs" : "restaurants"} with ${foodPref} options.${hasKids ? `\n👧 With ${kidNames}, look for family-friendly spots.` : ""}\n\nTap ✏️ on any meal to update.`;
      } else if (lower.includes("earlier") || lower.includes("later") || lower.includes("time") || lower.includes("move")) {
        reply = `${contextLine}Tap ✏️ on any timeline item to adjust times.`;
        if (hasKids) {
          const youngest = Math.min(...allKids.map(k => parseInt(k.age) || 10));
          reply += youngest <= 7 ? `\n\n💡 With young kids (${kidNames}), I'd recommend:\n• Dinner by 5:30 PM\n• Rest breaks every 2 hours\n• Late starts if mornings are tough` : `\n\n💡 With ${kidNames}, earlier dinner (6 PM) works well.`;
        }
      } else if (lower.includes("add") || lower.includes("include") || lower.includes("plug")) {
        // Check if user wants to add a specific item (e.g., "add Oink to day 2")
        const dayMatch = lower.match(/day\s*(\d+)/);
        const targetDay = dayMatch ? parseInt(dayMatch[1]) : selectedDay;
        // Extract what to add — text after "add"/"include"/"plug"
        const addMatch = msg.match(/(?:add|include|plug(?:\s*in)?)\s+(.+?)(?:\s+(?:to|into|on|for)\s+day\s*\d+)?$/i);
        const itemTitle = addMatch ? addMatch[1].trim().replace(/(?:to|into|on|for)\s+day\s*\d+$/i, '').trim() : null;
        if (itemTitle && itemTitle.length > 2) {
          // Add a specific named item to the specified day — smart time slot, replace if conflict
          const smartSlot = findSmartSlot(tripId, targetDay, lower);
          const newItem = { time: smartSlot.time, title: itemTitle, desc: `${firstLoc} · Added via chat`, group: "Everyone", color: T.blue };
          const parseT = (s) => { const m = s?.match(/(\d+):(\d+)\s*(AM|PM)/i); if (!m) return 0; let h = parseInt(m[1]); if (m[3].toUpperCase() === "PM" && h !== 12) h += 12; if (m[3].toUpperCase() === "AM" && h === 12) h = 0; return h * 60 + parseInt(m[2]); };
          let replacedTitle = null;
          setCreatedTrips(prev => prev.map(t => {
            if (t.id !== tripId) return t;
            const tl = t.timeline || {};
            let dayTl = [...(tl[targetDay] || [])];
            const slotMins = parseT(smartSlot.time);
            const existIdx = dayTl.findIndex(it => Math.abs(parseT(it.time) - slotMins) < 30);
            if (existIdx >= 0) {
              replacedTitle = dayTl[existIdx].title;
              dayTl[existIdx] = { ...dayTl[existIdx], ...newItem };
            } else {
              dayTl = [...dayTl, newItem];
            }
            dayTl.sort((a, b) => parseT(a.time) - parseT(b.time));
            return { ...t, timeline: { ...tl, [targetDay]: dayTl } };
          }));
          if (replacedTitle) {
            logActivity(tripId, "🔄", `Replaced "${replacedTitle}" with "${itemTitle}" on Day ${targetDay} · ${smartSlot.time}`, "itinerary");
          } else {
            logActivity(tripId, "📍", `Added "${itemTitle}" to Day ${targetDay}`, "itinerary");
          }
          // Auto-switch to itinerary on the added day
          setTimeout(() => { setSelectedDay(targetDay); setTripDetailTab("itinerary"); }, 600);
          reply = replacedTitle
            ? `🔄 Replaced **${replacedTitle}** with **${itemTitle}** on **Day ${targetDay}** at ${smartSlot.time} (${smartSlot.label}) in ${firstLoc}. Switching to your itinerary now — tap ✏️ to adjust.`
            : `✅ Added **${itemTitle}** to **Day ${targetDay}** at ${smartSlot.time} (${smartSlot.label}) in ${firstLoc}. Switching to your itinerary now — tap ✏️ to adjust the time.`;
        } else {
          addTimelineItem(tripId);
          reply = `${contextLine}Added a new activity slot for ${firstLoc}.`;
          if (hasKids) reply += `\n\n👧 Tip: Split adult/kid activities — ${kidNames} might enjoy something different!`;
          if (wantsDog) reply += `\n🐕 Remember: check venue is dog-friendly before booking.`;
          reply += `\n\nTap ✏️ to customise.`;
        }
      } else if (lower.includes("remove") || lower.includes("delete") || lower.includes("cancel")) {
        reply = `Tap ✏️ on any item, then 🗑️ to remove it. Which activity would you like to remove?`;
      } else if (lower.includes("budget") || lower.includes("cost") || lower.includes("spend") || lower.includes("price")) {
        reply = `${contextLine}Your **${budget || "unspecified"}** budget shapes all recommendations:\n• 🍽️ ${budgetLabel} restaurants (${foodPref})\n• 🎯 ${budgetLabel} activities\n• 🏨 Stays: ${trip?.stayNames?.join(", ") || "not set"}\n\nTrack actual costs by marking items as "Booked" and entering the price.`;
      } else if (lower.includes("summary") || lower.includes("plan") || lower.includes("overview")) {
        reply = `${contextLine}All itinerary items above are tailored to this context. Ask me about restaurants, activities, timing, or budget — I'll factor in everything.`;
      } else if (lower.includes("regenerate") || lower.includes("refresh") || lower.includes("redo")) {
        generateAndSetTimeline(tripId);
        reply = `${contextLine}Done! I've regenerated your itinerary based on all your preferences. The timeline above is updated.`;
      } else {
        reply = `${contextLine}I'm using all of the above to personalise your ${firstLoc} trip. Ask me about:\n• 🍽️ Restaurants & food\n• ⏰ Timing adjustments\n• 🎯 Activities to add\n• 💰 Budget & costs\n• 🔄 Regenerate itinerary`;
      }
      setTripChatTyping(false);
      setTripChatMessages(prev => [...prev, { role: "ai", text: reply }]);
      saveChatMessage(trip?.dbId, 'ai', reply);
    }, Math.min(2500, Math.max(800, 1200)));
  };

  const navigate = useCallback((s) => setScreen(s), []);

  // ─── Day-Aware Chat Greeting ───
  const buildDayGreeting = useCallback((dayNum) => {
    const day = DAYS[dayNum - 1];
    const items = TIMELINE[dayNum] || [];
    const totalDays = DAYS.length;
    const isFirstDay = dayNum === 1;
    const isLastDay = dayNum === totalDays;
    const { temp, cond, icon } = day.weather;
    const loc = day.location;
    const bookingsNeeded = items.filter(it => it.needsBooking).map(it => `${it.title} (${it.price})`);
    const activePolls = POLLS.filter(p => p.status === "active");

    if (isFirstDay) {
      const stay = TRIP.stays[0];
      const travelMode = TRIP.travelMode || "car";
      const modeIcon = travelMode.toLowerCase().includes("ev") ? "🔋" : travelMode.toLowerCase().includes("flight") ? "✈️" : travelMode.toLowerCase().includes("train") ? "🚆" : "🚗";
      if (TRIP.startLocation) {
        // Start location known — go straight to route suggestion
        setChatFlowStep("ask_pickups");
        setChatFlowData({ startLocation: TRIP.startLocation });
        return `${modeIcon} **Travel day — heading to ${loc}!**\n\n**From:** ${TRIP.startLocation}\n**To:** ${stay ? stay.name : loc}\n**Mode:** ${travelMode}\n**Weather at destination:** ${temp}°C ${icon} ${cond}\n\nAnyone to pick up along the way?`;
      } else {
        // Need to ask for start location
        setChatFlowStep("ask_start");
        setChatFlowData({});
        return `${modeIcon} **Travel day — heading to ${loc}!**\n\n**Staying at:** ${stay ? stay.name + " (" + stay.tags.join(", ") + ")" : loc}\n**Mode:** ${travelMode}\n**Weather at destination:** ${temp}°C ${icon} ${cond}\n\nWhere are you starting from? Enter your postcode or city so I can plan your route.`;
      }
    }

    if (isLastDay) {
      const stay = TRIP.stays[TRIP.stays.length - 1];
      const travelMode = TRIP.travelMode || "car";
      const modeIcon = travelMode.toLowerCase().includes("ev") ? "🔋" : travelMode.toLowerCase().includes("flight") ? "✈️" : travelMode.toLowerCase().includes("train") ? "🚆" : "🚗";
      if (TRIP.startLocation) {
        // Home location known — skip ask_home, go to departure time
        setChatFlowStep("ask_departure_time");
        setChatFlowData({ homeLocation: TRIP.startLocation });
        return `🏠 **Final day — heading back to ${TRIP.startLocation}!**\n\n${modeIcon} **From:** ${stay ? stay.name + ", " : ""}${loc}\n**To:** ${TRIP.startLocation}\n**Mode:** ${travelMode}\n**Weather:** ${temp}°C ${icon} ${cond}\n\nWhat time would you like to leave?`;
      } else {
        setChatFlowStep("ask_home");
        setChatFlowData({});
        return `🏠 **Final day — time to head home!**\n\n**From:** ${stay ? stay.name + ", " : ""}${loc}\n**Weather:** ${temp}°C ${icon} ${cond}\n\nWhere are you heading home to? I'll plan your departure with the best stops.`;
      }
    }

    // Middle days — activity-focused, anchored to current stay
    setChatFlowStep(null);
    setChatFlowData({});
    // Find which stay covers this day
    let currentStay = null;
    let nightsSoFar = 0;
    for (const stay of TRIP.stays) {
      if (dayNum >= nightsSoFar + 1 && dayNum <= nightsSoFar + stay.nights) {
        currentStay = stay;
        break;
      }
      nightsSoFar += stay.nights;
    }

    const adultItems = items.filter(it => it.for === "adults");
    const kidItems = items.filter(it => it.for === "kids");
    const allItems = items.filter(it => it.for === "all");

    let msg = `Good morning! Day ${dayNum} in **${loc}** · ${temp}°C ${icon} ${cond}\n\n`;
    if (currentStay) {
      msg += `🏨 Your base today: **${currentStay.name}** (${currentStay.type})\n`;
      if (currentStay.tags.length) msg += `${currentStay.tags.join(" · ")}\n`;
      msg += `\n`;
    }

    if (adultItems.length && kidItems.length) {
      msg += `I've split activities today:\n**Adults:** ${adultItems.map(it => it.title).join(", ")}\n**Kids:** ${kidItems.map(it => it.title).join(", ")}\n`;
      const meetup = allItems.find(it => it.title.toLowerCase().includes("lunch"));
      if (meetup) msg += `Everyone meets at **${meetup.title.replace("Lunch at ", "")}** for lunch.\n`;
    } else {
      const highlights = items.slice(0, 3).map(it => `${it.time} — ${it.title}`).join("\n");
      if (highlights) msg += highlights + "\n";
    }
    if (bookingsNeeded.length) msg += `\n📋 **Needs confirmation:** ${bookingsNeeded.join(", ")}`;
    if (activePolls.length) msg += `\n🗳️ ${activePolls.length} active poll${activePolls.length > 1 ? "s" : ""} — cast your vote!`;
    return msg;
  }, []);

  // Initialize chat greeting when entering chat or switching days
  useEffect(() => {
    if (screen === "chat" && chatDayInit !== selectedDay) {
      const greeting = buildDayGreeting(selectedDay);
      if (chatDayInit === null) {
        setChatMessages([{ role: "ai", text: greeting }]);
      } else {
        setChatMessages(prev => [...prev, { role: "ai", text: `— Switching to Day ${selectedDay} —\n\n${greeting}` }]);
      }
      setChatDayInit(selectedDay);
    }
  }, [screen, selectedDay, chatDayInit, buildDayGreeting]);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => { chatRef.current?.scrollTo(0, chatRef.current.scrollHeight); }, [chatMessages]);


  // ─── Screen: Polls ───
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [newPollOptions, setNewPollOptions] = useState(["", ""]);

  const createNewPoll = (tripId) => {
    if (!newPollQuestion.trim()) { alert("Enter a question"); return; }
    const validOpts = newPollOptions.filter(o => o.trim());
    if (validOpts.length < 2) { alert("Add at least 2 options"); return; }
    const newPoll = {
      id: Date.now(),
      q: newPollQuestion.trim(),
      status: "active",
      ends: "Tomorrow 9 PM",
      by: "You",
      votes: 0,
      options: validOpts.map(text => ({ text: text.trim(), pct: 0, voters: [], voted: false })),
    };
    if (tripId) {
      // Add to created trip's polls
      setCreatedTrips(prev => prev.map(t => t.id === tripId ? { ...t, polls: [newPoll, ...(t.polls || [])] } : t));
      logActivity(tripId, "🗳️", `Created poll: "${newPollQuestion.trim()}"`, "poll");
    } else {
      // Demo trip
      setPollData(prev => [newPoll, ...prev]);
    }
    setNewPollQuestion("");
    setNewPollOptions(["", ""]);
    setShowPollCreator(false);
    showToast("Poll created!");
  };

  // ─── Screen: Join Preview ───
  const [joinedSlot, setJoinedSlot] = useState(null);


  // ─── Render ───
  const phoneStyle = { maxWidth: 600, width: "100%", margin: "0 auto", minHeight: "100dvh", height: "100dvh", background: T.bg, overflow: "hidden", fontFamily: T.font, color: T.t1 };

  if (authLoading) {
    return (
      <div className="w-app" style={phoneStyle}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;1,400&family=Instrument+Serif&display=swap');@keyframes spin{to{transform:rotate(360deg)}}@keyframes kb1{from{transform:scale(1)}to{transform:scale(1.15)}}@keyframes kb2{from{transform:scale(1.15)}to{transform:scale(1)}}@keyframes kb3{from{transform:scale(1) translateX(0)}to{transform:scale(1.1) translateX(-3%)}}@keyframes kb4{from{transform:scale(1.1) translateY(-2%)}to{transform:scale(1) translateY(0)}}@keyframes reelFadeIn{from{opacity:0}to{opacity:1}}@keyframes reelProgress{from{width:0%}to{width:100%}}@keyframes reelEnergetic{0%{transform:scale(1) rotate(0deg);opacity:0}10%{opacity:1}100%{transform:scale(1.15) rotate(1.5deg);opacity:1}}@keyframes demoPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}@keyframes demoSlideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes demoPulse{0%,100%{opacity:.3}50%{opacity:1}}@keyframes demoBounce{0%{transform:translateY(-16px);opacity:0}65%{transform:translateY(3px)}100%{transform:translateY(0);opacity:1}}@keyframes demoFadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}@keyframes demoType{from{width:0}to{width:100%}}@keyframes demoGrow{from{width:0%}to{width:var(--target-width)}}@keyframes typingDot{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.08);border-radius:4px}.w-app input:focus-visible,.w-app textarea:focus-visible,.w-app select:focus-visible{border-color:#4a6f60!important;box-shadow:0 0 0 2px rgba(74,111,96,.15)}.w-app button:focus-visible{outline:2px solid #4a6f60;outline-offset:2px}.w-app input[type="date"]{cursor:pointer}.w-app input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;padding:4px;opacity:.6}.w-app button{transition:all .15s}.w-app button:hover{filter:brightness(.96)}.w-app button:active{filter:brightness(.9);transition:all 60ms}.w-pri:hover{filter:brightness(1.08)!important;box-shadow:0 2px 8px rgba(74,111,96,.25)}.w-pri:active{filter:brightness(.9)!important;transform:scale(.97)}.w-chip:hover{border-color:rgba(74,111,96,.4)!important;background:rgba(74,111,96,.06)!important}.w-chip:active{transform:scale(.96)}.w-tab:hover{color:#4a6f60!important}.w-expand{cursor:pointer;transition:all .15s}.w-expand:hover{background:rgba(0,0,0,.02)}.w-expand:active{background:rgba(0,0,0,.04)}html,body,#root{height:100%;margin:0;background:#f5f3f0}@media(min-width:601px){.w-app{border-radius:22px!important;max-height:900px!important;min-height:0!important;height:900px!important;border:.5px solid rgba(0,0,0,.08)!important;box-shadow:0 8px 40px rgba(0,0,0,.08)!important;margin-top:20px!important;zoom:0.85}}@media(max-width:600px){.w-app{border-radius:0!important;max-height:none!important;height:100dvh!important;border:none!important;box-shadow:none!important;margin:0!important;font-size:14px}}`}</style>
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontFamily: T.fontD, fontSize: 24, fontWeight: 400 }}>Trip With Me</h1>
            <p style={{ fontSize: 12, color: T.t2, marginTop: 4 }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-app" style={phoneStyle}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;1,400&family=Instrument+Serif&display=swap');@keyframes spin{to{transform:rotate(360deg)}}@keyframes kb1{from{transform:scale(1)}to{transform:scale(1.15)}}@keyframes kb2{from{transform:scale(1.15)}to{transform:scale(1)}}@keyframes kb3{from{transform:scale(1) translateX(0)}to{transform:scale(1.1) translateX(-3%)}}@keyframes kb4{from{transform:scale(1.1) translateY(-2%)}to{transform:scale(1) translateY(0)}}@keyframes reelFadeIn{from{opacity:0}to{opacity:1}}@keyframes reelProgress{from{width:0%}to{width:100%}}@keyframes reelEnergetic{0%{transform:scale(1) rotate(0deg);opacity:0}10%{opacity:1}100%{transform:scale(1.15) rotate(1.5deg);opacity:1}}@keyframes demoPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}@keyframes demoSlideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes demoPulse{0%,100%{opacity:.3}50%{opacity:1}}@keyframes demoBounce{0%{transform:translateY(-16px);opacity:0}65%{transform:translateY(3px)}100%{transform:translateY(0);opacity:1}}@keyframes demoFadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}@keyframes demoType{from{width:0}to{width:100%}}@keyframes demoGrow{from{width:0%}to{width:var(--target-width)}}@keyframes typingDot{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.08);border-radius:4px}.w-app input:focus-visible,.w-app textarea:focus-visible,.w-app select:focus-visible{border-color:#4a6f60!important;box-shadow:0 0 0 2px rgba(74,111,96,.15)}.w-app button:focus-visible{outline:2px solid #4a6f60;outline-offset:2px}.w-app input[type="date"]{cursor:pointer}.w-app input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;padding:4px;opacity:.6}.w-app button{transition:all .15s}.w-app button:hover{filter:brightness(.96)}.w-app button:active{filter:brightness(.9);transition:all 60ms}.w-pri:hover{filter:brightness(1.08)!important;box-shadow:0 2px 8px rgba(74,111,96,.25)}.w-pri:active{filter:brightness(.9)!important;transform:scale(.97)}.w-chip:hover{border-color:rgba(74,111,96,.4)!important;background:rgba(74,111,96,.06)!important}.w-chip:active{transform:scale(.96)}.w-tab:hover{color:#4a6f60!important}.w-expand{cursor:pointer;transition:all .15s}.w-expand:hover{background:rgba(0,0,0,.02)}.w-expand:active{background:rgba(0,0,0,.04)}html,body,#root{height:100%;margin:0;background:#f5f3f0}@media(min-width:601px){.w-app{border-radius:22px!important;max-height:900px!important;min-height:0!important;height:900px!important;border:.5px solid rgba(0,0,0,.08)!important;box-shadow:0 8px 40px rgba(0,0,0,.08)!important;margin-top:20px!important;zoom:0.85}}@media(max-width:600px){.w-app{border-radius:0!important;max-height:none!important;height:100dvh!important;border:none!important;box-shadow:none!important;margin:0!important;font-size:14px}}`}</style>
        <div style={{ height: "100%" }}>
          <AuthScreen signInWithGoogle={signInWithGoogle} signUpWithEmail={signUpWithEmail} signInWithEmail={signInWithEmail} authScreen={authScreen} setAuthScreen={setAuthScreen} authEmail={authEmail} setAuthEmail={setAuthEmail} authPassword={authPassword} setAuthPassword={setAuthPassword} authName={authName} setAuthName={setAuthName} authError={authError} setAuthError={setAuthError} setUser={setUser} setAuthLoading={setAuthLoading} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-app" style={phoneStyle}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;1,400&family=Instrument+Serif&display=swap');@keyframes spin{to{transform:rotate(360deg)}}@keyframes kb1{from{transform:scale(1)}to{transform:scale(1.15)}}@keyframes kb2{from{transform:scale(1.15)}to{transform:scale(1)}}@keyframes kb3{from{transform:scale(1) translateX(0)}to{transform:scale(1.1) translateX(-3%)}}@keyframes kb4{from{transform:scale(1.1) translateY(-2%)}to{transform:scale(1) translateY(0)}}@keyframes reelFadeIn{from{opacity:0}to{opacity:1}}@keyframes reelProgress{from{width:0%}to{width:100%}}@keyframes reelEnergetic{0%{transform:scale(1) rotate(0deg);opacity:0}10%{opacity:1}100%{transform:scale(1.15) rotate(1.5deg);opacity:1}}@keyframes demoPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}@keyframes demoSlideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes demoPulse{0%,100%{opacity:.3}50%{opacity:1}}@keyframes demoBounce{0%{transform:translateY(-16px);opacity:0}65%{transform:translateY(3px)}100%{transform:translateY(0);opacity:1}}@keyframes demoFadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}@keyframes demoType{from{width:0}to{width:100%}}@keyframes demoGrow{from{width:0%}to{width:var(--target-width)}}@keyframes typingDot{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.08);border-radius:4px}.w-app input:focus-visible,.w-app textarea:focus-visible,.w-app select:focus-visible{border-color:#4a6f60!important;box-shadow:0 0 0 2px rgba(74,111,96,.15)}.w-app button:focus-visible{outline:2px solid #4a6f60;outline-offset:2px}.w-app input[type="date"]{cursor:pointer}.w-app input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;padding:4px;opacity:.6}.w-app button{transition:all .15s}.w-app button:hover{filter:brightness(.96)}.w-app button:active{filter:brightness(.9);transition:all 60ms}.w-pri:hover{filter:brightness(1.08)!important;box-shadow:0 2px 8px rgba(74,111,96,.25)}.w-pri:active{filter:brightness(.9)!important;transform:scale(.97)}.w-chip:hover{border-color:rgba(74,111,96,.4)!important;background:rgba(74,111,96,.06)!important}.w-chip:active{transform:scale(.96)}.w-tab:hover{color:#4a6f60!important}.w-expand{cursor:pointer;transition:all .15s}.w-expand:hover{background:rgba(0,0,0,.02)}.w-expand:active{background:rgba(0,0,0,.04)}html,body,#root{height:100%;margin:0;background:#f5f3f0}@media(min-width:601px){.w-app{border-radius:22px!important;max-height:900px!important;min-height:0!important;height:900px!important;border:.5px solid rgba(0,0,0,.08)!important;box-shadow:0 8px 40px rgba(0,0,0,.08)!important;margin-top:20px!important;zoom:0.85}}@media(max-width:600px){.w-app{border-radius:0!important;max-height:none!important;height:100dvh!important;border:none!important;box-shadow:none!important;margin:0!important;font-size:14px}}`}</style>
      <div style={{ height: "100%" }}>
        {screen === "home" && <HomeScreen navigate={navigate} resetWizard={resetWizard} createdTrips={createdTrips} viewCreatedTrip={viewCreatedTrip} makeTripLive={makeTripLive} deleteCreatedTrip={deleteCreatedTrip} showNotifications={showNotifications} setShowNotifications={setShowNotifications} totalUnread={totalUnread} lastSeenActivity={lastSeenActivity} allRecentActivity={allRecentActivity} getUnreadCount={getUnreadCount} markTripSeen={markTripSeen} setSelectedDay={setSelectedDay} setShowDemo={setShowDemo} setDemoSlide={setDemoSlide} setTripDetailTab={setTripDetailTab} />}
        {screen === "create" && <CreateScreen wizStep={wizStep} setWizStep={setWizStep} wizTrip={wizTrip} setWizTrip={setWizTrip} wizShowErrors={wizShowErrors} setWizShowErrors={setWizShowErrors} wizTravellers={wizTravellers} setWizTravellers={setWizTravellers} wizStays={wizStays} setWizStays={setWizStays} wizPrefs={wizPrefs} setWizPrefs={setWizPrefs} placeInput={placeInput} setPlaceInput={setPlaceInput} placeSuggestionsOpen={placeSuggestionsOpen} setPlaceSuggestionsOpen={setPlaceSuggestionsOpen} staySearch={staySearch} setStaySearch={setStaySearch} staySearchOpen={staySearchOpen} setStaySearchOpen={setStaySearchOpen} stayPlacesResults={stayPlacesResults} setStayPlacesResults={setStayPlacesResults} staySearching={staySearching} handleStaySearchChange={handleStaySearchChange} foodSearch={foodSearch} setFoodSearch={setFoodSearch} adultActSearch={adultActSearch} setAdultActSearch={setAdultActSearch} olderActSearch={olderActSearch} setOlderActSearch={setOlderActSearch} youngerActSearch={youngerActSearch} setYoungerActSearch={setYoungerActSearch} expandedPrefSections={expandedPrefSections} setExpandedPrefSections={setExpandedPrefSections} placesFood={placesFood} placesActivities={placesActivities} REGION_SUGGESTIONS={REGION_SUGGESTIONS} editingTripId={editingTripId} setEditingTripId={setEditingTripId} navigate={navigate} showToast={showToast} createTrip={createTrip} />}
        {screen === "createdTrip" && <CreatedTripScreen createdTrips={createdTrips} selectedCreatedTrip={selectedCreatedTrip} setCreatedTrips={setCreatedTrips} setSelectedCreatedTrip={setSelectedCreatedTrip} navigate={navigate} showToast={showToast} tripDetailTab={tripDetailTab} setTripDetailTab={setTripDetailTab} selectedDay={selectedDay} setSelectedDay={setSelectedDay} expandedItem={expandedItem} setExpandedItem={setExpandedItem} editingTimelineIdx={editingTimelineIdx} setEditingTimelineIdx={setEditingTimelineIdx} addTimelineItem={addTimelineItem} updateTimelineItem={updateTimelineItem} deleteTimelineItem={deleteTimelineItem} moveTimelineItem={moveTimelineItem} getDayItems={getDayItems} hasTimeline={hasTimeline} findSmartSlot={findSmartSlot} generateAndSetTimeline={generateAndSetTimeline} makeTripLive={makeTripLive} deleteCreatedTrip={deleteCreatedTrip} setWizTrip={setWizTrip} setWizTravellers={setWizTravellers} setWizStays={setWizStays} setWizPrefs={setWizPrefs} setWizStep={setWizStep} setEditingTripId={setEditingTripId} logActivity={logActivity} getUnreadCount={getUnreadCount} markTripSeen={markTripSeen} showMap={showMap} setShowMap={setShowMap} tripDirections={tripDirections} setTripDirections={setTripDirections} getFullRouteFromStays={getFullRouteFromStays} tripChatInput={tripChatInput} setTripChatInput={setTripChatInput} tripChatMessages={tripChatMessages} tripChatTyping={tripChatTyping} tripChatEndRef={tripChatEndRef} handleTripChat={handleTripChat} chatAddDayPicker={chatAddDayPicker} setChatAddDayPicker={setChatAddDayPicker} showPollCreator={showPollCreator} setShowPollCreator={setShowPollCreator} newPollQuestion={newPollQuestion} setNewPollQuestion={setNewPollQuestion} newPollOptions={newPollOptions} setNewPollOptions={setNewPollOptions} createNewPoll={createNewPoll} expenses={expenses} showAddExpense={showAddExpense} setShowAddExpense={setShowAddExpense} editingExpense={editingExpense} setEditingExpense={setEditingExpense} expenseDesc={expenseDesc} setExpenseDesc={setExpenseDesc} expenseAmount={expenseAmount} setExpenseAmount={setExpenseAmount} expenseCategory={expenseCategory} setExpenseCategory={setExpenseCategory} expensePaidBy={expensePaidBy} setExpensePaidBy={setExpensePaidBy} expenseSplitMethod={expenseSplitMethod} setExpenseSplitMethod={setExpenseSplitMethod} expenseParticipants={expenseParticipants} setExpenseParticipants={setExpenseParticipants} expenseCustomSplits={expenseCustomSplits} setExpenseCustomSplits={setExpenseCustomSplits} showSettlement={showSettlement} setShowSettlement={setShowSettlement} resetExpenseForm={resetExpenseForm} saveExpense={saveExpense} deleteExpense={deleteExpense} getCategoryBreakdown={getCategoryBreakdown} calculateSettlement={calculateSettlement} uploadedPhotos={uploadedPhotos} setUploadedPhotos={setUploadedPhotos} handlePhotoUpload={handlePhotoUpload} updatePhotoInSupabase={updatePhotoInSupabase} deletePhotoFromSupabase={deletePhotoFromSupabase} viewingPhoto={viewingPhoto} setViewingPhoto={setViewingPhoto} reelPlaying={reelPlaying} setReelPlaying={setReelPlaying} reelIndex={reelIndex} setReelIndex={setReelIndex} reelPaused={reelPaused} setReelPaused={setReelPaused} reelStyle={reelStyle} setReelStyle={setReelStyle} photoInputRef={photoInputRef} shareToWhatsApp={shareToWhatsApp} expandedSections={expandedSections} setExpandedSections={setExpandedSections} />}
        {screen === "trip" && <TripScreen selectedDay={selectedDay} setSelectedDay={setSelectedDay} expandedItem={expandedItem} setExpandedItem={setExpandedItem} bookingStates={bookingStates} setBookingStates={setBookingStates} navigate={navigate} />}
        {screen === "chat" && <ChatScreen selectedDay={selectedDay} setSelectedDay={setSelectedDay} chatMessages={chatMessages} setChatMessages={setChatMessages} chatInput={chatInput} setChatInput={setChatInput} chatRef={chatRef} chatTyping={chatTyping} setChatTyping={setChatTyping} chatFlowStep={chatFlowStep} setChatFlowStep={setChatFlowStep} chatFlowData={chatFlowData} setChatFlowData={setChatFlowData} lastChatTopic={lastChatTopic} setLastChatTopic={setLastChatTopic} navigate={navigate} showToast={showToast} createdTrips={createdTrips} selectedCreatedTrip={selectedCreatedTrip} setCreatedTrips={setCreatedTrips} findSmartSlot={findSmartSlot} addTimelineItem={addTimelineItem} logActivity={logActivity} />}
        {screen === "vote" && <VoteScreen pollData={pollData} setPollData={setPollData} showPollCreator={showPollCreator} setShowPollCreator={setShowPollCreator} newPollQuestion={newPollQuestion} setNewPollQuestion={setNewPollQuestion} newPollOptions={newPollOptions} setNewPollOptions={setNewPollOptions} createNewPoll={createNewPoll} navigate={navigate} showToast={showToast} selectedCreatedTrip={selectedCreatedTrip} createdTrips={createdTrips} addTimelineItem={addTimelineItem} selectedDay={selectedDay} />}
        {screen === "memories" && <MemoriesScreen uploadedPhotos={uploadedPhotos} setUploadedPhotos={setUploadedPhotos} navigate={navigate} selectedCreatedTrip={selectedCreatedTrip} createdTrips={createdTrips} user={user} supabase={supabase} logActivity={logActivity} photoInputRef={photoInputRef} viewingPhoto={viewingPhoto} setViewingPhoto={setViewingPhoto} videoState={videoState} setVideoState={setVideoState} reelPlaying={reelPlaying} setReelPlaying={setReelPlaying} reelIndex={reelIndex} setReelIndex={setReelIndex} reelPaused={reelPaused} setReelPaused={setReelPaused} reelStyle={reelStyle} setReelStyle={setReelStyle} videoSettings={videoSettings} setVideoSettings={setVideoSettings} updatePhotoInSupabase={updatePhotoInSupabase} deletePhotoFromSupabase={deletePhotoFromSupabase} />}
        {screen === "share" && <ShareScreen navigate={navigate} />}
        {screen === "explore" && <ExploreScreen selectedCreatedTrip={selectedCreatedTrip} createdTrips={createdTrips} selectedDay={selectedDay} navigate={navigate} />}
        {screen === "settings" && <SettingsScreen user={user} navigate={navigate} signOut={signOut} selectedCreatedTrip={selectedCreatedTrip} syncing={syncing} settingsToggles={settingsToggles} setSettingsToggles={setSettingsToggles} />}
        {screen === "joinPreview" && <JoinPreviewScreen selectedCreatedTrip={selectedCreatedTrip} createdTrips={createdTrips} setCreatedTrips={setCreatedTrips} setSelectedCreatedTrip={setSelectedCreatedTrip} navigate={navigate} joinedSlot={joinedSlot} setJoinedSlot={setJoinedSlot} joinTripAsTraveller={joinTripAsTraveller} user={user} showToast={showToast} />}
      </div>
      {/* ── Activation Preferences Modal (global, works from any screen) ── */}
      {showActivationModal && (() => {
        const pendTrip = createdTrips.find(t => t.id === pendingActivationTripId);
        const isEV = pendTrip?.travel?.some(m => /ev/i.test(m));
        const startLoc = pendTrip?.startLocation || "";
        const firstPlace = pendTrip?.places?.[0] || "";
        const routePlaces = pendTrip ? getSmartRouteOrder(pendTrip) : [];
        const startH = activationPrefs.startTime ? parseInt(activationPrefs.startTime.split(":")[0]) : 8;
        const estArrival = Math.min(startH + 2, 18);
        const fmtHr = (h) => { const s = h >= 12 ? "PM" : "AM"; return `${h > 12 ? h - 12 : h}:00 ${s}`; };
        return (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380, maxHeight: "85vh", overflowY: "auto" }}>
            <h3 style={{ fontFamily: T.fontD, fontSize: 18, fontWeight: 400, marginBottom: 4 }}>Plan your journey</h3>
            <p style={{ fontSize: 12, color: T.t2, marginBottom: 16 }}>We'll build your itinerary around your travel.</p>

            {/* Route overview */}
            {startLoc && routePlaces.length > 0 && (
              <div style={{ background: T.s2, borderRadius: T.rs, padding: 12, marginBottom: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Your route</p>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: T.t1, fontWeight: 500 }}>{startLoc}</span>
                  {routePlaces.map((p, i) => (
                    <React.Fragment key={i}>
                      <span style={{ fontSize: 10, color: T.t3 }}>→</span>
                      <span style={{ fontSize: 12, color: T.ad, fontWeight: 500 }}>{p}</span>
                    </React.Fragment>
                  ))}
                  <span style={{ fontSize: 10, color: T.t3 }}>→</span>
                  <span style={{ fontSize: 12, color: T.t1, fontWeight: 500 }}>{startLoc}</span>
                </div>
                {isEV && <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, padding: "6px 10px", background: T.amberL, borderRadius: 8 }}>
                  <span style={{ fontSize: 14 }}>⚡</span>
                  <p style={{ fontSize: 11, color: T.amber, fontWeight: 500 }}>EV detected — we'll suggest charging stops along the way</p>
                </div>}
              </div>
            )}

            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>What time do you start your journey?</label>
            <input type="time" value={activationPrefs.startTime} onChange={e => setActivationPrefs(p => ({ ...p, startTime: e.target.value }))}
              style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, background: T.s, outline: "none", marginBottom: 4, minHeight: 44 }} />
            {startLoc && firstPlace && <p style={{ fontSize: 11, color: T.t3, marginBottom: 14 }}>Estimated arrival at {firstPlace}: ~{fmtHr(estArrival)}</p>}

            {/* Stopovers */}
            {activationPrefs.stopovers.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>Suggested stops</label>
                {activationPrefs.stopovers.map((stop, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 6, background: stop.enabled ? (stop.type === "ev_charge" ? T.amberL : T.s2) : T.s, borderRadius: T.rs, border: `.5px solid ${stop.enabled ? (stop.type === "ev_charge" ? T.amber : T.border) : T.border}`, opacity: stop.enabled ? 1 : 0.5, cursor: "pointer", transition: "all .15s" }}
                    onClick={() => setActivationPrefs(p => ({ ...p, stopovers: p.stopovers.map((s, si) => si === i ? { ...s, enabled: !s.enabled } : s) }))}>
                    <span style={{ fontSize: 16 }}>{stop.type === "ev_charge" ? "⚡" : "☕"}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: T.t1 }}>{stop.label}</p>
                      <p style={{ fontSize: 10, color: T.t3 }}>{stop.desc} · {stop.time}</p>
                    </div>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `.5px solid ${stop.enabled ? T.a : T.border}`, background: stop.enabled ? T.a : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {stop.enabled && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>✓</span>}
                    </div>
                  </div>
                ))}
                {isEV && activationPrefs.stopovers.some(s => s.type === "ev_charge" && s.enabled && s.combineMeal) && (
                  <p style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>Charging stops include a meal/coffee break</p>
                )}
              </div>
            )}

            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 8, textTransform: "uppercase", letterSpacing: .5 }}>Day 1 pace?</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {[{ id: "relaxed", label: "Relaxed", desc: "Settle in, easy start" }, { id: "balanced", label: "Balanced", desc: "Some exploring" }, { id: "packed", label: "Packed", desc: "Hit the ground running" }].map(opt => (
                <div key={opt.id} onClick={() => setActivationPrefs(p => ({ ...p, dayOnePace: opt.id }))}
                  style={{ flex: 1, padding: "8px 6px", borderRadius: T.rs, border: `.5px solid ${activationPrefs.dayOnePace === opt.id ? T.a : T.border}`,
                    background: activationPrefs.dayOnePace === opt.id ? T.al : T.s, cursor: "pointer", textAlign: "center", transition: "all .15s" }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: activationPrefs.dayOnePace === opt.id ? T.ad : T.t1 }}>{opt.label}</p>
                  <p style={{ fontSize: 9, color: T.t3, marginTop: 2 }}>{opt.desc}</p>
                </div>
              ))}
            </div>

            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.t3, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>Anything else? (optional)</label>
            <textarea value={activationPrefs.notes} onChange={e => setActivationPrefs(p => ({ ...p, notes: e.target.value }))}
              placeholder="e.g. Nap break after lunch, prefer outdoor activities..."
              style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 12, background: T.s, outline: "none", resize: "vertical", minHeight: 44, marginBottom: 16 }} />

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowActivationModal(false); setPendingActivationTripId(null); }} style={{ ...css.btn, ...css.btnSm, flex: 1, justifyContent: "center" }}>Cancel</button>
              <button onClick={confirmActivation} style={{ ...css.btn, ...css.btnP, flex: 2, justifyContent: "center", padding: "12px 16px" }}>Generate itinerary</button>
            </div>
          </div>
        </div>
        );
      })()}
      {/* Trip Reel Overlay */}
      {reelPlaying && uploadedPhotos.length > 0 && (() => {
        const photo = uploadedPhotos[reelIndex] || uploadedPhotos[0];
        // Animation based on reel style
        const baseDur = reelStyle === "energetic" ? 2 : reelStyle === "slideshow" ? 3 : 4;
        const reelDuration = videoSettings.has("Slow-mo") ? baseDur * 1.5 : baseDur;
        let photoAnimation, photoTransformOrigin;
        if (reelStyle === "cinematic") {
          const kbAnimations = ["kb1", "kb2", "kb3", "kb4"];
          const kbOrigins = ["top left", "center", "bottom right", "top right"];
          photoAnimation = `${kbAnimations[reelIndex % 4]} ${reelDuration}s ease-in-out forwards`;
          photoTransformOrigin = kbOrigins[reelIndex % 4];
        } else if (reelStyle === "slideshow") {
          photoAnimation = `reelFadeIn 0.8s ease-in`;
          photoTransformOrigin = "center";
        } else {
          // energetic — quick zoom with slight rotation
          photoAnimation = `reelEnergetic ${reelDuration}s ease-out forwards`;
          photoTransformOrigin = reelIndex % 2 === 0 ? "center left" : "center right";
        }
        const likedCount = uploadedPhotos.filter(p => p.liked).length;
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", display: "flex", flexDirection: "column", fontFamily: T.font }}>
            {/* Progress bars */}
            <div style={{ display: "flex", gap: 3, padding: "12px 8px 8px", zIndex: 2 }}>
              {uploadedPhotos.map((_, i) => (
                <div key={i} style={{ flex: 1, height: 2.5, borderRadius: 2, overflow: "hidden", background: "rgba(255,255,255,0.3)" }}>
                  <div style={{
                    height: "100%",
                    borderRadius: 2,
                    background: "#fff",
                    width: i < reelIndex ? "100%" : i === reelIndex ? "0%" : "0%",
                    ...(i === reelIndex && !reelPaused ? { animation: `reelProgress ${reelDuration}s linear forwards` } : {}),
                    ...(i === reelIndex && reelPaused ? { width: "50%" } : {}),
                  }} />
                </div>
              ))}
            </div>
            {/* Close button */}
            <button onClick={() => setReelPlaying(false)} style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", zIndex: 3, lineHeight: 1, padding: 4 }}>&times;</button>
            {/* Photo with style-based animation */}
            <div key={reelIndex} style={{ flex: 1, overflow: "hidden", position: "relative", animation: "reelFadeIn 0.5s ease-in" }}>
              <img
                src={photo.url}
                alt={photo.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  animation: photoAnimation,
                  transformOrigin: photoTransformOrigin,
                }}
              />
              {/* Date stamp overlay */}
              {videoSettings.has("Date stamps") && photo.uploadDate && (
                <span style={{ position: "absolute", top: 40, right: 12, color: "rgba(255,255,255,.8)", fontSize: 11, fontWeight: 500, textShadow: "0 1px 3px rgba(0,0,0,.5)", zIndex: 2 }}>{"\uD83D\uDCC5"} {photo.uploadDate}</span>
              )}
              {/* Pause indicator */}
              {reelPaused && (
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 48, color: "rgba(255,255,255,0.8)", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>⏸️</div>
              )}
              {/* Bottom overlay gradient */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(transparent, rgba(0,0,0,0.7))", pointerEvents: "none" }} />
              {/* Day badge + caption */}
              <div style={{ position: "absolute", bottom: 60, left: 16, right: 16, zIndex: 2 }}>
                <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 12, background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 12, fontWeight: 500, marginBottom: 8 }}>📍 {photo.day || "Untagged"}</span>
                {photo.caption && <p style={{ color: "#fff", fontSize: 15, fontWeight: 500, marginBottom: 4, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{photo.caption}</p>}
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{photo.name}</p>
              </div>
              {/* Stats */}
              <div style={{ position: "absolute", bottom: 24, left: 16, zIndex: 2 }}>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>❤️ {likedCount} photo{likedCount !== 1 ? "s" : ""} liked</span>
              </div>
              {/* Touch zones */}
              <div style={{ position: "absolute", inset: 0, display: "flex", zIndex: 1 }}>
                {/* Left third - previous */}
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => {
                  if (reelIndex > 0) {
                    if (reelTimerRef.current) clearInterval(reelTimerRef.current);
                    setReelIndex(prev => prev - 1);
                    setReelPaused(false);
                  }
                }} />
                {/* Center third - pause/play */}
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setReelPaused(prev => !prev)} />
                {/* Right third - next */}
                <div style={{ flex: 1, cursor: "pointer" }} onClick={() => {
                  if (reelTimerRef.current) clearInterval(reelTimerRef.current);
                  if (reelIndex < uploadedPhotos.length - 1) {
                    setReelIndex(prev => prev + 1);
                    setReelPaused(false);
                  } else {
                    setReelPlaying(false);
                  }
                }} />
              </div>
            </div>
          </div>
        );
      })()}
      {showWelcome && screen === "home" && createdTrips.length === 0 && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9997, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.s, borderRadius: T.r, padding: 28, maxWidth: 340, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{"🌍"}</div>
            <h2 style={{ fontFamily: T.fontD, fontSize: 22, fontWeight: 400, marginBottom: 8 }}>Welcome to Trip With Me</h2>
            <p style={{ fontSize: 13, color: T.t2, marginBottom: 20, lineHeight: 1.5 }}>Your AI travel concierge. Plan trips, invite friends, and create memories together.</p>
            <button onClick={() => { setShowWelcome(false); localStorage.setItem('twm_welcomed', 'true'); setScreen("create"); setWizStep(0); resetWizard(); }}
              style={{ ...css.btn, ...css.btnP, width: "100%", padding: "12px 16px", justifyContent: "center", fontSize: 14, fontWeight: 500, marginBottom: 10 }}>
              Create my first trip
            </button>
            <button onClick={() => { setShowWelcome(false); localStorage.setItem('twm_welcomed', 'true'); setShowDemo(true); setDemoSlide(0); }}
              style={{ ...css.btn, width: "100%", padding: "12px 16px", justifyContent: "center", fontSize: 13, color: T.t2 }}>
              Explore the demo first
            </button>
          </div>
        </div>
      )}
      {showDemo && (() => {
        const t = demoTick;
        const s = demoSlide;
        const total = 10;
        const isLast = s === total - 1;
        // Helper: typewriter text (reveals chars based on tick)
        const typeText = (text, startTick, speed = 2) => {
          const elapsed = Math.max(0, t - startTick);
          const chars = Math.min(text.length, Math.floor(elapsed / speed));
          return text.substring(0, chars) + (chars < text.length ? "│" : "");
        };
        // Helper: show element after tick
        const show = (afterTick) => t >= afterTick;
        // Helpers: return animation only during animation window, then stable static style to prevent flicker
        const popIn = (delay) => {
          if (t < delay) return { opacity: 0, transform: "scale(0)" };
          if (t < delay + 4) return { animation: "demoPop .6s cubic-bezier(.34,1.56,.64,1) forwards" };
          return { opacity: 1, transform: "scale(1)" };
        };
        const slideUp = (delay) => {
          if (t < delay) return { opacity: 0, transform: "translateY(16px)" };
          if (t < delay + 4) return { animation: "demoSlideUp .55s ease-out forwards" };
          return { opacity: 1, transform: "translateY(0)" };
        };
        const bounceIn = (delay) => {
          if (t < delay) return { opacity: 0, transform: "translateY(-16px)" };
          if (t < delay + 4) return { animation: "demoBounce .65s ease-out forwards" };
          return { opacity: 1, transform: "translateY(0)" };
        };
        // Chat bubble — mount at delay, transition at delay+1 (flicker-free)
        const ChatBubble = ({ text, isUser, delay }) => {
          if (t < delay) return null;
          const visible = t > delay;
          return (
            <div style={{ maxWidth: "85%", padding: "10px 14px", borderRadius: 14, fontSize: 12, lineHeight: 1.5, alignSelf: isUser ? "flex-end" : "flex-start",
              background: isUser ? T.a : T.s2, color: isUser ? "#fff" : T.t,
              opacity: visible ? 1 : 0, transform: visible ? "scale(1)" : "scale(.96)",
              transition: "opacity .5s ease, transform .5s ease" }}>
              {text}
            </div>
          );
        };

        // ─── SLIDE RENDERERS ───
        const renderSlide = () => {
          switch (s) {
            // ─── Slide 0: Narrative intro ───
            case 0: return (
              <div style={{ textAlign: "center", maxWidth: 340 }}>
                <div style={{ fontSize: 48, marginBottom: 16, ...popIn(2) }}>👨‍👩‍👧‍👦</div>
                <p style={{ fontFamily: T.fontD, fontSize: 22, color: "#fff", marginBottom: 8, ...slideUp(5) }}>
                  Meet the Johnsons
                </p>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,.7)", lineHeight: 1.6, ...slideUp(8) }}>
                  4 adults, 2 kids, 1 EV, and a dream Easter trip to the Lake District.
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20, ...slideUp(14) }}>
                  {[["You", T.a], ["James", T.coral], ["Sarah", T.blue], ["+1", T.amber]].map(([n, c], i) => (
                    <div key={i} style={{ ...popIn(16 + i * 4) }}>
                      <div style={{ width: 44, height: 44, borderRadius: 22, background: c, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 600, margin: "0 auto 4px" }}>{n[0]}</div>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>{n}</span>
                    </div>
                  ))}
                </div>
                {show(32) && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 14 }}>
                    {[{e:"👦",n:"Max, 12"},{e:"👧",n:"Ella, 8"}].map((k, i) => (
                      <div key={i} style={{ padding: "6px 14px", borderRadius: 10, background: "rgba(255,255,255,.08)", ...popIn(34 + i * 5) }}>
                        <span style={{ fontSize: 16 }}>{k.e}</span>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginLeft: 6 }}>{k.n}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );

            // ─── Slide 1: Trip creation with typing ───
            case 1: return (
              <div style={{ width: "100%", maxWidth: 320 }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 12, textAlign: "center", ...slideUp(0) }}>Step 1 · Name your trip</p>
                <div style={{ background: T.s, borderRadius: 14, padding: 16, textAlign: "left" }}>
                  <div style={{ background: T.s2, borderRadius: 8, padding: 12, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, color: T.t3 }}>Trip name</span>
                    <p style={{ fontSize: 14, fontWeight: 500, marginTop: 2, fontFamily: T.font, color: t < 3 ? T.t3 : T.t }}>{t < 3 ? "│" : typeText("Easter Lake District", 3, 1)}</p>
                  </div>
                  {show(25) && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 10, ...slideUp(25) }}>
                      <div style={{ flex: 1, background: T.s2, borderRadius: 8, padding: 10 }}>
                        <span style={{ fontSize: 10, color: T.t3 }}>Start</span>
                        <p style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>3 Apr 2026</p>
                      </div>
                      <div style={{ flex: 1, background: T.s2, borderRadius: 8, padding: 10 }}>
                        <span style={{ fontSize: 10, color: T.t3 }}>End</span>
                        <p style={{ fontSize: 12, fontWeight: 500, marginTop: 2 }}>7 Apr 2026</p>
                      </div>
                    </div>
                  )}
                  {show(30) && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {["Windermere", "Ambleside", "Keswick", "Grasmere"].map((p, i) => (
                        show(32 + i * 3) && <span key={p} style={{ ...css.chip, ...css.chipActive, fontSize: 11, padding: "4px 10px", ...popIn(32 + i * 3) }}>{p}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );

            // ─── Slide 2: Stays slide in ───
            case 2: return (
              <div style={{ width: "100%", maxWidth: 320 }}>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 12, textAlign: "center", ...slideUp(0) }}>Step 2 · Where are you staying?</p>
                <div style={{ background: T.s, borderRadius: 14, padding: 16, textAlign: "left" }}>
                  {show(4) && (
                    <div style={{ background: T.s2, borderRadius: 8, padding: 10, marginBottom: 6, display: "flex", alignItems: "center", gap: 8, ...slideUp(4) }}>
                      <span style={{ fontSize: 16 }}>🔍</span>
                      <span style={{ fontSize: 12, color: T.t3 }}>{typeText("Windermere hotels...", 6, 0.75)}</span>
                    </div>
                  )}
                  {[
                    { name: "Windermere Boutique Hotel", dates: "3-5 Apr", type: "Hotel", tags: ["2 rooms", "Breakfast", "EV charger"], delay: 14 },
                    { name: "Keswick Lakeside Cottage", dates: "5-7 Apr", type: "Cottage", tags: ["3 beds", "Garden", "Dog friendly"], delay: 20 },
                  ].map((stay, i) => (
                    show(stay.delay) && <div key={i} style={{ background: T.s2, borderRadius: 8, padding: 12, marginBottom: 6, ...slideUp(stay.delay) }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>{stay.name}</span>
                        <span style={{ fontSize: 9, color: T.amber, background: T.amberL, padding: "2px 8px", borderRadius: 8 }}>{stay.type}</span>
                      </div>
                      <span style={{ fontSize: 10, color: T.t3 }}>{stay.dates}</span>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                        {stay.tags.map((tag, j) => show(stay.delay + 3 + j * 2) && <span key={tag} style={{ fontSize: 9, padding: "2px 7px", borderRadius: 8, background: T.al, color: T.ad, ...popIn(stay.delay + 3 + j * 2) }}>{tag}</span>)}
                      </div>
                    </div>
                  ))}
                  {show(28) && <div style={{ textAlign: "center", marginTop: 4, ...popIn(28) }}><span style={{ fontSize: 10, color: T.ad }}>✓ 2 stays added</span></div>}
                </div>
              </div>
            );

            // ─── Slide 3: Day 1 chat conversation ───
            case 3: return (
              <div style={{ width: "100%", maxWidth: 320 }}>
                <div style={{ background: T.ad, borderRadius: "14px 14px 0 0", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>Chat with AI</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.15)", padding: "2px 8px", borderRadius: 8 }}>Day 1 · 3 Apr</span>
                </div>
                <div style={{ background: T.s, borderRadius: "0 0 14px 14px", padding: 12, display: "flex", flexDirection: "column", gap: 8, minHeight: 240 }}>
                  <ChatBubble delay={2} text={<span>🔋 <b>Travel day!</b> Manchester → Windermere<br/><br/>What time would you like to leave?</span>} />
                  {show(14) && (
                    <div style={{ display: "flex", gap: 6, ...slideUp(14) }}>
                      {["8:00 AM", "9:00 AM", "10:00 AM"].map((time, i) => (
                        <span key={time} style={{ ...css.chip, fontSize: 10, padding: "5px 12px",
                          ...(demoInteracted.time === time ? css.chipActive : {}),
                          cursor: "pointer", ...popIn(16 + i * 3) }}
                          onClick={e => { e.stopPropagation(); setDemoInteracted(p => ({...p, time})); setDemoPaused(true); setTimeout(() => setDemoPaused(false), 1500); }}>
                          {time}
                        </span>
                      ))}
                    </div>
                  )}
                  <ChatBubble delay={demoInteracted.time ? 0 : 28} isUser text={demoInteracted.time || "9:00 AM"} />
                  {(demoInteracted.time || show(34)) && (
                    <ChatBubble delay={demoInteracted.time ? 2 : 34} text={
                      <span>🗺️ <b>Route ready!</b><br/>Manchester → M6 → A591<br/>⚡ EV stop: Lancaster Services<br/>📍 Arrive ~{demoInteracted.time === "8:00 AM" ? "9:30 AM" : demoInteracted.time === "10:00 AM" ? "11:30 AM" : "10:30 AM"}</span>
                    } />
                  )}
                </div>
              </div>
            );

            // ─── Slide 4: Activity day with animated schedule ───
            case 4: return (
              <div style={{ width: "100%", maxWidth: 320 }}>
                <div style={{ background: T.ad, borderRadius: "14px 14px 0 0", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>Chat with AI</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.15)", padding: "2px 8px", borderRadius: 8 }}>Day 2 · 4 Apr</span>
                </div>
                <div style={{ background: T.s, borderRadius: "0 0 14px 14px", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <ChatBubble delay={2} text={<span>Good morning! Day 2 in <b>Ambleside</b> · 12°C ☁️</span>} />
                  {show(14) && (
                    <div style={{ background: T.amberL, borderRadius: 8, padding: "6px 10px", fontSize: 11, ...slideUp(14) }}>
                      🏨 Your base: <b>Windermere Boutique Hotel</b>
                    </div>
                  )}
                  {show(20) && (
                    <div style={{ display: "flex", gap: 6, ...slideUp(20) }}>
                      <div style={{ flex: 1, background: T.blueL, borderRadius: 8, padding: 8, ...slideUp(20) }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: T.blue, marginBottom: 4 }}>Adults</p>
                        {["🥾 Loughrigg Fell", "💆 Low Wood Spa"].map((a, i) => show(24 + i * 4) && <p key={i} style={{ fontSize: 10, marginBottom: 2, ...slideUp(24 + i * 4) }}>{a}</p>)}
                      </div>
                      <div style={{ flex: 1, background: T.pinkL, borderRadius: 8, padding: 8, ...slideUp(22) }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: T.pink, marginBottom: 4 }}>Kids</p>
                        {["🎢 Brockhole Park", "🥚 Easter egg trail"].map((a, i) => show(26 + i * 4) && <p key={i} style={{ fontSize: 10, marginBottom: 2, ...slideUp(26 + i * 4) }}>{a}</p>)}
                      </div>
                    </div>
                  )}
                  {show(36) && (
                    <div style={{ fontSize: 11, color: T.ad, textAlign: "center", padding: 6, background: T.al, borderRadius: 8, ...popIn(36) }}>
                      🍽️ Everyone meets at <b>Fellinis</b> for lunch — 12:30 PM
                    </div>
                  )}
                </div>
              </div>
            );

            // ─── Slide 5: Last day departure ───
            case 5: return (
              <div style={{ width: "100%", maxWidth: 320 }}>
                <div style={{ background: T.ad, borderRadius: "14px 14px 0 0", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "#fff" }}>Chat with AI</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,.6)", background: "rgba(255,255,255,.15)", padding: "2px 8px", borderRadius: 8 }}>Day 5 · 7 Apr</span>
                </div>
                <div style={{ background: T.s, borderRadius: "0 0 14px 14px", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <ChatBubble delay={2} text={<span>🏠 <b>Time to head home!</b> Keswick → Manchester<br/><br/>When do you want to set off?</span>} />
                  {show(14) && (
                    <div style={{ display: "flex", gap: 6, ...slideUp(14) }}>
                      {["10:00 AM", "After lunch"].map((opt, i) => (
                        <span key={opt} style={{ ...css.chip, fontSize: 10, padding: "5px 12px", cursor: "pointer", ...popIn(16 + i * 3),
                          ...(demoInteracted.depart === opt ? css.chipActive : {}) }}
                          onClick={e => { e.stopPropagation(); setDemoInteracted(p => ({...p, depart: opt})); setDemoPaused(true); setTimeout(() => setDemoPaused(false), 1500); }}>
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}
                  <ChatBubble delay={demoInteracted.depart ? 0 : 26} isUser text={demoInteracted.depart || "After lunch"} />
                  {(demoInteracted.depart || show(32)) && (
                    <ChatBubble delay={demoInteracted.depart ? 2 : 32} text={
                      <span>🗺️ <b>Route planned!</b><br/>Keswick → A66 → M6<br/>☕ Stop: Rheged Centre<br/>📍 Home by ~{demoInteracted.depart === "10:00 AM" ? "1:30 PM" : "5:00 PM"}</span>
                    } />
                  )}
                </div>
              </div>
            );

            // ─── Slide 6: Interactive poll ───
            case 6: {
              const pollVote = demoInteracted.poll;
              const opts = [
                { text: "The Drunken Duck", desc: "steaks · kids free", base: 2 },
                { text: "The Unicorn", desc: "pub grills · playground", base: 1 },
                { text: "Lake Road Kitchen", desc: "Nordic · upscale", base: 1 },
              ];
              const totalVotes = 4 + (pollVote !== undefined ? 1 : 0);
              const getVotes = (i) => {
                let v = opts[i].base;
                if (pollVote === i) v++;
                return v;
              };
              return (
                <div style={{ width: "100%", maxWidth: 320 }}>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 12, textAlign: "center", ...slideUp(0) }}>Group decision time</p>
                  <div style={{ background: T.s, borderRadius: 14, padding: 16, textAlign: "left" }}>
                    <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, ...slideUp(3) }}>🗳️ Where should we eat dinner?</p>
                    <p style={{ fontSize: 10, color: T.t3, marginBottom: 12, ...slideUp(5) }}>4 travellers · {pollVote !== undefined ? "You voted!" : "Tap to vote"}</p>
                    {opts.map((o, i) => {
                      const pct = Math.round(getVotes(i) / totalVotes * 100);
                      const voted = pollVote === i;
                      return show(8 + i * 4) && (
                        <div key={i} style={{ marginBottom: 8, position: "relative", borderRadius: 10, overflow: "hidden",
                          border: `1.5px solid ${voted ? T.a : T.border}`, cursor: pollVote === undefined ? "pointer" : "default", ...slideUp(8 + i * 4) }}
                          onClick={e => { if (pollVote !== undefined) return; e.stopPropagation(); setDemoInteracted(p => ({...p, poll: i})); setDemoPaused(true); setTimeout(() => setDemoPaused(false), 2000); }}>
                          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: pollVote !== undefined ? `${pct}%` : "0%",
                            background: voted ? T.al : T.s2, transition: "width 1s ease" }} />
                          <div style={{ position: "relative", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <span style={{ fontSize: 12, fontWeight: voted ? 600 : 400 }}>{voted ? "✓ " : ""}{o.text}</span>
                              <span style={{ fontSize: 10, color: T.t3, marginLeft: 6 }}>{o.desc}</span>
                            </div>
                            {pollVote !== undefined && <span style={{ fontSize: 12, fontWeight: 600, color: voted ? T.ad : T.t3 }}>{pct}%</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // ─── Slide 7: Photos flying in ───
            case 7: {
              const photos = [
                { label: "Fell view", color: "#5A8C6E" }, { label: "Lake", color: "#5A7EA0" },
                { label: "Lunch", color: "#A08060" }, { label: "Ella playing", color: "#7EA060" },
                { label: "Boat trip", color: "#4A8BA0" }, { label: "Ice cream", color: "#A04A8B" },
                { label: "Pub dinner", color: "#8A7348" }, { label: "Sunset", color: "#C87040" },
              ];
              return (
                <div style={{ width: "100%", maxWidth: 320 }}>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,.5)", marginBottom: 12, textAlign: "center", ...slideUp(0) }}>Day 2 memories · Ambleside</p>
                  <div style={{ background: T.s, borderRadius: 14, padding: 14, textAlign: "left" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5 }}>
                      {photos.map((p, i) => (
                        <div key={i} style={{ aspectRatio: "1", borderRadius: 8, background: show(4 + i * 3) ? p.color : T.s2,
                          display: "flex", alignItems: "flex-end", padding: 4, transition: "background .5s ease",
                          ...(show(4 + i * 3) ? bounceIn(4 + i * 3) : { opacity: .2 }) }}>
                          {show(4 + i * 3) && <span style={{ fontSize: 8, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,.5)" }}>{p.label}</span>}
                        </div>
                      ))}
                    </div>
                    {show(30) && (
                      <div style={{ textAlign: "center", marginTop: 10, ...popIn(30) }}>
                        <span style={{ fontSize: 11, color: T.ad }}>📸 {Math.min(8, Math.max(0, Math.floor((t - 4) / 3)))} photos added</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // ─── Slide 8: AI highlights reel ───
            case 8: {
              const reelPhotos = ["#5A8C6E", "#5A7EA0", "#A08060", "#4A8BA0", "#C87040"];
              const activeReel = Math.min(reelPhotos.length - 1, Math.floor(t / 7));
              return (
                <div style={{ width: "100%", maxWidth: 320 }}>
                  <div style={{ background: "#1a1a1a", borderRadius: 14, padding: 16, textAlign: "center", color: "#fff", overflow: "hidden" }}>
                    <div style={{ display: "flex", gap: 3, marginBottom: 14 }}>
                      {reelPhotos.map((_, i) => (
                        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,.15)", overflow: "hidden" }}>
                          <div style={{ height: "100%", background: T.a, width: i < activeReel ? "100%" : i === activeReel ? `${(t % 7) / 7 * 100}%` : "0%", transition: "width .12s linear" }} />
                        </div>
                      ))}
                    </div>
                    <div style={{ width: "100%", aspectRatio: "16/10", borderRadius: 8, background: reelPhotos[activeReel], marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .5s ease", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", bottom: 8, left: 10, fontSize: 10, color: "rgba(255,255,255,.7)" }}>
                        {["Loughrigg Fell", "Windermere Lake", "Lunch at Fellinis", "Boat trip", "Sunset"][activeReel]}
                      </div>
                      <div style={{ position: "absolute", top: 8, right: 10, fontSize: 9, color: "rgba(255,255,255,.5)", background: "rgba(0,0,0,.3)", padding: "2px 6px", borderRadius: 4 }}>
                        Day {[2,2,2,3,4][activeReel]}
                      </div>
                    </div>
                    <p style={{ fontFamily: T.fontD, fontSize: 16, marginBottom: 4, ...slideUp(2) }}>Easter Lake District 2026</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,.5)", marginBottom: 10 }}>AI-curated highlights · 8 photos</p>
                    <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                      {["🎵 Music", "🎙️ Narration", "📅 Dates"].map((s, i) => (
                        <span key={s} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 8, background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.6)", ...popIn(4 + i * 3) }}>{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            // ─── Slide 9: CTA ───
            case 9: return (
              <div style={{ textAlign: "center", maxWidth: 340 }}>
                <div style={{ fontSize: 56, marginBottom: 16, ...popIn(2) }}>🌍</div>
                <h2 style={{ fontFamily: T.fontD, fontSize: 26, color: "#fff", marginBottom: 8, ...slideUp(5) }}>Your adventure awaits</h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.6, marginBottom: 24, ...slideUp(8) }}>
                  Trip With Me connects maps, weather, bookings, EV chargers, and AI — so you can focus on making memories.
                </p>
                {show(14) && (
                  <button onClick={e => { e.stopPropagation(); setShowDemo(false); setScreen("create"); setWizStep(0); resetWizard(); }}
                    style={{ ...css.btn, ...css.btnP, width: "100%", padding: "14px 16px", justifyContent: "center", fontSize: 15, fontWeight: 500, marginBottom: 10, ...slideUp(14) }}>
                    Create my first trip
                  </button>
                )}
                {show(18) && (
                  <p onClick={e => { e.stopPropagation(); setShowDemo(false); }}
                    style={{ fontSize: 12, color: "rgba(255,255,255,.4)", cursor: "pointer", marginTop: 4, ...slideUp(18) }}>
                    or explore the demo trip →
                  </p>
                )}
              </div>
            );

            default: return null;
          }
        };

        // Narrative captions per slide
        const captions = [
          "This is their story...",
          "First, name the trip and pick destinations",
          "Then find the perfect places to stay",
          "Day 1 — the AI plans the whole drive",
          "Activity days — split plans for everyone",
          "Last day — route home with pit stops",
          "Big decisions? Let the group vote",
          "Every moment, captured and catalogued",
          "The AI turns your photos into a highlight reel",
          "",
        ];

        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "linear-gradient(180deg, #0D2818 0%, #1A3C2A 50%, #0D2818 100%)", display: "flex", flexDirection: "column", fontFamily: T.font, overflow: "hidden" }}
            onClick={e => {
              if (isLast) return;
              const x = e.clientX;
              const w = window.innerWidth;
              if (x < w * 0.25) { setDemoSlide(Math.max(0, s - 1)); }
              else if (x > w * 0.75) { setDemoSlide(Math.min(total - 1, s + 1)); }
            }}>
            {/* Progress bar */}
            <div style={{ display: "flex", gap: 3, padding: "12px 16px 0", flexShrink: 0 }}>
              {Array.from({length: total}).map((_, i) => {
                const dur = DEMO_SLIDE_DURATIONS[i] || 50;
                return (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,.15)", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, background: i < s ? "rgba(255,255,255,.8)" : i === s ? T.a : "transparent",
                      width: i < s ? "100%" : i === s ? `${Math.min(100, (t / dur) * 100)}%` : "0%", transition: i === s ? "width .12s linear" : "none" }} />
                  </div>
                );
              })}
            </div>
            {/* Top bar: Skip + pause */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 16px 0", flexShrink: 0 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.4)" }}>{s + 1} / {total}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={e => { e.stopPropagation(); setDemoPaused(p => !p); }}
                  style={{ background: "rgba(255,255,255,.1)", border: "none", color: "rgba(255,255,255,.7)", fontSize: 11, padding: "4px 12px", borderRadius: 12, cursor: "pointer", fontFamily: T.font }}>
                  {demoPaused ? "▶ Play" : "❚❚ Pause"}
                </button>
                <button onClick={e => { e.stopPropagation(); setShowDemo(false); setDemoPaused(false); setDemoInteracted({}); }}
                  style={{ background: "rgba(255,255,255,.1)", border: "none", color: "rgba(255,255,255,.7)", fontSize: 11, padding: "4px 12px", borderRadius: 12, cursor: "pointer", fontFamily: T.font }}>
                  Skip
                </button>
              </div>
            </div>
            {/* Slide content */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", overflow: "hidden" }} key={`slide-${s}`}>
              {renderSlide()}
            </div>
            {/* Bottom caption */}
            {captions[s] && (
              <div style={{ textAlign: "center", padding: "12px 24px 24px", flexShrink: 0 }}>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", fontStyle: "italic" }}>{captions[s]}</p>
              </div>
            )}
          </div>
        );
      })()}
      {toast && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", zIndex: 9998, padding: "10px 20px", borderRadius: 20, background: toast.type === "error" ? T.red : T.ad, color: "#fff", fontSize: 13, fontFamily: T.font, boxShadow: "0 4px 12px rgba(0,0,0,.15)", animation: "reelFadeIn .3s ease" }}>
          {toast.type === "success" ? "✓ " : "⚠ "}{toast.message}
        </div>
      )}
      {viewingPhoto && (() => {
        const photo = viewingPhoto;
        return (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", flexDirection: "column", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px" }}>
              <button onClick={() => setViewingPhoto(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 16px", gap: 12 }}>
              <img src={photo.url} alt={photo.name} style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: T.rs }} />
              <div style={{ width: "100%", maxWidth: 400 }}>
                <p style={{ color: "#fff", fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{photo.name}</p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginBottom: 10 }}>Uploaded {photo.uploadDate || "—"}</p>
                <input
                  type="text"
                  value={photo.caption || ""}
                  placeholder="Add a caption..."
                  onChange={(e) => {
                    const val = e.target.value;
                    setUploadedPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, caption: val } : p));
                    setViewingPhoto(prev => ({ ...prev, caption: val }));
                  }}
                  onBlur={() => { updatePhotoInSupabase(photo.id, { caption: photo.caption || '' }); }}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: T.rs, border: `.5px solid rgba(255,255,255,0.2)`, background: "rgba(255,255,255,0.1)", color: "#fff", fontFamily: T.font, fontSize: 13, outline: "none", marginBottom: 10 }}
                />
                <div style={{ marginBottom: 12 }}>
                  <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, display: "block", marginBottom: 4 }}>Assign to day</label>
                  <select
                    value={photo.day || "Untagged"}
                    onChange={(e) => {
                      const val = e.target.value;
                      setUploadedPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, day: val } : p));
                      setViewingPhoto(prev => ({ ...prev, day: val }));
                      updatePhotoInSupabase(photo.id, { day_tag: val });
                    }}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: T.rs, border: `.5px solid rgba(255,255,255,0.2)`, background: "rgba(255,255,255,0.15)", color: "#fff", fontFamily: T.font, fontSize: 13, outline: "none" }}
                  >
                    <option value="Untagged" style={{ color: "#000" }}>Untagged</option>
                    {(() => {
                      const tp = selectedCreatedTrip || createdTrips[0];
                      const dc = tp?.start && tp?.end ? Math.max(1, Math.ceil((new Date(tp.end) - new Date(tp.start)) / 86400000) + 1) : 5;
                      return Array.from({ length: Math.min(dc, 30) }, (_, i) => (
                        <option key={i} value={`Day ${i + 1}`} style={{ color: "#000" }}>Day {i + 1}</option>
                      ));
                    })()}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button
                    onClick={() => {
                      setUploadedPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, liked: !p.liked } : p));
                      setViewingPhoto(prev => ({ ...prev, liked: !prev.liked }));
                      updatePhotoInSupabase(photo.id, { liked: !photo.liked });
                    }}
                    style={{ ...css.btn, background: photo.liked ? T.redL : "rgba(255,255,255,0.1)", color: photo.liked ? T.red : "#fff", borderColor: photo.liked ? T.red : "rgba(255,255,255,0.2)" }}
                  >
                    {photo.liked ? "\u2764\uFE0F Liked" : "\uD83E\uDD0D Like"}
                  </button>
                  <button
                    onClick={() => {
                      deletePhotoFromSupabase(photo);
                      setUploadedPhotos(prev => prev.filter(p => p.id !== photo.id));
                      setViewingPhoto(null);
                    }}
                    style={{ ...css.btn, background: "rgba(217,62,62,0.15)", color: T.red, borderColor: T.red }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
