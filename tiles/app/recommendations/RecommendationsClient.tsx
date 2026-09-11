"use client";

import { useState, useMemo } from "react";
import MediaCard, { MediaSummary } from "@/app/components/MediaCard";
import SortFilterBar, {
  SortOption,
  matchesDecade,
  getDecadeNumber,
} from "@/app/components/SortFilterBar";

const RECOMMENDATIONS_SORT_OPTIONS: SortOption[] = [
  { label: "Top Recommended", value: "recommended" },
  { label: "Release Date (Newest)", value: "release_desc" },
  { label: "Release Date (Oldest)", value: "release_asc" },
  { label: "Decade (Newest)", value: "decade_desc" },
  { label: "Decade (Oldest)", value: "decade_asc" },
];

export default function RecommendationsClient({ initialItems }: { initialItems: MediaSummary[] }) {
  const [sortBy, setSortBy] = useState<string>("recommended");
  const [selectedDecade, setSelectedDecade] = useState<string>("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");

  // Unique genres from recommended items
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    initialItems.forEach((item) => {
      item.genres?.forEach((g) => set.add(g));
    });
    return Array.from(set).sort();
  }, [initialItems]);

  // Filter & Sort
  const filteredAndSorted = useMemo(() => {
    const filtered = initialItems.filter((item) => {
      if (!matchesDecade(item.release_date, selectedDecade)) return false;
      if (selectedGenre !== "all" && !item.genres?.includes(selectedGenre)) return false;
      return true;
    });

    if (sortBy === "recommended") {
      return filtered;
    }

    return filtered.slice().sort((a, b) => {
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
        default:
          return 0;
      }
    });
  }, [initialItems, selectedDecade, selectedGenre, sortBy]);

  const handleResetFilters = () => {
    setSortBy("recommended");
    setSelectedDecade("all");
    setSelectedGenre("all");
  };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 2rem 2rem" }}>
      {/* Sort & Filter Controls */}
      <SortFilterBar
        sortOptions={RECOMMENDATIONS_SORT_OPTIONS}
        sortBy={sortBy}
        onSortChange={setSortBy}
        selectedDecade={selectedDecade}
        onDecadeChange={setSelectedDecade}
        availableGenres={availableGenres}
        selectedGenre={selectedGenre}
        onGenreChange={setSelectedGenre}
        filteredCount={filteredAndSorted.length}
        totalCount={initialItems.length}
        onReset={handleResetFilters}
      />

      {filteredAndSorted.length === 0 ? (
        <div className="empty-state" style={{ padding: "3rem 1rem" }}>
          <p className="empty-title">No matching recommendations</p>
          <p className="empty-sub">Try adjusting your decade or genre filters.</p>
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
        <>
          <div
            style={{
              paddingBottom: "1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-muted)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {filteredAndSorted.length} Matched Title
              {filteredAndSorted.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="media-grid" role="list" aria-label="Recommended media items">
            {filteredAndSorted.map((item) => (
              <div key={item.id} role="listitem">
                <MediaCard item={item} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
