import React from 'react';
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';
import { Avatar } from '../common/Avatar';
import { Tag } from '../common/Tag';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useTrip } from '../../contexts/TripContext';

export function JoinPreviewScreen() {
  const { user } = useAuth();
  const { navigate, showToast } = useNavigation();
  const { selectedCreatedTrip, createdTrips, setCreatedTrips, setSelectedCreatedTrip, joinedSlot, setJoinedSlot, joinTripAsTraveller, joinTab, setJoinTab, tripDetailTab, setTripDetailTab } = useTrip();
  const trip = createdTrips.find(t => t.id === selectedCreatedTrip?.id) || selectedCreatedTrip;
  if (!trip) return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "center", alignItems: "center", padding: 40, textAlign: "center" }}>
      <p style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>Trip not found</p>
      <p style={{ fontSize: 13, color: T.t2, marginBottom: 16 }}>This invite link may be invalid or expired.</p>
      <button onClick={() => navigate("home")} style={{ ...css.btn, ...css.btnP }}>Go home</button>
    </div>
  );

  const adultColors = [T.a, T.coral, T.blue, T.amber, T.purple, T.pink];
  const getInit = (n) => { if (!n) return "?"; const p = n.trim().split(/\s+/); return p.length > 1 ? (p[0][0] + p[1][0]).toUpperCase() : n.slice(0, 2).toUpperCase(); };

  // Check if the current user was already auto-claimed by the RPC
  const allAdults = trip.travellers?.adults || [];
  const autoClaimedSlot = user && user.id !== 'demo'
    ? allAdults.find(a => a.claimedUserId === user.id)
    : null;

  // Unclaimed adult slots (excluding lead)
  const unclaimedAdults = allAdults.filter(a => !a.isLead && !a.isClaimed);

  // Unclaimed child slots (older kids, younger kids)
  const unclaimedOlderKids = (trip.travellers?.olderKids || []).filter(k => !k.isClaimed);
  const unclaimedYoungerKids = (trip.travellers?.youngerKids || []).filter(k => !k.isClaimed);
  const unclaimedChildren = [...unclaimedOlderKids, ...unclaimedYoungerKids];

  const alreadyJoined = !!autoClaimedSlot || joinedSlot !== null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => { setJoinedSlot(null); if (joinTab) { setTripDetailTab(joinTab); setJoinTab(null); } navigate("createdTrip"); }}>Back</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Join preview</h2>
        <div />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <div style={{ textAlign: "center", marginBottom: 20, padding: "20px 16px", background: T.al, borderRadius: T.r }}>
          <p style={{ fontSize: 11, color: T.t3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>You have been invited to</p>
          <h3 style={{ fontFamily: T.fontD, fontSize: 22, fontWeight: 400, marginBottom: 4 }}>{trip.name}</h3>
          <p style={{ fontSize: 13, color: T.t2 }}>{trip.start && trip.end ? `${trip.start} – ${trip.end} ${trip.year}` : "Dates TBC"}</p>
          {trip.places.length > 0 && (
            <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
              {trip.places.map(p => <Tag key={p} bg={T.purpleL} color={T.purple}>{p}</Tag>)}
            </div>
          )}
        </div>

        {/* If user was auto-claimed by the RPC, show that instead of claim UI */}
        {autoClaimedSlot && joinedSlot === null ? (
          <div style={{ ...css.card, background: T.al, borderColor: T.a, textAlign: "center", padding: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: T.ad }}>You've joined as {autoClaimedSlot.name}</p>
            <p style={{ fontSize: 12, color: T.t2, marginTop: 4 }}>You were automatically assigned to this slot.</p>
            <button onClick={() => {
              if (!createdTrips.find(t => t.id === trip.id)) {
                setCreatedTrips(prev => [...prev, { ...trip, isJoined: true }]);
              }
              setSelectedCreatedTrip(trip);
              if (joinTab) { setTripDetailTab(joinTab); setJoinTab(null); }
              navigate("createdTrip");
            }} style={{ ...css.btn, ...css.btnP, width: "100%", marginTop: 12, padding: "10px 16px", justifyContent: "center", fontSize: 13, fontWeight: 500, gap: 6 }}>
              {joinTab === "polls" ? "🗳️ View polls" : "📋 View full itinerary"}
            </button>
          </div>
        ) : (
          <>
            {/* Adult slots */}
            {unclaimedAdults.length > 0 && <div style={css.sectionTitle}>Join as:</div>}
            {unclaimedAdults.map((a, i) => {
              const slotName = a.name || `Adult ${i + 2}`;
              const isJoined = joinedSlot === a.dbId;
              return (
                <div key={a.dbId || i} style={{ ...css.card, display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar bg={adultColors[(i + 1) % adultColors.length]} label={getInit(slotName)} size={32} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>{slotName}</p>
                    <p style={{ fontSize: 11, color: T.t3 }}>Unclaimed slot</p>
                  </div>
                  {isJoined ? (
                    <Tag bg={T.al} color={T.ad}>Joined ✓</Tag>
                  ) : joinedSlot !== null ? null : (
                    <button onClick={async () => {
                      setJoinedSlot(a.dbId);
                      if (a.dbId && user && user.id !== 'demo') {
                        const ok = await joinTripAsTraveller(trip.dbId || trip.id, a.dbId, user.user_metadata?.full_name || user.email || slotName);
                        if (!ok) { setJoinedSlot(null); showToast("Failed to sync join — try again", "error"); }
                      }
                    }} style={{ ...css.btn, ...css.btnP, ...css.btnSm, fontSize: 11 }}>Join</button>
                  )}
                </div>
              );
            })}

            {/* Child slots */}
            {unclaimedChildren.length > 0 && (
              <>
                <div style={{ ...css.sectionTitle, marginTop: 12 }}>Join as child:</div>
                {unclaimedChildren.map((k, i) => {
                  const slotName = k.name || `Child ${i + 1}`;
                  const isJoined = joinedSlot === k.dbId;
                  return (
                    <div key={k.dbId || `child-${i}`} style={{ ...css.card, display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar bg={T.amber} label={getInit(slotName)} size={32} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 500 }}>{slotName}</p>
                        <p style={{ fontSize: 11, color: T.t3 }}>Unclaimed slot · {k.age ? `Age ${k.age}` : 'Child'}</p>
                      </div>
                      {isJoined ? (
                        <Tag bg={T.al} color={T.ad}>Joined ✓</Tag>
                      ) : joinedSlot !== null ? null : (
                        <button onClick={async () => {
                          setJoinedSlot(k.dbId);
                          if (k.dbId && user && user.id !== 'demo') {
                            const ok = await joinTripAsTraveller(trip.dbId || trip.id, k.dbId, user.user_metadata?.full_name || user.email || slotName);
                            if (!ok) { setJoinedSlot(null); showToast("Failed to sync join — try again", "error"); }
                          }
                        }} style={{ ...css.btn, ...css.btnP, ...css.btnSm, fontSize: 11 }}>Join</button>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {unclaimedAdults.length === 0 && unclaimedChildren.length === 0 && (
              <p style={{ fontSize: 13, color: T.t3, textAlign: "center", padding: 16 }}>No unclaimed slots available.</p>
            )}
          </>
        )}

        {joinedSlot !== null && (
          <div style={{ ...css.card, background: T.al, borderColor: T.a, textAlign: "center", marginTop: 12, padding: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: T.ad }}>Welcome to {trip.name}!</p>
            <p style={{ fontSize: 12, color: T.t2, marginTop: 4 }}>You have joined this trip successfully. The organiser will be notified.</p>
            <button onClick={() => {
              if (!createdTrips.find(t => t.id === trip.id)) {
                setCreatedTrips(prev => [...prev, { ...trip, isJoined: true }]);
              }
              setSelectedCreatedTrip(trip);
              setJoinedSlot(null);
              if (joinTab) { setTripDetailTab(joinTab); setJoinTab(null); }
              navigate("createdTrip");
            }} style={{ ...css.btn, ...css.btnP, width: "100%", marginTop: 12, padding: "10px 16px", justifyContent: "center", fontSize: 13, fontWeight: 500, gap: 6 }}>
              {joinTab === "polls" ? "🗳️ View polls" : "📋 View full itinerary"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
