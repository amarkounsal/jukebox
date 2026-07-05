import React, { useState, useEffect, useRef } from "react";
import { Search, Loader2 } from "lucide-react";

export function SearchBar({ onSearch, results, onAddToQueue, isLoading }) {
  const [query, setQuery] = useState("");
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set search query trigger after 350ms delay
    debounceTimerRef.current = setTimeout(() => {
      onSearch(query);
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, onSearch]);

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  return (
    <section className="search-section">
      <div className="search-input-wrapper">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          className="search-input"
          placeholder="Search a song, artist, or album..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {isLoading && <Loader2 className="search-spinner" size={20} />}
      </div>

      {results.length > 0 && (
        <div className="results-container glass-panel">
          {results.map((track) => {
            const art = track.album.images[2]?.url || track.album.images[0]?.url || "";
            return (
              <div key={track.id} className="result-item">
                <img src={art} alt={track.name} />
                <div className="result-info">
                  <div className="result-title">{track.name}</div>
                  <div className="result-artist">
                    {track.artists.map((a) => a.name).join(", ")}
                  </div>
                </div>
                <button
                  className="add-btn"
                  onClick={() => onAddToQueue(track)}
                >
                  + Add
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
