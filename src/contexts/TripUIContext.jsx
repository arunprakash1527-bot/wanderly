import React, { createContext, useContext, useState } from "react";

const TripUIContext = createContext(null);

export function TripUIProvider({ children }) {
  const [selectedDay, setSelectedDay] = useState(1);
  const [tripDetailTab, setTripDetailTab] = useState("itinerary");
  const [expandedItem, setExpandedItem] = useState(null);
  const [editingTimelineIdx, setEditingTimelineIdx] = useState(null);
  const [expandedSections, setExpandedSections] = useState({});
  const [bookingStates, setBookingStates] = useState({});
  const [showMap, setShowMap] = useState(true);
  const [tripDirections, setTripDirections] = useState(null);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [activationPrefs, setActivationPrefs] = useState({ startTime: "08:00", dayOnePace: "balanced", notes: "", stopovers: [] });
  const [pendingActivationTripId, setPendingActivationTripId] = useState(null);

  const value = {
    selectedDay, setSelectedDay,
    tripDetailTab, setTripDetailTab,
    expandedItem, setExpandedItem,
    editingTimelineIdx, setEditingTimelineIdx,
    expandedSections, setExpandedSections,
    bookingStates, setBookingStates,
    showMap, setShowMap,
    tripDirections, setTripDirections,
    showActivationModal, setShowActivationModal,
    activationPrefs, setActivationPrefs,
    pendingActivationTripId, setPendingActivationTripId,
  };

  return (
    <TripUIContext.Provider value={value}>
      {children}
    </TripUIContext.Provider>
  );
}

export function useTripUI() {
  const context = useContext(TripUIContext);
  if (!context) {
    throw new Error("useTripUI must be used within a TripUIProvider");
  }
  return context;
}
