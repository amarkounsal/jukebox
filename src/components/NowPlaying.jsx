import React, { useState, useEffect } from "react";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react";

export function NowPlaying({ currentlyPlaying, onTogglePlay, onNext, onPrev }) {
  const [localProgress, setLocalProgress] = useState(0);

  // Synchronize local progress ticker with currentlyPlaying updates
  useEffect(() => {
    if (currentlyPlaying) {
      setLocalProgress(currentlyPlaying.progressMs);
    } else {
      setLocalProgress(0);
    }
  }, [currentlyPlaying]);

  // Smooth local ticker that runs when track is playing
  useEffect(() => {
    if (!currentlyPlaying || !currentlyPlaying.isPlaying) return;

    const interval = setInterval(() => {
      setLocalProgress((prev) => {
        const next = prev + 1000;
        return next > currentlyPlaying.durationMs ? currentlyPlaying.durationMs : next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentlyPlaying]);

  if (!currentlyPlaying) {
    return (
      <div className="now-playing-panel glass-panel">
        <div style={{ width: "72px", height: "72px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
          🔇
        </div>
        <div className="np-info">
          <div className="np-tag">Jukebox status</div>
          <div className="np-title">No track currently active</div>
          <div className="np-artist">Start playing from Spotify to activate dashboard</div>
        </div>
      </div>
    );
  }

  const { title, artists, albumArt, isPlaying, durationMs } = currentlyPlaying;
  const progressPercent = durationMs > 0 ? (localProgress / durationMs) * 100 : 0;

  return (
    <div className="now-playing-panel glass-panel">
      <img src={albumArt} alt={title} />
      <div className="np-info">
        <div className="np-tag">Currently Playing</div>
        <div className="np-title">{title}</div>
        <div className="np-artist">{artists}</div>
      </div>
      <div className="np-controls">
        <button className="control-btn" onClick={onPrev} title="Previous track">
          <SkipBack size={18} fill="currentColor" />
        </button>
        <button className="control-btn play-pause" onClick={onTogglePlay} title={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
        <button className="control-btn" onClick={onNext} title="Skip track">
          <SkipForward size={18} fill="currentColor" />
        </button>
      </div>
      <div className="playback-progress" style={{ width: `${progressPercent}%` }} />
    </div>
  );
}
