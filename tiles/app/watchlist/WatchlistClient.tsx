"use client";

import { useState } from "react";
import MediaCard, { MediaSummary } from "@/app/components/MediaCard";

const BACKEND = "/api/backend";

interface WatchlistEntry extends MediaSummary {
  added_at: string;
}

export default function WatchlistClient({ initialItems }: { initialItems: WatchlistEntry[] }) {
  const [items, setItems] = useState<WatchlistEntry[]>(initialItems);

  const handleRemove = async (mediaId: number) => {
    setItems((prev) => prev.filter((item) => item.id !== mediaId));
    try {
      await fetch(`${BACKEND}/api/media/${mediaId}/watchlist`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch (e) {
      console.error("Failed to remove from watchlist:", e);
    }
  };

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">🔖</span>
        <p className="empty-title">Your Watchlist is empty</p>
        <p className="empty-sub">
          Explore films and TV shows in Discover and click "+ Watchlist" to save items for later.
        </p>
      </div>
    );
  }

  return (
    <div className="media-grid" role="list" aria-label="Watchlist items">
      {items.map((item) => (
        <div key={item.id} style={{ position: "relative" }}>
          <MediaCard item={item} />
          <button
            type="button"
            onClick={() => handleRemove(item.id)}
            style={{
              position: "absolute",
              top: "0.5rem",
              right: "0.5rem",
              background: "rgba(0, 0, 0, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#f87171",
              borderRadius: "9999px",
              width: "24px",
              height: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.8125rem",
              cursor: "pointer",
              zIndex: 10,
              backdropFilter: "blur(4px)",
            }}
            title="Remove from watchlist"
            aria-label={`Remove ${item.title} from watchlist`}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
