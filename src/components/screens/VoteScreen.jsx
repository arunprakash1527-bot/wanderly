import React from 'react';
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';
import { Tag } from '../common/Tag';
import { Avatar } from '../common/Avatar';
import { TabBar } from '../common/TabBar';

export function VoteScreen({
  pollData, setPollData,
  showPollCreator, setShowPollCreator,
  newPollQuestion, setNewPollQuestion,
  newPollOptions, setNewPollOptions,
  createNewPoll,
  navigate, showToast,
  selectedCreatedTrip, createdTrips,
  addTimelineItem, selectedDay,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("trip")}>Back</button>
        <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Group polls</h2>
        <button style={{ ...css.btn, ...css.btnSm, ...css.btnP }} onClick={() => setShowPollCreator(true)}>+ New</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
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
              <button onClick={createNewPoll} style={{ ...css.btn, ...css.btnSm, ...css.btnP, flex: 1, justifyContent: "center", fontSize: 11 }}>Create poll</button>
              <button onClick={() => { setShowPollCreator(false); setNewPollQuestion(""); setNewPollOptions(["", ""]); }}
                style={{ ...css.btn, ...css.btnSm, flex: 0, justifyContent: "center", fontSize: 11, color: T.t3 }}>Cancel</button>
            </div>
          </div>
        )}
        {pollData.map(poll => (
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
                setPollData(prev => prev.map(p => p.id === poll.id ? { ...p, options: p.options.map((o, j) => j === i ? { ...o, voted: !o.voted, pct: Math.min(100, o.pct + (o.voted ? -10 : 10)), voters: o.voted ? o.voters.filter(v => v !== "You") : [...(o.voters||[]), "You"] } : o) } : p));
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
                  <button onClick={(e) => { e.stopPropagation(); setPollData(prev => prev.map(p => p.id === poll.id ? { ...p, status: "closed" } : p)); showToast("Poll closed"); }}
                    style={{ ...css.btn, ...css.btnSm, fontSize: 10, padding: "3px 8px", color: T.red, borderColor: T.red }}>Close poll</button>
                )}
                {poll.status === "closed" && (() => {
                  const winner = [...poll.options].sort((a, b) => (b.voters?.length || 0) - (a.voters?.length || 0))[0];
                  const topCount = winner?.voters?.length || 0;
                  const isTie = poll.options.filter(o => (o.voters?.length || 0) === topCount).length > 1;
                  return topCount > 0 && !isTie ? (
                    <button onClick={(e) => { e.stopPropagation(); addTimelineItem(selectedCreatedTrip?.id || createdTrips[0]?.id); showToast(`Added "${winner.text}" to itinerary`); }}
                      style={{ ...css.btn, ...css.btnSm, ...css.btnP, fontSize: 10, padding: "3px 8px" }}>+ Add winner to itinerary</button>
                  ) : topCount > 0 && isTie ? (
                    <Tag bg={T.amberL} color={T.amber}>Tie — revote needed</Tag>
                  ) : null;
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>
      <TabBar active="trip" onNav={navigate} />
    </div>
  );
}
