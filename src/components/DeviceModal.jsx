import React, { useEffect } from "react";
import { Laptop, X } from "lucide-react";

export function DeviceModal({ isOpen, onClose, devices, activeDevice, onSelectDevice, onRefresh }) {
  useEffect(() => {
    if (isOpen) {
      onRefresh();
    }
  }, [isOpen, onRefresh]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
          <h3>Select Device</h3>
          <button className="control-btn" onClick={onClose} style={{ width: "32px", height: "32px" }}>
            <X size={16} />
          </button>
        </div>
        <div className="device-list">
          {devices.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", lineHeight: "1.5" }}>
              No active devices found. Please open Spotify on the host device and start playback.
            </p>
          ) : (
            devices.map((device) => (
              <button
                key={device.id}
                className={`btn device-option ${activeDevice?.id === device.id ? "active" : ""}`}
                onClick={() => onSelectDevice(device)}
              >
                <Laptop size={16} style={{ marginRight: "4px" }} />
                <span>
                  {device.name} {device.is_active ? " (Active)" : ""}
                </span>
              </button>
            ))
          )}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn small primary" onClick={onRefresh} style={{ flex: 1 }}>
            Refresh
          </button>
          <button className="btn small" onClick={onClose} style={{ flex: 1 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
