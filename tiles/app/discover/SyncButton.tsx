"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BACKEND = "/api/backend";

type Status = "idle" | "syncing" | "done" | "error";

export default function SyncButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [synced, setSynced] = useState(0);
  const router = useRouter();

  const handleSync = async () => {
    if (status === "syncing") return;
    setStatus("syncing");
    setSynced(0);

    try {
      const res = await fetch(`${BACKEND}/api/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages: 5 }),
      });

      if (!res.ok) throw new Error(`sync failed: ${res.status}`);
      const data = await res.json();
      setSynced(data.synced ?? 0);
      setStatus("done");

      // Refresh the server component data after a brief moment
      setTimeout(() => {
        router.refresh();
        setStatus("idle");
      }, 2500);
    } catch (e) {
      console.error(e);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const label =
    status === "syncing"
      ? "Syncing…"
      : status === "done"
      ? `✓ Synced ${synced} titles`
      : status === "error"
      ? "Sync failed — retry?"
      : "Sync TMDB";

  return (
    <button
      id="sync-tmdb-btn"
      onClick={handleSync}
      disabled={status === "syncing"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4375rem",
        padding: "0.5rem 1rem",
        borderRadius: "0.625rem",
        fontSize: "0.875rem",
        fontWeight: 600,
        fontFamily: "inherit",
        border: "1px solid",
        cursor: status === "syncing" ? "default" : "pointer",
        transition: "all 0.15s ease",
        // Colour based on state
        background:
          status === "done"
            ? "rgba(34,197,94,0.12)"
            : status === "error"
            ? "rgba(239,68,68,0.12)"
            : "transparent",
        borderColor:
          status === "done"
            ? "rgba(34,197,94,0.35)"
            : status === "error"
            ? "rgba(239,68,68,0.35)"
            : "var(--border-subtle)",
        color:
          status === "done"
            ? "#4ade80"
            : status === "error"
            ? "#f87171"
            : "var(--text-muted)",
        opacity: status === "syncing" ? 0.7 : 1,
      }}
    >
      {status === "syncing" && (
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ animation: "spin 0.9s linear infinite" }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      )}
      {status === "idle" && (
        <svg
          aria-hidden="true"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 2v6h-6" />
          <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
          <path d="M3 22v-6h6" />
          <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
        </svg>
      )}
      {label}

      {/* Spin keyframe — injected as a global once */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </button>
  );
}
