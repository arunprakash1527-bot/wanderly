import React, { useState, useRef, useCallback } from "react";
import { supabase } from './supabaseClient';
import { T } from './styles/tokens';
import { css } from './styles/shared';
import { CONNECTORS } from './constants/connectors';
import { MEMORIES } from './constants/tripData';

// Screen components
import { AuthScreen } from './components/screens/AuthScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { CreateScreen } from './components/screens/CreateScreen';
import { CreatedTripScreen } from './components/screens/CreatedTripScreen';
import { TripScreen } from './components/screens/TripScreen';
import { ChatScreen } from './components/screens/ChatScreen';
import { VoteScreen } from './components/screens/VoteScreen';
import { MemoriesScreen } from './components/screens/MemoriesScreen';
import { ShareScreen } from './components/screens/ShareScreen';
import { ExploreScreen } from './components/screens/ExploreScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { JoinPreviewScreen } from './components/screens/JoinPreviewScreen';

// Context providers and hooks
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { TripProvider, useTrip } from './contexts/TripContext';
import { WizardProvider, useWizard } from './contexts/WizardContext';
import { ChatProvider, useChat } from './contexts/ChatContext';
import { ExpenseProvider, useExpenses } from './contexts/ExpenseContext';
import { MemoriesProvider, useMemories } from './contexts/MemoriesContext';


// ─── CSS String (shared across loading, auth, and main renders) ───
const CSS_STRING = `@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;1,400&family=Instrument+Serif&display=swap');@keyframes spin{to{transform:rotate(360deg)}}@keyframes kb1{from{transform:scale(1)}to{transform:scale(1.15)}}@keyframes kb2{from{transform:scale(1.15)}to{transform:scale(1)}}@keyframes kb3{from{transform:scale(1) translateX(0)}to{transform:scale(1.1) translateX(-3%)}}@keyframes kb4{from{transform:scale(1.1) translateY(-2%)}to{transform:scale(1) translateY(0)}}@keyframes reelFadeIn{from{opacity:0}to{opacity:1}}@keyframes reelProgress{from{width:0%}to{width:100%}}@keyframes reelEnergetic{0%{transform:scale(1) rotate(0deg);opacity:0}10%{opacity:1}100%{transform:scale(1.15) rotate(1.5deg);opacity:1}}@keyframes demoPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}@keyframes demoSlideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes demoPulse{0%,100%{opacity:.3}50%{opacity:1}}@keyframes demoBounce{0%{transform:translateY(-16px);opacity:0}65%{transform:translateY(3px)}100%{transform:translateY(0);opacity:1}}@keyframes demoFadeIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}@keyframes demoType{from{width:0}to{width:100%}}@keyframes demoGrow{from{width:0%}to{width:var(--target-width)}}@keyframes typingDot{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.08);border-radius:4px}.w-app input:focus-visible,.w-app textarea:focus-visible,.w-app select:focus-visible{border-color:#4a6f60!important;box-shadow:0 0 0 2px rgba(74,111,96,.15)}.w-app button:focus-visible{outline:2px solid #4a6f60;outline-offset:2px}.w-app input[type="date"]{cursor:pointer}.w-app input[type="date"]::-webkit-calendar-picker-indicator{cursor:pointer;padding:4px;opacity:.6}.w-app button{transition:all .15s}.w-app button:hover{filter:brightness(.96)}.w-app button:active{filter:brightness(.9);transition:all 60ms}.w-pri:hover{filter:brightness(1.08)!important;box-shadow:0 2px 8px rgba(74,111,96,.25)}.w-pri:active{filter:brightness(.9)!important;transform:scale(.97)}.w-chip:hover{border-color:rgba(74,111,96,.4)!important;background:rgba(74,111,96,.06)!important}.w-chip:active{transform:scale(.96)}.w-tab:hover{color:#4a6f60!important}.w-expand{cursor:pointer;transition:all .15s}.w-expand:hover{background:rgba(0,0,0,.02)}.w-expand:active{background:rgba(0,0,0,.04)}html,body,#root{height:100%;margin:0;background:#f5f3f0}@media(min-width:601px){.w-app{border-radius:22px!important;max-height:900px!important;min-height:0!important;height:900px!important;border:.5px solid rgba(0,0,0,.08)!important;box-shadow:0 8px 40px rgba(0,0,0,.08)!important;margin-top:20px!important;zoom:0.85}}@media(max-width:600px){.w-app{border-radius:0!important;max-height:none!important;height:100dvh!important;border:none!important;box-shadow:none!important;margin:0!important;font-size:14px}}`;

// Demo slide durations (ticks at 220ms each)
const DEMO_SLIDE_DURATIONS = [62, 56, 54, 72, 58, 62, 58, 56, 54, 999];


// ─── Bridge: ExpenseProvider needs props from other contexts ───
function ExpenseProviderBridge({ children }) {
  const { user } = useAuth();
  const { showToast } = useNavigation();
  const { logActivity } = useTrip();
  return (
    <ExpenseProvider user={user} showToast={showToast} logActivity={logActivity}>
      {children}
    </ExpenseProvider>
  );
}


// ─── Main App: thin provider composition ───
export default function TripWithMeApp() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <TripProvider>
          <WizardProvider>
            <ChatProvider>
              <ExpenseProviderBridge>
                <MemoriesProvider>
                  <AppShell />
                </MemoriesProvider>
              </ExpenseProviderBridge>
            </ChatProvider>
          </WizardProvider>
        </TripProvider>
      </NavigationProvider>
    </AuthProvider>
  );
}


// ─── AppShell: reads all contexts, passes props to screens ───
function AppShell() {
  // ── Auth Context ──
  const {
    user, setUser,
    authLoading, setAuthLoading,
    authScreen, setAuthScreen,
    authEmail, setAuthEmail,
    authPassword, setAuthPassword,
    authName, setAuthName,
    authError, setAuthError,
    syncing,
    signInWithGoogle, signInWithEmail, signUpWithEmail, signOut,
  } = useAuth();

  // ── Navigation Context ──
  const {
    screen,
    toast,
    showWelcome, setShowWelcome,
    showDemo, setShowDemo,
    demoSlide, setDemoSlide,
    demoTick, setDemoTick,
    demoPaused, setDemoPaused,
    demoInteracted, setDemoInteracted,
    navigate, showToast,
  } = useNavigation();

  // ── Trip Context ──
  const {
    createdTrips, setCreatedTrips,
    selectedCreatedTrip, setSelectedCreatedTrip,
    selectedDay, setSelectedDay,
    tripDetailTab, setTripDetailTab,
    expandedItem, setExpandedItem,
    editingTimelineIdx, setEditingTimelineIdx,
    expandedSections, setExpandedSections,
    bookingStates, setBookingStates,
    joinedSlot, setJoinedSlot,
    showNotifications, setShowNotifications,
    lastSeenActivity,
    showActivationModal, setShowActivationModal,
    activationPrefs, setActivationPrefs,
    pendingActivationTripId,
    saving,
    showMap, setShowMap,
    tripDirections, setTripDirections,
    pollData, setPollData,
    showPollCreator, setShowPollCreator,
    newPollQuestion, setNewPollQuestion,
    newPollOptions, setNewPollOptions,
    totalUnread,
    allRecentActivity,
    joinTripAsTraveller,
    createTrip,
    logActivity,
    getUnreadCount,
    markTripSeen,
    findSmartSlot,
    shareToWhatsApp,
    deleteCreatedTrip,
    generateAndSetTimeline,
    getSmartRouteOrder,
    getFullRouteFromStays,
    makeTripLive,
    confirmActivation,
    viewCreatedTrip,
    updateTimelineItem,
    deleteTimelineItem,
    moveTimelineItem,
    addTimelineItem,
    getDayItems,
    hasTimeline,
    createNewPoll,
  } = useTrip();

  // ── Wizard Context ──
  const {
    wizStep, setWizStep,
    wizTrip, setWizTrip,
    wizTravellers, setWizTravellers,
    wizStays, setWizStays,
    wizPrefs, setWizPrefs,
    wizShowErrors, setWizShowErrors,
    placeInput, setPlaceInput,
    placeSuggestionsOpen, setPlaceSuggestionsOpen,
    staySearch, setStaySearch,
    staySearchOpen, setStaySearchOpen,
    stayPlacesResults, setStayPlacesResults,
    staySearching,
    handleStaySearchChange,
    foodSearch, setFoodSearch,
    adultActSearch, setAdultActSearch,
    olderActSearch, setOlderActSearch,
    youngerActSearch, setYoungerActSearch,
    expandedPrefSections, setExpandedPrefSections,
    placesFood,
    placesActivities,
    REGION_SUGGESTIONS,
    editingTripId, setEditingTripId,
    resetWizard,
  } = useWizard();

  // ── Chat Context ──
  const {
    chatMessages, setChatMessages,
    chatInput, setChatInput,
    chatRef,
    chatTyping, setChatTyping,
    chatFlowStep, setChatFlowStep,
    chatFlowData, setChatFlowData,
    chatAddDayPicker, setChatAddDayPicker,
    lastChatTopic, setLastChatTopic,
    tripChatInput, setTripChatInput,
    tripChatMessages,
    tripChatEndRef,
    tripChatTyping,
    handleTripChat,
  } = useChat();

  // ── Expense Context ──
  const {
    expenses,
    showAddExpense, setShowAddExpense,
    editingExpense, setEditingExpense,
    expenseDesc, setExpenseDesc,
    expenseAmount, setExpenseAmount,
    expenseCategory, setExpenseCategory,
    expensePaidBy, setExpensePaidBy,
    expenseSplitMethod, setExpenseSplitMethod,
    expenseParticipants, setExpenseParticipants,
    expenseCustomSplits, setExpenseCustomSplits,
    showSettlement, setShowSettlement,
    resetExpenseForm,
    saveExpense,
    deleteExpense,
    calculateSettlement,
    getCategoryBreakdown,
  } = useExpenses();

  // ── Memories Context ──
  const {
    uploadedPhotos, setUploadedPhotos,
    viewingPhoto, setViewingPhoto,
    videoState, setVideoState,
    videoSettings, setVideoSettings,
    reelPlaying, setReelPlaying,
    reelIndex, setReelIndex,
    reelPaused, setReelPaused,
    reelStyle, setReelStyle,
    photoInputRef,
    reelTimerRef,
    updatePhotoInSupabase,
    deletePhotoFromSupabase,
  } = useMemories();

  // ── Local state (not in any context) ──
  const [settingsToggles, setSettingsToggles] = useState(() => {
    const s = {}; Object.keys(CONNECTORS).forEach(k => s[k] = true);
    ["booking","ev","traffic","video","poll","checkout"].forEach(k => s["n_"+k] = true);
    return s;
  });
  const [photos, setPhotos] = useState(MEMORIES);

  // ── handlePhotoUpload bridge (used by CreatedTripScreen) ──
  const handlePhotoUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    const trip = selectedCreatedTrip || createdTrips[0];
    const tripId = trip?.dbId || trip?.id || 'default';

    for (const f of files) {
      const uniqueId = Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      const filePath = `${tripId}/${uniqueId}-${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      let url = URL.createObjectURL(f);
      let storedInSupabase = false;

      try {
        const { data, error } = await supabase.storage.from('trip-photos').upload(filePath, f, { cacheControl: '3600', upsert: false });
        if (!error && data) {
          const { data: urlData } = supabase.storage.from('trip-photos').getPublicUrl(filePath);
          if (urlData?.publicUrl) {
            url = urlData.publicUrl;
            storedInSupabase = true;
          }
        }
      } catch (err) { /* Storage not set up — use local URL */ }

      const newPhoto = {
        id: uniqueId, url, name: f.name, day: "Untagged", liked: false, caption: "",
        uploadDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        sortOrder: uploadedPhotos.length, filePath: storedInSupabase ? filePath : null,
      };

      setUploadedPhotos(prev => [...prev, newPhoto]);

      if (storedInSupabase && user) {
        try {
          await supabase.from('trip_photos').insert({
            trip_id: tripId, user_id: user.id, file_url: url, file_path: filePath,
            file_name: f.name, day_tag: 'Untagged', liked: false, caption: '', sort_order: uploadedPhotos.length,
          });
        } catch (err) { /* table may not exist yet */ }
      }
    }
    if (files.length > 0 && trip?.id) {
      logActivity(trip.id, "\uD83D\uDCF8", `Added ${files.length} photo${files.length > 1 ? "s" : ""} to memories`, "photo");
    }
    e.target.value = "";
  }, [selectedCreatedTrip, createdTrips, uploadedPhotos, setUploadedPhotos, user, logActivity]);

  // ── Render constants ──
  const phoneStyle = { maxWidth: 600, width: "100%", margin: "0 auto", minHeight: "100dvh", height: "100dvh", background: T.bg, overflow: "hidden", fontFamily: T.font, color: T.t1 };

  // ── Loading state ──
  if (authLoading) {
    return (
      <div className="w-app" style={phoneStyle}>
        <style>{CSS_STRING}</style>
        <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <h1 style={{ fontFamily: T.fontD, fontSize: 24, fontWeight: 400 }}>Trip With Me</h1>
            <p style={{ fontSize: 12, color: T.t2, marginTop: 4 }}>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Auth screen (not logged in) ──
  if (!user) {
    return (
      <div className="w-app" style={phoneStyle}>
        <style>{CSS_STRING}</style>
        <div style={{ height: "100%" }}>
          <AuthScreen signInWithGoogle={signInWithGoogle} signUpWithEmail={signUpWithEmail} signInWithEmail={signInWithEmail} authScreen={authScreen} setAuthScreen={setAuthScreen} authEmail={authEmail} setAuthEmail={setAuthEmail} authPassword={authPassword} setAuthPassword={setAuthPassword} authName={authName} setAuthName={setAuthName} authError={authError} setAuthError={setAuthError} setUser={setUser} setAuthLoading={setAuthLoading} />
        </div>
      </div>
    );
  }

  // ── Main app (logged in) ──
  return (
    <div className="w-app" style={phoneStyle}>
      <style>{CSS_STRING}</style>
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
                      <span style={{ fontSize: 10, color: T.t3 }}>{"\u2192"}</span>
                      <span style={{ fontSize: 12, color: T.ad, fontWeight: 500 }}>{p}</span>
                    </React.Fragment>
                  ))}
                  <span style={{ fontSize: 10, color: T.t3 }}>{"\u2192"}</span>
                  <span style={{ fontSize: 12, color: T.t1, fontWeight: 500 }}>{startLoc}</span>
                </div>
                {isEV && <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, padding: "6px 10px", background: T.amberL, borderRadius: 8 }}>
                  <span style={{ fontSize: 14 }}>{"\u26A1"}</span>
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
                    <span style={{ fontSize: 16 }}>{stop.type === "ev_charge" ? "\u26A1" : "\u2615"}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: T.t1 }}>{stop.label}</p>
                      <p style={{ fontSize: 10, color: T.t3 }}>{stop.desc} · {stop.time}</p>
                    </div>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `.5px solid ${stop.enabled ? T.a : T.border}`, background: stop.enabled ? T.a : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {stop.enabled && <span style={{ color: "#fff", fontSize: 12, lineHeight: 1 }}>{"\u2713"}</span>}
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
              <button onClick={() => { setShowActivationModal(false); }} style={{ ...css.btn, ...css.btnSm, flex: 1, justifyContent: "center" }}>Cancel</button>
              <button onClick={confirmActivation} style={{ ...css.btn, ...css.btnP, flex: 2, justifyContent: "center", padding: "12px 16px" }}>Generate itinerary</button>
            </div>
          </div>
        </div>
        );
      })()}
      {/* Trip Reel Overlay */}
      {reelPlaying && uploadedPhotos.length > 0 && (() => {
        const photo = uploadedPhotos[reelIndex] || uploadedPhotos[0];
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
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 48, color: "rgba(255,255,255,0.8)", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{"\u23F8\uFE0F"}</div>
              )}
              {/* Bottom overlay gradient */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(transparent, rgba(0,0,0,0.7))", pointerEvents: "none" }} />
              {/* Day badge + caption */}
              <div style={{ position: "absolute", bottom: 60, left: 16, right: 16, zIndex: 2 }}>
                <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 12, background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 12, fontWeight: 500, marginBottom: 8 }}>{"\uD83D\uDCCD"} {photo.day || "Untagged"}</span>
                {photo.caption && <p style={{ color: "#fff", fontSize: 15, fontWeight: 500, marginBottom: 4, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{photo.caption}</p>}
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{photo.name}</p>
              </div>
              {/* Stats */}
              <div style={{ position: "absolute", bottom: 24, left: 16, zIndex: 2 }}>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>{"\u2764\uFE0F"} {likedCount} photo{likedCount !== 1 ? "s" : ""} liked</span>
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
            <div style={{ fontSize: 40, marginBottom: 12 }}>{"\uD83C\uDF0D"}</div>
            <h2 style={{ fontFamily: T.fontD, fontSize: 22, fontWeight: 400, marginBottom: 8 }}>Welcome to Trip With Me</h2>
            <p style={{ fontSize: 13, color: T.t2, marginBottom: 20, lineHeight: 1.5 }}>Your AI travel concierge. Plan trips, invite friends, and create memories together.</p>
            <button onClick={() => { setShowWelcome(false); localStorage.setItem('twm_welcomed', 'true'); navigate("create"); setWizStep(0); resetWizard(); }}
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
          return text.substring(0, chars) + (chars < text.length ? "\u2502" : "");
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
                <div style={{ fontSize: 48, marginBottom: 16, ...popIn(2) }}>{"\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66"}</div>
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
                    {[{e:"\uD83D\uDC66",n:"Max, 12"},{e:"\uD83D\uDC67",n:"Ella, 8"}].map((k, i) => (
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
                    <p style={{ fontSize: 14, fontWeight: 500, marginTop: 2, fontFamily: T.font, color: t < 3 ? T.t3 : T.t }}>{t < 3 ? "\u2502" : typeText("Easter Lake District", 3, 1)}</p>
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
                      <span style={{ fontSize: 16 }}>{"\uD83D\uDD0D"}</span>
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
                  {show(28) && <div style={{ textAlign: "center", marginTop: 4, ...popIn(28) }}><span style={{ fontSize: 10, color: T.ad }}>{"\u2713"} 2 stays added</span></div>}
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
                  <ChatBubble delay={2} text={<span>{"\uD83D\uDD0B"} <b>Travel day!</b> Manchester {"\u2192"} Windermere<br/><br/>What time would you like to leave?</span>} />
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
                      <span>{"\uD83D\uDDFA\uFE0F"} <b>Route ready!</b><br/>Manchester {"\u2192"} M6 {"\u2192"} A591<br/>{"\u26A1"} EV stop: Lancaster Services<br/>{"\uD83D\uDCCD"} Arrive ~{demoInteracted.time === "8:00 AM" ? "9:30 AM" : demoInteracted.time === "10:00 AM" ? "11:30 AM" : "10:30 AM"}</span>
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
                  <ChatBubble delay={2} text={<span>Good morning! Day 2 in <b>Ambleside</b> · 12{"\u00B0"}C {"\u2601\uFE0F"}</span>} />
                  {show(14) && (
                    <div style={{ background: T.amberL, borderRadius: 8, padding: "6px 10px", fontSize: 11, ...slideUp(14) }}>
                      {"\uD83C\uDFE8"} Your base: <b>Windermere Boutique Hotel</b>
                    </div>
                  )}
                  {show(20) && (
                    <div style={{ display: "flex", gap: 6, ...slideUp(20) }}>
                      <div style={{ flex: 1, background: T.blueL, borderRadius: 8, padding: 8, ...slideUp(20) }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: T.blue, marginBottom: 4 }}>Adults</p>
                        {["\uD83E\uDD7E Loughrigg Fell", "\uD83D\uDC86 Low Wood Spa"].map((a, i) => show(24 + i * 4) && <p key={i} style={{ fontSize: 10, marginBottom: 2, ...slideUp(24 + i * 4) }}>{a}</p>)}
                      </div>
                      <div style={{ flex: 1, background: T.pinkL, borderRadius: 8, padding: 8, ...slideUp(22) }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: T.pink, marginBottom: 4 }}>Kids</p>
                        {["\uD83C\uDFA2 Brockhole Park", "\uD83E\uDD5A Easter egg trail"].map((a, i) => show(26 + i * 4) && <p key={i} style={{ fontSize: 10, marginBottom: 2, ...slideUp(26 + i * 4) }}>{a}</p>)}
                      </div>
                    </div>
                  )}
                  {show(36) && (
                    <div style={{ fontSize: 11, color: T.ad, textAlign: "center", padding: 6, background: T.al, borderRadius: 8, ...popIn(36) }}>
                      {"\uD83C\uDF7D\uFE0F"} Everyone meets at <b>Fellinis</b> for lunch — 12:30 PM
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
                  <ChatBubble delay={2} text={<span>{"\uD83C\uDFE0"} <b>Time to head home!</b> Keswick {"\u2192"} Manchester<br/><br/>When do you want to set off?</span>} />
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
                      <span>{"\uD83D\uDDFA\uFE0F"} <b>Route planned!</b><br/>Keswick {"\u2192"} A66 {"\u2192"} M6<br/>{"\u2615"} Stop: Rheged Centre<br/>{"\uD83D\uDCCD"} Home by ~{demoInteracted.depart === "10:00 AM" ? "1:30 PM" : "5:00 PM"}</span>
                    } />
                  )}
                </div>
              </div>
            );

            // ─── Slide 6: Interactive poll ───
            case 6: {
              const pollVote = demoInteracted.poll;
              const opts = [
                { text: "The Drunken Duck", desc: "steaks \u00B7 kids free", base: 2 },
                { text: "The Unicorn", desc: "pub grills \u00B7 playground", base: 1 },
                { text: "Lake Road Kitchen", desc: "Nordic \u00B7 upscale", base: 1 },
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
                    <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, ...slideUp(3) }}>{"\uD83D\uDDF3\uFE0F"} Where should we eat dinner?</p>
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
                              <span style={{ fontSize: 12, fontWeight: voted ? 600 : 400 }}>{voted ? "\u2713 " : ""}{o.text}</span>
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
              const demoPhotos = [
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
                      {demoPhotos.map((p, i) => (
                        <div key={i} style={{ aspectRatio: "1", borderRadius: 8, background: show(4 + i * 3) ? p.color : T.s2,
                          display: "flex", alignItems: "flex-end", padding: 4, transition: "background .5s ease",
                          ...(show(4 + i * 3) ? bounceIn(4 + i * 3) : { opacity: .2 }) }}>
                          {show(4 + i * 3) && <span style={{ fontSize: 8, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,.5)" }}>{p.label}</span>}
                        </div>
                      ))}
                    </div>
                    {show(30) && (
                      <div style={{ textAlign: "center", marginTop: 10, ...popIn(30) }}>
                        <span style={{ fontSize: 11, color: T.ad }}>{"\uD83D\uDCF8"} {Math.min(8, Math.max(0, Math.floor((t - 4) / 3)))} photos added</span>
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
                      {["\uD83C\uDFB5 Music", "\uD83C\uDF99\uFE0F Narration", "\uD83D\uDCC5 Dates"].map((s, i) => (
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
                <div style={{ fontSize: 56, marginBottom: 16, ...popIn(2) }}>{"\uD83C\uDF0D"}</div>
                <h2 style={{ fontFamily: T.fontD, fontSize: 26, color: "#fff", marginBottom: 8, ...slideUp(5) }}>Your adventure awaits</h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.5)", lineHeight: 1.6, marginBottom: 24, ...slideUp(8) }}>
                  Trip With Me connects maps, weather, bookings, EV chargers, and AI — so you can focus on making memories.
                </p>
                {show(14) && (
                  <button onClick={e => { e.stopPropagation(); setShowDemo(false); navigate("create"); setWizStep(0); resetWizard(); }}
                    style={{ ...css.btn, ...css.btnP, width: "100%", padding: "14px 16px", justifyContent: "center", fontSize: 15, fontWeight: 500, marginBottom: 10, ...slideUp(14) }}>
                    Create my first trip
                  </button>
                )}
                {show(18) && (
                  <p onClick={e => { e.stopPropagation(); setShowDemo(false); }}
                    style={{ fontSize: 12, color: "rgba(255,255,255,.4)", cursor: "pointer", marginTop: 4, ...slideUp(18) }}>
                    or explore the demo trip {"\u2192"}
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
          "Day 1 \u2014 the AI plans the whole drive",
          "Activity days \u2014 split plans for everyone",
          "Last day \u2014 route home with pit stops",
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
                  {demoPaused ? "\u25B6 Play" : "\u275A\u275A Pause"}
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
          {toast.type === "success" ? "\u2713 " : "\u26A0 "}{toast.message}
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
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginBottom: 10 }}>Uploaded {photo.uploadDate || "\u2014"}</p>
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
