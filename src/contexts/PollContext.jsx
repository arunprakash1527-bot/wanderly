import React, { createContext, useContext, useState } from "react";
import { POLLS } from "../constants/tripData";
import { useTripData } from "./TripDataContext";
import { useNavigation } from "./NavigationContext";

const PollContext = createContext(null);

export function PollProvider({ children }) {
  const { showToast } = useNavigation();
  const { selectedCreatedTrip, setCreatedTrips, logActivity } = useTripData();

  const [pollData, setPollData] = useState(POLLS);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [newPollOptions, setNewPollOptions] = useState(["", ""]);

  // ─── Create New Poll ───
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
      setCreatedTrips(prev => prev.map(t => t.id === tripId ? { ...t, polls: [newPoll, ...(t.polls || [])] } : t));
      logActivity(tripId, "🗳️", `Created poll: "${newPollQuestion.trim()}"`, "poll");
    } else {
      setPollData(prev => [newPoll, ...prev]);
    }
    setNewPollQuestion("");
    setNewPollOptions(["", ""]);
    setShowPollCreator(false);
    showToast("Poll created!");
  };

  const value = {
    pollData, setPollData,
    showPollCreator, setShowPollCreator,
    newPollQuestion, setNewPollQuestion,
    newPollOptions, setNewPollOptions,
    createNewPoll,
  };

  return (
    <PollContext.Provider value={value}>
      {children}
    </PollContext.Provider>
  );
}

export function usePoll() {
  const context = useContext(PollContext);
  if (!context) {
    throw new Error("usePoll must be used within a PollProvider");
  }
  return context;
}
