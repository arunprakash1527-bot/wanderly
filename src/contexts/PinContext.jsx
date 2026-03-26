import React, { createContext, useContext, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthContext";
import { useNavigation } from "./NavigationContext";
import { useTrip } from "./TripContext";

const PinContext = createContext(null);

export function PinProvider({ children }) {
  const { user } = useAuth();
  const { showToast } = useNavigation();
  const { selectedCreatedTrip } = useTrip();

  const [pins, setPins] = useState([]);
  const [pinsLoading, setPinsLoading] = useState(false);
  const [showAddPin, setShowAddPin] = useState(false);

  // Load pins for current trip
  const loadPins = useCallback(async () => {
    const tripDbId = selectedCreatedTrip?.dbId;
    if (!tripDbId) return;
    setPinsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .eq('trip_id', tripDbId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPins(data || []);
    } catch (e) {
      console.error('Error loading pins:', e);
    }
    setPinsLoading(false);
  }, [selectedCreatedTrip?.dbId]);

  // Add a new pin
  const addPin = async ({ type, title, content, url, imageUrl }) => {
    const tripDbId = selectedCreatedTrip?.dbId;
    if (!tripDbId || !user) return;
    const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || "Someone";
    try {
      const { data, error } = await supabase
        .from('pins')
        .insert({
          trip_id: tripDbId,
          user_id: user.id,
          type,
          title: title || (type === 'note' ? content?.substring(0, 50) : 'Untitled'),
          content,
          url,
          image_url: imageUrl,
          added_by_name: userName,
          reactions: {},
        })
        .select()
        .single();
      if (error) throw error;
      setPins(prev => [data, ...prev]);
      showToast("Pin added!");
      setShowAddPin(false);
    } catch (e) {
      showToast("Failed to add pin", "error");
    }
  };

  // Toggle reaction on a pin
  const toggleReaction = async (pinId, emoji) => {
    if (!user) return;
    const pin = pins.find(p => p.id === pinId);
    if (!pin) return;
    const reactions = { ...(pin.reactions || {}) };
    if (reactions[user.id] === emoji) {
      delete reactions[user.id]; // toggle off
    } else {
      reactions[user.id] = emoji;
    }
    try {
      const { error } = await supabase
        .from('pins')
        .update({ reactions })
        .eq('id', pinId);
      if (error) throw error;
      setPins(prev => prev.map(p => p.id === pinId ? { ...p, reactions } : p));
    } catch (e) {
      showToast("Failed to update reaction", "error");
    }
  };

  // Delete a pin
  const deletePin = async (pinId) => {
    try {
      const { error } = await supabase
        .from('pins')
        .delete()
        .eq('id', pinId);
      if (error) throw error;
      setPins(prev => prev.filter(p => p.id !== pinId));
      showToast("Pin removed");
    } catch (e) {
      showToast("Failed to remove pin", "error");
    }
  };

  const value = {
    pins, setPins, pinsLoading, showAddPin, setShowAddPin,
    loadPins, addPin, toggleReaction, deletePin,
  };

  return <PinContext.Provider value={value}>{children}</PinContext.Provider>;
}

export function usePins() {
  const context = useContext(PinContext);
  if (!context) throw new Error('usePins must be used within PinProvider');
  return context;
}
