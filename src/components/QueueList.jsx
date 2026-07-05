import React from "react";

export function QueueList({ queue }) {
  return (
    <section className="queue-section">
      <div className="queue-header">
        <h2>Up Next</h2>
        {queue.length > 0 && (
          <span className="queue-count">
            ({queue.length} added this session)
          </span>
        )}
      </div>

      <div className="queue-list">
        {queue.length === 0 ? (
          <div className="queue-empty">
            Queue empty. Search for songs and tap "+ Add" to build the session playlist.
          </div>
        ) : (
          queue.map((track, idx) => {
            const displayIndex = queue.length - idx; // Display index counts up for visual order
            return (
              <div key={`${track.id}-${idx}`} className="queue-item glass-panel">
                <span className="queue-item-index">#{displayIndex}</span>
                <div className="queue-item-details">
                  <div className="queue-title">{track.name}</div>
                  <div className="queue-artist">
                    {track.artists.map((a) => a.name).join(", ")}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
