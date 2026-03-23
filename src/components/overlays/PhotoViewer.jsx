import React from "react";
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';
import { useTrip } from '../../contexts/TripContext';
import { useMemories } from '../../contexts/MemoriesContext';

export function PhotoViewer() {
  const { selectedCreatedTrip, createdTrips } = useTrip();
  const {
    uploadedPhotos, setUploadedPhotos,
    viewingPhoto, setViewingPhoto,
    updatePhotoInSupabase,
    deletePhotoFromSupabase,
  } = useMemories();

  if (!viewingPhoto) return null;

  const photo = viewingPhoto;
  const tp = selectedCreatedTrip || createdTrips[0];
  const dc = tp?.start && tp?.end ? Math.max(1, Math.ceil((new Date(tp.end) - new Date(tp.start)) / 86400000) + 1) : 5;

  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", flexDirection: "column", overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px" }}>
        <button onClick={() => setViewingPhoto(null)} style={{ background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", lineHeight: 1 }}>&times;</button>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px 16px", gap: 12 }}>
        <img src={photo.url} alt={photo.name} style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: T.rs }} />
        <div style={{ width: "100%", maxWidth: 400 }}>
          <p style={{ color: "#fff", fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{photo.name}</p>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginBottom: 10 }}>Uploaded {photo.uploadDate || "\u2014"}</p>
          <input
            type="text"
            value={photo.caption || ""}
            placeholder="Add a caption..."
            onChange={(e) => {
              const val = e.target.value;
              setUploadedPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, caption: val } : p));
              setViewingPhoto(prev => ({ ...prev, caption: val }));
            }}
            onBlur={() => { updatePhotoInSupabase(photo.id, { caption: photo.caption || '' }); }}
            style={{ width: "100%", padding: "8px 12px", borderRadius: T.rs, border: `.5px solid rgba(255,255,255,0.2)`, background: "rgba(255,255,255,0.1)", color: "#fff", fontFamily: T.font, fontSize: 13, outline: "none", marginBottom: 10 }}
          />
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, display: "block", marginBottom: 4 }}>Assign to day</label>
            <select
              value={photo.day || "Untagged"}
              onChange={(e) => {
                const val = e.target.value;
                setUploadedPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, day: val } : p));
                setViewingPhoto(prev => ({ ...prev, day: val }));
                updatePhotoInSupabase(photo.id, { day_tag: val });
              }}
              style={{ width: "100%", padding: "8px 12px", borderRadius: T.rs, border: `.5px solid rgba(255,255,255,0.2)`, background: "rgba(255,255,255,0.15)", color: "#fff", fontFamily: T.font, fontSize: 13, outline: "none" }}
            >
              <option value="Untagged" style={{ color: "#000" }}>Untagged</option>
              {Array.from({ length: Math.min(dc, 30) }, (_, i) => (
                <option key={i} value={`Day ${i + 1}`} style={{ color: "#000" }}>Day {i + 1}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={() => {
                setUploadedPhotos(prev => prev.map(p => p.id === photo.id ? { ...p, liked: !p.liked } : p));
                setViewingPhoto(prev => ({ ...prev, liked: !prev.liked }));
                updatePhotoInSupabase(photo.id, { liked: !photo.liked });
              }}
              style={{ ...css.btn, background: photo.liked ? T.redL : "rgba(255,255,255,0.1)", color: photo.liked ? T.red : "#fff", borderColor: photo.liked ? T.red : "rgba(255,255,255,0.2)" }}
            >
              {photo.liked ? "\u2764\uFE0F Liked" : "\uD83E\uDD0D Like"}
            </button>
            <button
              onClick={() => {
                deletePhotoFromSupabase(photo);
                setUploadedPhotos(prev => prev.filter(p => p.id !== photo.id));
                setViewingPhoto(null);
              }}
              style={{ ...css.btn, background: "rgba(217,62,62,0.15)", color: T.red, borderColor: T.red }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
