import React, { useRef, useEffect, useState } from 'react';
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';
import { EXPENSE_CATEGORIES, getCatInfo } from '../../constants/expenses';
import { renderChatHtml } from '../../utils/chatHelpers';
import { Avatar } from '../common/Avatar';
import { Tag } from '../common/Tag';
import { Collapsible } from '../common/Collapsible';
import { TripMap } from '../map/TripMap';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useTrip } from '../../contexts/TripContext';
import { useWizard } from '../../contexts/WizardContext';
import { useChat } from '../../contexts/ChatContext';
import { useExpenses } from '../../contexts/ExpenseContext';
import { useMemories } from '../../contexts/MemoriesContext';

import { curateReelPhotos } from '../../utils/reelCurator';
import { REEL_TRACKS } from '../../utils/reelMusic';
import { detectMood, generateAutoCaption, buildMemoryTimeline } from '../../utils/aiMemories';
import { checkSchoolHolidays, getHolidayBadge } from '../../utils/schoolHolidays';
import { detectConflicts } from '../../utils/conflictDetector';
import { generatePackingSuggestions, PACKING_CATEGORIES } from '../../utils/packingSuggester';
import { EV_MODELS, calculateRealisticRange, planChargingStops } from '../../utils/evPlanner';
import { checkInActivity, markRunningLate, getDayProgress, getTimeToNext } from '../../utils/liveTrip';
import { checkWeatherAlerts } from '../../utils/weatherAlerts';
import { exportItineraryAsPDF } from '../../utils/exportItinerary';
import { detectItemType, getRestaurantBookingLinks, getActivityBookingLinks } from '../../utils/bookingLinks';
import { TimelineItemSkeleton } from '../common/Skeleton';

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return `${d.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]}`;
};

/** Detect the user's locale currency symbol */
function getLocaleCurrencySymbol() {
  try {
    const locale = navigator.language || 'en-GB';
    const currencyMap = {
      'en-US': 'USD', 'en-GB': 'GBP', 'en-AU': 'AUD', 'en-CA': 'CAD',
      'en-NZ': 'NZD', 'en-IE': 'EUR', 'de': 'EUR', 'fr': 'EUR', 'es': 'EUR',
      'it': 'EUR', 'nl': 'EUR', 'pt': 'EUR', 'ja': 'JPY', 'zh': 'CNY',
      'ko': 'KRW', 'hi': 'INR', 'ar': 'AED', 'sv': 'SEK', 'no': 'NOK',
      'da': 'DKK', 'pl': 'PLN', 'cs': 'CZK', 'hu': 'HUF', 'ro': 'RON',
      'bg': 'BGN', 'hr': 'HRK', 'tr': 'TRY', 'ru': 'RUB', 'th': 'THB',
      'id': 'IDR', 'ms': 'MYR', 'vi': 'VND', 'fil': 'PHP', 'zh-TW': 'TWD',
      'zh-HK': 'HKD', 'en-SG': 'SGD', 'en-ZA': 'ZAR', 'pt-BR': 'BRL',
      'es-MX': 'MXN', 'es-AR': 'ARS', 'es-CL': 'CLP', 'es-CO': 'COP',
    };
    const code = currencyMap[locale] || currencyMap[locale.split('-')[0]] || 'GBP';
    const parts = new Intl.NumberFormat(locale, { style: 'currency', currency: code }).formatToParts(0);
    const sym = parts.find(p => p.type === 'currency');
    return sym ? sym.value : '£';
  } catch { return '£'; }
}
const CS = getLocaleCurrencySymbol();

export function CreatedTripScreen() {
  const { user } = useAuth();
  const { navigate, showToast } = useNavigation();
  const { createdTrips, selectedCreatedTrip, setCreatedTrips, setSelectedCreatedTrip, tripDetailTab, setTripDetailTab, selectedDay, setSelectedDay, expandedItem, setExpandedItem, editingTimelineIdx, setEditingTimelineIdx, addTimelineItem, updateTimelineItem, finaliseTimelineEdit, deleteTimelineItem, moveTimelineItem, getDayItems, hasTimeline, findSmartSlot, generateAndSetTimeline, makeTripLive, deleteCreatedTrip, logActivity, getUnreadCount, markTripSeen, showMap, setShowMap, tripDirections, setTripDirections, getFullRouteFromStays, showPollCreator, setShowPollCreator, newPollQuestion, setNewPollQuestion, newPollOptions, setNewPollOptions, createNewPoll, shareToWhatsApp, expandedSections, setExpandedSections, endTrip } = useTrip();
  const { setWizTrip, setWizTravellers, setWizStays, setWizPrefs, setWizStep, setEditingTripId } = useWizard();
  const { tripChatInput, setTripChatInput, tripChatMessages, tripChatTyping, tripChatEndRef, handleTripChat, chatAddDayPicker, setChatAddDayPicker, loadTripMessages, intelligence, smartTips, tripChatFlow } = useChat();
  const { expenses, showAddExpense, setShowAddExpense, editingExpense, setEditingExpense, expenseDesc, setExpenseDesc, expenseAmount, setExpenseAmount, expenseCategory, setExpenseCategory, expensePaidBy, setExpensePaidBy, expenseSplitMethod, setExpenseSplitMethod, expenseParticipants, setExpenseParticipants, expenseCustomSplits, setExpenseCustomSplits, showSettlement, setShowSettlement, expenseDate, setExpenseDate, resetExpenseForm, saveExpense, deleteExpense, getCategoryBreakdown, calculateSettlement, loadExpenses } = useExpenses();
  const { uploadedPhotos, setUploadedPhotos, viewingPhoto, setViewingPhoto, reelPlaying, setReelPlaying, reelIndex, setReelIndex, reelPaused, setReelPaused, reelStyle, setReelStyle, reelTrack, setReelTrack, reelPhotos, setReelPhotos, wrappedPlaying, setWrappedPlaying, memoriesView, setMemoriesView, autoOrderEnabled, setAutoOrderEnabled, photoInputRef, uploadDayTagRef, updatePhotoInSupabase, deletePhotoFromSupabase, handlePhotoUpload, loadTripPhotos } = useMemories();


  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [showLateOptions, setShowLateOptions] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem("twm_dismissed_weather_alerts") || "[]"); } catch { return []; }
  });

  // Packing list state
  const tripId = selectedCreatedTrip?.id;
  const [packingItems, setPackingItems] = useState(() => {
    if (tripId) {
      const saved = localStorage.getItem(`twm_packing_${tripId}`);
      if (saved) try { return JSON.parse(saved); } catch {}
    }
    return [];
  });
  const [packingGenerated, setPackingGenerated] = useState(() => {
    if (tripId) {
      const saved = localStorage.getItem(`twm_packing_${tripId}`);
      if (saved) try { JSON.parse(saved); return true; } catch {}
    }
    return false;
  });
  const [newPackingItem, setNewPackingItem] = useState("");
  const [packingFilter, setPackingFilter] = useState("all"); // "all", "packed", "unpacked", person name

  // EV profile state
  const [evProfile, setEvProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("twm_ev_profile")) || null; } catch { return null; }
  });
  const [showEvSetup, setShowEvSetup] = useState(false);
  const [chargingPlan, setChargingPlan] = useState(null);

  // Conflict detection
  const [conflicts, setConflicts] = useState([]);
  const [showConflicts, setShowConflicts] = useState(false);

  // Swipe between days — only on the day nav pills, not the content area (to avoid blocking scroll)
  const swipeStart = useRef(null);
  const handleDayNavSwipe = (numDays) => ({
    onTouchStart: (e) => { swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; },
    onTouchEnd: (e) => {
      if (!swipeStart.current) return;
      const dx = e.changedTouches[0].clientX - swipeStart.current.x;
      const dy = e.changedTouches[0].clientY - swipeStart.current.y;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0 && selectedDay < numDays) { setSelectedDay(selectedDay + 1); setEditingTimelineIdx(null); }
        if (dx > 0 && selectedDay > 1) { setSelectedDay(selectedDay - 1); setEditingTimelineIdx(null); }
      }
      swipeStart.current = null;
    },
  });

  const trip = createdTrips.find(t => t.id === selectedCreatedTrip?.id) || selectedCreatedTrip;

  // Load trip data from Supabase when selected trip changes
  const tripDbId = selectedCreatedTrip?.dbId || selectedCreatedTrip?.id;
  useEffect(() => {
    if (tripDbId) {
      loadTripMessages(tripDbId);
      loadExpenses(tripDbId);
      loadTripPhotos(tripDbId);
    }
  }, [tripDbId]); // eslint-disable-line

  // Auto-detect conflicts when timeline changes
  useEffect(() => {
    if (trip?.timeline && Object.keys(trip.timeline).length > 0) {
      setConflicts(detectConflicts(trip));
    }
  }, [trip?.timeline, selectedDay]); // eslint-disable-line

  // Persist packing check state to localStorage
  useEffect(() => {
    if (trip?.id && packingItems.length > 0) {
      localStorage.setItem(`twm_packing_${trip.id}`, JSON.stringify(packingItems));
    }
  }, [packingItems, trip?.id]); // eslint-disable-line

if (!trip) return <div style={{ padding: 40, textAlign: "center" }}>Trip not found. <button onClick={() => navigate("home")} style={css.btn}>Go home</button></div>;
  const isLive = trip.status === "live";
  const isCompleted = trip.status === "completed";
  const totalTravellers = (trip.travellers?.adults?.length || 0) + (trip.travellers?.olderKids?.length || 0) + (trip.travellers?.youngerKids?.length || 0) + (trip.travellers?.infants?.length || 0);
  // Smart numDays: prefer stay date span if stays indicate shorter trip
  let numDays = 1;
  const tripStays = trip.stays || [];
  if (tripStays.length > 0) {
    const cis = tripStays.map(s => s.checkIn).filter(Boolean).sort();
    const cos = tripStays.map(s => s.checkOut).filter(Boolean).sort();
    if (cis.length > 0 && cos.length > 0) {
      const sd = Math.max(1, Math.round((new Date(cos[cos.length - 1] + "T12:00:00") - new Date(cis[0] + "T12:00:00")) / 86400000) + 1);
      const rd = trip.rawStart && trip.rawEnd ? Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1) : null;
      numDays = (rd && sd < rd && sd <= 30) ? sd : (rd || sd);
    }
  }
  if (numDays <= 1 && trip.rawStart && trip.rawEnd) {
    numDays = Math.max(1, Math.round((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1);
  }
  const dayItems = getDayItems(trip.timeline, selectedDay, editingTimelineIdx !== null);
  const tripHasTimeline = hasTimeline(trip);
  const tripStart = trip.rawStart ? new Date(trip.rawStart) : null;

  // Edit trip handler
  const editTrip = () => {
    setWizTrip({ name: trip.name, brief: trip.brief || "", start: trip.rawStart || "", end: trip.rawEnd || "", places: [...trip.places], travel: new Set(trip.travel), budget: trip.budget || "", startLocation: trip.startLocation || "" });
    setWizTravellers({ adults: trip.travellers.adults.map(a => ({ ...a })), olderKids: (trip.travellers.olderKids || []).map(c => ({ ...c })), youngerKids: (trip.travellers.youngerKids || []).map(c => ({ ...c })), infants: (trip.travellers.infants || []).map(c => ({ ...c })) });
    setWizStays(trip.stays || []);
    setWizPrefs({ food: new Set(trip.prefs.food), adultActs: new Set(trip.prefs.adultActs || trip.prefs.activities), olderActs: new Set(trip.prefs.olderActs || []), youngerActs: new Set(trip.prefs.youngerActs || []), instructions: trip.prefs.instructions || "" });
    setWizStep(0);
    setEditingTripId(trip.id);
    navigate("create");
  };

  // Tab bar for live trips — pill chip style
  const tripTabStyle = (tab) => ({
    padding: "6px 16px", fontSize: 12, fontWeight: tripDetailTab === tab ? 600 : 400,
    color: tripDetailTab === tab ? T.ad : T.t3, cursor: "pointer",
    border: `1px solid ${tripDetailTab === tab ? T.a : T.border}`,
    background: tripDetailTab === tab ? T.al : "transparent",
    fontFamily: T.font, borderRadius: 20, whiteSpace: "nowrap", transition: "all .15s"
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Header ── */}
      <div style={{ background: isCompleted ? "#6B6185" : isLive ? T.ad : T.blue, color: "#fff", padding: "16px 20px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <button style={{ ...css.btn, ...css.btnSm, background: "rgba(255,255,255,.18)", borderColor: "rgba(255,255,255,.3)", color: "#fff", fontSize: 12, fontWeight: 500 }} onClick={() => navigate("home")}>← Back</button>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {isCompleted
              ? <span style={{ fontSize: 10, fontWeight: 600, background: "rgba(255,255,255,.22)", color: "#fff", padding: "3px 10px", borderRadius: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>Completed</span>
              : isLive
              ? <span style={{ fontSize: 10, fontWeight: 600, background: "rgba(255,255,255,.22)", color: "#fff", padding: "3px 10px", borderRadius: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>● Live</span>
              : <span style={{ fontSize: 10, fontWeight: 600, background: "rgba(255,255,255,.22)", color: "#fff", padding: "3px 10px", borderRadius: 12, letterSpacing: 0.5, textTransform: "uppercase" }}>Draft</span>
            }
            {isLive && !confirmingEnd && (
              <button onClick={() => setConfirmingEnd(true)} style={{ ...css.btn, ...css.btnSm, color: "#fff", fontSize: 12, fontWeight: 500, background: "rgba(255,255,255,.18)", borderColor: "rgba(255,255,255,.3)" }}>End trip</button>
            )}
            {isLive && confirmingEnd && (
              <>
                <button onClick={() => { setConfirmingEnd(false); endTrip(trip.id); }} style={{ ...css.btn, ...css.btnSm, color: "#fff", fontSize: 12, fontWeight: 500, background: "rgba(220,80,80,.8)", borderColor: "rgba(255,255,255,.3)" }}>Confirm end</button>
                <button onClick={() => setConfirmingEnd(false)} style={{ ...css.btn, ...css.btnSm, color: "#fff", fontSize: 12, fontWeight: 500, background: "rgba(255,255,255,.18)", borderColor: "rgba(255,255,255,.3)" }}>Cancel</button>
              </>
            )}
            {!isCompleted && <button onClick={editTrip} style={{ ...css.btn, ...css.btnSm, color: "#fff", fontSize: 12, fontWeight: 500, background: "rgba(255,255,255,.18)", borderColor: "rgba(255,255,255,.3)" }}>Edit</button>}
          </div>
        </div>
        <h2 style={{ fontFamily: T.fontD, fontSize: 20, fontWeight: 400 }}>{trip.name}</h2>
        <p style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
          {trip.rawStart && trip.rawEnd ? `${fmtDate(trip.rawStart)} – ${fmtDate(trip.rawEnd)} ${new Date(trip.rawEnd + "T12:00:00").getFullYear()}` : (trip.start && trip.end ? `${trip.start} – ${trip.end} ${trip.year}` : "Dates TBC")}
          {` · ${trip.places.join(", ") || "No locations"} · ${totalTravellers} traveller${totalTravellers > 1 ? "s" : ""}`}
        </p>
      </div>

      {/* ── Not live: draft trip screen ── */}
      {!isLive && !isCompleted && (() => {
        const travelIcons = { "Flight": "✈️", "EV vehicle": "⚡", "Non-EV vehicle": "🚗", "Train": "🚆", "Walking": "🚶", "Bicycle": "🚲" };
        const hasDates = trip.rawStart && trip.rawEnd;
        const hasPrefs = (trip.prefs?.food?.length > 0) || (trip.prefs?.adultActs?.length > 0) || (trip.prefs?.activities?.length > 0);
        const hasStays = trip.stayNames.length > 0;
        const hasTravel = trip.travel.length > 0;
        const hasTravellers = totalTravellers > 0;
        const readiness = [trip.places.length > 0, hasDates, hasTravel, hasStays].filter(Boolean).length;
        const readinessPct = Math.round((readiness / 4) * 100);

        return (
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

            {/* ── Activate CTA ── */}
            <div style={{ ...css.card, background: `linear-gradient(135deg, ${T.al}80, ${T.al})`, borderColor: T.a, marginBottom: 16, padding: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: T.a, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>🚀</div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: T.ad, marginBottom: 2 }}>Ready to go live?</h3>
                  <p style={{ fontSize: 12, color: T.t2, lineHeight: 1.4 }}>Generate a {numDays}-day itinerary with activities, food & routes</p>
                </div>
              </div>
              <button onClick={() => makeTripLive(trip.id)} style={{ ...css.btn, ...css.btnP, justifyContent: "center", width: "100%", padding: "14px 16px", fontSize: 15, fontWeight: 600, borderRadius: T.r, boxShadow: "0 2px 8px rgba(27,143,106,.25)" }}>Activate trip</button>
            </div>

            {/* ── What you'll unlock ── */}
            <div style={{ ...css.card, marginBottom: 16, padding: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: T.t, marginBottom: 12 }}>What activating unlocks</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { icon: "📋", label: "AI Itinerary", desc: "Day-by-day activities, food & routes", color: T.a },
                  { icon: "💬", label: "AI Chat", desc: "Refine plans with your concierge", color: T.blue },
                  { icon: "💷", label: "Expenses", desc: "Track & split costs with your group", color: T.coral },
                  { icon: "📊", label: "Group Polls", desc: "Vote on restaurants, activities & more", color: T.purple },
                  { icon: "🎒", label: "Packing List", desc: "Smart suggestions based on your trip", color: T.amber },
                  { icon: "📸", label: "Memories", desc: "Upload photos & create trip reels", color: T.pink },
                ].map(f => (
                  <div key={f.label} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: T.s2, borderRadius: T.rs }}>
                    <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 600, color: f.color }}>{f.label}</p>
                      <p style={{ fontSize: 10, color: T.t3, lineHeight: 1.3, marginTop: 2 }}>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Trip readiness ── */}
            <div style={{ ...css.card, marginBottom: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: T.t }}>Trip readiness</p>
                <span style={{ fontSize: 11, fontWeight: 600, color: readinessPct === 100 ? T.a : T.amber }}>{readinessPct}%</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: T.s3, marginBottom: 12, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${readinessPct}%`, background: readinessPct === 100 ? T.a : T.amber, borderRadius: 2, transition: "width .3s" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { done: trip.places.length > 0, label: "Destinations", detail: trip.places.join(", "), step: 0 },
                  { done: hasDates, label: "Dates", detail: hasDates ? `${trip.start} – ${trip.end}` : "Not set", step: 0 },
                  { done: hasTravel, label: "Transport", detail: hasTravel ? trip.travel.join(", ") : "Not set", step: 0 },
                  { done: hasStays, label: "Accommodation", detail: hasStays ? trip.stayNames.join(", ") : "Not added", step: 2 },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: item.done ? T.a : T.s3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: item.done ? "#fff" : T.t3, flexShrink: 0 }}>
                      {item.done ? "✓" : "·"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: T.t }}>{item.label}</p>
                      <p style={{ fontSize: 11, color: item.done ? T.t2 : T.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.detail}</p>
                    </div>
                    {!item.done && (
                      <button onClick={() => { editTrip(); setTimeout(() => setWizStep(item.step), 50); }}
                        style={{ fontSize: 10, fontWeight: 500, color: T.a, background: T.al, border: "none", borderRadius: 10, padding: "3px 10px", cursor: "pointer", fontFamily: T.font, flexShrink: 0 }}>Add</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ── Trip summary card ── */}
            <div style={{ ...css.card, marginBottom: 12, padding: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: T.t, marginBottom: 10 }}>Trip summary</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ padding: "10px 12px", background: T.s2, borderRadius: T.rs }}>
                  <p style={{ fontSize: 10, color: T.t3, textTransform: "uppercase", marginBottom: 2 }}>Duration</p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: T.t }}>{numDays} day{numDays > 1 ? "s" : ""}</p>
                </div>
                <div style={{ padding: "10px 12px", background: T.s2, borderRadius: T.rs }}>
                  <p style={{ fontSize: 10, color: T.t3, textTransform: "uppercase", marginBottom: 2 }}>Travellers</p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: T.t }}>{totalTravellers}</p>
                </div>
                <div style={{ padding: "10px 12px", background: T.s2, borderRadius: T.rs }}>
                  <p style={{ fontSize: 10, color: T.t3, textTransform: "uppercase", marginBottom: 2 }}>Transport</p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: T.t }}>{hasTravel ? trip.travel.map(t => travelIcons[t] || t).join(" ") : "—"}</p>
                </div>
                <div style={{ padding: "10px 12px", background: T.s2, borderRadius: T.rs }}>
                  <p style={{ fontSize: 10, color: T.t3, textTransform: "uppercase", marginBottom: 2 }}>Budget</p>
                  <p style={{ fontSize: 14, fontWeight: 500, color: T.t }}>{trip.budget || "—"}</p>
                </div>
              </div>
              {trip.brief && <p style={{ fontSize: 12, color: T.t2, marginTop: 10, lineHeight: 1.5, fontStyle: "italic" }}>"{trip.brief}"</p>}
            </div>

            {/* ── Quick actions ── */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button onClick={editTrip} style={{ ...css.card, flex: 1, padding: "12px", textAlign: "center", cursor: "pointer", border: `.5px solid ${T.border}` }}>
                <span style={{ fontSize: 18, display: "block", marginBottom: 4 }}>✏️</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: T.t2 }}>Edit trip</span>
              </button>
              <button onClick={() => { const link = `${window.location.origin}/join/${trip.dbId || trip.id}`; navigator.clipboard?.writeText(link).then(() => showToast("Invite link copied!")); }}
                style={{ ...css.card, flex: 1, padding: "12px", textAlign: "center", cursor: "pointer", border: `.5px solid ${T.border}` }}>
                <span style={{ fontSize: 18, display: "block", marginBottom: 4 }}>🔗</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: T.t2 }}>Share link</span>
              </button>
              <button onClick={() => { editTrip(); setTimeout(() => setWizStep(2), 50); }}
                style={{ ...css.card, flex: 1, padding: "12px", textAlign: "center", cursor: "pointer", border: `.5px solid ${T.border}` }}>
                <span style={{ fontSize: 18, display: "block", marginBottom: 4 }}>🏨</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: T.t2 }}>{hasStays ? "Edit stays" : "Add stay"}</span>
              </button>
            </div>

            {/* ── Stays detail (if any) ── */}
            {hasStays && (
              <div style={{ ...css.card, marginBottom: 12, padding: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: T.t, marginBottom: 10 }}>Accommodation</p>
                {(trip.stays || []).map((s, i) => {
                  const addToCalendar = s.checkIn ? () => {
                    const start = s.checkIn.replace(/-/g, "");
                    const end = s.checkOut ? s.checkOut.replace(/-/g, "") : start;
                    const loc = s.address || s.location || s.name;
                    const ics = [
                      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//TripWithMe//EN", "BEGIN:VEVENT",
                      `DTSTART;VALUE=DATE:${start}`, `DTEND;VALUE=DATE:${end}`,
                      `SUMMARY:🏨 ${s.name}`, `LOCATION:${loc}`,
                      `DESCRIPTION:Check-in: ${s.checkIn}${s.checkOut ? `\\nCheck-out: ${s.checkOut}` : ""}\\n\\nTrip With Me — ${trip.name}`,
                      "END:VEVENT", "END:VCALENDAR"
                    ].join("\r\n");
                    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a"); a.href = url; a.download = `${s.name.replace(/[^a-z0-9]/gi, "_")}.ics`; a.click();
                    URL.revokeObjectURL(url);
                    showToast("Calendar event downloaded");
                  } : null;
                  return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < trip.stays.length - 1 ? `.5px solid ${T.border}` : "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: T.amberL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🏨</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: T.t, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</p>
                      {s.checkIn && <p style={{ fontSize: 11, color: T.t3 }}>{s.checkIn}{s.checkOut ? ` → ${s.checkOut}` : ""}{s.location ? ` · ${s.location}` : ""}</p>}
                    </div>
                    {addToCalendar && (
                      <button onClick={addToCalendar} title="Add to calendar"
                        style={{ background: T.s2, border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontSize: 14, flexShrink: 0, lineHeight: 1 }}>
                        📅
                      </button>
                    )}
                  </div>
                  );
                })}
              </div>
            )}

            {/* ── Preferences (if any) ── */}
            {hasPrefs && (
              <div style={{ ...css.card, marginBottom: 12, padding: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: T.t, marginBottom: 10 }}>Preferences</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {[...(trip.prefs?.food || []), ...(trip.prefs?.adultActs || trip.prefs?.activities || [])].slice(0, 12).map(p => <Tag key={p} bg={T.s2} color={T.t2}>{p}</Tag>)}
                  {[...(trip.prefs?.food || []), ...(trip.prefs?.adultActs || trip.prefs?.activities || [])].length > 12 && <Tag bg={T.s2} color={T.t3}>+{[...(trip.prefs?.food || []), ...(trip.prefs?.adultActs || trip.prefs?.activities || [])].length - 12} more</Tag>}
                </div>
              </div>
            )}

            {/* ── Remove trip (de-emphasized) ── */}
            <button onClick={() => { if (window.confirm(`Are you sure you want to remove "${trip.name}"? This cannot be undone.`)) { deleteCreatedTrip(trip.id); navigate("home"); } }}
              style={{ background: "none", border: "none", color: T.t3, fontSize: 11, cursor: "pointer", fontFamily: T.font, padding: "12px 0", width: "100%", textAlign: "center", opacity: 0.6 }}>
              Remove trip
            </button>
          </div>
        );
      })()}

      {/* ── Completed trip: summary recap ── */}
      {isCompleted && (
        <div style={{ padding: 20, background: T.s2, borderBottom: `.5px solid ${T.border}` }}>
          <div style={{ ...css.card, padding: 16, background: `linear-gradient(135deg, ${T.purpleL}, #E8E5F5)`, borderColor: T.purple }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>{"\uD83C\uDFC1"}</span>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: T.purple }}>Trip Complete</p>
                <p style={{ fontSize: 11, color: T.t2 }}>Here's a recap of your adventure</p>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ padding: "10px 12px", background: "rgba(255,255,255,.7)", borderRadius: T.rs }}>
                <p style={{ fontSize: 10, color: T.t3, textTransform: "uppercase", marginBottom: 2 }}>Duration</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: T.t }}>{numDays} day{numDays > 1 ? "s" : ""}</p>
              </div>
              <div style={{ padding: "10px 12px", background: "rgba(255,255,255,.7)", borderRadius: T.rs }}>
                <p style={{ fontSize: 10, color: T.t3, textTransform: "uppercase", marginBottom: 2 }}>Travellers</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: T.t }}>{totalTravellers}</p>
              </div>
              <div style={{ padding: "10px 12px", background: "rgba(255,255,255,.7)", borderRadius: T.rs }}>
                <p style={{ fontSize: 10, color: T.t3, textTransform: "uppercase", marginBottom: 2 }}>Expenses</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: T.t }}>{"\u00A3"}{expenses.reduce((s, e) => s + e.amount, 0).toFixed(2)}</p>
              </div>
              <div style={{ padding: "10px 12px", background: "rgba(255,255,255,.7)", borderRadius: T.rs }}>
                <p style={{ fontSize: 10, color: T.t3, textTransform: "uppercase", marginBottom: 2 }}>Photos</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: T.t }}>{uploadedPhotos.length}</p>
              </div>
            </div>
            {/* Trip Wrapped button */}
            <button onClick={() => setWrappedPlaying(true)}
              style={{ width: "100%", marginTop: 12, padding: "12px 16px", borderRadius: T.rs, border: `1.5px solid ${T.purple}`, background: `linear-gradient(135deg, ${T.purpleL}, #E0DBF5)`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: T.font, transition: "all .15s" }}>
              <span style={{ fontSize: 18 }}>✨</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.purple }}>View Trip Wrapped</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Live trip: 3-tab layout ── */}
      {(isLive || isCompleted) && (
        <>
          {/* Tab bar */}
          <div style={{ display: "flex", overflowX: "auto", gap: 8, padding: "10px 16px", background: T.s, borderBottom: `1px solid ${T.border}08`, position: "sticky", top: 0, zIndex: 10, WebkitOverflowScrolling: "touch" }}>
            <button className="w-tab" style={tripTabStyle("itinerary")} onClick={() => setTripDetailTab("itinerary")}>Itinerary</button>
            <button className="w-tab" style={tripTabStyle("chat")} onClick={() => setTripDetailTab("chat")}>Chat</button>
            <button className="w-tab" style={tripTabStyle("polls")} onClick={() => setTripDetailTab("polls")}>Polls</button>
<button className="w-tab" style={tripTabStyle("expenses")} onClick={() => setTripDetailTab("expenses")}>Expenses</button>
            <button className="w-tab" style={tripTabStyle("packing")} onClick={() => setTripDetailTab("packing")}>Packing</button>
            <button className="w-tab" style={tripTabStyle("memories")} onClick={() => setTripDetailTab("memories")}>Memories</button>
            <button className="w-tab" style={{ ...tripTabStyle("activity"), position: "relative" }} onClick={() => { setTripDetailTab("activity"); markTripSeen(trip.id); }}>
              Activity
              {getUnreadCount(trip.id) > 0 && tripDetailTab !== "activity" && <span style={{ position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, background: T.coral, color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{getUnreadCount(trip.id)}</span>}
            </button>
          </div>

          {/* ── ITINERARY TAB ── */}
          {tripDetailTab === "itinerary" && (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              {!tripHasTimeline && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>✨</div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: T.ad, marginBottom: 4 }}>Your itinerary is being prepared</p>
                    <p style={{ fontSize: 12, color: T.t2, lineHeight: 1.5, marginBottom: 12, fontStyle: "italic" }}>Your adventure starts here -- generate a plan or add activities manually.</p>
                    <button onClick={() => { generateAndSetTimeline(trip.id); }} style={{ ...css.btn, ...css.btnP, ...css.btnSm }}>Generate itinerary</button>
                  </div>
                  {trip.status === "live" && (
                    <div style={{ width: "100%", padding: "16px 20px", marginTop: 16 }}>
                      <TimelineItemSkeleton />
                      <TimelineItemSkeleton />
                      <TimelineItemSkeleton />
                      <TimelineItemSkeleton />
                      <TimelineItemSkeleton />
                    </div>
                  )}
                </div>
              )}
              {tripHasTimeline && (
                <>
                  {/* Day navigator pills */}
                  <div style={{ display: "flex", gap: 6, padding: "10px 20px", overflowX: "auto", background: T.s, borderBottom: `.5px solid ${T.border}` }} {...handleDayNavSwipe(numDays)}>
                    {Array.from({ length: numDays }, (_, i) => i + 1).map(d => {
                      const dayDate = tripStart ? new Date(tripStart.getTime() + (d - 1) * 86400000) : null;
                      const dateStr = dayDate ? dayDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
                      const isActive = selectedDay === d;
                      const dayHasItems = getDayItems(trip.timeline, d).length > 0;
                      return (
                        <button key={d} onClick={() => { setSelectedDay(d); setEditingTimelineIdx(null); }}
                          style={{ padding: "6px 14px", borderRadius: 20, border: `.5px solid ${isActive ? T.a : T.border}`,
                            background: isActive ? T.a : dayHasItems ? T.s : T.s2, color: isActive ? "#fff" : dayHasItems ? T.t1 : T.t3,
                            fontSize: 11, fontWeight: isActive ? 600 : 400, fontFamily: T.font, cursor: "pointer", whiteSpace: "nowrap",
                            transition: "all .15s", flexShrink: 0, opacity: dayHasItems || isActive ? 1 : 0.6 }}>
                          Day {d}{dateStr ? ` · ${dateStr}` : ""}
                        </button>
                      );
                    })}
                    <button onClick={() => exportItineraryAsPDF(trip, tripStart)}
                      style={{ padding: "4px 10px", borderRadius: 14, border: `.5px solid ${T.border}`, background: T.s, fontSize: 10, color: T.t2, cursor: "pointer", fontFamily: T.font, whiteSpace: "nowrap", flexShrink: 0 }}>
                      📄 Export PDF
                    </button>
                  </div>

                  {/* Live Trip Progress — compact single line, only for today */}
                  {isLive && (() => {
                    const prog = getDayProgress(trip.timeline, selectedDay);
                    if (prog.total === 0) return null;
                    const dayDate = tripStart ? new Date(tripStart.getTime() + (selectedDay - 1) * 86400000) : null;
                    const today = new Date(); today.setHours(0,0,0,0);
                    const isToday = dayDate && dayDate.toDateString() === today.toDateString();
                    if (!isToday) return null;
                    const nextInfo = getTimeToNext(trip.timeline, selectedDay);
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 20px", background: prog.allDone ? T.greenL : T.al, borderBottom: `.5px solid ${T.border}` }}>
                        <div style={{ width: 32, height: 4, borderRadius: 2, background: T.s2, overflow: "hidden", flexShrink: 0 }}>
                          <div style={{ height: "100%", borderRadius: 2, background: prog.allDone ? T.green : T.a, width: `${prog.percent}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: prog.allDone ? T.green : T.ad, fontWeight: 600, whiteSpace: "nowrap" }}>
                          {prog.allDone ? "✅ Done" : `${prog.done}/${prog.total}`}
                        </span>
                        {nextInfo && !prog.allDone && (
                          <span style={{ fontSize: 11, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            Next: {nextInfo.item.title} <span style={{ color: nextInfo.overdue ? T.red : nextInfo.mins < 15 ? T.amber : T.t3, fontWeight: 600 }}>{nextInfo.overdue ? `⚠️ ${nextInfo.label}` : `in ${nextInfo.label}`}</span>
                          </span>
                        )}
                        {!prog.allDone && !showLateOptions && (
                          <button onClick={() => setShowLateOptions(true)} style={{ marginLeft: "auto", flexShrink: 0, padding: "2px 8px", fontSize: 10, fontWeight: 600, borderRadius: 10, border: `.5px solid ${T.border}`, background: T.bg, color: T.t2, cursor: "pointer", fontFamily: T.font, whiteSpace: "nowrap" }}>
                            ⏰ Late?
                          </button>
                        )}
                        {!prog.allDone && showLateOptions && (
                          <div style={{ marginLeft: "auto", display: "flex", gap: 4, flexShrink: 0 }}>
                            {[15, 30, 45, 60].map(mins => (
                              <button key={mins} onClick={() => { markRunningLate(trip, selectedDay, mins, setCreatedTrips, logActivity); setShowLateOptions(false); showToast(`Schedule adjusted by ${mins}m`); }}
                                style={{ padding: "2px 6px", fontSize: 10, fontWeight: 600, borderRadius: 8, border: `.5px solid ${T.a}`, background: T.al, color: T.ad, cursor: "pointer", fontFamily: T.font }}>
                                {mins}m
                              </button>
                            ))}
                            <button onClick={() => setShowLateOptions(false)} style={{ padding: "2px 6px", fontSize: 10, borderRadius: 8, border: `.5px solid ${T.border}`, background: T.bg, color: T.t3, cursor: "pointer", fontFamily: T.font }}>✕</button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Compact info strip — weather, conflicts, map toggle, tips */}
                  {(() => {
                    const tripStartDate = trip.rawStart ? new Date(trip.rawStart + "T00:00:00") : null;
                    const daysUntilTrip = tripStartDate ? Math.floor((tripStartDate - new Date()) / 86400000) : 999;
                    const showWeather = daysUntilTrip <= 7 && daysUntilTrip >= -30;
                    const hol = (trip.rawStart && trip.rawEnd) ? checkSchoolHolidays(trip.rawStart, trip.rawEnd) : { warnings: [] };
                    const dayConflicts = conflicts.filter(c => !c.dayNum || c.dayNum === selectedDay);
                    const hasPills = showWeather || dayConflicts.length > 0 || hol.warnings.length > 0 || trip.places?.length > 0 || smartTips.length > 0;
                    if (!hasPills) return null;
                    return (
                      <div style={{ display: "flex", gap: 6, padding: "6px 20px", overflowX: "auto", borderBottom: `.5px solid ${T.border}`, WebkitOverflowScrolling: "touch" }}>
                        {/* Weather pill */}
                        {showWeather && intelligence?.weather?.current && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 14, background: T.blueL, fontSize: 10, color: T.blue, fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0 }}>
                            {intelligence.signals?.find(s => s.type === "weather")?.icon || "🌤️"} {intelligence.signals?.find(s => s.type === "weather")?.label || ""}
                          </span>
                        )}
                        {/* Driving pill */}
                        {tripDirections && (() => {
                          const legs = tripDirections.legs || [];
                          return legs.length > 0 ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 14, background: T.s2, fontSize: 10, color: T.t2, fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0 }}>
                              🚗 {tripDirections.totalDistance} · {tripDirections.totalDuration}
                            </span>
                          ) : null;
                        })()}
                        {/* Conflict pill */}
                        {dayConflicts.length > 0 && (
                          <button onClick={() => setShowConflicts(!showConflicts)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 14, background: dayConflicts.some(c => c.severity === "error") ? T.redL : T.amberL, fontSize: 10, color: dayConflicts.some(c => c.severity === "error") ? T.red : T.amber, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, border: "none", cursor: "pointer", fontFamily: T.font }}>
                            ⚠️ {dayConflicts.length} {dayConflicts.length === 1 ? "issue" : "issues"}
                          </button>
                        )}
                        {/* Holiday pills */}
                        {hol.warnings.map((w, i) => (
                          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "4px 10px", borderRadius: 14, background: w.severity === "positive" ? T.greenL : w.severity === "warning" ? T.amberL : T.blueL, fontSize: 10, color: w.severity === "positive" ? T.green : w.severity === "warning" ? T.amber : T.blue, fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0 }}>
                            {w.icon} {w.title}
                          </span>
                        ))}
                        {/* Map toggle pill */}
                        {trip.places?.length > 0 && (
                          <button onClick={() => setShowMap(!showMap)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "4px 10px", borderRadius: 14, background: showMap ? T.al : T.s2, fontSize: 10, color: showMap ? T.ad : T.t3, fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0, border: "none", cursor: "pointer", fontFamily: T.font }}>
                            🗺️ Map
                          </button>
                        )}
                        {/* Tips pill */}
                        {showWeather && smartTips.length > 0 && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "4px 10px", borderRadius: 14, background: T.s2, fontSize: 10, color: T.t3, fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer" }}
                            onClick={() => { const el = document.getElementById('smart-tips-panel'); if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none'; }}>
                            💡 {smartTips.length} tips
                          </span>
                        )}
                        {/* Currency pill */}
                        {showWeather && intelligence?.currency?.rates && Object.entries(intelligence.currency.rates).slice(0, 1).map(([code, info]) => (
                          <span key={code} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "4px 10px", borderRadius: 14, background: T.s2, fontSize: 10, color: T.t2, fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0 }}>
                            💱 {info.example}
                          </span>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Weather alerts — proactive banners */}
                  {(() => {
                    const weatherAlerts = checkWeatherAlerts(intelligence, trip, selectedDay);
                    const activeAlerts = weatherAlerts.filter(a => !dismissedAlerts.includes(`${trip?.id}_${selectedDay}_${a.type}`));
                    if (activeAlerts.length === 0) return null;
                    return (
                      <div style={{ padding: "4px 20px", display: "flex", flexDirection: "column", gap: 4 }}>
                        {activeAlerts.map((alert) => (
                          <div key={alert.type} style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8,
                            background: alert.severity === "warning" ? T.amberL : T.blueL,
                            border: `.5px solid ${alert.severity === "warning" ? T.amber : T.blue}22`,
                            fontSize: 11, color: alert.severity === "warning" ? T.amber : T.blue, fontWeight: 500,
                          }}>
                            <span style={{ fontSize: 13, flexShrink: 0 }}>{alert.icon}</span>
                            <span style={{ flex: 1 }}>{alert.message}</span>
                            <button
                              onClick={() => {
                                const key = `${trip?.id}_${selectedDay}_${alert.type}`;
                                const next = [...dismissedAlerts, key];
                                setDismissedAlerts(next);
                                try { localStorage.setItem("twm_dismissed_weather_alerts", JSON.stringify(next)); } catch {}
                              }}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: "2px 4px", fontSize: 13, color: alert.severity === "warning" ? T.amber : T.blue, opacity: 0.6, fontFamily: T.font, lineHeight: 1, flexShrink: 0 }}
                              aria-label="Dismiss alert"
                            >&times;</button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Conflict details — collapsible */}
                  {showConflicts && conflicts.filter(c => !c.dayNum || c.dayNum === selectedDay).length > 0 && (
                    <div style={{ padding: "4px 20px 4px", display: "flex", flexDirection: "column", gap: 4 }}>
                      {conflicts.filter(c => !c.dayNum || c.dayNum === selectedDay).map((c, i) => (
                        <div key={i} style={{ padding: "6px 10px", borderRadius: 8, background: T.s,
                          border: `.5px solid ${c.severity === "error" ? T.red : c.severity === "warning" ? T.amber : T.border}`,
                          fontSize: 10, color: T.t2, display: "flex", alignItems: "flex-start", gap: 6 }}>
                          <span style={{ fontSize: 12, flexShrink: 0 }}>{c.icon}</span>
                          <span>{c.message}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Smart tips panel — hidden by default, toggled by pill */}
                  <div id="smart-tips-panel" style={{ display: "none" }}>
                    {smartTips.length > 0 && (
                      <div style={{ padding: "4px 20px", display: "flex", gap: 6, overflowX: "auto" }}>
                        {smartTips.slice(0, 4).map((tip, i) => (
                          <div key={i} style={{ minWidth: 200, flexShrink: 0, padding: "8px 12px", borderRadius: 10,
                            background: T.s2, border: `.5px solid ${T.border}`, fontSize: 10, color: T.t2, lineHeight: 1.4, display: "flex", gap: 6, alignItems: "flex-start" }}>
                            <span style={{ fontSize: 14, flexShrink: 0 }}>{tip.icon}</span>
                            <span>{tip.tip}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Embedded Map — hidden by default, toggled by pill */}
                  {showMap && trip.places?.length > 0 && (
                    <div style={{ padding: "6px 20px 4px" }}>
                      <TripMap
                        places={(() => {
                          const route = getFullRouteFromStays(trip);
                          const stops = trip.startLocation ? [trip.startLocation, ...route] : route;
                          if (trip.startLocation && stops.length > 1 && stops[stops.length - 1].toLowerCase() !== trip.startLocation.toLowerCase()) stops.push(trip.startLocation);
                          return stops;
                        })()}
                        height={160}
                        onDirectionsLoaded={setTripDirections}
                        travelMode={trip.travel?.[0] || trip.travel?.values?.().next?.().value || ""}
                      />
                    </div>
                  )}


                  {/* Timeline items for selected day */}
                  <div style={{ flex: 1, overflowY: "auto", padding: "10px 20px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>
                        Day {selectedDay}
                        {(() => { const dd = tripStart ? new Date(tripStart.getTime() + (selectedDay - 1) * 86400000) : null; return dd ? ` — ${dd.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}` : ""; })()}
                        {(() => {
                          // Derive location from stay check-in dates for this day
                          const dayDateStr = tripStart ? new Date(tripStart.getTime() + (selectedDay - 1) * 86400000).toISOString().split("T")[0] : null;
                          if (dayDateStr && trip.stays?.length > 0) {
                            const sorted = [...trip.stays].filter(s => s.checkIn && s.location).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
                            const match = sorted.find(s => s.checkIn <= dayDateStr && s.checkOut > dayDateStr) || sorted.find(s => s.checkIn === dayDateStr) || sorted[0];
                            return match?.location ? ` · ${match.location}` : "";
                          }
                          const loc = trip.places?.[(selectedDay - 1) % (trip.places?.length || 1)];
                          return loc ? ` · ${loc}` : "";
                        })()}
                      </p>
                      <button onClick={() => addTimelineItem(trip.id)} style={{ ...css.btn, ...css.btnSm, fontSize: 11, color: T.a }}>+ Add</button>
                    </div>

                    {dayItems.length === 0 && (
                      <div style={{ textAlign: "center", padding: "24px 0", color: T.t3 }}>
                        <p style={{ fontSize: 13, marginBottom: 8 }}>No activities planned for Day {selectedDay} yet.</p>
                        <button onClick={() => addTimelineItem(trip.id)} style={{ ...css.btn, ...css.btnSm, color: T.a, fontSize: 11 }}>+ Add activity</button>
                      </div>
                    )}

                    {dayItems.map((item, i) => (
                      <div key={i} data-timeline-idx={i} style={{ display: "flex", gap: 12, marginBottom: editingTimelineIdx === i ? 8 : 14,
                        opacity: item.checkedIn ? 0.5 : 1, transition: "opacity .2s" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 14 }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.checkedIn ? T.green : item.color, flexShrink: 0 }} />
                          {i < dayItems.length - 1 && <div style={{ width: 1.5, flex: 1, background: T.border, marginTop: 4 }} />}
                        </div>
                        <div style={{ flex: 1, paddingBottom: 4 }}>
                          {editingTimelineIdx === i ? (
                            <div style={{ ...css.card, padding: 10, marginBottom: 4 }}>
                              <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "center" }}>
                                {/* Time stepper: ▼ time ▲ with 30-min increments */}
                                <div style={{ display: "flex", alignItems: "center", gap: 0, border: `.5px solid ${T.border}`, borderRadius: 8, overflow: "hidden", background: T.s, flexShrink: 0 }}>
                                  <button onClick={() => {
                                    const m = item.time?.match(/(\d+):(\d+)\s*(AM|PM)/i);
                                    if (!m) return;
                                    let h = parseInt(m[1]), min = parseInt(m[2]), ap = m[3].toUpperCase();
                                    let total = (ap === "PM" && h !== 12 ? h + 12 : ap === "AM" && h === 12 ? 0 : h) * 60 + min;
                                    total = Math.max(0, total - 30);
                                    let nh = Math.floor(total / 60), nm = total % 60;
                                    const nap = nh >= 12 ? "PM" : "AM";
                                    if (nh > 12) nh -= 12; if (nh === 0) nh = 12;
                                    updateTimelineItem(trip.id, i, "time", `${nh}:${String(nm).padStart(2,"0")} ${nap}`);
                                  }} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", fontSize: 13, color: T.t2, fontFamily: T.font, lineHeight: 1 }} aria-label="Earlier">◀</button>
                                  <span style={{ padding: "4px 6px", fontSize: 12, fontWeight: 600, color: T.a, minWidth: 70, textAlign: "center", fontFamily: T.font }}>{item.time}</span>
                                  <button onClick={() => {
                                    const m = item.time?.match(/(\d+):(\d+)\s*(AM|PM)/i);
                                    if (!m) return;
                                    let h = parseInt(m[1]), min = parseInt(m[2]), ap = m[3].toUpperCase();
                                    let total = (ap === "PM" && h !== 12 ? h + 12 : ap === "AM" && h === 12 ? 0 : h) * 60 + min;
                                    total = Math.min(23 * 60 + 30, total + 30);
                                    let nh = Math.floor(total / 60), nm = total % 60;
                                    const nap = nh >= 12 ? "PM" : "AM";
                                    if (nh > 12) nh -= 12; if (nh === 0) nh = 12;
                                    updateTimelineItem(trip.id, i, "time", `${nh}:${String(nm).padStart(2,"0")} ${nap}`);
                                  }} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", fontSize: 13, color: T.t2, fontFamily: T.font, lineHeight: 1 }} aria-label="Later">▶</button>
                                </div>
                                <input value={item.title} onChange={e => updateTimelineItem(trip.id, i, "title", e.target.value)}
                                  style={{ flex: 1, padding: "5px 8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none" }} placeholder="Title" />
                              </div>
                              <input value={item.desc} onChange={e => updateTimelineItem(trip.id, i, "desc", e.target.value)}
                                style={{ width: "100%", padding: "5px 8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none", marginBottom: 6 }} placeholder="Description" />
                              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <button onClick={() => { finaliseTimelineEdit(trip.id); setEditingTimelineIdx(null); }} style={{ ...css.btn, ...css.btnP, ...css.btnSm, fontSize: 10 }}>Done</button>
                                <button onClick={() => moveTimelineItem(trip.id, i, -1)} disabled={i === 0}
                                  style={{ ...css.btn, ...css.btnSm, fontSize: 12, padding: "4px 8px", opacity: i === 0 ? 0.3 : 1 }} aria-label="Move up">▲</button>
                                <button onClick={() => moveTimelineItem(trip.id, i, 1)} disabled={i === dayItems.length - 1}
                                  style={{ ...css.btn, ...css.btnSm, fontSize: 12, padding: "4px 8px", opacity: i === dayItems.length - 1 ? 0.3 : 1 }} aria-label="Move down">▼</button>
                                <button onClick={() => deleteTimelineItem(trip.id, i)} style={{ ...css.btn, ...css.btnSm, fontSize: 10, color: T.red }}>Delete</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 11, color: T.t3, marginBottom: 2 }}>{item.time}</p>
                                <p style={{ fontSize: 14, fontWeight: 500 }}>
                                  {item.title}
                                  {intelligence?.weather?.today && intelligence.weather.today.rainMm > 3 && /walk|hike|beach|park|garden|outdoor|kayak|cycling|bike|boat|cliff|trail|surf|swim/i.test(item.title + " " + (item.desc || "")) && (
                                    <span style={{ marginLeft: 6, fontSize: 10, padding: "2px 6px", borderRadius: 8, background: T.amberL, color: T.amber, fontWeight: 500, verticalAlign: "middle" }}>🌧️ Rain expected</span>
                                  )}
                                  {intelligence?.weather?.today && intelligence.weather.today.high >= 35 && /walk|hike|outdoor|trail/i.test(item.title + " " + (item.desc || "")) && (
                                    <span style={{ marginLeft: 6, fontSize: 10, padding: "2px 6px", borderRadius: 8, background: T.coralL, color: T.coral, fontWeight: 500, verticalAlign: "middle" }}>🔥 Very hot</span>
                                  )}
                                </p>
                                <p style={{ fontSize: 12, color: T.t2, marginTop: 2 }}>{item.desc}</p>
                                <Tag bg={item.group === "Adults" ? T.blueL : item.group === "Kids" ? T.pinkL : item.group === "Note" ? T.amberL : T.al} color={item.group === "Adults" ? T.blue : item.group === "Kids" ? T.pink : item.group === "Note" ? T.amber : T.ad}>{item.group}</Tag>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                                {isLive && !item.checkedIn && (
                                  <button onClick={() => checkInActivity(trip, selectedDay, i, setCreatedTrips, logActivity)}
                                    style={{ ...css.btn, ...css.btnSm, fontSize: 10, padding: "4px 8px", minWidth: 36, minHeight: 28,
                                      background: T.al, borderColor: T.a, color: T.ad, justifyContent: "center" }}>✓</button>
                                )}
                                {isLive && item.checkedIn && (
                                  <span style={{ fontSize: 16 }}>✅</span>
                                )}
                                {(() => {
                                  const iType = detectItemType(item);
                                  const dayLoc = trip.places?.[Math.min(selectedDay - 1, (trip.places?.length || 1) - 1)] || trip.places?.[0] || "";
                                  if (iType === "restaurant") {
                                    const link = getRestaurantBookingLinks({ name: item.title }, { city: dayLoc, places: trip.places })[0];
                                    return link ? <button onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")} aria-label="Reserve"
                                      style={{ ...css.btn, ...css.btnSm, fontSize: 10, padding: "4px 8px", minWidth: 36, minHeight: 28, color: T.blue, justifyContent: "center" }}>🍽️</button> : null;
                                  }
                                  if (/museum|tour|cruise|boat|castle|palace|workshop|class|zoo|aquarium|gallery|show|theatre|concert|spa|kayak|climb|cycle|surf|dive|ski/i.test(`${item.title} ${item.desc || ""}`)) {
                                    const link = getActivityBookingLinks({ title: item.title }, { city: dayLoc })[0];
                                    return link ? <button onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")} aria-label="Book activity"
                                      style={{ ...css.btn, ...css.btnSm, fontSize: 10, padding: "4px 8px", minWidth: 36, minHeight: 28, color: T.blue, justifyContent: "center" }}>🎟️</button> : null;
                                  }
                                  return null;
                                })()}
                                <button onClick={() => setEditingTimelineIdx(i)} aria-label={`Edit ${item.title}`}
                                  style={{ ...css.btn, ...css.btnSm, fontSize: 14, padding: "8px", minWidth: 40, minHeight: 40, opacity: 0.5, justifyContent: "center" }}>✏️</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Tonight's stay — matched from selected day */}
                    {trip.stays?.length > 0 && (() => {
                      const currentDate = tripStart ? new Date(tripStart.getTime() + (selectedDay - 1) * 86400000) : null;
                      const matchedStay = currentDate ? trip.stays.find(s => {
                        if (!s.checkIn || !s.checkOut) return false;
                        return currentDate >= new Date(s.checkIn) && currentDate < new Date(s.checkOut);
                      }) : trip.stays[0];
                      return matchedStay ? (
                        <div style={{ ...css.card, background: T.purpleL, borderColor: T.purple, marginTop: 4 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ fontSize: 14 }}>🏠</span>
                            <div>
                              <p style={{ fontSize: 12, fontWeight: 500, color: T.purple }}>Tonight's stay</p>
                              <p style={{ fontSize: 11, color: T.t2 }}>{matchedStay.name}{matchedStay.checkIn ? ` · ${new Date(matchedStay.checkIn).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(matchedStay.checkOut).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}</p>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── CHAT TAB ── */}
          {tripDetailTab === "chat" && (() => {
            const tripDays = trip.rawStart && trip.rawEnd ? Math.max(1, Math.ceil((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1) : Object.keys(trip.timeline || {}).length || 5;
            const currentLoc = trip.places?.[(selectedDay - 1) % (trip.places?.length || 1)] || "this area";

            // Parse structured suggestion cards from AI messages
            const parseSuggestions = (text) => {
              const items = [];
              const lines = text.split("\n");
              let current = null;
              for (const line of lines) {
                // Match "1. **Name** ..." or "- **Name** ..."
                const m = line.match(/^\s*(?:\d+\.\s*|\-\s*)\*\*([^*]+)\*\*\s*(.*)/);
                if (m) {
                  if (current) items.push(current);
                  const name = m[1].trim();
                  const rest = m[2].replace(/^[\s\-–—·]+/, "").trim();
                  const ratingM = rest.match(/(\d\.\d)★/);
                  const priceM = rest.match(/(£{1,4})/);
                  const isRestaurant = /restaurant|food|eat|seafood|cuisine|cafe|bistro|bakery|dining|grill|kitchen/i.test(rest + " " + name);
                  // Extract cuisine tags (e.g. "· Italian · Cafe" after rating/price)
                  const cuisineM = rest.match(/·\s*([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/g);
                  const cuisineTags = cuisineM ? cuisineM
                    .map(c => c.replace(/^·\s*/, "").trim())
                    .filter(c => !/^(Open|Closed|Restaurant)$/i.test(c) && !/★|£/.test(c))
                    .slice(0, 2) : [];
                  current = { name, desc: rest, rating: ratingM ? ratingM[1] : null, price: priceM ? priceM[1] : null, isRestaurant, cuisineTags };
                } else if (current && line.match(/^\s{2,}/) && !line.match(/^\s*(\*|#|Pro|💡|Say)/)) {
                  const trimmed = line.trim();
                  // Capture 📍 address specifically
                  if (trimmed.startsWith("📍")) {
                    current.address = trimmed.replace(/^📍\s*/, "");
                  } else if (!current.address && !trimmed.startsWith("🔌") && !trimmed.startsWith("💰") && !trimmed.startsWith("🏢") && !trimmed.startsWith("🏪") && !trimmed.startsWith("[")) {
                    current.address = trimmed;
                  }
                  // Capture distance/operational from desc line for EV chargers
                  if (trimmed.startsWith("🔌")) current.connectorInfo = trimmed;
                }
              }
              if (current) items.push(current);
              return items;
            };

            // Render a suggestion card
            const renderSuggestionCard = (item, msgIdx, itemIdx) => {
              const addedKey = `${msgIdx}_${itemIdx}`;
              const isAdded = chatAddDayPicker?.added === addedKey;
              const showDayPicker = chatAddDayPicker?.msgIdx === msgIdx && chatAddDayPicker?.itemIdx === itemIdx && !isAdded;
              const slot = findSmartSlot(trip.id, selectedDay, item.isRestaurant ? "restaurant" : "activity");

              return (
                <div key={itemIdx} style={{ background: T.s, border: `.5px solid ${T.border}`, borderRadius: 12, padding: "10px 12px", marginBottom: 6, transition: "all .15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: T.t1, marginBottom: 2 }}>{item.name}</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
                        {item.rating && <span style={{ fontSize: 11, color: T.amber, fontWeight: 600 }}>{item.rating}★</span>}
                        {item.price && <span style={{ fontSize: 11, color: T.green, fontWeight: 500 }}>{item.price}</span>}
                        {item.cuisineTags?.length > 0
                          ? item.cuisineTags.map((c, ci) => <span key={ci} style={{ fontSize: 10, color: T.t3, background: T.s2, padding: "1px 6px", borderRadius: 4 }}>🍽️ {c}</span>)
                          : item.isRestaurant && <span style={{ fontSize: 10, color: T.t3, background: T.s2, padding: "1px 6px", borderRadius: 4 }}>🍽️ Restaurant</span>}
                      </div>
                      {item.address && <p style={{ fontSize: 10, color: T.t2, lineHeight: 1.3, marginBottom: 1 }}>📍 {item.address}</p>}
                      {item.desc && <p style={{ fontSize: 11, color: T.t3, lineHeight: 1.4 }}>{item.desc.replace(/[\d.]+★/g, "").replace(/£+/g, "").replace(/^\s*[,·\-–]\s*/, "").trim()}</p>}
                    </div>
                    {isAdded ? (
                      <span style={{ fontSize: 11, color: T.a, fontWeight: 600, whiteSpace: "nowrap", padding: "6px 10px" }}>{chatAddDayPicker?.replaced ? `🔄 Replaced` : "✓ Added"}</span>
                    ) : (
                      <button onClick={() => setChatAddDayPicker(showDayPicker ? null : { msgIdx, itemIdx })}
                        style={{ background: T.al, color: T.ad, border: `1px solid ${T.a}40`, borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: T.font, whiteSpace: "nowrap", flexShrink: 0 }}>
                        + Add
                      </button>
                    )}
                  </div>
                  {showDayPicker && (
                    <div style={{ marginTop: 8, padding: "8px 0", borderTop: `.5px solid ${T.border}` }}>
                      <p style={{ fontSize: 10, color: T.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: .5, marginBottom: 6 }}>Add to which day?</p>
                      <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 4 }}>
                        {Array.from({ length: tripDays }, (_, d) => d + 1).map(day => {
                          const daySlot = findSmartSlot(trip.id, day, item.isRestaurant ? "restaurant" : "activity");
                          const dayLoc = trip.places?.[(day - 1) % (trip.places?.length || 1)] || "";
                          // Check if an existing item would be replaced
                          const parseTm = (s) => { const m = s?.match(/(\d+):(\d+)\s*(AM|PM)/i); if (!m) return 0; let h = parseInt(m[1]); if (m[3].toUpperCase() === "PM" && h !== 12) h += 12; if (m[3].toUpperCase() === "AM" && h === 12) h = 0; return h * 60 + parseInt(m[2]); };
                          const slotMins = parseTm(daySlot.time);
                          const dayItemsForSlot = (trip.timeline || {})[day] || [];
                          const wouldReplace = dayItemsForSlot.find(it => Math.abs(parseTm(it.time) - slotMins) < 30);
                          return (
                            <button key={day} onClick={() => {
                              const newItem = { time: daySlot.time, title: item.name, desc: `${dayLoc || currentLoc} · ${item.desc ? item.desc.slice(0, 40) : "Added from chat"}`, group: "Everyone", color: item.isRestaurant ? T.coral : T.blue };
                              const parseT = (s) => { const m = s?.match(/(\d+):(\d+)\s*(AM|PM)/i); if (!m) return 0; let h = parseInt(m[1]); if (m[3].toUpperCase() === "PM" && h !== 12) h += 12; if (m[3].toUpperCase() === "AM" && h === 12) h = 0; return h * 60 + parseInt(m[2]); };
                              let replacedName = null;
                              setCreatedTrips(prev => prev.map(t => {
                                if (t.id !== trip.id) return t;
                                const tl = t.timeline || {};
                                let dayTl = [...(tl[day] || [])];
                                // Find existing item at the same time slot to replace
                                const slotMins = parseT(daySlot.time);
                                const existIdx = dayTl.findIndex(it => {
                                  const itMins = parseT(it.time);
                                  return Math.abs(itMins - slotMins) < 30;
                                });
                                if (existIdx >= 0) {
                                  replacedName = dayTl[existIdx].title;
                                  dayTl[existIdx] = { ...dayTl[existIdx], ...newItem };
                                } else {
                                  dayTl = [...dayTl, newItem];
                                }
                                dayTl.sort((a, b) => parseT(a.time) - parseT(b.time));
                                return { ...t, timeline: { ...tl, [day]: dayTl } };
                              }));
                              if (replacedName) {
                                showToast(`Replaced "${replacedName}" with "${item.name}" · Day ${day} ${daySlot.time}`);
                                logActivity(trip.id, "🔄", `Replaced "${replacedName}" with "${item.name}" on Day ${day} · ${daySlot.time}`, "itinerary");
                              } else {
                                showToast(`Added "${item.name}" to Day ${day} · ${daySlot.label} (${daySlot.time})`);
                                logActivity(trip.id, "📍", `Added "${item.name}" to Day ${day} · ${daySlot.time}`, "itinerary");
                              }
                              setChatAddDayPicker({ added: addedKey, replaced: replacedName });
                              setTimeout(() => setChatAddDayPicker(null), 2500);
                            }}
                              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "6px 12px", borderRadius: 8, cursor: "pointer", border: `.5px solid ${wouldReplace ? T.amber : day === selectedDay ? T.a : T.border}`, background: wouldReplace ? T.amberL : day === selectedDay ? T.al : T.s, minWidth: 64, flexShrink: 0, fontFamily: T.font }}>
                              <span style={{ fontSize: 12, fontWeight: day === selectedDay ? 700 : 500, color: day === selectedDay ? T.ad : T.t1 }}>Day {day}</span>
                              <span style={{ fontSize: 9, color: T.t3 }}>{daySlot.label} · {daySlot.time}</span>
                              {wouldReplace && <span style={{ fontSize: 8, color: T.amber, fontWeight: 600 }}>Replaces: {wouldReplace.title.length > 16 ? wouldReplace.title.slice(0, 16) + "…" : wouldReplace.title}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            };

            return (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 8px", minHeight: 0 }}>
                {tripChatMessages.length === 0 && (
                  <div style={{ textAlign: "center", padding: "32px 12px", color: T.t3 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
                    <p style={{ fontSize: 14, fontWeight: 500, color: T.t2, marginBottom: 4 }}>Your trip concierge</p>
                    <p style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 16 }}>Find restaurants, add activities, adjust plans — I know your preferences.</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 280, margin: "0 auto" }}>
                      {[
                        { q: `Find restaurants in ${currentLoc}`, icon: "🍽️" },
                        { q: "Suggest activities for today", icon: "🎯" },
                        { q: "What's the budget looking like?", icon: "💰" },
                        { q: "Regenerate itinerary", icon: "🔄" },
                      ].map(({ q, icon }) => (
                        <button key={q} onClick={() => { setTripChatInput(q); }} className="w-btn"
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: T.s, border: `.5px solid ${T.border}`, borderRadius: 10, fontSize: 12, color: T.t1, cursor: "pointer", fontFamily: T.font, textAlign: "left", transition: "all .15s" }}>
                          <span style={{ fontSize: 16 }}>{icon}</span> {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {tripChatMessages.map((msg, i) => {
                  const suggestions = msg.role === "ai" ? parseSuggestions(msg.text) : [];
                  // Strip suggestion lines from the displayed text to avoid duplication
                  let displayText = msg.text;
                  if (suggestions.length > 0) {
                    // Keep only non-list lines (headers, tips, pro tips)
                    displayText = msg.text.split("\n").filter(line => {
                      const isSuggestionLine = /^\s*(?:\d+\.\s*|\-\s*)\*\*[^*]+\*\*/.test(line);
                      const isAddressLine = /^\s{2,}(?![\*#💡])/.test(line) && !/^\s*[\*#]/.test(line);
                      return !isSuggestionLine && !isAddressLine;
                    }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
                  }

                  return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 10 }}>
                    {/* Chat bubble */}
                    {displayText && (
                      <div style={{ maxWidth: "88%", padding: "10px 14px", borderRadius: 16, fontSize: 13, lineHeight: 1.5,
                        background: msg.role === "user" ? T.a : T.s2, color: msg.role === "user" ? "#fff" : T.t1,
                        borderBottomRightRadius: msg.role === "user" ? 4 : 16, borderBottomLeftRadius: msg.role === "user" ? 16 : 4,
                        wordBreak: "break-word", overflowWrap: "break-word" }}
                        dangerouslySetInnerHTML={{ __html: renderChatHtml(displayText, msg.role === "user" ? "#fff" : T.a) }} />
                    )}
                    {/* Structured suggestion cards */}
                    {suggestions.length > 0 && (
                      <div style={{ width: "100%", maxWidth: "92%", marginTop: 6 }}>
                        {suggestions.map((item, j) => renderSuggestionCard(item, i, j))}
                      </div>
                    )}
                  </div>
                  );
                })}
                {tripChatTyping && (
                  <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 8 }}>
                    <div style={{ padding: "12px 18px", background: T.s2, borderRadius: "16px 16px 16px 4px", display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.t3, animation: "typingDot 1.2s infinite", animationDelay: "0s" }} />
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.t3, animation: "typingDot 1.2s infinite", animationDelay: "0.2s" }} />
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.t3, animation: "typingDot 1.2s infinite", animationDelay: "0.4s" }} />
                    </div>
                  </div>
                )}
                <div ref={tripChatEndRef} />
              </div>
              {/* Day context bar */}
              <div style={{ padding: "6px 16px", background: T.s2, borderTop: `.5px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: T.t3 }}>Chatting about:</span>
                <div style={{ display: "flex", gap: 4, overflowX: "auto" }}>
                  {Array.from({ length: Math.min(tripDays, 7) }, (_, d) => d + 1).map(day => (
                    <button key={day} onClick={() => setSelectedDay(day)}
                      style={{ padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: day === selectedDay ? 700 : 400, border: "none", cursor: "pointer", fontFamily: T.font,
                        background: day === selectedDay ? T.a : "transparent", color: day === selectedDay ? "#fff" : T.t3 }}>
                      D{day}
                    </button>
                  ))}
                </div>
                <span style={{ fontSize: 10, color: T.t2, fontWeight: 500, marginLeft: "auto" }}>{currentLoc}</span>
              </div>
              {tripChatFlow?.step === "pick_attraction" && (
                <div style={{ display: "flex", gap: 6, padding: "6px 16px", overflowX: "auto", borderTop: `.5px solid ${T.border}`, background: T.s2 }}>
                  {tripChatFlow.data.options.map((opt, i) => (
                    <button key={i} onClick={() => { setTripChatInput(`${i + 1}`); setTimeout(() => handleTripChat(trip.id), 50); }}
                      style={{ ...css.chip, flexShrink: 0, fontSize: 11, padding: "5px 12px", background: T.al, borderColor: T.a, color: T.ad }}>{i + 1}. {opt}</button>
                  ))}
                </div>
              )}
              <div style={{ padding: "10px 16px", borderTop: `.5px solid ${T.border}`, background: T.s }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input value={tripChatInput} onChange={e => setTripChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleTripChat(trip.id)}
                    style={{ flex: 1, padding: "10px 14px", border: `.5px solid ${T.border}`, borderRadius: 24, fontFamily: T.font, fontSize: 13, background: "#fff", outline: "none" }}
                    placeholder={tripChatFlow?.step === "pick_attraction" ? "Pick a number or type your own..." : `Ask about ${currentLoc}...`} aria-label="Trip chat input" />
                  <button onClick={() => handleTripChat(trip.id)} aria-label="Send trip message" style={{ ...css.btn, ...css.btnP, borderRadius: 24, padding: "10px 16px", fontSize: 12 }}>Send</button>
                </div>
              </div>
            </div>
            );
          })()}

          {/* ── POLLS TAB ── */}
          {tripDetailTab === "polls" && (
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: T.t2 }}>Group polls</p>
                <button style={{ ...css.btn, ...css.btnSm, ...css.btnP }} onClick={() => setShowPollCreator(true)}>+ New poll</button>
              </div>

              {showPollCreator && (
                <div style={{ ...css.card, marginBottom: 16, border: `1px solid ${T.a}` }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: T.ad }}>New poll</p>
                  <input value={newPollQuestion} onChange={e => setNewPollQuestion(e.target.value)}
                    placeholder="What's the question?"
                    style={{ width: "100%", padding: "10px 12px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, marginBottom: 10, outline: "none" }} />
                  {newPollOptions.map((opt, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                      <input value={opt} onChange={e => setNewPollOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                        placeholder={`Option ${i + 1}`}
                        style={{ flex: 1, padding: "8px 10px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 12, outline: "none" }} />
                      {newPollOptions.length > 2 && (
                        <button onClick={() => setNewPollOptions(prev => prev.filter((_, j) => j !== i))}
                          style={{ ...css.btn, ...css.btnSm, padding: "4px 10px", color: T.red, fontSize: 14, minHeight: 36 }}>×</button>
                      )}
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    {newPollOptions.length < 5 && (
                      <button onClick={() => setNewPollOptions(prev => [...prev, ""])}
                        style={{ ...css.btn, ...css.btnSm, flex: 1, justifyContent: "center", fontSize: 11 }}>+ Add option</button>
                    )}
                    <button onClick={() => createNewPoll(trip.id)} style={{ ...css.btn, ...css.btnSm, ...css.btnP, flex: 1, justifyContent: "center", fontSize: 11 }}>Create poll</button>
                    <button onClick={() => { setShowPollCreator(false); setNewPollQuestion(""); setNewPollOptions(["", ""]); }}
                      style={{ ...css.btn, ...css.btnSm, flex: 0, justifyContent: "center", fontSize: 11, color: T.t3 }}>Cancel</button>
                  </div>
                </div>
              )}

              {(trip.polls || []).length === 0 && !showPollCreator && (
                <div style={{ textAlign: "center", padding: "40px 16px", color: T.t3 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🗳️</div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: T.t2, marginBottom: 4 }}>No polls yet</p>
                  <p style={{ fontSize: 12, lineHeight: 1.5 }}>Create a poll to let your group vote on activities, restaurants, or plans.</p>
                </div>
              )}

              {(trip.polls || []).map(poll => (
                <div key={poll.id} style={{ ...css.card, opacity: poll.status === "closed" ? 0.6 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <Tag bg={poll.status === "active" ? T.al : T.s2} color={poll.status === "active" ? T.ad : T.t3}>
                      {poll.status === "active" ? "Active" : "Closed"}
                    </Tag>
                    <span style={{ fontSize: 11, color: T.t3 }}>{poll.ends}</span>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>{poll.q}</p>
                  {poll.options.map((opt, i) => (
                    <div key={i} onClick={() => {
                      if (poll.status === "closed") return;
                      setCreatedTrips(prev => prev.map(t => {
                        if (t.id !== trip.id) return t;
                        return { ...t, polls: (t.polls || []).map(p => {
                          if (p.id !== poll.id) return p;
                          const updated = p.options.map((o, j) => j === i ? { ...o, voted: !o.voted, voters: o.voted ? o.voters.filter(v => v !== "You") : [...(o.voters||[]), "You"] } : o);
                          const denominator = totalTravellers > 0 ? totalTravellers : 1;
                          return { ...p, options: updated.map(o => ({ ...o, pct: Math.round((o.voters?.length || 0) / denominator * 100) })) };
                        }) };
                      }));
                    }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: `.5px solid ${opt.voted ? T.a : T.border}`, borderRadius: T.rs, marginBottom: 6, cursor: poll.status === "closed" ? "default" : "pointer", position: "relative", overflow: "hidden", background: opt.voted ? T.al : T.s }}>
                      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${opt.pct}%`, background: T.al, borderRadius: T.rs, zIndex: 0 }} />
                      <span style={{ position: "relative", zIndex: 1, fontSize: 13, flex: 1 }}>{opt.text}</span>
                      <div style={{ display: "flex", position: "relative", zIndex: 1 }}>
                        {opt.voters?.slice(0, 3).map((v, j) => {
                          const cols = { You: T.a, JM: T.coral, SP: T.blue, RK: T.amber, LT: T.purple };
                          return <Avatar key={j} bg={cols[v] || T.t3} label={v.slice(0, 2)} size={20} style={{ marginLeft: j ? -4 : 0, border: `1.5px solid ${T.s}` }} />;
                        })}
                      </div>
                      <span style={{ position: "relative", zIndex: 1, fontSize: 12, fontWeight: 500, color: T.a, minWidth: 28, textAlign: "right" }}>{opt.pct}%</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, fontSize: 11, color: T.t3 }}>
                    <span>{poll.options.reduce((s, o) => s + (o.voters?.length || 0), 0)} votes · by {poll.by}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      {poll.status === "active" && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); shareToWhatsApp(trip.name, `🗳️ Vote on: "${poll.q}"\n${poll.options.map(o => `• ${o.text}`).join("\n")}`, trip.dbId || trip.id, { tab: "polls" }); }}
                            style={{ ...css.btn, ...css.btnSm, fontSize: 10, padding: "3px 8px", background: "#25D366", color: "#fff", borderColor: "#25D366" }}>Share in WhatsApp</button>
                          <button onClick={(e) => { e.stopPropagation(); setCreatedTrips(prev => prev.map(t => t.id !== trip.id ? t : { ...t, polls: (t.polls || []).map(p => p.id === poll.id ? { ...p, status: "closed" } : p) })); logActivity(trip.id, "🗳️", `Poll closed: "${poll.q}"`, "poll"); showToast("Poll closed"); }}
                            style={{ ...css.btn, ...css.btnSm, fontSize: 10, padding: "3px 8px", color: T.red, borderColor: T.red }}>Close poll</button>
                        </>
                      )}
                      {poll.status === "closed" && (() => {
                        const winner = [...poll.options].sort((a, b) => (b.voters?.length || 0) - (a.voters?.length || 0))[0];
                        const topCount = winner?.voters?.length || 0;
                        const isTie = poll.options.filter(o => (o.voters?.length || 0) === topCount).length > 1;
                        return topCount > 0 && !isTie ? (
                          <button onClick={(e) => { e.stopPropagation(); addTimelineItem(trip.id); showToast(`Added "${winner.text}" to itinerary`); }}
                            style={{ ...css.btn, ...css.btnSm, ...css.btnP, fontSize: 10, padding: "3px 8px" }}>+ Add to itinerary</button>
                        ) : topCount > 0 && isTie ? (
                          <Tag bg={T.amberL} color={T.amber}>Tie — revote needed</Tag>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── EXPENSES TAB ── */}
          {tripDetailTab === "expenses" && (() => {
            const adults = (trip.travellers?.adults || []).map(a => a.name).filter(Boolean);
            // Include accommodation costs from stays
            const stayCosts = (trip.stays || []).filter(s => s.cost && parseFloat(s.cost) > 0).map(s => ({
              id: `stay-${s.name}`, description: s.name || "Accommodation", amount: parseFloat(s.cost),
              category: "accommodation", paid_by: adults[0] || "You", isStay: true,
              splits: adults.map(name => ({ participant_name: name, share_amount: Math.round(parseFloat(s.cost) / adults.length * 100) / 100 })),
            }));
            const allExpenses = [...stayCosts, ...expenses];
            const totalSpent = allExpenses.reduce((s, e) => s + e.amount, 0);
            const catBreakdown = getCategoryBreakdown(allExpenses);
            const settlements = calculateSettlement(allExpenses);

            // Per-person spending breakdown
            const perPerson = {};
            adults.forEach(name => { perPerson[name] = { paid: 0, owes: 0 }; });
            allExpenses.forEach(exp => {
              if (perPerson[exp.paid_by]) perPerson[exp.paid_by].paid += exp.amount;
              (exp.splits || []).forEach(s => {
                if (perPerson[s.participant_name]) perPerson[s.participant_name].owes += s.share_amount;
              });
            });

            // Group expenses by date
            const expByDate = {};
            expenses.forEach(exp => {
              const dateKey = exp.expense_date || "Undated";
              if (!expByDate[dateKey]) expByDate[dateKey] = [];
              expByDate[dateKey].push(exp);
            });
            const sortedDates = Object.keys(expByDate).sort((a, b) => b.localeCompare(a));

            const fmtExpDate = (iso) => {
              if (!iso || iso === "Undated") return "Undated";
              const d = new Date(iso + "T12:00:00");
              const today = new Date(); today.setHours(12,0,0,0);
              const diff = Math.round((today - d) / 86400000);
              if (diff === 0) return "Today";
              if (diff === 1) return "Yesterday";
              return `${d.getDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]}`;
            };

            const openAddExpense = (existingExpense) => {
              if (existingExpense) {
                setEditingExpense(existingExpense);
                setExpenseDesc(existingExpense.description);
                setExpenseAmount(String(existingExpense.amount));
                setExpenseCategory(existingExpense.category);
                setExpenseDate(existingExpense.expense_date || new Date().toISOString().split('T')[0]);
                setExpensePaidBy(existingExpense.paid_by);
                setExpenseSplitMethod(existingExpense.split_method || 'equal');
                setExpenseParticipants((existingExpense.splits || []).map(s => s.participant_name));
                const customs = {};
                (existingExpense.splits || []).forEach(s => {
                  customs[s.participant_name] = existingExpense.split_method === 'percentage' ? (s.share_percentage || 0) : s.share_amount;
                });
                setExpenseCustomSplits(customs);
              } else {
                resetExpenseForm();
                setExpensePaidBy(adults[0] || '');
                setExpenseParticipants([...adults]);
              }
              setShowAddExpense(true);
            };

            // Quick-add presets
            const quickPresets = [
              { icon: "☕", label: "Coffee", cat: "food", amount: "4.50" },
              { icon: "🍽️", label: "Meal", cat: "food", amount: "" },
              { icon: "⛽", label: "Fuel", cat: "travel", amount: "" },
              { icon: "🎟️", label: "Tickets", cat: "activities", amount: "" },
              { icon: "🛒", label: "Shopping", cat: "other", amount: "" },
            ];

            return (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              {/* Add Expense Modal — bottom sheet style */}
              {showAddExpense && (
                <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
                  onClick={(e) => { if (e.target === e.currentTarget) resetExpenseForm(); }}>
                  <div style={{ background: T.bg, borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "88vh", overflowY: "auto", padding: "8px 20px 30px", animation: "demoSlideUp .25s ease-out" }}>
                    {/* Drag handle */}
                    <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 12px" }}>
                      <div style={{ width: 36, height: 4, borderRadius: 2, background: T.border }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                      <h3 style={{ fontFamily: T.fontD, fontSize: 18, fontWeight: 400 }}>{editingExpense ? "Edit Expense" : "Add Expense"}</h3>
                      <button onClick={resetExpenseForm} style={{ background: "none", border: "none", fontSize: 22, color: T.t3, cursor: "pointer", padding: 4, lineHeight: 1 }}>&times;</button>
                    </div>

                    {/* Amount — prominent at top */}
                    <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
                      <div style={{ display: "inline-flex", alignItems: "baseline", gap: 2 }}>
                        <span style={{ fontSize: 28, fontWeight: 300, color: T.t3 }}>{CS}</span>
                        <input value={expenseAmount} onChange={e => setExpenseAmount(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="0.00" type="text" inputMode="decimal" autoFocus
                          style={{ width: Math.max(80, (expenseAmount.length || 4) * 22), fontSize: 36, fontWeight: 700, fontFamily: T.font, border: "none", outline: "none", textAlign: "center", background: "transparent", color: T.t1 }} />
                      </div>
                    </div>

                    {/* Description */}
                    <input value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} placeholder="What was it for?"
                      style={{ width: "100%", padding: "12px 14px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 14, marginBottom: 12, outline: "none", boxSizing: "border-box", background: T.s }} />

                    {/* Category — 2-row icon grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 12 }}>
                      {EXPENSE_CATEGORIES.map(cat => (
                        <button key={cat.key} onClick={() => setExpenseCategory(cat.key)}
                          style={{ padding: "10px 4px", borderRadius: T.rs, border: `.5px solid ${expenseCategory === cat.key ? cat.color : T.border}`,
                            background: expenseCategory === cat.key ? cat.color + "15" : T.s,
                            cursor: "pointer", textAlign: "center", transition: "all .15s", fontFamily: T.font }}>
                          <div style={{ fontSize: 20, marginBottom: 2 }}>{cat.icon}</div>
                          <div style={{ fontSize: 10, fontWeight: expenseCategory === cat.key ? 600 : 400, color: expenseCategory === cat.key ? cat.color : T.t2 }}>{cat.label.split(" ")[0]}</div>
                        </button>
                      ))}
                    </div>

                    {/* Date */}
                    <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)}
                      style={{ width: "100%", padding: "10px 14px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontFamily: T.font, fontSize: 13, marginBottom: 14, outline: "none", boxSizing: "border-box", background: T.s }} />

                    {/* Paid by */}
                    <label style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 6, display: "block" }}>Paid by</label>
                    <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }}>
                      {adults.map(name => (
                        <button key={name} onClick={() => setExpensePaidBy(name)}
                          style={{ padding: "8px 16px", borderRadius: 20, fontSize: 12, fontWeight: expensePaidBy === name ? 600 : 400, whiteSpace: "nowrap",
                            background: expensePaidBy === name ? T.a : T.s, color: expensePaidBy === name ? "#fff" : T.t2,
                            border: `.5px solid ${expensePaidBy === name ? T.ad : T.border}`, cursor: "pointer", fontFamily: T.font, transition: "all .15s" }}>
                          {name}
                        </button>
                      ))}
                    </div>

                    {/* Split between */}
                    <label style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 6, display: "block" }}>Split between</label>
                    <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto" }}>
                      {adults.map(name => {
                        const isIn = expenseParticipants.includes(name);
                        return (
                          <button key={name} onClick={() => setExpenseParticipants(prev => isIn ? prev.filter(n => n !== name) : [...prev, name])}
                            style={{ padding: "8px 16px", borderRadius: 20, fontSize: 12, fontWeight: isIn ? 600 : 400, whiteSpace: "nowrap",
                              background: isIn ? T.blueL : T.s, color: isIn ? T.blue : T.t3,
                              border: `.5px solid ${isIn ? T.blue : T.border}`, cursor: "pointer", fontFamily: T.font, transition: "all .15s" }}>
                            {isIn ? "✓ " : ""}{name}
                          </button>
                        );
                      })}
                    </div>

                    {/* Split method */}
                    <div style={{ display: "flex", gap: 0, marginBottom: 12, borderRadius: T.rs, overflow: "hidden", border: `.5px solid ${T.border}` }}>
                      {[{ key: 'equal', label: '÷ Equal' }, { key: 'percentage', label: '% Percent' }, { key: 'custom', label: '# Custom' }].map(m => (
                        <button key={m.key} onClick={() => setExpenseSplitMethod(m.key)}
                          style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: expenseSplitMethod === m.key ? 600 : 400,
                            background: expenseSplitMethod === m.key ? T.al : T.s, color: expenseSplitMethod === m.key ? T.ad : T.t3,
                            border: "none", cursor: "pointer", fontFamily: T.font, transition: "all .15s",
                            borderRight: m.key !== 'custom' ? `.5px solid ${T.border}` : "none" }}>
                          {m.label}
                        </button>
                      ))}
                    </div>

                    {/* Equal split preview */}
                    {expenseSplitMethod === 'equal' && expenseParticipants.length > 0 && parseFloat(expenseAmount) > 0 && (
                      <div style={{ background: T.al, borderRadius: T.rs, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: T.ad, fontWeight: 500, textAlign: "center" }}>
                        {CS}{(parseFloat(expenseAmount) / expenseParticipants.length).toFixed(2)} each · {expenseParticipants.length} {expenseParticipants.length === 1 ? "person" : "people"}
                      </div>
                    )}

                    {/* Percentage inputs */}
                    {expenseSplitMethod === 'percentage' && expenseParticipants.length > 0 && (
                      <div style={{ background: T.s, borderRadius: T.rs, padding: 12, marginBottom: 12, border: `.5px solid ${T.border}` }}>
                        {expenseParticipants.map(name => (
                          <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{name}</span>
                            <input value={expenseCustomSplits[name] || ''} onChange={e => setExpenseCustomSplits(prev => ({ ...prev, [name]: e.target.value }))}
                              placeholder="0" type="text" inputMode="decimal" style={{ width: 60, padding: "6px 8px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontSize: 13, fontWeight: 600, textAlign: "right", outline: "none" }} />
                            <span style={{ fontSize: 12, color: T.t3 }}>%</span>
                            {parseFloat(expenseAmount) > 0 && <span style={{ fontSize: 10, color: T.t3, minWidth: 44, textAlign: "right" }}>{CS}{(parseFloat(expenseAmount) * (parseFloat(expenseCustomSplits[name]) || 0) / 100).toFixed(2)}</span>}
                          </div>
                        ))}
                        <div style={{ fontSize: 11, color: expenseParticipants.reduce((s, n) => s + (parseFloat(expenseCustomSplits[n]) || 0), 0) === 100 ? T.green : T.red, marginTop: 4, fontWeight: 600 }}>
                          Total: {expenseParticipants.reduce((s, n) => s + (parseFloat(expenseCustomSplits[n]) || 0), 0).toFixed(0)}%
                        </div>
                      </div>
                    )}

                    {/* Custom amount inputs */}
                    {expenseSplitMethod === 'custom' && expenseParticipants.length > 0 && (
                      <div style={{ background: T.s, borderRadius: T.rs, padding: 12, marginBottom: 12, border: `.5px solid ${T.border}` }}>
                        {expenseParticipants.map(name => (
                          <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            <span style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{name}</span>
                            <span style={{ fontSize: 12, color: T.t3 }}>{CS}</span>
                            <input value={expenseCustomSplits[name] || ''} onChange={e => setExpenseCustomSplits(prev => ({ ...prev, [name]: e.target.value }))}
                              placeholder="0.00" type="text" inputMode="decimal" style={{ width: 70, padding: "6px 8px", border: `.5px solid ${T.border}`, borderRadius: T.rs, fontSize: 13, fontWeight: 600, textAlign: "right", outline: "none" }} />
                          </div>
                        ))}
                        {parseFloat(expenseAmount) > 0 && (
                          <div style={{ fontSize: 11, color: Math.abs(expenseParticipants.reduce((s, n) => s + (parseFloat(expenseCustomSplits[n]) || 0), 0) - parseFloat(expenseAmount)) < 0.02 ? T.green : T.red, marginTop: 4, fontWeight: 600 }}>
                            Total: {CS}{expenseParticipants.reduce((s, n) => s + (parseFloat(expenseCustomSplits[n]) || 0), 0).toFixed(2)} / {CS}{parseFloat(expenseAmount).toFixed(2)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Save button */}
                    <button onClick={() => saveExpense(trip)} style={{ ...css.btn, ...css.btnP, width: "100%", padding: "14px 0", borderRadius: T.rs, fontSize: 14, fontWeight: 600, justifyContent: "center" }}>
                      {editingExpense ? "Update Expense" : "Add Expense"}
                    </button>
                  </div>
                </div>
              )}

              {/* Expenses content */}
              <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>

                {/* ── Summary hero ── */}
                <div style={{ background: `linear-gradient(135deg, ${T.al}, ${T.s})`, borderRadius: T.r, padding: 20, marginBottom: 16, border: `.5px solid ${T.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 4 }}>Total spent</p>
                      <p style={{ fontSize: 28, fontWeight: 700, fontFamily: T.fontD, color: T.t1, lineHeight: 1 }}>{CS}{totalSpent.toFixed(2)}</p>
                      <p style={{ fontSize: 11, color: T.t3, marginTop: 4 }}>{allExpenses.length} expense{allExpenses.length !== 1 ? "s" : ""}{adults.length > 0 ? ` · ${CS}${(totalSpent / Math.max(adults.length, 1)).toFixed(0)} per person` : ""}</p>
                    </div>
                    <button onClick={() => openAddExpense()} style={{ ...css.btn, ...css.btnP, borderRadius: 24, padding: "10px 18px", fontSize: 13, fontWeight: 600 }}>
                      + Add
                    </button>
                  </div>

                  {/* Quick add presets */}
                  <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                    {quickPresets.map((qp, i) => (
                      <button key={i} onClick={() => { resetExpenseForm(); setExpensePaidBy(adults[0] || ''); setExpenseParticipants([...adults]); setExpenseCategory(qp.cat); if (qp.amount) setExpenseAmount(qp.amount); setExpenseDesc(qp.label); setShowAddExpense(true); }}
                        style={{ padding: "6px 12px", borderRadius: 20, background: T.s, border: `.5px solid ${T.border}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", flexShrink: 0, fontFamily: T.font, fontSize: 11, color: T.t2, transition: "all .15s" }}>
                        <span style={{ fontSize: 14 }}>{qp.icon}</span> {qp.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Settlement — always visible when expenses exist ── */}
                {allExpenses.length > 0 && (
                  <div style={{ ...css.card, marginBottom: 16, padding: 0, overflow: "hidden", border: `.5px solid ${settlements.length > 0 ? T.amber : T.green}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: settlements.length > 0 ? T.amberL : T.greenL, cursor: "pointer" }}
                      onClick={() => setShowSettlement(!showSettlement)}>
                      <span style={{ fontSize: 16 }}>{settlements.length > 0 ? "💸" : "✅"}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{settlements.length > 0 ? "Settle up" : "All settled up!"}</p>
                        <p style={{ fontSize: 11, color: T.t3 }}>{settlements.length > 0 ? `${settlements.length} payment${settlements.length > 1 ? "s" : ""} needed` : "No payments needed"}</p>
                      </div>
                      <span style={{ fontSize: 12, color: T.t3, transition: "transform .2s", transform: showSettlement ? "rotate(180deg)" : "none" }}>▼</span>
                    </div>
                    {showSettlement && settlements.length > 0 && (
                      <div style={{ padding: "4px 14px 12px" }}>
                        {settlements.map((s, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: i < settlements.length - 1 ? `.5px solid ${T.border}` : "none" }}>
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: T.coralL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: T.coral, flexShrink: 0 }}>{s.from.charAt(0)}</div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 12 }}><b style={{ color: T.coral }}>{s.from}</b> <span style={{ color: T.t3 }}>→</span> <b style={{ color: T.green }}>{s.to}</b></p>
                            </div>
                            <span style={{ fontSize: 15, fontWeight: 700, color: T.t1 }}>{CS}{s.amount.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {showSettlement && settlements.length === 0 && (
                      <p style={{ fontSize: 12, color: T.t3, padding: "8px 14px 12px" }}>Everyone is square — no payments needed.</p>
                    )}
                  </div>
                )}

                {/* ── Per-person breakdown ── */}
                {adults.length > 1 && allExpenses.length > 0 && (
                  <div style={{ ...css.card, marginBottom: 16, padding: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>Per person</p>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(adults.length, 3)}, 1fr)`, gap: 8 }}>
                      {adults.map((name, i) => {
                        const pp = perPerson[name] || { paid: 0, owes: 0 };
                        const balance = pp.paid - pp.owes;
                        return (
                          <div key={i} style={{ padding: "10px 8px", borderRadius: T.rs, background: T.s2, textAlign: "center" }}>
                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: balance >= 0 ? T.greenL : T.coralL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: balance >= 0 ? T.green : T.coral, margin: "0 auto 6px" }}>{name.charAt(0)}</div>
                            <p style={{ fontSize: 12, fontWeight: 600, color: T.t1, marginBottom: 2 }}>{name.split(" ")[0]}</p>
                            <p style={{ fontSize: 10, color: T.t3 }}>Paid {CS}{pp.paid.toFixed(0)}</p>
                            <p style={{ fontSize: 10, color: T.t3 }}>Owes {CS}{pp.owes.toFixed(0)}</p>
                            <p style={{ fontSize: 11, fontWeight: 600, color: balance >= 0 ? T.green : T.coral, marginTop: 4 }}>{balance >= 0 ? "+" : ""}{CS}{balance.toFixed(2)}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Category breakdown ── */}
                {catBreakdown.length > 0 && (
                  <div style={{ ...css.card, marginBottom: 16, padding: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>Spending breakdown</p>
                    {/* Stacked bar */}
                    <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
                      {catBreakdown.map(s => (
                        <div key={s.key} style={{ width: `${s.percentage}%`, background: s.color, minWidth: s.percentage > 0 ? 3 : 0, transition: "width .5s ease" }} title={`${s.label}: ${CS}${s.amount.toFixed(2)}`} />
                      ))}
                    </div>
                    {catBreakdown.map(s => (
                      <div key={s.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", fontSize: 12 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, color: T.t2 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                          {s.icon} {s.label}
                        </span>
                        <span style={{ fontWeight: 600, color: T.t1 }}>{CS}{s.amount.toFixed(2)} <span style={{ fontWeight: 400, color: T.t3, fontSize: 10 }}>({s.percentage.toFixed(0)}%)</span></span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Accommodation costs from stays ── */}
                {stayCosts.length > 0 && (
                  <div style={{ ...css.card, marginBottom: 16, padding: 14, background: T.amberL, borderColor: T.amber + "40" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: T.amber, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>🏨 Accommodation</p>
                    {stayCosts.map((sc, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < stayCosts.length - 1 ? `.5px solid ${T.amber}22` : "none" }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 500, color: T.t1 }}>{sc.description}</p>
                          <p style={{ fontSize: 10, color: T.t2 }}>{CS}{(sc.amount / adults.length).toFixed(2)} each · {adults.length} people</p>
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 700, color: T.amber }}>{CS}{sc.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <p style={{ fontSize: 10, color: T.t3, marginTop: 8, fontStyle: "italic" }}>Auto-included from stay details</p>
                  </div>
                )}

                {/* ── Expense list — grouped by date ── */}
                {expenses.length === 0 && stayCosts.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 16px", color: T.t3 }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>💷</div>
                    <p style={{ fontSize: 15, fontWeight: 500, color: T.t2, marginBottom: 6 }}>No expenses yet</p>
                    <p style={{ fontSize: 12, lineHeight: 1.5, maxWidth: 240, margin: "0 auto" }}>Track group spending, split costs, and see who owes whom</p>
                    <button onClick={() => openAddExpense()} style={{ ...css.btn, ...css.btnP, borderRadius: 20, padding: "10px 24px", fontSize: 13, marginTop: 16 }}>Add first expense</button>
                  </div>
                )}

                {sortedDates.map(dateKey => (
                  <div key={dateKey} style={{ marginBottom: 4 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8, marginTop: 8 }}>
                      {fmtExpDate(dateKey)}
                      <span style={{ fontWeight: 400, marginLeft: 8, textTransform: "none" }}>{CS}{expByDate[dateKey].reduce((s, e) => s + e.amount, 0).toFixed(2)}</span>
                    </p>
                    {expByDate[dateKey].map((exp, i) => {
                      const cat = getCatInfo(exp.category);
                      const myShare = (exp.splits || []).find(s => s.participant_name === (adults[0] || ""));
                      return (
                        <div key={exp.id || i} className="w-card" style={{ ...css.card, marginBottom: 6, padding: "10px 12px", cursor: "pointer" }}
                          onClick={() => openAddExpense(exp)}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: cat.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                              {cat.icon}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: T.t1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{exp.description}</p>
                              <p style={{ fontSize: 10, color: T.t3 }}>
                                {exp.paid_by} paid
                                {exp.split_method === "equal" && (exp.splits || []).length > 1 ? ` · split ${(exp.splits || []).length} ways` : ""}
                                {myShare ? ` · your share ${CS}${myShare.share_amount.toFixed(2)}` : ""}
                              </p>
                            </div>
                            <p style={{ fontSize: 15, fontWeight: 700, color: T.t1, flexShrink: 0 }}>{CS}{exp.amount.toFixed(2)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            );
          })()}

          {/* ── PACKING TAB ── */}
          {tripDetailTab === "packing" && (() => {
            // Generate suggestions if not done yet
            if (!packingGenerated) {
              const suggested = generatePackingSuggestions(trip, intelligence);
              setPackingItems(suggested);
              setPackingGenerated(true);
            }
            const togglePacked = (idx) => setPackingItems(prev => prev.map((p, i) => i === idx ? { ...p, checked: !p.checked } : p));
            const addCustomItem = () => {
              if (!newPackingItem.trim()) return;
              setPackingItems(prev => [...prev, { item: newPackingItem.trim(), category: "essentials", reason: "Custom", person: "everyone", checked: false, auto: false }]);
              setNewPackingItem("");
            };
            const removeItem = (idx) => setPackingItems(prev => prev.filter((_, i) => i !== idx));
            const packedCount = packingItems.filter(p => p.checked).length;
            const totalCount = packingItems.length;
            const progress = totalCount > 0 ? Math.round((packedCount / totalCount) * 100) : 0;

            // Group by category or person
            const grouped = {};
            const filteredItems = packingFilter === "all" ? packingItems
              : packingFilter === "packed" ? packingItems.filter(p => p.checked)
              : packingFilter === "unpacked" ? packingItems.filter(p => !p.checked)
              : packingItems.filter(p => p.person === packingFilter || (p.forNames && p.forNames.includes(packingFilter)));

            for (const item of filteredItems) {
              const cat = item.category || "essentials";
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat].push(item);
            }

            // Get unique people for filter pills (include individual names from grouped items)
            const people = [...new Set(packingItems.flatMap(p => {
              const names = [];
              if (p.person && p.person !== "everyone") names.push(p.person);
              if (p.forNames) names.push(...p.forNames);
              return names;
            }).filter(Boolean))];

            return (
              <div style={{ flex: 1, overflowY: "auto", padding: 0 }}>
                {/* Progress bar */}
                <div style={{ padding: "16px 20px 8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>Packing List</p>
                    <span style={{ fontSize: 11, color: progress === 100 ? T.green : T.t3 }}>
                      {progress === 100 ? "✅ All packed!" : `${packedCount}/${totalCount} packed`}
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: T.s2, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, background: progress === 100 ? T.green : T.a,
                      width: `${progress}%`, transition: "width .3s" }} />
                  </div>
                </div>

                {/* Filter pills */}
                <div style={{ display: "flex", gap: 6, padding: "6px 20px", overflowX: "auto" }}>
                  {["all", "unpacked", "packed", ...people].map(f => (
                    <button key={f} onClick={() => setPackingFilter(f)}
                      style={{ padding: "4px 12px", borderRadius: 16, border: `.5px solid ${packingFilter === f ? T.a : T.border}`,
                        background: packingFilter === f ? T.al : "transparent", color: packingFilter === f ? T.ad : T.t3,
                        fontSize: 11, cursor: "pointer", fontFamily: T.font, whiteSpace: "nowrap", textTransform: "capitalize" }}>
                      {f}
                    </button>
                  ))}
                </div>

                {/* Add custom item */}
                <div style={{ display: "flex", gap: 6, padding: "8px 20px" }}>
                  <input value={newPackingItem} onChange={e => setNewPackingItem(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addCustomItem()}
                    placeholder="Add custom item..."
                    style={{ flex: 1, padding: "8px 12px", borderRadius: 10, border: `.5px solid ${T.border}`,
                      fontSize: 12, fontFamily: T.font, outline: "none", minHeight: 36 }} />
                  <button onClick={addCustomItem} style={{ ...css.btn, ...css.btnP, ...css.btnSm, borderRadius: 10 }}>+</button>
                </div>

                {/* Grouped items */}
                <div style={{ padding: "0 20px 100px" }}>
                  {Object.entries(grouped).map(([cat, items]) => {
                    const catInfo = PACKING_CATEGORIES[cat] || { label: cat, icon: "📦" };
                    return (
                      <div key={cat} style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                          {catInfo.icon} {catInfo.label} ({items.filter(i => i.checked).length}/{items.length})
                        </p>
                        {items.map((item, idx) => {
                          const globalIdx = packingItems.indexOf(item);
                          return (
                            <div key={globalIdx} onClick={() => togglePacked(globalIdx)}
                              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                                borderBottom: `.5px solid ${T.border}`, cursor: "pointer",
                                opacity: item.checked ? 0.5 : 1, transition: "opacity .15s" }}>
                              <div style={{ width: 20, height: 20, borderRadius: 6,
                                border: `1.5px solid ${item.checked ? T.a : T.t3}`,
                                background: item.checked ? T.a : "transparent",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: "#fff", fontSize: 12, flexShrink: 0, transition: "all .15s" }}>
                                {item.checked && "✓"}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <p style={{ fontSize: 13, textDecoration: item.checked ? "line-through" : "none", color: T.t1 }}>{item.item}</p>
                                  {item.qty > 1 && (
                                    <span style={{ fontSize: 10, fontWeight: 600, color: T.a, background: `${T.a}15`, borderRadius: 8, padding: "1px 6px" }}>×{item.qty}</span>
                                  )}
                                </div>
                                <p style={{ fontSize: 10, color: T.t3 }}>
                                  {item.forNames?.length > 1 && <span style={{ color: T.ad, marginRight: 4 }}>{item.forNames.join(", ")}</span>}
                                  {!item.forNames && item.person !== "everyone" && <span style={{ color: T.ad, marginRight: 4 }}>{item.person}</span>}
                                  {item.reason}
                                </p>
                              </div>
                              {!item.auto && (
                                <button onClick={e => { e.stopPropagation(); removeItem(globalIdx); }}
                                  style={{ background: "none", border: "none", fontSize: 14, color: T.t3, cursor: "pointer", padding: 4 }}>×</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <div style={{ textAlign: "center", padding: 40, color: T.t3 }}>
                      <p style={{ fontSize: 13 }}>No items match this filter</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── MEMORIES TAB ── */}
          {tripDetailTab === "memories" && (() => {
            const photoDayCount = trip.rawStart && trip.rawEnd
              ? Math.max(1, Math.ceil((new Date(trip.rawEnd + "T12:00:00") - new Date(trip.rawStart + "T12:00:00")) / 86400000) + 1)
              : Object.keys(trip.timeline || {}).length || 5;
            const dayGroups = Array.from({ length: Math.min(photoDayCount, 30) }, (_, i) => `Day ${i + 1}`);
            const taggedByDay = {};
            dayGroups.forEach(d => { taggedByDay[d] = uploadedPhotos.filter(p => p.day === d); });
            const untaggedPhotos = uploadedPhotos.filter(p => p.day === "Untagged");
            const totalPhotos = uploadedPhotos.length;
            const likedCount = uploadedPhotos.filter(p => p.liked).length;

            const renderThumb = (p, idx) => {
              const mood = detectMood(p, trip.timeline);
              return (
              <div key={idx} style={{ position: "relative" }}>
                <div style={{ aspectRatio: "1", borderRadius: T.rs, overflow: "hidden", cursor: "pointer", position: "relative", border: p.liked ? `2px solid ${T.red}` : "none" }} onClick={() => setViewingPhoto(p)}>
                  <img src={p.url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <span onClick={(e) => { e.stopPropagation(); const updated = uploadedPhotos.map(ph => ph.id === p.id ? { ...ph, liked: !ph.liked } : ph); setUploadedPhotos(updated); updatePhotoInSupabase(p.id, { liked: !p.liked }); }} style={{ position: "absolute", top: 4, left: 4, fontSize: 14, cursor: "pointer", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.4))" }}>{p.liked ? "\u2764\uFE0F" : "\uD83E\uDD0D"}</span>
                  <span onClick={(e) => { e.stopPropagation(); setUploadedPhotos(prev => prev.filter(ph => ph.id !== p.id)); deletePhotoFromSupabase(p); }} style={{ position: "absolute", top: 2, right: 4, fontSize: 14, cursor: "pointer", color: "#fff", fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,.6)", lineHeight: 1 }}>&times;</span>
                  {/* Mood tag */}
                  {mood && (
                    <span style={{ position: "absolute", bottom: 4, left: 4, padding: "2px 6px", borderRadius: 8, background: mood.bg, color: mood.color, fontSize: 9, fontWeight: 600, display: "flex", alignItems: "center", gap: 2 }}>
                      {mood.icon} {mood.label}
                    </span>
                  )}
                  {/* AI caption button */}
                  {!p.caption && (
                    <span onClick={(e) => { e.stopPropagation(); const caption = generateAutoCaption(p, trip.timeline, trip); setUploadedPhotos(prev => prev.map(ph => ph.id === p.id ? { ...ph, caption } : ph)); updatePhotoInSupabase(p.id, { caption }); }}
                      style={{ position: "absolute", bottom: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,.5)", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(2px)" }}
                      title="AI caption">AI</span>
                  )}
                </div>
                {/* Caption display */}
                {p.caption && (
                  <p style={{ fontSize: 9, color: T.t2, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.caption}</p>
                )}
                <select value={p.day} onChange={(e) => { const newDay = e.target.value; setUploadedPhotos(prev => prev.map(ph => ph.id === p.id ? { ...ph, day: newDay } : ph)); updatePhotoInSupabase(p.id, { day_tag: newDay }); }}
                  style={{ width: "100%", padding: "3px 4px", fontSize: 10, border: `.5px solid ${T.border}`, borderRadius: 4, background: T.s2, color: T.t2, marginTop: 3, fontFamily: T.font, cursor: "pointer" }}>
                  <option value="Untagged">Untagged</option>
                  {dayGroups.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              );
            };
            const uploadBox = (dayLabel) => (
              <div onClick={() => { uploadDayTagRef.current = dayLabel || "Untagged"; photoInputRef.current?.click(); }} style={{ aspectRatio: "1", borderRadius: T.rs, background: T.s2, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20, color: T.t3, flexDirection: "column", gap: 2 }}>{"📷"}<span style={{ fontSize: 10 }}>Add</span></div>
            );

            return (
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              <input type="file" accept="image/*" multiple ref={photoInputRef} style={{ display: "none" }} onChange={handlePhotoUpload} />
              {/* Stats + View toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 12, fontSize: 12, color: T.t2 }}>
                  <span>📸 {totalPhotos}</span>
                  <span>❤️ {likedCount}</span>
                </div>
                <button style={{ ...css.btn, ...css.btnSm, ...css.btnP }} onClick={() => photoInputRef.current?.click()}>+ Upload</button>
              </div>
              {/* View mode + AI tools */}
              {totalPhotos > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
                  <button onClick={() => setMemoriesView("grid")}
                    style={{ padding: "5px 12px", borderRadius: 16, fontSize: 11, fontWeight: memoriesView === "grid" ? 600 : 400, border: `.5px solid ${memoriesView === "grid" ? T.a : T.border}`, background: memoriesView === "grid" ? T.al : "transparent", color: memoriesView === "grid" ? T.ad : T.t3, cursor: "pointer", fontFamily: T.font }}>
                    📷 Grid
                  </button>
                  <button onClick={() => setMemoriesView("timeline")}
                    style={{ padding: "5px 12px", borderRadius: 16, fontSize: 11, fontWeight: memoriesView === "timeline" ? 600 : 400, border: `.5px solid ${memoriesView === "timeline" ? T.a : T.border}`, background: memoriesView === "timeline" ? T.al : "transparent", color: memoriesView === "timeline" ? T.ad : T.t3, cursor: "pointer", fontFamily: T.font }}>
                    📖 Timeline
                  </button>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => { uploadedPhotos.forEach(p => { if (!p.caption) { const caption = generateAutoCaption(p, trip.timeline, trip); setUploadedPhotos(prev => prev.map(ph => ph.id === p.id ? { ...ph, caption } : ph)); updatePhotoInSupabase(p.id, { caption }); }}); }}
                    style={{ padding: "5px 10px", borderRadius: 16, fontSize: 10, fontWeight: 500, border: `.5px solid ${T.purple}`, background: T.purpleL, color: T.purple, cursor: "pointer", fontFamily: T.font, display: "flex", alignItems: "center", gap: 3 }}>
                    ✨ AI Captions
                  </button>
                </div>
              )}

              {/* Highlight reel */}
              {totalPhotos > 0 && (() => {
                const curatedCount = curateReelPhotos(uploadedPhotos).length;
                return (<>
                <div style={{ ...css.card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
                  <div style={{ height: 120, background: `linear-gradient(135deg, ${T.ad}, ${T.a})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", gap: 12 }}>
                    <button onClick={() => { const curated = curateReelPhotos(uploadedPhotos); setReelPhotos(curated); setReelIndex(0); setReelPaused(false); setReelPlaying(true); }}
                      style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,.2)", border: "2px solid rgba(255,255,255,.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .15s" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                    </button>
                    <div>
                      <p style={{ fontSize: 16, fontWeight: 600 }}>Trip Highlight Reel</p>
                      <p style={{ fontSize: 11, opacity: .7 }}>{curatedCount} best photos · Music synced</p>
                    </div>
                  </div>
                </div>

                {/* Music track picker */}
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Music</p>
                  <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
                    {REEL_TRACKS.map(t => (
                      <button key={t.id} onClick={() => setReelTrack(t.id)}
                        style={{ minWidth: 90, padding: "8px 10px", borderRadius: T.rs, border: `.5px solid ${reelTrack === t.id ? T.a : T.border}`,
                          background: reelTrack === t.id ? T.al : T.s2, cursor: "pointer", textAlign: "center", flexShrink: 0 }}>
                        <p style={{ fontSize: 16, marginBottom: 2 }}>{t.icon}</p>
                        <p style={{ fontSize: 11, fontWeight: 500, color: reelTrack === t.id ? T.ad : T.t1 }}>{t.name}</p>
                        <p style={{ fontSize: 9, color: T.t3 }}>{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reel style selector */}
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Visual Style</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[
                      { id: "cinematic", label: "\uD83C\uDFAC Cinematic", desc: "Slow Ken Burns" },
                      { id: "slideshow", label: "\uD83D\uDCF7 Slideshow", desc: "Clean fades" },
                      { id: "energetic", label: "\u26A1 Energetic", desc: "Fast & dynamic" },
                    ].map(s => (
                      <button key={s.id} onClick={() => setReelStyle(s.id)}
                        style={{ flex: 1, padding: "10px 8px", borderRadius: T.rs, border: `.5px solid ${reelStyle === s.id ? T.a : T.border}`,
                          background: reelStyle === s.id ? T.al : T.s2, cursor: "pointer", textAlign: "center" }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: reelStyle === s.id ? T.ad : T.t1 }}>{s.label}</p>
                        <p style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>{s.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                </>);
              })()}

              {/* ─── TIMELINE VIEW ─── */}
              {memoriesView === "timeline" && totalPhotos > 0 && (() => {
                const memTimeline = buildMemoryTimeline(uploadedPhotos, trip.timeline, trip);
                return (
                  <div style={{ position: "relative", paddingLeft: 24 }}>
                    {/* Vertical line */}
                    <div style={{ position: "absolute", left: 10, top: 0, bottom: 0, width: 2, background: T.border }} />
                    {memTimeline.filter(d => d.photoCount > 0 || d.activities.length > 0).map((entry, i) => (
                      <div key={i} style={{ position: "relative", marginBottom: 24 }}>
                        {/* Dot */}
                        <div style={{ position: "absolute", left: -20, top: 4, width: 12, height: 12, borderRadius: "50%", background: entry.mood ? entry.mood.bg : T.s2, border: `2px solid ${entry.mood ? entry.mood.color : T.border}`, zIndex: 1 }} />
                        {/* Header */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: T.t1 }}>{entry.dayLabel}</p>
                          {entry.date && <span style={{ fontSize: 11, color: T.t3 }}>{entry.date}</span>}
                          {entry.location && <span style={{ fontSize: 11, color: T.a, fontWeight: 500 }}>📍 {entry.location}</span>}
                          {entry.mood && <span style={{ padding: "2px 8px", borderRadius: 10, background: entry.mood.bg, color: entry.mood.color, fontSize: 10, fontWeight: 600 }}>{entry.mood.icon} {entry.mood.label}</span>}
                        </div>
                        {/* Activities context */}
                        {entry.activities.length > 0 && (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                            {entry.activities.map((act, ai) => (
                              <span key={ai} style={{ padding: "3px 8px", borderRadius: 8, background: T.s2, fontSize: 10, color: T.t2 }}>
                                {act.time && <span style={{ color: T.t3 }}>{act.time} </span>}{act.title}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Photos */}
                        {entry.photos.length > 0 && (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                            {entry.photos.map((p, pi) => renderThumb(p, pi))}
                            {uploadBox(entry.dayLabel)}
                          </div>
                        )}
                        {entry.photos.length === 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div onClick={() => { uploadDayTagRef.current = entry.dayLabel; photoInputRef.current?.click(); }}
                              style={{ padding: "8px 14px", borderRadius: T.rs, border: `1px dashed ${T.border}`, cursor: "pointer", fontSize: 11, color: T.t3 }}>
                              📷 Add photos for {entry.dayLabel}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* ─── GRID VIEW ─── */}
              {memoriesView === "grid" && dayGroups.map(dayLabel => {
                const dayPhotos = taggedByDay[dayLabel];
                return (
                  <div key={dayLabel} style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5 }}>{dayLabel}</p>
                        {(() => { const mood = dayPhotos.length > 0 ? detectMood(dayPhotos[0], trip.timeline) : null; return mood ? <span style={{ padding: "1px 6px", borderRadius: 8, background: mood.bg, color: mood.color, fontSize: 9, fontWeight: 600 }}>{mood.icon} {mood.label}</span> : null; })()}
                      </div>
                      <span style={{ fontSize: 11, color: T.t3 }}>{dayPhotos.length === 0 ? "No photos yet" : `${dayPhotos.length} photo${dayPhotos.length !== 1 ? "s" : ""}`}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                      {dayPhotos.map((p, i) => renderThumb(p, i))}
                      {uploadBox(dayLabel)}
                    </div>
                  </div>
                );
              })}

              {/* Untagged */}
              {memoriesView === "grid" && untaggedPhotos.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Untagged</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                    {untaggedPhotos.map((p, i) => renderThumb(p, i))}
                  </div>
                </div>
              )}

              {totalPhotos === 0 && (
                <div style={{ textAlign: "center", padding: "40px 16px", color: T.t3 }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📸</div>
                  <p style={{ fontSize: 14, fontWeight: 500, color: T.t2, marginBottom: 4 }}>No memories yet</p>
                  <p style={{ fontSize: 12, lineHeight: 1.5 }}>Upload photos to create your trip highlight reel and organise memories by day.</p>
                </div>
              )}
            </div>
            );
          })()}

          {/* ── INFO TAB ── */}
          {tripDetailTab === "activity" && (() => {
            const activities = trip.activity || [];
            const formatAgo = (iso) => {
              const diff = Date.now() - new Date(iso).getTime();
              if (diff < 60000) return "Just now";
              if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
              if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
              return `${Math.floor(diff / 86400000)}d ago`;
            };
            const tripLink = `${window.location.origin}?join=${trip.shareCode || trip.dbId || trip.id}`;
            return (
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {/* ── WhatsApp share ── */}
              <div style={{ ...css.card, marginBottom: 12, padding: 14, background: "#E8F5E8", borderColor: "#25D366" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#128C7E", marginBottom: 8 }}>Share with your group</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => shareToWhatsApp(trip.name, `Check out our trip plan for ${trip.places.join(", ")}! 🗺️`, trip.dbId || trip.id)}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", background: "#25D366", color: "#fff", border: "none", borderRadius: T.rs, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>
                    <span style={{ fontSize: 16 }}>💬</span> Share trip
                  </button>
                  <button onClick={() => { const activePolls = (trip.polls || []).filter(p => p.status === "active"); if (!activePolls.length) { showToast("No active polls to share"); return; } shareToWhatsApp(trip.name, `🗳️ Vote on: "${activePolls[0].q}"\n${activePolls[0].options.map(o => `• ${o.text}`).join("\n")}`, trip.dbId || trip.id, { tab: "polls" }); }}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 12px", background: "#128C7E", color: "#fff", border: "none", borderRadius: T.rs, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: T.font }}>
                    <span style={{ fontSize: 16 }}>🗳️</span> Share poll
                  </button>
                </div>
              </div>

              {/* ── Share & Invite ── */}
              {trip.shareCode && (
                <div style={{ ...css.card, marginBottom: 12, padding: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Invite link</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: T.s2, borderRadius: T.rs, fontSize: 12, color: T.t2, marginBottom: 8 }}>
                    <code style={{ flex: 1, fontFamily: T.font, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tripLink}</code>
                    <button className="w-btn" style={{ ...css.btn, ...css.btnSm, fontSize: 11 }} onClick={() => { navigator.clipboard?.writeText(tripLink); showToast("Link copied!"); }}>Copy</button>
                  </div>
                  {(trip.travellers?.adults || []).map((a, i) => {
                    const adultColors = [T.a, T.coral, T.blue, T.amber, T.purple, T.pink];
                    const getInit = (n) => { if (!n) return "?"; const p = n.trim().split(/\s+/); return p.length > 1 ? (p[0][0] + p[1][0]).toUpperCase() : n.slice(0, 2).toUpperCase(); };
                    const status = a.isLead ? "Organiser" : a.isClaimed ? "Joined" : "Invited";
                    const statusColor = a.isLead ? T.ad : a.isClaimed ? T.blue : T.t3;
                    const displayName = (a.name === "You" && a.isLead && user) ? (user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || a.name) : (a.name || `Adult ${i + 1}`);
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: i < (trip.travellers?.adults?.length || 0) - 1 ? `.5px solid ${T.border}` : "none" }}>
                        <Avatar bg={adultColors[i % adultColors.length]} label={getInit(displayName)} size={24} />
                        <p style={{ flex: 1, fontSize: 12, fontWeight: 500 }}>{displayName}</p>
                        <p style={{ fontSize: 10, color: statusColor }}>{status}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Activity feed ── */}
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>Recent activity</p>
                {activities.length === 0 && (
                  <div style={{ textAlign: "center", padding: "30px 16px", color: T.t3 }}>
                    <div style={{ fontSize: 24, marginBottom: 6 }}>📋</div>
                    <p style={{ fontSize: 13, color: T.t2, marginBottom: 2 }}>No activity yet</p>
                    <p style={{ fontSize: 11 }}>Changes to polls, itinerary, expenses, and photos will appear here.</p>
                  </div>
                )}
                {activities.map((a) => (
                  <div key={a.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: `.5px solid ${T.border}` }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: a.type === "milestone" ? T.al : a.type === "poll" ? T.purpleL : a.type === "expense" ? T.amberL : a.type === "photo" ? T.coralL : T.blueL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{a.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: T.t, lineHeight: 1.4 }}>{a.text}</p>
                      <p style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>{a.by} · {formatAgo(a.time)}</p>
                    </div>
                    {(a.type === "poll" || a.type === "itinerary") && (
                      <button onClick={() => shareToWhatsApp(trip.name, `${a.icon} ${a.text}`, trip.dbId || trip.id, a.type === "poll" ? { tab: "polls" } : {})}
                        style={{ background: "none", border: "none", fontSize: 14, cursor: "pointer", opacity: 0.5, flexShrink: 0, padding: 4 }} title="Share on WhatsApp">💬</button>
                    )}
                  </div>
                ))}
              </div>

              {/* ── Trip details (collapsed) ── */}
              <Collapsible title="Trip details" icon="📋" sectionKey="activityTripDetails" defaultOpen={false} expandedSections={expandedSections} setExpandedSections={setExpandedSections}
                count={trip.places.length + trip.travel.length}>
                <div className="w-card" style={css.card}>
                  {trip.places.length > 0 && <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>Locations</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{trip.places.map(p => <Tag key={p} bg={T.purpleL} color={T.purple}>{p}</Tag>)}</div></div>}
                  {trip.travel.length > 0 && <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>Travel</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{trip.travel.map(tv => <Tag key={tv} bg={T.blueL} color={T.blue}>{tv}</Tag>)}</div></div>}
                  {trip.stayNames.length > 0 && <div style={{ marginBottom: 8 }}><label style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>Stays</label><div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>{trip.stayNames.map(s => <Tag key={s} bg={T.amberL} color={T.amber}>{s}</Tag>)}</div></div>}
                  {trip.brief && <div><label style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>Brief</label><p style={{ fontSize: 12, color: T.t2, marginTop: 4, lineHeight: 1.5 }}>{trip.brief}</p></div>}
                </div>
              </Collapsible>

              <button onClick={() => { if (window.confirm(`Are you sure you want to remove "${trip.name}"? This cannot be undone.`)) { deleteCreatedTrip(trip.id); navigate("home"); } }}
                style={{ background: "none", border: "none", color: T.t3, fontSize: 11, cursor: "pointer", fontFamily: T.font, padding: "16px 0", width: "100%", textAlign: "center", opacity: 0.6 }}>
                Remove trip
              </button>
            </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
