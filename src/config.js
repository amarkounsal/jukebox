export const CONFIG = {
  CLIENT_ID: import.meta.env.VITE_SPOTIFY_CLIENT_ID || "",
  REDIRECT_URI: import.meta.env.VITE_SPOTIFY_REDIRECT_URI || window.location.origin + "/", // Falls back to current host origin
  SCOPES: [
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "streaming"
  ].join(" ")
};

