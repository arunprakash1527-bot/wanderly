import React, { useState, useEffect, useRef, useCallback } from 'react';
import { T } from '../../styles/tokens';
import { useMemories } from '../../contexts/MemoriesContext';
import { useTrip } from '../../contexts/TripContext';
import { useExpenses } from '../../contexts/ExpenseContext';
import { generateWrappedData } from '../../utils/wrappedDataGenerator';

// ─── Animated counter hook ───
function useAnimatedCounter(target, duration = 1500, delay = 300) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    if (target <= 0) { setValue(0); return; }
    const timeout = setTimeout(() => {
      const start = performance.now();
      const tick = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }, delay);
    return () => { clearTimeout(timeout); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration, delay]);
  return value;
}

// ─── Small animated number display ───
function AnimNum({ value, prefix = "", suffix = "", delay = 300, style = {} }) {
  const animated = useAnimatedCounter(value, 1200, delay);
  return <span style={style}>{prefix}{animated.toLocaleString()}{suffix}</span>;
}

// ─── Donut chart (SVG) ───
function DonutChart({ data, size = 140 }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="16" />
      {data.map((item, i) => {
        const dashLen = (item.percentage / 100) * circumference;
        const dashOffset = -offset;
        offset += dashLen;
        return (
          <circle key={i} cx="70" cy="70" r={radius} fill="none"
            stroke={item.color} strokeWidth="16" strokeLinecap="round"
            strokeDasharray={`${dashLen} ${circumference - dashLen}`}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 70 70)"
            style={{ opacity: 0, animation: `wrappedStroke .8s ease-out ${0.3 + i * 0.15}s forwards` }}
          />
        );
      })}
      <text x="70" y="66" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="700" fontFamily={T.font}>
        £{Math.round(data.reduce((s, d) => s + d.amount, 0))}
      </text>
      <text x="70" y="82" textAnchor="middle" fill="rgba(255,255,255,.7)" fontSize="10" fontFamily={T.font}>
        total
      </text>
    </svg>
  );
}

// ─── Card wrapper ───
function WrappedCard({ gradient, children, delay = 0 }) {
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "40px 28px",
      background: gradient, fontFamily: T.font,
      opacity: 0, animation: `wrappedCardIn .5s ease-out ${delay}s forwards`,
    }}>
      {children}
    </div>
  );
}

// ─── Main Wrapped Overlay ───
export function TripWrapped() {
  const { wrappedPlaying, setWrappedPlaying, uploadedPhotos } = useMemories();
  const { selectedCreatedTrip, createdTrips } = useTrip();
  const { expenses, getCategoryBreakdown, calculateSettlement } = useExpenses();

  const [card, setCard] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);
  const TOTAL_CARDS = 8;
  const CARD_DURATION = 6000;

  const trip = createdTrips.find(t => t.id === selectedCreatedTrip?.id) || selectedCreatedTrip;

  // Generate wrapped data
  const data = trip ? generateWrappedData(trip, expenses, uploadedPhotos, trip.polls || [], trip.timeline || {}) : null;

  // Auto-advance
  useEffect(() => {
    if (!wrappedPlaying || paused) return;
    timerRef.current = setTimeout(() => {
      setCard(prev => {
        if (prev >= TOTAL_CARDS - 1) { setWrappedPlaying(false); return 0; }
        return prev + 1;
      });
    }, CARD_DURATION);
    return () => clearTimeout(timerRef.current);
  }, [wrappedPlaying, card, paused, setWrappedPlaying]);

  const goNext = useCallback(() => {
    clearTimeout(timerRef.current);
    if (card >= TOTAL_CARDS - 1) { setWrappedPlaying(false); setCard(0); }
    else setCard(c => c + 1);
    setPaused(false);
  }, [card, setWrappedPlaying]);

  const goPrev = useCallback(() => {
    clearTimeout(timerRef.current);
    if (card > 0) setCard(c => c - 1);
    setPaused(false);
  }, [card]);

  if (!wrappedPlaying || !data) return null;

  // ─── Card content renderers ───
  const cards = [
    // 0: INTRO
    () => (
      <WrappedCard gradient={`linear-gradient(160deg, #0D6B4F 0%, ${T.ad} 40%, ${T.a} 100%)`}>
        <div style={{ opacity: 0, animation: "wrappedFadeUp .6s ease-out .2s forwards" }}>
          <p style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 2, color: "rgba(255,255,255,.6)", marginBottom: 8 }}>Your trip recap</p>
        </div>
        <h1 style={{ opacity: 0, animation: "wrappedFadeUp .6s ease-out .4s forwards", fontFamily: T.fontD, fontSize: 32, fontWeight: 400, color: "#fff", textAlign: "center", marginBottom: 8 }}>
          {data.tripName}
        </h1>
        <p style={{ opacity: 0, animation: "wrappedFadeUp .6s ease-out .6s forwards", fontSize: 14, color: "rgba(255,255,255,.8)", marginBottom: 24 }}>
          {data.dateRange} {data.year}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", opacity: 0, animation: "wrappedFadeUp .6s ease-out .8s forwards" }}>
          {data.places.map((p, i) => (
            <span key={i} style={{ padding: "6px 14px", borderRadius: 20, background: "rgba(255,255,255,.15)", color: "#fff", fontSize: 13, fontWeight: 500, backdropFilter: "blur(4px)" }}>
              📍 {p}
            </span>
          ))}
        </div>
        <p style={{ opacity: 0, animation: "wrappedFadeUp .6s ease-out 1.2s forwards", marginTop: 32, fontSize: 11, color: "rgba(255,255,255,.4)" }}>
          Tap to continue →
        </p>
      </WrappedCard>
    ),

    // 1: BY THE NUMBERS
    () => (
      <WrappedCard gradient={`linear-gradient(160deg, ${T.blue} 0%, ${T.purple} 100%)`}>
        <p style={{ opacity: 0, animation: "wrappedFadeUp .5s ease-out .1s forwards", fontSize: 12, textTransform: "uppercase", letterSpacing: 2, color: "rgba(255,255,255,.6)", marginBottom: 24 }}>By the numbers</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, width: "100%", maxWidth: 300 }}>
          {[
            { label: "Days", value: data.numDays, icon: "📅", delay: 300 },
            { label: "Places", value: data.placesVisited, icon: "📍", delay: 450 },
            { label: "Travellers", value: data.totalTravellers, icon: "👥", delay: 600 },
            { label: "Photos", value: data.photosCount, icon: "📸", delay: 750 },
            { label: "Activities", value: data.totalActivities, icon: "🎯", delay: 900 },
            { label: "Spent", value: Math.round(data.totalSpent), icon: "💰", delay: 1050 },
          ].map((stat, i) => (
            <div key={i} style={{
              padding: "16px 12px", borderRadius: 16, background: "rgba(255,255,255,.12)",
              textAlign: "center", backdropFilter: "blur(4px)",
              opacity: 0, animation: `wrappedPop .5s ease-out ${stat.delay}ms forwards`,
            }}>
              <div style={{ fontSize: 24, marginBottom: 4 }}>{stat.icon}</div>
              <AnimNum value={stat.value} prefix={stat.label === "Spent" ? "£" : ""} delay={stat.delay + 200}
                style={{ fontSize: 28, fontWeight: 700, color: "#fff", display: "block" }} />
              <p style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 4 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </WrappedCard>
    ),

    // 2: SPENDING BREAKDOWN
    () => (
      <WrappedCard gradient={`linear-gradient(160deg, ${T.coral} 0%, ${T.amber} 100%)`}>
        <p style={{ opacity: 0, animation: "wrappedFadeUp .5s ease-out .1s forwards", fontSize: 12, textTransform: "uppercase", letterSpacing: 2, color: "rgba(255,255,255,.6)", marginBottom: 20 }}>Where the money went</p>
        {data.categoryBreakdown.length > 0 ? (
          <>
            <DonutChart data={data.categoryBreakdown} />
            <div style={{ marginTop: 20, width: "100%", maxWidth: 280 }}>
              {data.categoryBreakdown.slice(0, 5).map((cat, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, opacity: 0, animation: `wrappedFadeUp .4s ease-out ${0.6 + i * 0.12}s forwards` }}>
                  <span style={{ fontSize: 18 }}>{cat.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 12, color: "#fff", fontWeight: 500 }}>{cat.label}</span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,.8)" }}>£{Math.round(cat.amount)}</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,.15)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 2, background: cat.color, width: "0%", animation: `wrappedBar .8s ease-out ${0.8 + i * 0.12}s forwards`, "--target": `${cat.percentage}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", opacity: 0, animation: "wrappedFadeUp .5s ease-out .3s forwards" }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>🆓</p>
            <p style={{ fontSize: 16, color: "#fff", fontWeight: 600 }}>No expenses tracked</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 4 }}>The best things in life are free!</p>
          </div>
        )}
      </WrappedCard>
    ),

    // 3: SUPERLATIVES
    () => (
      <WrappedCard gradient={`linear-gradient(160deg, ${T.purple} 0%, ${T.pink} 100%)`}>
        <p style={{ opacity: 0, animation: "wrappedFadeUp .5s ease-out .1s forwards", fontSize: 12, textTransform: "uppercase", letterSpacing: 2, color: "rgba(255,255,255,.6)", marginBottom: 24 }}>Trip superlatives</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 300 }}>
          {data.topSpender && (
            <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,.12)", textAlign: "center", opacity: 0, animation: "wrappedPop .5s ease-out .3s forwards" }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>💳 Top Spender</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>{data.topSpender[0]}</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.7)", marginTop: 4 }}>Paid £{Math.round(data.topSpender[1])} total</p>
            </div>
          )}
          {data.mostGenerous && data.mostGenerous[1] > 0 && (
            <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,.12)", textAlign: "center", opacity: 0, animation: "wrappedPop .5s ease-out .5s forwards" }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>🏆 Most Generous</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: "#fff" }}>{data.mostGenerous[0]}</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.7)", marginTop: 4 }}>Covered £{Math.round(data.mostGenerous[1])} more than their share</p>
            </div>
          )}
          {data.biggestExpense && (
            <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,.12)", textAlign: "center", opacity: 0, animation: "wrappedPop .5s ease-out .7s forwards" }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>🤑 Biggest Splurge</p>
              <p style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>{data.biggestExpense.description}</p>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,.7)", marginTop: 4 }}>£{data.biggestExpense.amount.toFixed(2)}</p>
            </div>
          )}
          {!data.topSpender && !data.biggestExpense && (
            <div style={{ textAlign: "center", opacity: 0, animation: "wrappedFadeUp .5s ease-out .3s forwards" }}>
              <p style={{ fontSize: 40, marginBottom: 8 }}>🤝</p>
              <p style={{ fontSize: 16, color: "#fff", fontWeight: 600 }}>Everyone shared equally!</p>
            </div>
          )}
        </div>
      </WrappedCard>
    ),

    // 4: BEST MOMENTS
    () => (
      <WrappedCard gradient={`linear-gradient(160deg, #0D6B4F 0%, #085041 100%)`}>
        <p style={{ opacity: 0, animation: "wrappedFadeUp .5s ease-out .1s forwards", fontSize: 12, textTransform: "uppercase", letterSpacing: 2, color: "rgba(255,255,255,.6)", marginBottom: 20 }}>Best moments</p>
        {data.bestMoments.length > 0 ? (
          <>
            <div style={{ display: "flex", gap: 8, width: "100%", maxWidth: 320, justifyContent: "center" }}>
              {data.bestMoments.map((photo, i) => (
                <div key={i} style={{
                  flex: i === 0 ? "1.4" : "1",
                  aspectRatio: i === 0 ? "3/4" : "3/4",
                  borderRadius: 12, overflow: "hidden",
                  opacity: 0, animation: `wrappedPop .5s ease-out ${0.3 + i * 0.2}s forwards`,
                  border: "2px solid rgba(255,255,255,.2)",
                }}>
                  <img src={photo.url} alt={photo.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 20, opacity: 0, animation: "wrappedFadeUp .5s ease-out 1s forwards" }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{data.photosCount}</p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>Photos</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{data.likedCount}</p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>Favourites</p>
              </div>
              {data.mostPhotographedDay && (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>{data.mostPhotographedDay[0]}</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,.5)" }}>{data.mostPhotographedDay[1]} photos</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", opacity: 0, animation: "wrappedFadeUp .5s ease-out .3s forwards" }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>📷</p>
            <p style={{ fontSize: 16, color: "#fff", fontWeight: 600 }}>No photos yet</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 4 }}>Upload memories to see your best moments</p>
          </div>
        )}
      </WrappedCard>
    ),

    // 5: POLLS / GROUP DECISIONS
    () => (
      <WrappedCard gradient={`linear-gradient(160deg, ${T.amber} 0%, #8B5E12 100%)`}>
        <p style={{ opacity: 0, animation: "wrappedFadeUp .5s ease-out .1s forwards", fontSize: 12, textTransform: "uppercase", letterSpacing: 2, color: "rgba(255,255,255,.6)", marginBottom: 24 }}>Group decisions</p>
        {data.pollCount > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 300, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 20, opacity: 0, animation: "wrappedPop .5s ease-out .3s forwards" }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 36, fontWeight: 700, color: "#fff" }}>{data.pollCount}</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>Polls created</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 36, fontWeight: 700, color: "#fff" }}>{data.totalVotes}</p>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>Total votes</p>
              </div>
            </div>
            {data.mostVotedPoll && (
              <div style={{ padding: 16, borderRadius: 16, background: "rgba(255,255,255,.12)", width: "100%", opacity: 0, animation: "wrappedFadeUp .5s ease-out .6s forwards" }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginBottom: 6 }}>🗳️ Most popular poll</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 8 }}>{data.mostVotedPoll.q}</p>
                {data.mostVotedPoll.options && data.mostVotedPoll.options.slice(0, 3).map((opt, i) => (
                  <div key={i} style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,.8)" }}>{opt.text}</span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,.6)" }}>{opt.pct}%</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,.15)", overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 2, background: "#fff", width: `${opt.pct}%`, transition: "width 1s ease-out" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center", opacity: 0, animation: "wrappedFadeUp .5s ease-out .3s forwards" }}>
            <p style={{ fontSize: 40, marginBottom: 8 }}>🤝</p>
            <p style={{ fontSize: 16, color: "#fff", fontWeight: 600 }}>No polls this trip</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 4 }}>Everyone was on the same page!</p>
          </div>
        )}
      </WrappedCard>
    ),

    // 6: JOURNEY MAP
    () => (
      <WrappedCard gradient={`linear-gradient(160deg, ${T.blue} 0%, #1A5C8A 50%, ${T.ad} 100%)`}>
        <p style={{ opacity: 0, animation: "wrappedFadeUp .5s ease-out .1s forwards", fontSize: 12, textTransform: "uppercase", letterSpacing: 2, color: "rgba(255,255,255,.6)", marginBottom: 24 }}>Your journey</p>
        <div style={{ position: "relative", width: "100%", maxWidth: 280 }}>
          {/* Vertical line */}
          <div style={{ position: "absolute", left: 16, top: 8, bottom: 8, width: 2, background: "rgba(255,255,255,.15)" }}>
            <div style={{ width: "100%", height: "0%", background: "rgba(255,255,255,.5)", animation: "wrappedLine 2s ease-out .3s forwards" }} />
          </div>
          {/* Stops */}
          {data.places.map((place, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 14, marginBottom: 20, paddingLeft: 0,
              opacity: 0, animation: `wrappedFadeUp .5s ease-out ${0.4 + i * 0.25}s forwards`,
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                background: i === 0 ? "rgba(255,255,255,.25)" : i === data.places.length - 1 ? T.a : "rgba(255,255,255,.12)",
                border: "2px solid rgba(255,255,255,.3)", fontSize: 14, zIndex: 1,
              }}>
                {i === 0 ? "🚀" : i === data.places.length - 1 ? "🏁" : "📍"}
              </div>
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>{place}</p>
                {data.stayNames[i] && <p style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>🏨 {data.stayNames[i]}</p>}
              </div>
            </div>
          ))}
          {/* Travel modes */}
          {data.travelModes.length > 0 && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, paddingLeft: 48, opacity: 0, animation: `wrappedFadeUp .5s ease-out ${0.4 + data.places.length * 0.25}s forwards` }}>
              {data.travelModes.map((mode, i) => (
                <span key={i} style={{ padding: "4px 10px", borderRadius: 12, background: "rgba(255,255,255,.12)", fontSize: 11, color: "rgba(255,255,255,.7)" }}>{mode}</span>
              ))}
            </div>
          )}
        </div>
      </WrappedCard>
    ),

    // 7: FINAL / SHARE CARD
    () => (
      <WrappedCard gradient={`linear-gradient(160deg, ${T.ad} 0%, #085041 40%, #063D2F 100%)`}>
        <div style={{ opacity: 0, animation: "wrappedPop .6s ease-out .2s forwards", marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,.12)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", fontSize: 32 }}>✨</div>
        </div>
        <h2 style={{ opacity: 0, animation: "wrappedFadeUp .6s ease-out .4s forwards", fontFamily: T.fontD, fontSize: 26, fontWeight: 400, color: "#fff", textAlign: "center", marginBottom: 8 }}>
          That's a wrap!
        </h2>
        <p style={{ opacity: 0, animation: "wrappedFadeUp .6s ease-out .6s forwards", fontSize: 13, color: "rgba(255,255,255,.6)", textAlign: "center", marginBottom: 28, maxWidth: 240 }}>
          {data.tripName} — {data.numDays} day{data.numDays > 1 ? "s" : ""}, {data.placesVisited} place{data.placesVisited !== 1 ? "s" : ""}, {data.photosCount} memories
        </p>
        {/* Mini recap card */}
        <div style={{
          opacity: 0, animation: "wrappedFadeUp .6s ease-out .8s forwards",
          background: "rgba(255,255,255,.08)", borderRadius: 20, padding: "24px 20px",
          width: "100%", maxWidth: 280, backdropFilter: "blur(4px)",
          border: "1px solid rgba(255,255,255,.1)",
        }}>
          <p style={{ fontFamily: T.fontD, fontSize: 18, color: "#fff", textAlign: "center", marginBottom: 4 }}>{data.tripName}</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,.5)", textAlign: "center", marginBottom: 16 }}>{data.dateRange} {data.year}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, textAlign: "center" }}>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{data.numDays}</p>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,.4)" }}>DAYS</p>
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{data.photosCount}</p>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,.4)" }}>PHOTOS</p>
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>£{Math.round(data.totalSpent)}</p>
              <p style={{ fontSize: 9, color: "rgba(255,255,255,.4)" }}>SPENT</p>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,.1)", marginTop: 14, paddingTop: 10, textAlign: "center" }}>
            <p style={{ fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: 1 }}>MADE WITH TRIP WITH ME</p>
          </div>
        </div>
        <button onClick={() => { setWrappedPlaying(false); setCard(0); }}
          style={{ opacity: 0, animation: "wrappedFadeUp .6s ease-out 1.2s forwards", marginTop: 24, padding: "10px 28px", borderRadius: 24, background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.2)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: T.font }}>
          Done
        </button>
      </WrappedCard>
    ),
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", fontFamily: T.font }}>
      {/* Progress bars */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", gap: 3, padding: "12px 8px 8px", zIndex: 10 }}>
        {Array.from({ length: TOTAL_CARDS }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, overflow: "hidden", background: "rgba(255,255,255,0.2)" }}>
            <div style={{
              height: "100%", borderRadius: 2, background: "#fff",
              width: i < card ? "100%" : i === card ? "0%" : "0%",
              ...(i === card && !paused ? { animation: `reelProgress ${CARD_DURATION / 1000}s linear forwards` } : {}),
              ...(i === card && paused ? { width: "50%" } : {}),
            }} />
          </div>
        ))}
      </div>

      {/* Close button */}
      <button onClick={() => { setWrappedPlaying(false); setCard(0); }}
        style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", zIndex: 11, lineHeight: 1, padding: 4 }}>
        &times;
      </button>

      {/* Card content */}
      <div key={card} style={{ position: "absolute", inset: 0 }}>
        {cards[card]()}
      </div>

      {/* Tap zones */}
      <div style={{ position: "absolute", inset: 0, display: "flex", zIndex: 5 }}>
        <div style={{ flex: 1, cursor: "pointer" }} onClick={goPrev} />
        <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setPaused(p => !p)} />
        <div style={{ flex: 2, cursor: "pointer" }} onClick={goNext} />
      </div>
    </div>
  );
}
