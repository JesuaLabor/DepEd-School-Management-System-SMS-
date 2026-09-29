import { useState, useEffect } from "react";
import {
  getPendingMutations,
  replayPendingMutations,
  type QueuedMutation,
} from "@/services/offlineQueue";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState<boolean>(false);
  const [syncedCount, setSyncedCount] = useState<number>(0);
  const [pendingQueue, setPendingQueue] = useState<QueuedMutation[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshQueue = () => {
    setPendingQueue(getPendingMutations());
  };

  useEffect(() => {
    refreshQueue();

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 5000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
      refreshQueue();
    };

    const handleQueueChanged = () => {
      refreshQueue();
    };

    const handleQueueReplayed = (e: Event) => {
      const customEvent = e as CustomEvent<{ synced: number; failed: number; remaining: number }>;
      refreshQueue();
      if (customEvent.detail?.synced > 0) {
        setSyncedCount(customEvent.detail.synced);
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 5000);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("offline-queue-changed", handleQueueChanged);
    window.addEventListener("offline-queue-replayed", handleQueueReplayed);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline-queue-changed", handleQueueChanged);
      window.removeEventListener("offline-queue-replayed", handleQueueReplayed);
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const res = await replayPendingMutations();
      if (res.synced > 0) {
        setSyncedCount(res.synced);
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 5000);
      }
    } finally {
      setIsSyncing(false);
      refreshQueue();
    }
  };

  if (isOnline && !showReconnected && pendingQueue.length === 0) {
    return null;
  }

  if (showReconnected) {
    return (
      <div
        style={{
          background: "linear-gradient(90deg, #15803d, #16a34a)",
          color: "#ffffff",
          padding: "0.55rem 1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.825rem",
          fontWeight: 600,
          boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)",
          animation: "fadeIn 0.3s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>✓</span>
          <span>
            {syncedCount > 0
              ? `Reconnection successful! Synced ${syncedCount} queued change(s) with DepEd database.`
              : "Internet connection restored! Live synchronization with DepEd database resumed."}
          </span>
        </div>
        <button
          onClick={() => setShowReconnected(false)}
          style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: "0.9rem" }}
        >
          ✕
        </button>
      </div>
    );
  }

  // Pending items while online
  if (isOnline && pendingQueue.length > 0) {
    return (
      <div
        style={{
          background: "linear-gradient(90deg, #1e40af, #1e3a8a)",
          color: "#ffffff",
          padding: "0.55rem 1rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.825rem",
          fontWeight: 600,
          borderBottom: "1px solid rgba(245, 158, 11, 0.4)",
          boxShadow: "0 2px 8px rgba(30, 64, 175, 0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span>🔄</span>
          <span>
            <strong>{pendingQueue.length} offline submission(s)</strong> awaiting sync to server.
          </span>
        </div>
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "1px solid rgba(255,255,255,0.4)",
            color: "#fff",
            borderRadius: "4px",
            padding: "0.2rem 0.6rem",
            fontSize: "0.75rem",
            fontWeight: 700,
            cursor: isSyncing ? "not-allowed" : "pointer",
          }}
        >
          {isSyncing ? "Syncing..." : "Sync Now ⟳"}
        </button>
      </div>
    );
  }

  // Offline mode active
  return (
    <div
      style={{
        background: "linear-gradient(90deg, #b45309, #d97706)",
        color: "#ffffff",
        padding: "0.6rem 1rem",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "0.825rem",
        fontWeight: 600,
        boxShadow: "0 2px 8px rgba(217, 119, 6, 0.25)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span>⚡</span>
        <span>
          <strong>Offline Mode Active:</strong> Operating from local cache.
          {pendingQueue.length > 0 ? (
            <span style={{ marginLeft: "0.35rem", textDecoration: "underline" }}>
              {pendingQueue.length} submission(s) queued for automatic replay upon reconnect.
            </span>
          ) : (
            " Submissions made now will be stored and synchronized automatically once internet returns."
          )}
        </span>
      </div>
      <span style={{ fontSize: "0.75rem", background: "rgba(0,0,0,0.2)", padding: "2px 8px", borderRadius: "10px" }}>
        Offline Cache {pendingQueue.length > 0 ? `(${pendingQueue.length} queued)` : ""}
      </span>
    </div>
  );
}
