"use client";

import { useState, useMemo } from "react";
import MediaCard, { MediaSummary } from "@/app/components/MediaCard";
import SortFilterBar, {
  SortOption,
  matchesDecade,
  getDecadeNumber,
} from "@/app/components/SortFilterBar";

const BACKEND = "/api/backend";

interface WatchlistEntry extends MediaSummary {
  added_at: string;
}

const WATCHLIST_SORT_OPTIONS: SortOption[] = [
  { label: "Recently Added", value: "added_desc" },
  { label: "Release Date (Newest)", value: "release_desc" },
  { label: "Release Date (Oldest)", value: "release_asc" },
  { label: "Decade (Newest)", value: "decade_desc" },
  { label: "Decade (Oldest)", value: "decade_asc" },
];

export default function WatchlistClient({ initialItems }: { initialItems: WatchlistEntry[] }) {
  const [items, setItems] = useState<WatchlistEntry[]>(initialItems);
  const [sortBy, setSortBy] = useState<string>("added_desc");
  const [selectedDecade, setSelectedDecade] = useState<string>("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");

  const handleRemove = async (mediaId: number) => {
    setItems((prev) => prev.filter((item) => item.id !== mediaId));
    try {
      await fetch(`${BACKEND}/media/${mediaId}/watchlist`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch (e) {
      console.error("Failed to remove from watchlist:", e);
    }
  };

  // Collect unique genres present in watchlist
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      item.genres?.forEach((g) => set.add(g));
    });
    return Array.from(set).sort();
  }, [items]);

  // Filter & Sort
  const filteredAndSorted = useMemo(() => {
    const filtered = items.filter((item) => {
      if (!matchesDecade(item.release_date, selectedDecade)) return false;
      if (selectedGenre !== "all" && !item.genres?.includes(selectedGenre)) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "release_desc": {
          const tA = a.release_date ? new Date(a.release_date).getTime() : 0;
          const tB = b.release_date ? new Date(b.release_date).getTime() : 0;
          return tB - tA;
        }
        case "release_asc": {
          const tA = a.release_date ? new Date(a.release_date).getTime() : 9999999999999;
          const tB = b.release_date ? new Date(b.release_date).getTime() : 9999999999999;
          return tA - tB;
        }
        case "decade_desc": {
          const dA = getDecadeNumber(a.release_date);
          const dB = getDecadeNumber(b.release_date);
          if (dA !== dB) return dB - dA;
          const tA = a.release_date ? new Date(a.release_date).getTime() : 0;
          const tB = b.release_date ? new Date(b.release_date).getTime() : 0;
          return tB - tA;
        }
        case "decade_asc": {
          const dA = getDecadeNumber(a.release_date);
          const dB = getDecadeNumber(b.release_date);
          if (dA !== dB) return dA - dB;
          const tA = a.release_date ? new Date(a.release_date).getTime() : 9999999999999;
          const tB = b.release_date ? new Date(b.release_date).getTime() : 9999999999999;
          return tA - tB;
        }
        case "added_asc":
          return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
        case "added_desc":
        default:
          return new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
      }
    });
  }, [items, selectedDecade, selectedGenre, sortBy]);

  const handleResetFilters = () => {
    setSortBy("added_desc");
    setSelectedDecade("all");
    setSelectedGenre("all");
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "2rem 2rem 5rem" }}>
      {/* Editorial Header with Cream Count Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.75rem", flexWrap: "wrap" }}>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--cream-primary)",
            margin: 0,
          }}
        >
          Watchlist
        </h1>
        <span className="pill-badge" style={{ fontSize: "0.8125rem", padding: "0.2rem 0.75rem" }}>
          {items.length} {items.length === 1 ? "title" : "titles"}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <div
            style={{
              width: 52,
              height: 52,
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
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--cream-primary)"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="2" y1="7" x2="7" y2="7" />
              <line x1="2" y1="17" x2="7" y2="17" />
              <line x1="17" y1="17" x2="22" y2="17" />
              <line x1="17" y1="7" x2="22" y2="7" />
            </svg>
          </div>
          <p className="empty-title">Your Watchlist is empty</p>
          <p className="empty-sub">
            Explore films and TV shows in Discover and click "+ Watchlist" to curate your archive.
          </p>
        </div>
      ) : (
        <>
          {/* Sort & Filter Controls */}
          <SortFilterBar
            sortOptions={WATCHLIST_SORT_OPTIONS}
            sortBy={sortBy}
            onSortChange={setSortBy}
            selectedDecade={selectedDecade}
            onDecadeChange={setSelectedDecade}
            availableGenres={availableGenres}
            selectedGenre={selectedGenre}
            onGenreChange={setSelectedGenre}
            filteredCount={filteredAndSorted.length}
            totalCount={items.length}
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
            <div className="media-grid" role="list" aria-label="Watchlist items">
              {filteredAndSorted.map((item) => (
                <div key={item.id} style={{ position: "relative" }}>
                  <MediaCard item={item} />
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    style={{
                      position: "absolute",
                      top: "0.625rem",
                      right: "0.625rem",
                      background: "rgba(10, 10, 9, 0.8)",
                      border: "1px solid rgba(242, 237, 227, 0.2)",
                      color: "var(--cream-primary)",
                      borderRadius: "9999px",
                      width: "28px",
                      height: "28px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      zIndex: 10,
                      backdropFilter: "blur(12px)",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--cream-primary)";
                      e.currentTarget.style.background = "rgba(242, 237, 227, 0.15)";
                      e.currentTarget.style.transform = "scale(1.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(242, 237, 227, 0.2)";
                      e.currentTarget.style.background = "rgba(10, 10, 9, 0.8)";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                    title="Remove from watchlist"
                    aria-label={`Remove ${item.title} from watchlist`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
