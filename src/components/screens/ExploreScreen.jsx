import React from 'react';
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';
import { DAYS } from '../../constants/tripData';
import { getLocationActivities } from '../../utils/locationHelpers';
import { Tag } from '../common/Tag';
import { TabBar } from '../common/TabBar';

export function ExploreScreen({ selectedCreatedTrip, createdTrips, selectedDay, navigate }) {
  // Dynamic location: use created trip's places first, then demo data
  const trip = selectedCreatedTrip || createdTrips[0];
  const currentLoc = trip?.places?.[0] || DAYS[selectedDay - 1]?.location || "Ambleside";
  const locActs = getLocationActivities(currentLoc);
  // Build dynamic explore items from location data
  const exploreItems = [];
  if (locActs) {
    if (locActs.dinner?.[0]) exploreItems.push({ title: locActs.dinner[0].split(" at ").pop() || locActs.dinner[0], sub: `Restaurant · ${currentLoc}`, tags: [["Dining", T.coralL, T.coral]], icon: "🍽️", bg: T.coralL });
    if (locActs.kids?.[0]) exploreItems.push({ title: locActs.kids[0], sub: `Family activity · ${currentLoc}`, tags: [["Kids", T.pinkL, T.pink]], icon: "🎢", bg: T.pinkL });
    exploreItems.push({ title: `EV Chargers near ${currentLoc}`, sub: "Open Charge Map", tags: [["EV charging", T.al, T.ad]], icon: "⚡", bg: T.al });
    if (locActs.morning?.[0]) exploreItems.push({ title: locActs.morning[0], sub: `Activity · ${currentLoc}`, tags: [["Explore", T.blueL, T.blue]], icon: "🥾", bg: T.blueL });
    if (locActs.afternoon?.[0]) exploreItems.push({ title: locActs.afternoon[0], sub: `Afternoon · ${currentLoc}`, tags: [["Sightseeing", T.purpleL, T.purple]], icon: "📸", bg: T.purpleL });
  } else {
    exploreItems.push(
      { title: `Restaurants in ${currentLoc}`, sub: "Find dining nearby", tags: [["Dining", T.coralL, T.coral]], icon: "🍽️", bg: T.coralL },
      { title: `Things to do in ${currentLoc}`, sub: "Activities & attractions", tags: [["Explore", T.blueL, T.blue]], icon: "🎯", bg: T.blueL },
      { title: `EV Chargers near ${currentLoc}`, sub: "Open Charge Map", tags: [["EV charging", T.al, T.ad]], icon: "⚡", bg: T.al },
      { title: `Walks near ${currentLoc}`, sub: "Trails & hikes", tags: [["Outdoors", T.purpleL, T.purple]], icon: "🥾", bg: T.purpleL },
    );
  }
  const mapIcons = [["🍽️", "28%", "30%", T.coral], ["🎢", "68%", "22%", T.pink], ["⚡", "75%", "58%", T.a], ["🥾", "18%", "60%", T.purple]];
  if (exploreItems.length > 4) mapIcons.push(["📸", "45%", "70%", T.blue]);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate(selectedCreatedTrip ? "tripDetail" : "trip")}>Back</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Explore nearby</h2>
        <span style={{ fontSize: 12, color: T.t3 }}>{currentLoc}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <div style={{ height: 160, background: T.s2, borderRadius: T.r, marginBottom: 12, position: "relative", overflow: "hidden", border: `.5px solid ${T.border}` }}>
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(170deg, #D4E8D0, #E2EDDA 40%, #C9DBC3)" }}>
            <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", ...css.avatar(T.blue, 28), border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,.15)" }}>You</div>
            {mapIcons.map(([icon, l, t, c], i) => (
              <div key={i} style={{ position: "absolute", left: l, top: t, ...css.avatar(c, 22), fontSize: 11, border: "2px solid #fff" }}>{icon}</div>
            ))}
          </div>
        </div>
        {exploreItems.map((p, i) => (
          <div key={i} onClick={() => window.open(`https://www.google.com/maps/search/${encodeURIComponent(p.title)}+${encodeURIComponent(currentLoc)}`, "_blank")} style={{ ...css.card, display: "flex", gap: 12, cursor: "pointer" }}>
            <div style={{ width: 52, height: 52, borderRadius: T.rs, background: p.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{p.icon}</div>
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 500 }}>{p.title}</h4>
              <p style={{ fontSize: 12, color: T.t2, marginBottom: 4 }}>{p.sub}</p>
              <div>{p.tags.map(([t, bg, c]) => <Tag key={t} bg={bg} color={c}>{t}</Tag>)}</div>
            </div>
          </div>
        ))}
      </div>
      <TabBar active="explore" onNav={navigate} />
    </div>
  );
}
