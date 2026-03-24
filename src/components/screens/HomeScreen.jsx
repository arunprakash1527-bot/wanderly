import React from 'react';
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';
import { TRIP } from '../../constants/tripData';
import { Avatar } from '../common/Avatar';
import { Tag } from '../common/Tag';
import { TabBar } from '../common/TabBar';
import { useNavigation } from '../../contexts/NavigationContext';
import { useTrip } from '../../contexts/TripContext';
import { useWizard } from '../../contexts/WizardContext';

export function HomeScreen() {
  const { navigate, setShowDemo, setDemoSlide } = useNavigation();
  const { createdTrips, viewCreatedTrip, makeTripLive, deleteCreatedTrip, showNotifications, setShowNotifications, totalUnread, lastSeenActivity, allRecentActivity, getUnreadCount, markTripSeen, setSelectedDay, setTripDetailTab } = useTrip();
  const { resetWizard } = useWizard();
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      <div style={{ padding: "16px 20px 12px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <h1 style={{ fontFamily: T.fontD, fontSize: 24, fontWeight: 400, color: T.t1 }}>Trip With Me</h1>
          <span style={{ fontSize: 11, color: T.t3, fontWeight: 500, letterSpacing: 0.5 }}>TRAVEL CONCIERGE</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button style={{ position: "relative", background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: 4 }} onClick={() => setShowNotifications(prev => !prev)} title="Notifications" aria-label={`Notifications${totalUnread > 0 ? `, ${totalUnread} unread` : ""}`}>
            🔔
            {totalUnread > 0 && <span style={{ position: "absolute", top: 0, right: 0, minWidth: 16, height: 16, borderRadius: 8, background: T.coral, color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: `2px solid ${T.s}` }}>{totalUnread > 99 ? "99+" : totalUnread}</span>}
          </button>
          <button style={{ ...css.btn, ...css.btnP, ...css.btnSm }} onClick={() => { resetWizard(); navigate("create"); }}>+ New trip</button>
        </div>
      </div>

      {/* ── Notification panel ── */}
      {showNotifications && <>
        <div onClick={() => setShowNotifications(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} />
        <div style={{ position: "absolute", top: 56, right: 12, width: "calc(100% - 24px)", maxWidth: 360, maxHeight: 420, background: T.s, borderRadius: T.r, boxShadow: "0 8px 32px rgba(0,0,0,.15), 0 2px 8px rgba(0,0,0,.08)", border: `.5px solid ${T.border}`, zIndex: 100, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `.5px solid ${T.border}` }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: T.t1 }}>Notifications</p>
            {totalUnread > 0 && <button onClick={() => { createdTrips.forEach(t => markTripSeen(t.id)); }} style={{ background: "none", border: "none", fontSize: 11, color: T.a, cursor: "pointer", fontFamily: T.font, fontWeight: 600 }}>Mark all read</button>}
          </div>
          <div style={{ flex: 1, overflowY: "auto", maxHeight: 360 }}>
            {allRecentActivity.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 16px", color: T.t3 }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>🔕</div>
                <p style={{ fontSize: 13, color: T.t2 }}>No notifications yet</p>
                <p style={{ fontSize: 11 }}>Activity from your trips will appear here.</p>
              </div>
            )}
            {allRecentActivity.map((a) => {
              const isUnread = new Date(a.time).getTime() > (lastSeenActivity[a.tripId] || 0);
              const diff = Date.now() - new Date(a.time).getTime();
              const ago = diff < 60000 ? "Just now" : diff < 3600000 ? `${Math.floor(diff / 60000)}m` : diff < 86400000 ? `${Math.floor(diff / 3600000)}h` : `${Math.floor(diff / 86400000)}d`;
              return (
                <div key={a.id} onClick={() => { const trip = createdTrips.find(t => t.id === a.tripId); if (trip) { viewCreatedTrip(trip); setTripDetailTab("activity"); markTripSeen(a.tripId); } setShowNotifications(false); }}
                  style={{ display: "flex", gap: 10, padding: "10px 16px", cursor: "pointer", background: isUnread ? T.al + "40" : "transparent", borderBottom: `.5px solid ${T.border}`, transition: "background .15s" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: a.type === "milestone" ? T.al : a.type === "poll" ? T.purpleL : a.type === "expense" ? T.amberL : a.type === "photo" ? T.coralL : T.blueL, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>{a.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: T.a, marginBottom: 2 }}>{a.tripName}</p>
                    <p style={{ fontSize: 12, color: T.t1, lineHeight: 1.4 }}>{a.text}</p>
                    <p style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>{a.by} · {ago}</p>
                  </div>
                  {isUnread && <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.a, flexShrink: 0, marginTop: 12 }} />}
                </div>
              );
            })}
          </div>
        </div>
      </>}
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {createdTrips.length === 0 ? (
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <p style={{ fontFamily: T.fontD, fontSize: 20, fontWeight: 400, color: T.t1, marginBottom: 4 }}>No trips yet</p>
            <p style={{ fontSize: 13, color: T.t3 }}>Start planning your first adventure</p>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: T.t3, marginBottom: 16 }}>Your upcoming adventures</p>
        )}

        {createdTrips.map(trip => (
          <div key={trip.id} style={{ ...css.card, position: "relative", overflow: "hidden", marginBottom: 12, cursor: "pointer" }} onClick={() => viewCreatedTrip(trip)}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: `radial-gradient(circle at 100% 0%, ${trip.status === "completed" ? T.purpleL : trip.status === "live" ? T.al : T.blueL} 0%, transparent 70%)`, pointerEvents: "none" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <h3 style={{ fontFamily: T.fontD, fontSize: 18, fontWeight: 400 }}>{trip.name}</h3>
                <p style={{ fontSize: 12, color: T.t2 }}>{trip.start && trip.end ? `${trip.start} – ${trip.end} ${trip.year}` : "Dates TBC"}</p>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {getUnreadCount(trip.id) > 0 && <Tag bg={T.coralL} color={T.coral}>{getUnreadCount(trip.id)} new</Tag>}
                {trip.status === "completed" ? <Tag bg={T.purpleL} color={T.purple}>Completed</Tag> : trip.status === "live" ? <Tag bg={T.al} color={T.ad}>Live</Tag> : <Tag bg={T.blueL} color={T.blue}>New</Tag>}
              </div>
            </div>
            {trip.brief && <p style={{ fontSize: 12, color: T.t3, marginBottom: 8 }}>{trip.brief}</p>}
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
              {trip.places.map(p => <Tag key={p} bg={T.purpleL} color={T.purple}>{p}</Tag>)}
              {trip.travel.map(t => <Tag key={t} bg={T.blueL} color={T.blue}>{t}</Tag>)}
              {(trip.travellers?.adults?.length || 0) > 0 && <Tag bg={T.coralL} color={T.coral}>{trip.travellers.adults.length} adult{trip.travellers.adults.length > 1 ? "s" : ""}</Tag>}
              {(trip.travellers?.olderKids?.length || 0) > 0 && <Tag bg={T.pinkL} color={T.pink}>{trip.travellers.olderKids.length} older kid{trip.travellers.olderKids.length > 1 ? "s" : ""}</Tag>}
              {(trip.travellers?.youngerKids?.length || 0) > 0 && <Tag bg={T.pinkL} color={T.pink}>{trip.travellers.youngerKids.length} younger kid{trip.travellers.youngerKids.length > 1 ? "s" : ""}</Tag>}
              {trip.stayNames.length > 0 && <Tag bg={T.amberL} color={T.amber}>{trip.stayNames.length} stay{trip.stayNames.length > 1 ? "s" : ""}</Tag>}
              {trip.budget && <Tag bg={T.greenL} color={T.green}>{trip.budget}</Tag>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {trip.status !== "live" && trip.status !== "completed" && <button onClick={e => { e.stopPropagation(); makeTripLive(trip.id); }} style={{ ...css.btn, ...css.btnP, ...css.btnSm, fontSize: 12 }}>Activate trip</button>}
              <button onClick={e => { e.stopPropagation(); if (window.confirm(`Remove "${trip.name}"? This cannot be undone.`)) deleteCreatedTrip(trip.id); }}
                style={{ ...css.btn, ...css.btnSm, fontSize: 12, color: T.red, borderColor: "rgba(200,50,50,.2)" }}>Remove</button>
            </div>
          </div>
        ))}

        <div style={{ ...css.card, cursor: "pointer", position: "relative", overflow: "hidden" }} onClick={() => { setSelectedDay(1); navigate("trip"); }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: `radial-gradient(circle at 100% 0%, ${T.al} 0%, transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div>
              <h3 style={{ fontFamily: T.fontD, fontSize: 18, fontWeight: 400 }}>{TRIP.name}</h3>
              <p style={{ fontSize: 12, color: T.t2 }}>{TRIP.start} - {TRIP.end} {TRIP.year}</p>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Tag bg={T.amberL} color={T.amber}>Demo</Tag>
              <Tag bg={T.al} color={T.ad}>Live</Tag>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontSize: 11, color: T.t3, fontStyle: "italic" }}>Sample trip — tap to explore</p>
            <button onClick={e => { e.stopPropagation(); setShowDemo(true); setDemoSlide(0); }} style={{ ...css.btn, ...css.btnSm, fontSize: 10, padding: "4px 10px", gap: 4 }}>{localStorage.getItem('twm_demo_seen') ? "▶ Replay demo" : "▶ Watch demo"}</button>
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
            <Tag bg={T.blueL} color={T.blue}>EV road trip</Tag>
            <Tag bg={T.coralL} color={T.coral}>Mixed diet</Tag>
            <Tag bg={T.pinkL} color={T.pink}>2 kids</Tag>
            <Tag bg={T.purpleL} color={T.purple}>2 stays</Tag>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex" }}>
              {[["You", T.a], ["JM", T.coral], ["SP", T.blue], ["+1", T.amber]].map(([l, c], i) => (
                <Avatar key={i} bg={c} label={l} size={28} style={{ marginLeft: i ? -6 : 0, border: `2px solid ${T.s}` }} />
              ))}
            </div>
            <span style={{ fontSize: 12, color: T.t3 }}>4 adults · 2 children</span>
          </div>
        </div>
        <div style={{ ...css.card, ...(createdTrips.length === 0 ? { background: T.al, borderColor: T.a } : { border: `1.5px dashed ${T.border}`, background: "none", boxShadow: "none" }), textAlign: "center", padding: "36px 20px", cursor: "pointer" }} onClick={() => { resetWizard(); navigate("create"); }}>
          <div style={{ fontSize: 32, opacity: createdTrips.length === 0 ? 0.8 : 0.3, marginBottom: 8 }}>{createdTrips.length === 0 ? "✈️" : "+"}</div>
          <p style={{ fontSize: 14, fontWeight: createdTrips.length === 0 ? 600 : 500, color: createdTrips.length === 0 ? T.ad : T.t2 }}>Plan your next adventure</p>
          <p style={{ fontSize: 12, color: T.t3, marginTop: 4 }}>Create from scratch or use a template</p>
        </div>

        <div style={{ ...css.card, marginTop: 16, background: T.al, borderColor: T.a }}>
          <div style={{ display: "flex", gap: 10, alignItems: "start" }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: T.ad }}>Powered by intelligent routing</p>
              <p style={{ fontSize: 12, color: T.t2, marginTop: 2 }}>Trip With Me automatically connects to 18 travel services — maps, weather, bookings, EV chargers, and more — based on your trip needs.</p>
            </div>
          </div>
        </div>
      </div>
      <TabBar active="home" onNav={navigate} />
    </div>
  );
}
