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
      const res = await fetch(`${BACKEND}/sync`, {
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
      ? "Syncing Archive…"
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
        gap: "0.5rem",
        padding: "0.45rem 1.125rem",
        borderRadius: "9999px",
        fontSize: "0.8125rem",
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: status === "syncing" ? "default" : "pointer",
        transition: "all 0.2s ease",
        background:
          status === "done"
            ? "rgba(242, 237, 227, 0.08)"
            : status === "error"
            ? "rgba(242, 237, 227, 0.04)"
            : "rgba(242, 237, 227, 0.03)",
        border: "1px solid",
        borderColor:
          status === "done"
            ? "var(--cream-primary)"
            : status === "error"
            ? "rgba(242, 237, 227, 0.3)"
            : "var(--border-subtle)",
        color:
          status === "done"
            ? "var(--cream-primary)"
            : status === "error"
            ? "var(--text-muted)"
            : "var(--text-muted)",
        letterSpacing: "0.02em",
        opacity: status === "syncing" ? 0.7 : 1,
        boxShadow: status === "done" ? "0 0 12px rgba(242, 237, 227, 0.1)" : "none",
      }}
      className="hover:text-[#f2ede3] hover:border-[rgba(242,237,227,0.25)]"
    >
      {status === "syncing" && (
        <svg
          aria-hidden="true"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ animation: "spin 1s linear infinite" }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      )}
      {status !== "syncing" && (
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
        </svg>
      )}
      <span>{label}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}
