import React from "react";

export function LoginScreen({ onLogin }) {
  return (
    <div className="screen login-screen">
      <div className="login-card glass-panel">
        <span className="logo-icon" role="img" aria-label="music note">🎵</span>
        <h1>Office Jukebox</h1>
        <p className="sub">
          Host: connect with Spotify Premium to initialize the shared queue.
        </p>
        <button onClick={onLogin} className="btn primary">
          Connect Spotify (Host Login)
        </button>
        <p className="hint">
          Only the device connected to the office Bluetooth speaker needs to authenticate. Other users can search and add songs directly without any login!
        </p>
      </div>
    </div>
  );
}
