import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { supabase } from "../supabaseClient";

const MemoriesContext = createContext(null);

export function MemoriesProvider({ children }) {
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
