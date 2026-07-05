import { useState, useEffect, useCallback, useRef } from "react";
import { CONFIG } from "../config";

const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

// ---------------------- PKCE helpers ----------------------
function base64UrlEncode(arrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function sha256(plain) {
  const data = new TextEncoder().encode(plain);
  return await crypto.subtle.digest("SHA-256", data);
}

function randomString(length = 64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const values = crypto.getRandomValues(new Uint8Array(length));
  values.forEach((v) => (result += chars[v % chars.length]));
  return result;
}

// ---------------------- Token storage helpers ----------------------
function saveTokens({ access_token, refresh_token, expires_in }) {
  const expiresAt = Date.now() + expires_in * 1000;
  localStorage.setItem("sj_access_token", access_token);
  if (refresh_token) localStorage.setItem("sj_refresh_token", refresh_token);
  localStorage.setItem("sj_expires_at", String(expiresAt));
}

function getAccessToken() {
  return localStorage.getItem("sj_access_token");
}

function getRefreshToken() {
  return localStorage.getItem("sj_refresh_token");
}

function tokenExpired() {
  const expiresAt = Number(localStorage.getItem("sj_expires_at") || 0);
  return Date.now() > expiresAt - 5000; // 5s buffer
}

function clearTokens() {
  localStorage.removeItem("sj_access_token");
  localStorage.removeItem("sj_refresh_token");
  localStorage.removeItem("sj_expires_at");
  localStorage.removeItem("sj_code_verifier");
}

export function useSpotify(onShowToast) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
  const [activeDevice, setActiveDevice] = useState(null);
  const [devices, setDevices] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [localQueue, setLocalQueue] = useState([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const isRefreshingRef = useRef(false);

  // Initialize auth state
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  // ---------------------- Token operations ----------------------
  const refreshAccessToken = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      isRefreshingRef.current = false;
      throw new Error("No refresh token available");
    }

    try {
      const body = new URLSearchParams({
        client_id: CONFIG.CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });

      const res = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!res.ok) throw new Error("Refresh failed");
      const data = await res.json();
      saveTokens({ ...data, refresh_token: data.refresh_token || refreshToken });
    } catch (err) {
      console.error("Error refreshing token:", err);
      // If refresh fails, log out
      clearTokens();
      setIsAuthenticated(false);
      throw err;
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  const ensureToken = useCallback(async () => {
    if (tokenExpired()) {
      await refreshAccessToken();
    }
    return getAccessToken();
  }, [refreshAccessToken]);

  // ---------------------- API Wrapper ----------------------
  const api = useCallback(async (path, options = {}) => {
    let token;
    try {
      token = await ensureToken();
    } catch (err) {
      throw new Error("Authentication expired. Please log in again.");
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    if (res.status === 401) {
      // Retry once after refreshing
      try {
        await refreshAccessToken();
        const newToken = getAccessToken();
        const retryRes = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers: {
            Authorization: `Bearer ${newToken}`,
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers,
          },
        });
        if (retryRes.status === 204) return null;
        if (!retryRes.ok) throw new Error(`API error ${retryRes.status}`);
        const text = await retryRes.text();
        return text ? JSON.parse(text) : null;
      } catch (err) {
        clearTokens();
        setIsAuthenticated(false);
        throw err;
      }
    }

    if (res.status === 204) return null;
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API error ${res.status}: ${err}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }, [ensureToken, refreshAccessToken]);

  // ---------------------- Authorization Flow ----------------------
  const login = useCallback(async () => {
    const codeVerifier = randomString(64);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64UrlEncode(hashed);

    localStorage.setItem("sj_code_verifier", codeVerifier);

    const params = new URLSearchParams({
      client_id: CONFIG.CLIENT_ID,
      response_type: "code",
      redirect_uri: CONFIG.REDIRECT_URI,
      scope: CONFIG.SCOPES,
      code_challenge_method: "S256",
      code_challenge: codeChallenge,
    });

    window.location.href = `${AUTH_ENDPOINT}?${params.toString()}`;
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setCurrentlyPlaying(null);
    setActiveDevice(null);
    setDevices([]);
    setSearchResults([]);
    setLocalQueue([]);
    setIsAuthenticated(false);
  }, []);

  const exchangeCodeForToken = useCallback(async (code) => {
    const codeVerifier = localStorage.getItem("sj_code_verifier");
    const body = new URLSearchParams({
      client_id: CONFIG.CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: CONFIG.REDIRECT_URI,
      code_verifier: codeVerifier,
    });

    const res = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!res.ok) throw new Error("Token exchange failed");
    const data = await res.json();
    saveTokens(data);
    setIsAuthenticated(true);
  }, []);

  // ---------------------- Device Management ----------------------
  const fetchDevices = useCallback(async () => {
    try {
      const data = await api("/me/player/devices");
      if (data && data.devices) {
        setDevices(data.devices);
        const active = data.devices.find((d) => d.is_active);
        if (active) {
          setActiveDevice(active);
        }
      }
    } catch (e) {
      console.error("Failed to fetch devices:", e);
    }
  }, [api]);

  const selectDevice = useCallback(async (device) => {
    try {
      await api("/me/player", {
        method: "PUT",
        body: JSON.stringify({ device_ids: [device.id], play: true }),
      });
      setActiveDevice(device);
      // Optimistically update device selection in local array
      setDevices((prev) =>
        prev.map((d) => ({ ...d, is_active: d.id === device.id }))
      );
      if (onShowToast) onShowToast(`Switched to ${device.name}`);
    } catch (e) {
      console.error(e);
      if (onShowToast) onShowToast("Couldn't switch device");
    }
  }, [api, onShowToast]);

  // ---------------------- Playback Control ----------------------
  const pollCurrentlyPlaying = useCallback(async () => {
    try {
      const data = await api("/me/player/currently-playing");
      if (!data || !data.item) {
        setCurrentlyPlaying(null);
        return;
      }
      setCurrentlyPlaying({
        id: data.item.id,
        title: data.item.name,
        artists: data.item.artists.map((a) => a.name).join(", "),
        albumArt: data.item.album.images[1]?.url || data.item.album.images[0]?.url || "",
        isPlaying: data.is_playing,
        progressMs: data.progress_ms,
        durationMs: data.item.duration_ms,
      });
    } catch (e) {
      // Ignore transient errors during polling
    }
  }, [api]);

  const togglePlay = useCallback(async () => {
    try {
      const current = currentlyPlaying;
      if (current && current.isPlaying) {
        await api("/me/player/pause", { method: "PUT" });
      } else {
        await api("/me/player/play", { method: "PUT" });
      }
      setTimeout(pollCurrentlyPlaying, 300);
    } catch (e) {
      if (onShowToast) onShowToast("Playback control failed");
    }
  }, [api, currentlyPlaying, pollCurrentlyPlaying, onShowToast]);

  const nextTrack = useCallback(async () => {
    try {
      await api("/me/player/next", { method: "POST" });
      setTimeout(pollCurrentlyPlaying, 300);
    } catch (e) {
      if (onShowToast) onShowToast("Failed to skip track");
    }
  }, [api, pollCurrentlyPlaying, onShowToast]);

  const prevTrack = useCallback(async () => {
    try {
      await api("/me/player/previous", { method: "POST" });
      setTimeout(pollCurrentlyPlaying, 300);
    } catch (e) {
      if (onShowToast) onShowToast("Failed to play previous track");
    }
  }, [api, pollCurrentlyPlaying, onShowToast]);

  // ---------------------- Search and Queue ----------------------
  const search = useCallback(async (query) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    setIsLoadingSearch(true);
    try {
      const data = await api(`/search?q=${encodeURIComponent(trimmed)}&type=track&limit=10`);
      if (data && data.tracks) {
        setSearchResults(data.tracks.items);
      }
    } catch (e) {
      console.error(e);
      setSearchResults([]);
    } finally {
      setIsLoadingSearch(false);
    }
  }, [api]);

  const addToQueue = useCallback(async (track) => {
    try {
      await api(`/me/player/queue?uri=${encodeURIComponent(track.uri)}`, { method: "POST" });
      if (onShowToast) onShowToast(`Added "${track.name}" to the queue`);
      setLocalQueue((prev) => [track, ...prev]);
    } catch (e) {
      console.error(e);
      if (onShowToast) onShowToast("Couldn't add — is a device active?");
    }
  }, [api, onShowToast]);

  return {
    isAuthenticated,
    currentlyPlaying,
    activeDevice,
    devices,
    searchResults,
    localQueue,
    isLoadingSearch,
    login,
    logout,
    exchangeCodeForToken,
    fetchDevices,
    selectDevice,
    togglePlay,
    nextTrack,
    prevTrack,
    search,
    addToQueue,
    pollCurrentlyPlaying,
  };
}
