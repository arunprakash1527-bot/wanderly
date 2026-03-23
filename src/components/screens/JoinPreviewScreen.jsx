import React from 'react';
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';
import { Avatar } from '../common/Avatar';
import { Tag } from '../common/Tag';

export function JoinPreviewScreen({ selectedCreatedTrip, createdTrips, setCreatedTrips, setSelectedCreatedTrip, navigate, joinedSlot, setJoinedSlot, joinTripAsTraveller, user, showToast }) {
  const trip = createdTrips.find(t => t.id === selectedCreatedTrip?.id) || selectedCreatedTrip;
  if (!trip) return <div style={{ padding: 40, textAlign: "center" }}>Trip not found. <button onClick={() => navigate("home")} style={css.btn}>Go home</button></div>;
  const adultColors = [T.a, T.coral, T.blue, T.amber, T.purple, T.pink];
  const getInit = (n) => { if (!n) return "?"; const p = n.trim().split(/\s+/); return p.length > 1 ? (p[0][0] + p[1][0]).toUpperCase() : n.slice(0, 2).toUpperCase(); };
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => { setJoinedSlot(null); navigate("createdTrip"); }}>Back</button>
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

        <div style={css.sectionTitle}>Join as:</div>
        {trip.travellers.adults.filter(a => !a.isLead).map((a, i) => {
          const realIdx = i + 1;
          const slotName = a.name || `Adult ${realIdx + 1}`;
          const isJoined = joinedSlot === realIdx;
          return (
            <div key={realIdx} style={{ ...css.card, display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar bg={adultColors[realIdx % adultColors.length]} label={getInit(slotName)} size={32} />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 500 }}>{slotName}</p>
                <p style={{ fontSize: 11, color: T.t3 }}>Unclaimed slot</p>
              </div>
              {isJoined ? (
                <Tag bg={T.al} color={T.ad}>Joined ✓</Tag>
              ) : (
                <button onClick={async () => {
                  setJoinedSlot(realIdx);
                  if (a.dbId && user && user.id !== 'demo') {
                    const ok = await joinTripAsTraveller(trip.dbId || trip.id, a.dbId, user.user_metadata?.full_name || user.email || slotName);
                    if (!ok) showToast("Failed to sync join — try again", "error");
                  }
                }} style={{ ...css.btn, ...css.btnP, ...css.btnSm, fontSize: 11 }}>Join</button>
              )}
            </div>
          );
        })}
        {trip.travellers.adults.filter(a => !a.isLead).length === 0 && (
          <p style={{ fontSize: 13, color: T.t3, textAlign: "center", padding: 16 }}>No unclaimed adult slots available.</p>
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
              navigate("createdTrip");
            }} style={{ ...css.btn, ...css.btnP, width: "100%", marginTop: 12, padding: "10px 16px", justifyContent: "center", fontSize: 13, fontWeight: 500, gap: 6 }}>
              📋 View full itinerary
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
