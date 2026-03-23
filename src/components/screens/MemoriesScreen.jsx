import React from 'react';
import { supabase } from '../../supabaseClient';
import { T } from '../../styles/tokens';
import { css } from '../../styles/shared';
import { Tag } from '../common/Tag';
import { TabBar } from '../common/TabBar';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useTrip } from '../../contexts/TripContext';
import { useMemories } from '../../contexts/MemoriesContext';

export function MemoriesScreen() {
  const { user } = useAuth();
  const { navigate } = useNavigation();
  const { selectedCreatedTrip, createdTrips, logActivity } = useTrip();
  const { uploadedPhotos, setUploadedPhotos, viewingPhoto, setViewingPhoto, videoState, setVideoState, videoSettings, setVideoSettings, reelPlaying, setReelPlaying, reelIndex, setReelIndex, reelPaused, setReelPaused, reelStyle, setReelStyle, photoInputRef, updatePhotoInSupabase, deletePhotoFromSupabase } = useMemories();
  const handlePhotoUpload = async (e) => {
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
          if (urlData?.publicUrl) {
            url = urlData.publicUrl;
            storedInSupabase = true;
          }
        }
      } catch (err) { /* Storage not set up — use local URL */ }

      const newPhoto = {
        id: uniqueId, url, name: f.name, day: "Untagged", liked: false, caption: "",
        uploadDate: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        sortOrder: uploadedPhotos.length, filePath: storedInSupabase ? filePath : null,
      };

      setUploadedPhotos(prev => [...prev, newPhoto]);

      // Save metadata to Supabase
      if (storedInSupabase && user) {
        try {
          await supabase.from('trip_photos').insert({
            trip_id: tripId, user_id: user.id, file_url: url, file_path: filePath,
            file_name: f.name, day_tag: 'Untagged', liked: false, caption: '', sort_order: uploadedPhotos.length,
          });
        } catch (err) { /* table may not exist yet */ }
      }
    }
    if (files.length > 0 && trip?.id) {
      logActivity(trip.id, "📸", `Added ${files.length} photo${files.length > 1 ? "s" : ""} to memories`, "photo");
    }
    e.target.value = "";
  };

  const totalPhotos = uploadedPhotos.length;
  const likedCount = uploadedPhotos.filter(p => p.liked).length;
  const daysWithPhotos = new Set(uploadedPhotos.filter(p => p.day !== "Untagged").map(p => p.day)).size;
  const untaggedPhotos = uploadedPhotos.filter(p => p.day === "Untagged");
  const tripForPhotos = selectedCreatedTrip || createdTrips[0];
  const photoDayCount = tripForPhotos?.start && tripForPhotos?.end
    ? Math.max(1, Math.ceil((new Date(tripForPhotos.end) - new Date(tripForPhotos.start)) / 86400000) + 1)
    : 5;
  const dayGroups = Array.from({ length: Math.min(photoDayCount, 30) }, (_, i) => `Day ${i + 1}`);
  const taggedByDay = {};
  dayGroups.forEach(d => { taggedByDay[d] = uploadedPhotos.filter(p => p.day === d); });

  const renderPhotoThumb = (p, idx) => (
    <div key={idx} style={{ position: "relative" }}>
      <div style={{ aspectRatio: "1", borderRadius: T.rs, overflow: "hidden", cursor: "pointer", position: "relative", border: p.liked ? `2px solid ${T.red}` : "none" }} onClick={() => setViewingPhoto(p)}>
        <img src={p.url} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <span onClick={(e) => { e.stopPropagation(); const updated = uploadedPhotos.map(ph => ph.id === p.id ? { ...ph, liked: !ph.liked } : ph); setUploadedPhotos(updated); updatePhotoInSupabase(p.id, { liked: !p.liked }); }} style={{ position: "absolute", top: 4, left: 4, fontSize: 14, cursor: "pointer", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.4))" }}>{p.liked ? "\u2764\uFE0F" : "\uD83E\uDD0D"}</span>
        <span onClick={(e) => { e.stopPropagation(); setUploadedPhotos(prev => prev.filter(ph => ph.id !== p.id)); deletePhotoFromSupabase(p); }} style={{ position: "absolute", top: 2, right: 4, fontSize: 14, cursor: "pointer", color: "#fff", fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,.6)", lineHeight: 1 }}>&times;</span>
      </div>
      <select value={p.day} onChange={(e) => { const newDay = e.target.value; setUploadedPhotos(prev => prev.map(ph => ph.id === p.id ? { ...ph, day: newDay } : ph)); updatePhotoInSupabase(p.id, { day_tag: newDay }); }}
        style={{ width: "100%", padding: "3px 4px", fontSize: 10, border: `.5px solid ${T.border}`, borderRadius: 4, background: T.s2, color: T.t2, marginTop: 3, fontFamily: T.font, cursor: "pointer" }}>
        <option value="Untagged">Untagged</option>
        {dayGroups.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
    </div>
  );

  const renderUploadBox = () => (
    <div onClick={() => photoInputRef.current?.click()} style={{ aspectRatio: "1", borderRadius: T.rs, border: `1.5px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 24, color: T.t3 }}>+</div>
  );

  return (
  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
    <input type="file" accept="image/*" multiple ref={photoInputRef} style={{ display: "none" }} onChange={handlePhotoUpload} aria-label="Upload photos" />
    <div style={{ padding: "14px 20px", background: T.s, borderBottom: `.5px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <button style={{ ...css.btn, ...css.btnSm }} onClick={() => navigate("trip")}>Back</button>
      <h2 style={{ fontFamily: T.fontD, fontSize: 17, fontWeight: 400 }}>Memories</h2>
      <button style={{ ...css.btn, ...css.btnSm, ...css.btnP }} onClick={() => photoInputRef.current?.click()}>Upload</button>
    </div>
    <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
      {/* Trip Stats Banner */}
      <div style={{ ...css.card, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <span style={{ fontSize: 13, color: T.t2 }}>{"\uD83D\uDCF8"} {totalPhotos} photo{totalPhotos !== 1 ? "s" : ""}</span>
        <span style={{ fontSize: 13, color: T.t3 }}>&middot;</span>
        <span style={{ fontSize: 13, color: T.t2 }}>{"\u2764\uFE0F"} {likedCount} favourite{likedCount !== 1 ? "s" : ""}</span>
        <span style={{ fontSize: 13, color: T.t3 }}>&middot;</span>
        <span style={{ fontSize: 13, color: T.t2 }}>{"\uD83D\uDCC5"} {daysWithPhotos} day{daysWithPhotos !== 1 ? "s" : ""}</span>
      </div>

      {/* AI Video */}
      <div style={{ ...css.card, padding: 0, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ height: 180, background: `linear-gradient(135deg, ${T.ad}, ${T.a}, #085041)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
          {videoState === "generating" ? (
            <>
              <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(255,255,255,.2)", borderTopColor: "#fff", animation: "spin .8s linear infinite" }} />
              <p style={{ fontSize: 13, marginTop: 10, opacity: .8 }}>Generating highlights...</p>
            </>
          ) : (
            <>
              <button onClick={() => {
                  if (uploadedPhotos.length > 0) {
                    setReelIndex(0);
                    setReelPaused(false);
                    setReelPlaying(true);
                  } else {
                    alert("Upload some photos first!");
                  }
                }}
                style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,.2)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
              </button>
              <p style={{ fontSize: 13, marginTop: 10, opacity: .8 }}>
                {uploadedPhotos.length === 0 ? "Upload photos to create your reel" : "Play trip highlight reel"}
              </p>
            </>
          )}
        </div>
        <div style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>Easter Lake District 2026</p>
              <p style={{ fontSize: 12, color: T.t2 }}>Auto-generated from {totalPhotos} photos</p>
            </div>
            <button style={{ ...css.btn, ...css.btnSm }}>Share</button>
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>
            <Tag bg={T.blueL} color={T.blue}>30 sec</Tag>
            <Tag bg={T.purpleL} color={T.purple}>Music + transitions</Tag>
            <Tag bg={T.al} color={T.ad}>AI narration</Tag>
          </div>
        </div>
      </div>

      {/* Day-grouped photos */}
      {dayGroups.map(dayLabel => {
        const dayPhotos = taggedByDay[dayLabel];
        return (
          <div key={dayLabel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={css.sectionTitle}>{dayLabel}</div>
              <span style={{ fontSize: 12, color: T.t3 }}>{dayPhotos.length} photo{dayPhotos.length !== 1 ? "s" : ""}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 16 }}>
              {dayPhotos.length > 0 ? (
                <>
                  {dayPhotos.map((p, i) => renderPhotoThumb(p, i))}
                  {renderUploadBox()}
                </>
              ) : (
                renderUploadBox()
              )}
            </div>
          </div>
        );
      })}

      {/* Untagged / Your Uploads */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={css.sectionTitle}>Your Uploads</div>
          <span style={{ fontSize: 12, color: T.t3 }}>{untaggedPhotos.length} photo{untaggedPhotos.length !== 1 ? "s" : ""}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 16 }}>
          {untaggedPhotos.length > 0 ? (
            <>
              {untaggedPhotos.map((p, i) => renderPhotoThumb(p, i))}
              {renderUploadBox()}
            </>
          ) : (
            renderUploadBox()
          )}
        </div>
      </div>

      {/* Reel style selector */}
      {totalPhotos > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: T.t3, textTransform: "uppercase", letterSpacing: .5, marginBottom: 8 }}>Reel Style</p>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { id: "cinematic", label: "\uD83C\uDFAC Cinematic", desc: "Slow Ken Burns" },
              { id: "slideshow", label: "\uD83D\uDCF7 Slideshow", desc: "Clean fades" },
              { id: "energetic", label: "\u26A1 Energetic", desc: "Fast & dynamic" },
            ].map(s => (
              <button key={s.id} onClick={() => setReelStyle(s.id)}
                style={{ flex: 1, padding: "10px 8px", borderRadius: T.rs, border: `.5px solid ${reelStyle === s.id ? T.a : T.border}`,
                  background: reelStyle === s.id ? T.al : T.s2, cursor: "pointer", textAlign: "center" }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: reelStyle === s.id ? T.ad : T.t1 }}>{s.label}</p>
                <p style={{ fontSize: 10, color: T.t3, marginTop: 2 }}>{s.desc}</p>
              </button>
            ))}
          </div>
          <p style={{ fontSize: 10, color: T.t3, marginTop: 6 }}>Photos play in upload order. Drag to reorder coming soon.</p>
        </div>
      )}

      <div style={{ ...css.card, padding: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Video settings</p>
        <p style={{ fontSize: 12, color: T.t2, marginBottom: 12 }}>Customise your highlight reel</p>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
          {["Music overlay", "AI narration", "Date stamps", "Slow-mo", "Boomerangs"].map((o) => {
            const comingSoon = ["Music overlay", "AI narration", "Boomerangs"].includes(o);
            return (
              <span key={o} onClick={() => setVideoSettings(prev => { const next = new Set(prev); if (next.has(o)) next.delete(o); else next.add(o); return next; })} style={{ ...css.chip, ...(videoSettings.has(o) ? css.chipActive : {}), cursor: "pointer", position: "relative" }}>
                {o}
                {comingSoon && <span style={{ fontSize: 7, color: T.amber, marginLeft: 3 }}>soon</span>}
              </span>
            );
          })}
        </div>
      </div>
    </div>
    <TabBar active="memories" onNav={navigate} />
  </div>
  );
}
