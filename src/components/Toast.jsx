import React from "react";

export function Toast({ message }) {
  if (!message) return null;

  return (
    <div className="toast-container">
      <div className="toast-panel">
        <span>🎵</span>
        <span>{message}</span>
      </div>
    </div>
  );
}
