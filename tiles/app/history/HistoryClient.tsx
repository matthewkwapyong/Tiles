"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MediaSummary } from "@/app/components/MediaCard";
import SortFilterBar, {
  SortOption,
  matchesDecade,
  getDecadeNumber,
} from "@/app/components/SortFilterBar";

const BACKEND = "/api/backend";
const TMDB_IMG = "https://image.tmdb.org/t/p/w342";

export interface HistoryItem {
  log_id: number;
  watched_at: string;
  notes?: string;
  user_rating?: number | null;
  media: MediaSummary;
}

const HISTORY_SORT_OPTIONS: SortOption[] = [
  { label: "Recently Watched", value: "watched_desc" },
  { label: "Your Rating (High to Low)", value: "rating_desc" },
  { label: "Your Rating (Low to High)", value: "rating_asc" },
  { label: "Release Date (Newest)", value: "release_desc" },
  { label: "Release Date (Oldest)", value: "release_asc" },
  { label: "Decade (Newest)", value: "decade_desc" },
  { label: "Decade (Oldest)", value: "decade_asc" },
];

export default function HistoryClient({ initialHistory }: { initialHistory: HistoryItem[] }) {
  const [history, setHistory] = useState<HistoryItem[]>(initialHistory);
  const [sortBy, setSortBy] = useState<string>("watched_desc");
  const [selectedDecade, setSelectedDecade] = useState<string>("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");

  // If user_rating is not populated yet from backend, lazily fetch it
  useEffect(() => {
    const unrated = history.filter((h) => h.user_rating === undefined);
    if (unrated.length === 0) return;

    let isMounted = true;
    (async () => {
      const updates: Record<number, number | null> = {};
      await Promise.all(
        unrated.map(async (h) => {
          try {
            const res = await fetch(`${BACKEND}/media/${h.media.id}/rating`, {
              credentials: "include",
            });
            if (res.ok) {
              const data = await res.json();
              updates[h.log_id] = data.rating ?? null;
            }
          } catch {
            updates[h.log_id] = null;
          }
        })
      );

      if (isMounted) {
        setHistory((prev) =>
          prev.map((item) =>
            item.log_id in updates
              ? { ...item, user_rating: updates[item.log_id] }
              : item
          )
        );
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDelete = async (e: React.MouseEvent, logId: number) => {
    e.preventDefault();
    e.stopPropagation();
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

  // Collect available unique genres
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    history.forEach((h) => {
      h.media.genres?.forEach((g) => set.add(g));
    });
    return Array.from(set).sort();
  }, [history]);

  // Filter & Sort
  const filteredAndSorted = useMemo(() => {
    const filtered = history.filter((item) => {
      if (!matchesDecade(item.media.release_date, selectedDecade)) return false;
      if (selectedGenre !== "all" && !item.media.genres?.includes(selectedGenre)) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "rating_desc": {
          const rA = a.user_rating != null ? a.user_rating : -1;
          const rB = b.user_rating != null ? b.user_rating : -1;
          if (rA !== rB) return rB - rA;
          return new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime();
        }
        case "rating_asc": {
          const rA = a.user_rating != null ? a.user_rating : 999;
          const rB = b.user_rating != null ? b.user_rating : 999;
          if (rA !== rB) return rA - rB;
          return new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime();
        }
        case "release_desc": {
          const tA = a.media.release_date ? new Date(a.media.release_date).getTime() : 0;
          const tB = b.media.release_date ? new Date(b.media.release_date).getTime() : 0;
          return tB - tA;
        }
        case "release_asc": {
          const tA = a.media.release_date ? new Date(a.media.release_date).getTime() : 9999999999999;
          const tB = b.media.release_date ? new Date(b.media.release_date).getTime() : 9999999999999;
          return tA - tB;
        }
        case "decade_desc": {
          const dA = getDecadeNumber(a.media.release_date);
          const dB = getDecadeNumber(b.media.release_date);
          if (dA !== dB) return dB - dA;
          const tA = a.media.release_date ? new Date(a.media.release_date).getTime() : 0;
          const tB = b.media.release_date ? new Date(b.media.release_date).getTime() : 0;
          return tB - tA;
        }
        case "decade_asc": {
          const dA = getDecadeNumber(a.media.release_date);
          const dB = getDecadeNumber(b.media.release_date);
          if (dA !== dB) return dA - dB;
          const tA = a.media.release_date ? new Date(a.media.release_date).getTime() : 9999999999999;
          const tB = b.media.release_date ? new Date(b.media.release_date).getTime() : 9999999999999;
          return tA - tB;
        }
        case "watched_asc":
          return new Date(a.watched_at).getTime() - new Date(b.watched_at).getTime();
        case "watched_desc":
        default:
          return new Date(b.watched_at).getTime() - new Date(a.watched_at).getTime();
      }
    });
  }, [history, selectedDecade, selectedGenre, sortBy]);

  const handleResetFilters = () => {
    setSortBy("watched_desc");
    setSelectedDecade("all");
    setSelectedGenre("all");
  };

  return (
    <div className="history-wall-container">
      {/* Editorial Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", marginBottom: "1.75rem", flexWrap: "wrap" }}>
        <h1
          style={{
            fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "var(--cream-primary)",
            margin: 0,
            lineHeight: 1.15,
          }}
        >
          Watch History
        </h1>
        <span className="pill-badge" style={{ fontSize: "0.8125rem", padding: "0.2rem 0.75rem", fontWeight: 600 }}>
          {history.length} {history.length === 1 ? "film" : "films"}
        </span>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(242, 237, 227, 0.05)",
              border: "1px solid rgba(242, 237, 227, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem",
            }}
            aria-hidden="true"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--cream-primary)"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <p className="empty-title">No watch history yet</p>
          <p className="empty-sub">
            Log movies and TV shows as you watch them by clicking "Log Watch" on any title's dossier.
          </p>
          <Link
            href="/discover"
            style={{
              marginTop: "0.75rem",
              color: "var(--cream-primary)",
              textDecoration: "underline",
              fontSize: "0.875rem",
            }}
          >
            Explore Titles Archive →
          </Link>
        </div>
      ) : (
        <>
          {/* Sort & Filter Controls */}
          <SortFilterBar
            sortOptions={HISTORY_SORT_OPTIONS}
            sortBy={sortBy}
            onSortChange={setSortBy}
            selectedDecade={selectedDecade}
            onDecadeChange={setSelectedDecade}
            availableGenres={availableGenres}
            selectedGenre={selectedGenre}
            onGenreChange={setSelectedGenre}
            filteredCount={filteredAndSorted.length}
            totalCount={history.length}
            onReset={handleResetFilters}
          />

          {filteredAndSorted.length === 0 ? (
            <div className="empty-state" style={{ padding: "3rem 1rem" }}>
              <p className="empty-title">No matching titles</p>
              <p className="empty-sub">Try changing your decade or genre filter.</p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="pill-btn-ghost"
                style={{ marginTop: "0.75rem", padding: "0.4rem 1.25rem", cursor: "pointer" }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="history-wall-grid">
              {filteredAndSorted.map((item) => {
                const dateStr = new Date(item.watched_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
                const ratingDisplay =
                  item.user_rating != null ? (item.user_rating / 2).toFixed(1) : null;

                return (
                  <Link
                    key={item.log_id}
                    href={`/media/${item.media.id}`}
                    className="history-tile"
                    title={`${item.media.title} — Logged: ${dateStr}${ratingDisplay ? ` • Rating: ${ratingDisplay}/5` : ""}${item.notes ? `\n"${item.notes}"` : ""}`}
                  >
                    {/* Poster image */}
                    {item.media.poster_path ? (
                      <Image
                        src={`${TMDB_IMG}${item.media.poster_path}`}
                        alt={item.media.title}
                        fill
                        sizes="(max-width: 640px) 105px, (max-width: 1024px) 115px, 125px"
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
                          fontSize: "1.75rem",
                          color: "var(--cream-muted)",
                          background: "#111110",
                        }}
                      >
                        🎬
                      </div>
                    )}

                    {/* Notes indicator dot */}
                    {item.notes && (
                      <span
                        className="history-tile-notes-dot"
                        title={`Notes: ${item.notes}`}
                      />
                    )}

                    {/* Hover overlay with title, date, and user rating */}
                    <div className="history-tile-overlay">
                      <p className="history-tile-title">{item.media.title}</p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginTop: "0.15rem",
                          gap: "0.25rem",
                        }}
                      >
                        <span className="history-tile-date">{dateStr}</span>
                        {ratingDisplay && (
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              color: "var(--cream-primary)",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            ★ {ratingDisplay}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick delete button on hover */}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, item.log_id)}
                      className="history-tile-delete"
                      title="Remove from history"
                      aria-label={`Remove ${item.media.title} from history`}
                    >
                      ✕
                    </button>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

