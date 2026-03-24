import React from 'react';
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';
import { TRIP, DAYS, TIMELINE } from '../../constants/tripData';
import { Tag, GroupTag } from '../common/Tag';
import { Avatar } from '../common/Avatar';
import { TabBar } from '../common/TabBar';
import { TripMap } from '../map/TripMap';
import { useNavigation } from '../../contexts/NavigationContext';
import { useTrip } from '../../contexts/TripContext';

const TimelineItem = ({ item, index, expanded, onToggle, bookingState, onBook, onSkip, onCostUpdate }) => {
  const forMap = { all: "Everyone", adults: "Adults", kids: "Max & Ella", older: "Max (12)", younger: "Ella (8)" };
  return (
    <div style={{ position: "relative", marginBottom: 12, cursor: "pointer" }} onClick={onToggle}>
      <div style={{ position: "absolute", left: -18, top: 6, width: 8, height: 8, borderRadius: "50%", background: index < 3 ? T.a : T.s2, border: `2px solid ${index < 3 ? T.al : T.border}` }} />
      <div style={{ fontSize: 11, color: T.t3 }}>{item.time}</div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{item.title}</div>
      <div style={{ fontSize: 12, color: T.t2 }}>{item.desc}</div>
      {item.for && item.for !== "all" && <div style={{ marginTop: 3 }}><GroupTag type={item.for}>{forMap[item.for]}</GroupTag></div>}

      {/* Booking status tracking */}
      {item.needsBooking && !bookingState && (
        <div style={{ padding: 10, background: T.amberL, border: `.5px solid ${T.amber}`, borderRadius: T.rs, marginTop: 6 }}
          onClick={e => e.stopPropagation()}>
          <p style={{ fontSize: 12, color: T.amber, marginBottom: 8 }}><strong>Action needed:</strong> {item.price}</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button style={{ ...css.btn, ...css.btnSm, fontSize: 11, color: T.blue }} onClick={() => window.open(`https://www.google.com/search?q=book+${encodeURIComponent(item.title)}`, "_blank")}>Book externally ↗</button>
            <button style={{ ...css.btn, ...css.btnSm, ...css.btnP, fontSize: 11 }} onClick={onBook}>Mark as booked</button>
            <button style={{ ...css.btn, ...css.btnSm, fontSize: 11 }} onClick={onSkip}>Skip</button>
          </div>
        </div>
      )}
      {item.needsBooking && bookingState?.status === "booked" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: T.al, borderRadius: T.rs, marginTop: 6 }} onClick={e => e.stopPropagation()}>
          <span style={{ fontSize: 12, color: T.ad, fontWeight: 500 }}>✓ Booked — marked by you</span>
          <input placeholder="£ Cost" value={bookingState.cost || ""} onChange={e => onCostUpdate(e.target.value)}
            style={{ width: 80, padding: "4px 8px", border: `.5px solid ${T.border}`, borderRadius: 6, fontFamily: T.font, fontSize: 11, background: T.s, outline: "none" }} />
        </div>
      )}
      {item.needsBooking && bookingState?.status === "skipped" && (
        <div style={{ padding: "6px 10px", background: T.s2, borderRadius: T.rs, marginTop: 6, fontSize: 12, color: T.t3 }}>
          Skipped
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div style={{ ...css.card, marginTop: 8, animation: "none" }} onClick={e => e.stopPropagation()}>
          <p style={{ fontSize: 14, fontWeight: 500 }}>{item.title}</p>
          <p style={{ fontSize: 12, color: T.t2, marginTop: 2 }}>{item.desc}</p>
          {item.rating && <p style={{ fontSize: 12, color: T.amber, marginTop: 4 }}>{"★".repeat(Math.floor(item.rating))} {item.rating}</p>}
          {item.price && <p style={{ fontSize: 12, color: T.t2, marginTop: 2 }}>Price: {item.price}</p>}
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            <button style={{ ...css.btn, ...css.btnSm, ...css.btnP }} onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(item.title)}+Lake+District`, "_blank")}>Navigate</button>
            <button style={{ ...css.btn, ...css.btnSm }} onClick={() => alert(`Calling ${item.title}...`)}>Call</button>
            <button style={{ ...css.btn, ...css.btnSm }} onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(item.title)}+reviews`, "_blank")}>Reviews</button>
            <button style={{ ...css.btn, ...css.btnSm }} onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(item.title)}+menu`, "_blank")}>Menu</button>
            <button style={{ ...css.btn, ...css.btnSm, color: T.red }} onClick={() => alert(`${item.title} removed from itinerary.`)}>Remove</button>
          </div>
        </div>
      )}
    </div>
  );
};

export function TripScreen() {
  const { navigate } = useNavigation();
  const { selectedDay, setSelectedDay, expandedItem, setExpandedItem, bookingStates, setBookingStates } = useTrip();
  const day = DAYS[selectedDay - 1];
  const items = TIMELINE[selectedDay] || [];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Hero */}
      <div style={{ padding: "20px 20px 16px", background: `linear-gradient(135deg, ${T.a} 0%, ${T.ad} 100%)`, color: "#fff", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <h1 style={{ fontFamily: T.fontD, fontSize: 22, fontWeight: 400, marginBottom: 2 }}>{TRIP.name}</h1>
            <p style={{ fontSize: 13, opacity: 0.8 }}>{TRIP.start} - {TRIP.end} {TRIP.year}</p>
          </div>
          <button style={{ ...css.btn, ...css.btnSm, background: "rgba(255,255,255,.18)", borderColor: "rgba(255,255,255,.3)", color: "#fff", fontSize: 12, fontWeight: 500 }} onClick={() => navigate("home")}>← Back</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {[["Day", `${day.day} of 5`], ["Location", day.location], ["Weather", `${day.weather.temp}°C ${day.weather.icon}`]].map(([l, v]) => (
            <div key={l} style={{ flex: 1, background: "rgba(255,255,255,.12)", borderRadius: T.rs, padding: "7px 10px" }}>
              <div style={{ fontSize: 9, opacity: 0.65, textTransform: "uppercase", letterSpacing: .5 }}>{l}</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 20px 20px" }}>
        {/* Day Picker */}
        <div style={{ display: "flex", gap: 6, padding: "8px 0", overflowX: "auto" }}>
          {DAYS.map(d => (
            <button key={d.day} onClick={() => { setSelectedDay(d.day); setExpandedItem(null); }}
              style={{ ...css.chip, ...(selectedDay === d.day ? { background: T.a, color: "#fff", borderColor: T.ad } : { background: T.s, borderColor: T.border, color: T.t2 }), minWidth: 56, textAlign: "center", padding: "8px 12px", flexShrink: 0 }}>
              <div style={{ fontWeight: 500, fontSize: 12 }}>Day {d.day}</div>
              <div style={{ fontSize: 10, opacity: 0.7 }}>{d.date}</div>
            </button>
          ))}
        </div>

        {/* Map */}
        <div style={{ marginBottom: 12 }}>
          <TripMap
            places={[TRIP.startLocation, ...TRIP.places]}
            height={160}
          />
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={css.sectionTitle}>Timeline</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("vote")}>Polls</button>
            <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("share")}>Share</button>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ position: "relative", paddingLeft: 20 }}>
          <div style={{ position: "absolute", left: 5, top: 8, bottom: 8, width: 1.5, background: T.border }} />
          {items.map((item, i) => (
            <TimelineItem key={`${selectedDay}-${i}`} item={item} index={i} expanded={expandedItem === i}
              onToggle={() => setExpandedItem(expandedItem === i ? null : i)}
              bookingState={bookingStates[`${selectedDay}-${i}`]}
              onBook={() => setBookingStates(prev => ({ ...prev, [`${selectedDay}-${i}`]: { status: "booked", cost: "" } }))}
              onSkip={() => setBookingStates(prev => ({ ...prev, [`${selectedDay}-${i}`]: { status: "skipped" } }))}
              onCostUpdate={(cost) => setBookingStates(prev => ({ ...prev, [`${selectedDay}-${i}`]: { ...prev[`${selectedDay}-${i}`], cost } }))} />
          ))}
        </div>

        {/* Stay card */}
        {TRIP.stays.map((s, i) => (
          selectedDay <= 2 && i === 0 || selectedDay > 2 && i === 1 ? (
            <div key={i} style={{ ...css.card, background: T.purpleL, borderColor: T.purple, marginTop: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "start" }}>
                <span style={{ fontSize: 16 }}>🏠</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500, color: T.purple }}>Tonight's stay</p>
                  <p style={{ fontSize: 12, color: T.t2 }}>{s.name} · {s.tags.join(" · ")}</p>
                </div>
              </div>
            </div>
          ) : null
        ))}

        {/* Alert */}
        {selectedDay === 2 && (
          <div style={{ ...css.card, background: T.amberL, borderColor: T.amber, marginTop: 6 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "start" }}>
              <span style={{ fontSize: 14 }}>⚠️</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: T.amber }}>A591 partial closure</p>
                <p style={{ fontSize: 12, color: T.t2 }}>Diversion via A592 adds 8 min. Route auto-updated.</p>
              </div>
            </div>
          </div>
        )}
      </div>
      <TabBar active="trip" onNav={navigate} />
    </div>
  );
}
