import React, { useEffect, useState, useCallback } from "react";
import { useSpotify } from "./hooks/useSpotify";
import { LoginScreen } from "./components/LoginScreen";
import { NowPlaying } from "./components/NowPlaying";
import { SearchBar } from "./components/SearchBar";
import { QueueList } from "./components/QueueList";
import { DeviceModal } from "./components/DeviceModal";
import { Toast } from "./components/Toast";
import { CONFIG } from "./config";
import { Music, Radio, LogOut } from "lucide-react";

export default function App() {
  const [toastMessage, setToastMessage] = useState(null);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Toast handler
  const showToast = useCallback((msg) => {
    setToastMessage(msg);
  }, []);

  const spotify = useSpotify(showToast);

  // Clear toast after timeout
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Boot: Handle OAuth code exchange and session boot
  useEffect(() => {
    async function initAuth() {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      if (code) {
        try {
          await spotify.exchangeCodeForToken(code);
          // Clean URL parameters
          window.history.replaceState({}, document.title, CONFIG.REDIRECT_URI);
          showToast("Successfully connected to Spotify!");
        } catch (err) {
          showToast("Failed to authenticate with Spotify.");
          console.error(err);
        }
      }
      setIsInitializing(false);
    }
    initAuth();
  }, [spotify.exchangeCodeForToken, showToast]);

  // Polling: Update Currently Playing status in intervals when authenticated
  useEffect(() => {
    if (!spotify.isAuthenticated) return;

    spotify.pollCurrentlyPlaying();
    spotify.fetchDevices();

    const interval = setInterval(() => {
      spotify.pollCurrentlyPlaying();
    }, 4000);

    return () => clearInterval(interval);
  }, [spotify.isAuthenticated, spotify.pollCurrentlyPlaying, spotify.fetchDevices]);

  if (isInitializing) {
    return (
      <div className="screen login-screen">
        <div style={{ color: "var(--muted)", fontSize: "1.1rem" }}>
          Initializing session...
        </div>
      </div>
    );
  }

  if (!spotify.isAuthenticated) {
    return (
      <>
        <LoginScreen onLogin={spotify.login} />
        <Toast message={toastMessage} />
      </>
    );
  }

  return (
    <div className="screen">
      <div className="app-screen">
        <header>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Music className="logo-icon-app" size={24} style={{ color: "var(--accent)" }} />
            <h1>Office Jukebox</h1>
          </div>
          <div className="header-right">
            <div className={`device-badge ${spotify.activeDevice ? "active" : ""}`}>
              <div className={spotify.activeDevice ? "device-pulse" : ""} />
              <span>
                {spotify.activeDevice ? spotify.activeDevice.name : "No active device"}
              </span>
            </div>
            <button
              className="btn small"
              onClick={() => setIsDeviceModalOpen(true)}
            >
              <Radio size={14} />
              <span>Devices</span>
            </button>
            <button className="btn small danger" onClick={spotify.logout}>
              <LogOut size={14} />
              <span>Log out</span>
            </button>
          </div>
        </header>

        <NowPlaying
          currentlyPlaying={spotify.currentlyPlaying}
          onTogglePlay={spotify.togglePlay}
          onNext={spotify.nextTrack}
          onPrev={spotify.prevTrack}
        />

        <SearchBar
          onSearch={spotify.search}
          results={spotify.searchResults}
          onAddToQueue={spotify.addToQueue}
          isLoading={spotify.isLoadingSearch}
        />

        <QueueList queue={spotify.localQueue} />

        <DeviceModal
          isOpen={isDeviceModalOpen}
          onClose={() => setIsDeviceModalOpen(false)}
          devices={spotify.devices}
          activeDevice={spotify.activeDevice}
          onSelectDevice={spotify.selectDevice}
          onRefresh={spotify.fetchDevices}
        />

        <Toast message={toastMessage} />
      </div>
    </div>
  );
}
