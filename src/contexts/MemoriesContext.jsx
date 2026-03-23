import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthContext";
import { useTrip } from "./TripContext";

const MemoriesContext = createContext(null);

export function MemoriesProvider({ children }) {
  const { user } = useAuth();
  const { selectedCreatedTrip, createdTrips, logActivity } = useTrip();
  // ─── Memories State ───
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [videoState, setVideoState] = useState("idle");
  const [videoSettings, setVideoSettings] = useState(new Set(["Music overlay", "AI narration", "Date stamps"]));
  const [reelPlaying, setReelPlaying] = useState(false);
  const [reelIndex, setReelIndex] = useState(0);
  const [reelPaused, setReelPaused] = useState(false);
  const [reelStyle, setReelStyle] = useState("cinematic"); // "cinematic" | "slideshow" | "energetic"

  // ─── Refs ───
  const photoInputRef = useRef(null);
  const reelTimerRef = useRef(null);

  // ─── Supabase Functions ───
  const loadTripPhotos = async (tripId) => {
    if (!tripId) return;
    try {
      const { data } = await supabase.from('trip_photos').select('*').eq('trip_id', tripId).order('sort_order', { ascending: true });
      if (data && data.length > 0) {
        setUploadedPhotos(data.map(p => ({
          id: p.id, url: p.file_url, name: p.file_name, day: p.day_tag || "Untagged",
          liked: p.liked || false, caption: p.caption || "", sortOrder: p.sort_order || 0,
          filePath: p.file_path, uploadDate: new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        })));
      }
    } catch (e) { /* table may not exist */ }
  };

  const updatePhotoInSupabase = async (photoId, updates) => {
    try { await supabase.from('trip_photos').update(updates).eq('id', photoId); } catch (e) { /* ignore */ }
  };

  const deletePhotoFromSupabase = async (photo) => {
    try {
      if (photo.filePath) await supabase.storage.from('trip-photos').remove([photo.filePath]);
      await supabase.from('trip_photos').delete().eq('id', photo.id);
    } catch (e) { /* ignore */ }
  };

  // ─── Trip Reel auto-advance timer ───
  useEffect(() => {
    if (reelPlaying && !reelPaused && uploadedPhotos.length > 0) {
      const baseDuration = reelStyle === "energetic" ? 2000 : reelStyle === "slideshow" ? 3000 : 4000;
      const reelDuration = videoSettings.has("Slow-mo") ? baseDuration * 1.5 : baseDuration;
      reelTimerRef.current = setInterval(() => {
        setReelIndex(prev => {
          if (prev >= uploadedPhotos.length - 1) {
            setReelPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, reelDuration);
    }
    return () => { if (reelTimerRef.current) clearInterval(reelTimerRef.current); };
  }, [reelPlaying, reelPaused, uploadedPhotos.length, reelStyle, videoSettings]);

  // ─── Photo Upload ───
  const handlePhotoUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    const trip = selectedCreatedTrip || createdTrips[0];
    const tripId = trip?.dbId || trip?.id || 'default';
    for (const f of files) {
      const uniqueId = Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      const filePath = `${tripId}/${uniqueId}-${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      let url = URL.createObjectURL(f);
      let storedInSupabase = false;
      try {
        const { data, error } = await supabase.storage.from('trip-photos').upload(filePath, f, { cacheControl: '3600', upsert: false });
        if (!error && data) {
          const { data: urlData } = supabase.storage.from('trip-photos').getPublicUrl(filePath);
          if (urlData?.publicUrl) { url = urlData.publicUrl; storedInSupabase = true; }
        }
      } catch (err) { /* Storage not set up */ }
      const newPhoto = { id: uniqueId, url, name: f.name, day: "Untagged", liked: false, caption: "", uploadDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), sortOrder: uploadedPhotos.length, filePath: storedInSupabase ? filePath : null };
      setUploadedPhotos(prev => [...prev, newPhoto]);
      if (storedInSupabase && user) {
        try { await supabase.from('trip_photos').insert({ trip_id: tripId, user_id: user.id, file_url: url, file_path: filePath, file_name: f.name, day_tag: 'Untagged', liked: false, caption: '', sort_order: uploadedPhotos.length }); } catch (err) {}
      }
    }
    if (files.length > 0 && trip?.id) logActivity(trip.id, "\uD83D\uDCF8", `Added ${files.length} photo${files.length > 1 ? "s" : ""} to memories`, "photo");
    e.target.value = "";
  }, [selectedCreatedTrip, createdTrips, uploadedPhotos, setUploadedPhotos, user, logActivity]);

  const value = {
    uploadedPhotos, setUploadedPhotos,
    viewingPhoto, setViewingPhoto,
    videoState, setVideoState,
    videoSettings, setVideoSettings,
    reelPlaying, setReelPlaying,
    reelIndex, setReelIndex,
    reelPaused, setReelPaused,
    reelStyle, setReelStyle,
    photoInputRef,
    reelTimerRef,
    loadTripPhotos,
    updatePhotoInSupabase,
    deletePhotoFromSupabase,
    handlePhotoUpload,
  };

  return (
    <MemoriesContext.Provider value={value}>
      {children}
    </MemoriesContext.Provider>
  );
}

export function useMemories() {
  const ctx = useContext(MemoriesContext);
  if (!ctx) throw new Error("useMemories must be used within a MemoriesProvider");
  return ctx;
}
