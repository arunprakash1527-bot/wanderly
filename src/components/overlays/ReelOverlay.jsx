import React from 'react';
import { T } from '../../styles/tokens';
import { useMemories } from '../../contexts/MemoriesContext';

export function ReelOverlay() {
  const {
    reelPlaying, setReelPlaying,
    uploadedPhotos,
    reelIndex, setReelIndex,
    reelPaused, setReelPaused,
    reelStyle,
    videoSettings,
    reelTimerRef,
  } = useMemories();

  if (!reelPlaying || uploadedPhotos.length === 0) return null;

  const photo = uploadedPhotos[reelIndex] || uploadedPhotos[0];
  const baseDur = reelStyle === "energetic" ? 2 : reelStyle === "slideshow" ? 3 : 4;
  const reelDuration = videoSettings.has("Slow-mo") ? baseDur * 1.5 : baseDur;
  let photoAnimation, photoTransformOrigin;
  if (reelStyle === "cinematic") {
    const kbAnimations = ["kb1", "kb2", "kb3", "kb4"];
    const kbOrigins = ["top left", "center", "bottom right", "top right"];
    photoAnimation = `${kbAnimations[reelIndex % 4]} ${reelDuration}s ease-in-out forwards`;
    photoTransformOrigin = kbOrigins[reelIndex % 4];
  } else if (reelStyle === "slideshow") {
    photoAnimation = `reelFadeIn 0.8s ease-in`;
    photoTransformOrigin = "center";
  } else {
    photoAnimation = `reelEnergetic ${reelDuration}s ease-out forwards`;
    photoTransformOrigin = reelIndex % 2 === 0 ? "center left" : "center right";
  }
  const likedCount = uploadedPhotos.filter(p => p.liked).length;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", display: "flex", flexDirection: "column", fontFamily: T.font }}>
      {/* Progress bars */}
      <div style={{ display: "flex", gap: 3, padding: "12px 8px 8px", zIndex: 2 }}>
        {uploadedPhotos.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 2.5, borderRadius: 2, overflow: "hidden", background: "rgba(255,255,255,0.3)" }}>
            <div style={{
              height: "100%",
              borderRadius: 2,
              background: "#fff",
              width: i < reelIndex ? "100%" : i === reelIndex ? "0%" : "0%",
              ...(i === reelIndex && !reelPaused ? { animation: `reelProgress ${reelDuration}s linear forwards` } : {}),
              ...(i === reelIndex && reelPaused ? { width: "50%" } : {}),
            }} />
          </div>
        ))}
      </div>
      {/* Close button */}
      <button onClick={() => setReelPlaying(false)} style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", zIndex: 3, lineHeight: 1, padding: 4 }}>&times;</button>
      {/* Photo with style-based animation */}
      <div key={reelIndex} style={{ flex: 1, overflow: "hidden", position: "relative", animation: "reelFadeIn 0.5s ease-in" }}>
        <img
          src={photo.url}
          alt={photo.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            animation: photoAnimation,
            transformOrigin: photoTransformOrigin,
          }}
        />
        {/* Date stamp overlay */}
        {videoSettings.has("Date stamps") && photo.uploadDate && (
          <span style={{ position: "absolute", top: 40, right: 12, color: "rgba(255,255,255,.8)", fontSize: 11, fontWeight: 500, textShadow: "0 1px 3px rgba(0,0,0,.5)", zIndex: 2 }}>{"\uD83D\uDCC5"} {photo.uploadDate}</span>
        )}
        {/* Pause indicator */}
        {reelPaused && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 48, color: "rgba(255,255,255,0.8)", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{"\u23F8\uFE0F"}</div>
        )}
        {/* Bottom overlay gradient */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(transparent, rgba(0,0,0,0.7))", pointerEvents: "none" }} />
        {/* Day badge + caption */}
        <div style={{ position: "absolute", bottom: 60, left: 16, right: 16, zIndex: 2 }}>
          <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 12, background: "rgba(255,255,255,0.2)", backdropFilter: "blur(8px)", color: "#fff", fontSize: 12, fontWeight: 500, marginBottom: 8 }}>{"\uD83D\uDCCD"} {photo.day || "Untagged"}</span>
          {photo.caption && <p style={{ color: "#fff", fontSize: 15, fontWeight: 500, marginBottom: 4, textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>{photo.caption}</p>}
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>{photo.name}</p>
        </div>
        {/* Stats */}
        <div style={{ position: "absolute", bottom: 24, left: 16, zIndex: 2 }}>
          <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>{"\u2764\uFE0F"} {likedCount} photo{likedCount !== 1 ? "s" : ""} liked</span>
        </div>
        {/* Touch zones */}
        <div style={{ position: "absolute", inset: 0, display: "flex", zIndex: 1 }}>
          {/* Left third - previous */}
          <div style={{ flex: 1, cursor: "pointer" }} onClick={() => {
            if (reelIndex > 0) {
              if (reelTimerRef.current) clearInterval(reelTimerRef.current);
              setReelIndex(prev => prev - 1);
              setReelPaused(false);
            }
          }} />
          {/* Center third - pause/play */}
          <div style={{ flex: 1, cursor: "pointer" }} onClick={() => setReelPaused(prev => !prev)} />
          {/* Right third - next */}
          <div style={{ flex: 1, cursor: "pointer" }} onClick={() => {
            if (reelTimerRef.current) clearInterval(reelTimerRef.current);
            if (reelIndex < uploadedPhotos.length - 1) {
              setReelIndex(prev => prev + 1);
              setReelPaused(false);
            } else {
              setReelPlaying(false);
            }
          }} />
        </div>
      </div>
    </div>
  );
}
