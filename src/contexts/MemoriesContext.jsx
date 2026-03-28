import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthContext";
import { useNavigation } from "./NavigationContext";
import { useTrip } from "./TripContext";

const MemoriesContext = createContext(null);

// NOTE: For full security, switch the 'trip-photos' bucket to PRIVATE in the
// Supabase dashboard. This code works with both public and private buckets
// during the transition period. Once private, only signed URLs will grant access.

const SIGNED_URL_EXPIRY = 86400;       // 24 hours in seconds
const SIGNED_URL_REFRESH_AGE = 72000000; // 20 hours in ms — refresh before expiry

/**
 * Generate a signed URL for a storage path.
 * Returns { signedUrl, signedAt } or null on failure.
 */
async function generateSignedUrl(storagePath) {
  if (!storagePath) return null;
  try {
    const { data, error } = await supabase.storage
      .from('trip-photos')
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);
    if (error || !data?.signedUrl) return null;
    return { signedUrl: data.signedUrl, signedAt: Date.now() };
  } catch {
    return null;
  }
}

/**
 * Check whether a signed URL is stale (older than 20 hours).
 */
function isSignedUrlStale(signedAt) {
  if (!signedAt) return true;
  return Date.now() - signedAt > SIGNED_URL_REFRESH_AGE;
}

export function MemoriesProvider({ children }) {
  const { user } = useAuth();
  const { showToast } = useNavigation();
  const { selectedCreatedTrip, createdTrips, logActivity } = useTrip();
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  // ─── Memories State ───
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [videoState, setVideoState] = useState("idle");
  const [videoSettings, setVideoSettings] = useState(new Set(["Music overlay", "AI narration", "Date stamps"]));
  const [reelPlaying, setReelPlaying] = useState(false);
  const [reelIndex, setReelIndex] = useState(0);
  const [reelPaused, setReelPaused] = useState(false);
  const [reelStyle, setReelStyle] = useState("cinematic"); // "cinematic" | "slideshow" | "energetic"
  const [reelTrack, setReelTrack] = useState("ambient"); // music track id
  const [reelPhotos, setReelPhotos] = useState([]); // curated photos for reel

  // ─── Trip Wrapped State ───
  const [wrappedPlaying, setWrappedPlaying] = useState(false);

  // ─── AI Memories State ───
  const [memoriesView, setMemoriesView] = useState("grid"); // "grid" | "timeline"
  const [autoOrderEnabled, setAutoOrderEnabled] = useState(false);

  // ─── Refs ───
  const photoInputRef = useRef(null);
  const reelTimerRef = useRef(null);
  const reelMusicRef = useRef(null); // { stop(), audioCtx }
  const uploadDayTagRef = useRef("Untagged");

  // ─── Supabase Functions ───
  const loadTripPhotos = async (tripId) => {
    if (!tripId) return;
    try {
      const { data } = await supabase.from('trip_photos').select('*').eq('trip_id', tripId).order('sort_order', { ascending: true });
      if (data && data.length > 0) {
        // Generate signed URLs for all photos in parallel
        const photosWithUrls = await Promise.all(data.map(async (p) => {
          const storagePath = p.file_path;
          let url = p.file_url; // fallback to stored URL (public bucket transition)
          let signedAt = null;

          if (storagePath) {
            const signed = await generateSignedUrl(storagePath);
            if (signed) {
              url = signed.signedUrl;
              signedAt = signed.signedAt;
            }
          }

          return {
            id: p.id, url, name: p.file_name, day: p.day_tag || "Untagged",
            liked: p.liked || false, caption: p.caption || "", sortOrder: p.sort_order || 0,
            filePath: storagePath, signedAt,
            uploadDate: new Date(p.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
          };
        }));
        setUploadedPhotos(photosWithUrls);
      }
    } catch (e) { /* table may not exist */ }
  };

  /**
   * Refresh signed URLs for any photos whose URLs are stale (older than 20h).
   * Call this periodically or before displaying photos.
   */
  const refreshStaleSignedUrls = useCallback(async () => {
    setUploadedPhotos(prev => {
      const hasStale = prev.some(p => p.filePath && isSignedUrlStale(p.signedAt));
      if (!hasStale) return prev; // no update needed, keep same reference
      // Kick off async refresh
      (async () => {
        const refreshed = await Promise.all(prev.map(async (p) => {
          if (!p.filePath || !isSignedUrlStale(p.signedAt)) return p;
          const signed = await generateSignedUrl(p.filePath);
          if (signed) return { ...p, url: signed.signedUrl, signedAt: signed.signedAt };
          return p; // keep existing URL if refresh fails
        }));
        setUploadedPhotos(refreshed);
      })();
      return prev; // return unchanged for now; async update will follow
    });
  }, []);

  // Auto-refresh stale signed URLs every 30 minutes
  useEffect(() => {
    const interval = setInterval(refreshStaleSignedUrls, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshStaleSignedUrls]);

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
    const photos = reelPhotos.length > 0 ? reelPhotos : uploadedPhotos;
    if (reelPlaying && !reelPaused && photos.length > 0) {
      const baseDuration = reelStyle === "energetic" ? 2000 : reelStyle === "slideshow" ? 3000 : 4000;
      const reelDuration = videoSettings.has("Slow-mo") ? baseDuration * 1.5 : baseDuration;
      reelTimerRef.current = setInterval(() => {
        setReelIndex(prev => {
          if (prev >= photos.length - 1) {
            setReelPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, reelDuration);
    }
    return () => { if (reelTimerRef.current) clearInterval(reelTimerRef.current); };
  }, [reelPlaying, reelPaused, uploadedPhotos.length, reelPhotos.length, reelStyle, videoSettings]); // eslint-disable-line

  // ─── Photo Upload ───
  const handlePhotoUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    const trip = selectedCreatedTrip || createdTrips[0];
    const tripId = trip?.dbId || trip?.id || 'default';
    for (const f of files) {
      if (f.size > MAX_FILE_SIZE) {
        showToast(`${f.name} is too large (max 10MB)`, "error");
        continue;
      }
      const uniqueId = Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      const filePath = `${tripId}/${uniqueId}-${f.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      let url = URL.createObjectURL(f);
      let storedInSupabase = false;
      let signedAt = null;
      try {
        const { data, error } = await supabase.storage.from('trip-photos').upload(filePath, f, { cacheControl: '3600', upsert: false });
        if (!error && data) {
          // Use signed URL instead of public URL for private bucket support
          const signed = await generateSignedUrl(filePath);
          if (signed) {
            url = signed.signedUrl;
            signedAt = signed.signedAt;
            storedInSupabase = true;
          } else {
            // Fallback to public URL during transition period
            const { data: urlData } = supabase.storage.from('trip-photos').getPublicUrl(filePath);
            if (urlData?.publicUrl) { url = urlData.publicUrl; storedInSupabase = true; }
          }
        }
      } catch (err) { /* Storage not set up */ }
      const dayTag = uploadDayTagRef.current || "Untagged";
      const newPhoto = { id: uniqueId, url, name: f.name, day: dayTag, liked: false, caption: "", uploadDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }), sortOrder: uploadedPhotos.length, filePath: storedInSupabase ? filePath : null, signedAt };
      setUploadedPhotos(prev => [...prev, newPhoto]);
      if (storedInSupabase && user) {
        // Store the storage path in the DB, NOT the signed/public URL (signed URLs expire)
        try { await supabase.from('trip_photos').insert({ trip_id: tripId, user_id: user.id, file_url: filePath, file_path: filePath, file_name: f.name, day_tag: dayTag, liked: false, caption: '', sort_order: uploadedPhotos.length }); } catch (err) {}
      }
    }
    if (files.length > 0 && trip?.id) logActivity(trip.id, "\uD83D\uDCF8", `Added ${files.length} photo${files.length > 1 ? "s" : ""} to memories`, "photo");
    uploadDayTagRef.current = "Untagged";
    e.target.value = "";
  }, [selectedCreatedTrip, createdTrips, uploadedPhotos, setUploadedPhotos, user, logActivity, showToast, MAX_FILE_SIZE]);

  const value = {
    uploadedPhotos, setUploadedPhotos,
    viewingPhoto, setViewingPhoto,
    videoState, setVideoState,
    videoSettings, setVideoSettings,
    reelPlaying, setReelPlaying,
    reelIndex, setReelIndex,
    reelPaused, setReelPaused,
    reelStyle, setReelStyle,
    reelTrack, setReelTrack,
    reelPhotos, setReelPhotos,
    wrappedPlaying, setWrappedPlaying,
    memoriesView, setMemoriesView,
    autoOrderEnabled, setAutoOrderEnabled,
    photoInputRef,
    reelTimerRef,
    reelMusicRef,
    uploadDayTagRef,
    loadTripPhotos,
    updatePhotoInSupabase,
    deletePhotoFromSupabase,
    handlePhotoUpload,
    refreshStaleSignedUrls,
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
