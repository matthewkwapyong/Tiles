"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MediaSummary } from "@/app/components/MediaCard";

const BACKEND = "/api/backend";
const TMDB_IMG = "https://image.tmdb.org/t/p/w185";

export interface HistoryItem {
  log_id: number;
  watched_at: string;
  notes?: string;
  media: MediaSummary;
}

export default function HistoryClient({ initialHistory }: { initialHistory: HistoryItem[] }) {
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);

  const handleDelete = async (logId: number) => {
    setHistory((prev) => prev.filter((item) => item.log_id !== logId));
    try {
      await fetch(`${BACKEND}/watched/${logId}`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch (e) {
      console.error("Failed deleting watch history entry:", e);
    }
  };

  if (history.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">👁</span>
        <p className="empty-title">No watch history yet</p>
        <p className="empty-sub">
          Log movies and TV shows you watch by clicking "Log Watch" on any title's page.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 2rem 4rem" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {history.map((item) => {
          const dateStr = new Date(item.watched_at).toLocaleDateString(undefined, {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          });

          return (
            <div
              key={item.log_id}
              style={{
                display: "flex",
                gap: "1.25rem",
                alignItems: "center",
                padding: "1rem 1.25rem",
                borderRadius: "0.875rem",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                transition: "border-color 0.15s ease",
              }}
            >
              {/* Thumbnail */}
              <Link href={`/media/${item.media.id}`} style={{ flexShrink: 0, textDecoration: "none" }}>
                <div
                  style={{
                    width: 54,
                    height: 81,
                    borderRadius: "0.5rem",
                    overflow: "hidden",
                    background: "var(--bg-card)",
                    position: "relative",
                  }}
                >
                  {item.media.poster_path ? (
                    <Image
                      src={`${TMDB_IMG}${item.media.poster_path}`}
                      alt={item.media.title}
                      fill
                      sizes="54px"
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.5rem",
                      }}
                    >
                      🎬
                    </div>
                  )}
                </div>
              </Link>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link
                  href={`/media/${item.media.id}`}
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    textDecoration: "none",
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.media.title}
                </Link>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    marginTop: "0.25rem",
                    fontSize: "0.8125rem",
                    color: "var(--text-muted)",
                  }}
                >
                  <span>Watched on <strong style={{ color: "var(--text-primary)" }}>{dateStr}</strong></span>
                  <span
                    style={{
                      padding: "0.1rem 0.4rem",
                      borderRadius: "9999px",
                      background: "rgba(99,102,241,0.15)",
                      color: "#a5b4fc",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      fontSize: "0.6875rem",
                    }}
                  >
                    {item.media.media_type}
                  </span>
                </div>

                {item.notes && (
                  <p
                    style={{
                      marginTop: "0.375rem",
                      fontSize: "0.875rem",
                      color: "var(--text-muted)",
                      fontStyle: "italic",
                    }}
                  >
                    "{item.notes}"
                  </p>
                )}
              </div>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleDelete(item.log_id)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-faint)",
                  cursor: "pointer",
                  fontSize: "1.125rem",
                  padding: "0.5rem",
                  lineHeight: 1,
                  borderRadius: "0.375rem",
                }}
                title="Delete log entry"
                aria-label={`Delete log entry for ${item.media.title}`}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
