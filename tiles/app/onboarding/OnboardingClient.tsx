"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MediaSummary } from "@/app/components/MediaCard";

const BACKEND = "/api/backend";
const TMDB_IMG = "https://image.tmdb.org/t/p/w342";
const MIN_RATINGS = 10;

/**
 * Compact inline star rating bar for onboarding poster cards.
 * 5 stars with half-star precision (1.0 to 10.0 rating points).
 */
function CardStarRating({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (val: number | null) => void;
}) {
  const [hoverVal, setHoverVal] = useState<number | null>(null);

  const activeVal = hoverVal !== null ? hoverVal : value ?? 0;

  const calculateScore = (e: React.MouseEvent<HTMLDivElement>, starIndex: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;
    return isLeftHalf ? starIndex * 2 + 1.0 : starIndex * 2 + 2.0;
  };

  return (
    <div
      style={{ display: "flex", gap: "0.2rem", alignItems: "center", justifyContent: "center" }}
      onMouseLeave={() => setHoverVal(null)}
    >
      {Array.from({ length: 5 }, (_, starIndex) => {
        const starFullPoints = (starIndex + 1) * 2;
        const starHalfPoints = starFullPoints - 1;
        const isFull = activeVal >= starFullPoints;
        const isHalf = !isFull && activeVal >= starHalfPoints;

        return (
          <div
            key={starIndex}
            onMouseMove={(e) => setHoverVal(calculateScore(e, starIndex))}
            onClick={(e) => {
              const score = calculateScore(e, starIndex);
              onChange(score === value ? null : score);
            }}
            style={{
              position: "relative",
              width: 24,
              height: 24,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.1s ease",
              transform: hoverVal !== null && Math.ceil(hoverVal / 2) === starIndex + 1 ? "scale(1.2)" : "scale(1)",
            }}
            title={`Rate ${(starIndex + 1)} star${starIndex > 0 ? "s" : ""}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <defs>
                <linearGradient id={`card-star-half-${starIndex}`}>
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0.2)" />
                </linearGradient>
              </defs>
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={isFull ? "#fbbf24" : isHalf ? `url(#card-star-half-${starIndex})` : "rgba(255,255,255,0.2)"}
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

export default function OnboardingClient({ initialItems }: { initialItems: MediaSummary[] }) {
  const router = useRouter();

  // Grid items state (curated + search additions)
  const [items, setItems] = useState<MediaSummary[]>(initialItems);

  // Ratings map: media_item_id -> rating value (1.0 .. 10.0)
  const [ratings, setRatings] = useState<Record<number, number>>({});

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  // Submission / Loading state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ratedCount = Object.keys(ratings).length;
  const isReady = ratedCount >= MIN_RATINGS;

  // Search handler
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setSearching(true);
    try {
      const res = await fetch(`${BACKEND}/media?q=${encodeURIComponent(q)}&source=tmdb`);
      if (res.ok) {
        const data = await res.json();
        const searchResults: MediaSummary[] = data.items ?? [];

        // Prepend non-duplicate search items
        setItems((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const newUnique = searchResults.filter((i) => !existingIds.has(i.id));
          return [...newUnique, ...prev];
        });
      }
    } catch (err) {
      console.error("Onboarding search error:", err);
    } finally {
      setSearching(false);
    }
  };

  // Single card rating handler
  const handleRateItem = (mediaId: number, val: number | null) => {
    setRatings((prev) => {
      const updated = { ...prev };
      if (val === null) {
        delete updated[mediaId];
      } else {
        updated[mediaId] = val;
      }
      return updated;
    });
  };

  // Submit onboarding ratings
  const handleSubmitBatch = async () => {
    if (!isReady || submitting) return;

    setSubmitting(true);
    setError(null);

    const payload = {
      ratings: Object.entries(ratings).map(([id, rating]) => ({
        media_item_id: parseInt(id, 10),
        rating,
      })),
    };

    try {
      const res = await fetch(`${BACKEND}/onboarding/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to submit onboarding ratings");
      }

      // Simulate a brief recommendation building transition before redirect
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 2000);
    } catch (err) {
      console.error("Batch rating error:", err);
      setError(err instanceof Error ? err.message : "Error submitting ratings");
      setSubmitting(false);
    }
  };

  // If submitting, render full-screen recommendation loading overlay
  if (submitting) {
    return (
      <div
        className="cinema-bg"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "9999px",
            border: "3px solid rgba(99,102,241,0.2)",
            borderTopColor: "var(--accent)",
            animation: "spin 1s linear infinite",
            marginBottom: "1.5rem",
          }}
        />
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          Building Your Personalised Profile...
        </h2>
        <p style={{ color: "var(--text-muted)", maxWidth: 420 }}>
          Calculating taste vectors based on your {ratedCount} ratings. Preparing your custom film recommendations.
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="cinema-bg" style={{ minHeight: "100vh", paddingBottom: "6rem" }}>
      {/* ── Sticky Progress Header ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(13, 15, 26, 0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "1rem 2rem",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          {/* Brand & Progress text */}
          <div>
            <span style={{ fontWeight: 800, fontSize: "1.125rem", color: "var(--text-primary)" }}>
              Welcome to Tiles
            </span>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: 0 }}>
              Rate at least <strong>{MIN_RATINGS} movies or TV shows</strong> to build your taste profile.
            </p>
          </div>

          {/* Progress Bar & Finish Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ width: 140 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  marginBottom: "0.25rem",
                  color: isReady ? "#4ade80" : "var(--text-primary)",
                }}
              >
                <span>{ratedCount} / {MIN_RATINGS}</span>
                <span>{Math.min(100, Math.round((ratedCount / MIN_RATINGS) * 100))}%</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: 6,
                  borderRadius: 9999,
                  background: "var(--bg-surface)",
                  overflow: "hidden",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, (ratedCount / MIN_RATINGS) * 100)}%`,
                    background: isReady
                      ? "linear-gradient(90deg, #4ade80 0%, #22c55e 100%)"
                      : "var(--accent)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            <button
              id="finish-onboarding-btn"
              onClick={handleSubmitBatch}
              disabled={!isReady || submitting}
              style={{
                padding: "0.625rem 1.5rem",
                borderRadius: "0.625rem",
                background: isReady ? "var(--accent)" : "rgba(255,255,255,0.05)",
                color: isReady ? "#fff" : "var(--text-faint)",
                fontWeight: 700,
                fontSize: "0.9375rem",
                border: "1px solid",
                borderColor: isReady ? "var(--accent)" : "var(--border-subtle)",
                cursor: isReady ? "pointer" : "not-allowed",
                boxShadow: isReady ? "0 0 20px var(--accent-glow)" : "none",
                transition: "all 0.2s ease",
                fontFamily: "inherit",
              }}
            >
              Finish Setup →
            </button>
          </div>
        </div>
      </header>

      {/* ── Search Bar Section ── */}
      <div style={{ maxWidth: 1400, margin: "2rem auto 1.5rem", padding: "0 2rem" }}>
        <form onSubmit={handleSearchSubmit} className="search-row" style={{ maxWidth: 540 }}>
          <input
            type="search"
            className="search-input"
            placeholder="Can't find a film? Search titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn-search" disabled={searching}>
            {searching ? "Searching..." : "Search"}
          </button>
        </form>
      </div>

      {error && (
        <div style={{ maxWidth: 1400, margin: "0 auto 1.5rem", padding: "0 2rem", color: "#f87171" }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Rateable Media Cards Grid ── */}
      <div className="media-grid" style={{ maxWidth: 1400, margin: "0 auto" }}>
        {items.map((item) => {
          const userRating = ratings[item.id];
          const year = item.release_date?.slice(0, 4);

          return (
            <div
              key={item.id}
              style={{
                borderRadius: "0.75rem",
                overflow: "hidden",
                background: "var(--bg-surface)",
                border: `1px solid ${userRating ? "var(--accent)" : "var(--border-subtle)"}`,
                boxShadow: userRating ? "0 0 16px var(--accent-glow)" : "none",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Poster Image */}
              <div style={{ position: "relative", aspectRatio: "2/3", background: "var(--bg-card)" }}>
                {item.poster_path ? (
                  <Image
                    src={`${TMDB_IMG}${item.poster_path}`}
                    alt={item.title}
                    fill
                    sizes="180px"
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
                      fontSize: "2.5rem",
                    }}
                  >
                    🎬
                  </div>
                )}

                {/* Rated overlay badge */}
                {userRating && (
                  <div
                    style={{
                      position: "absolute",
                      top: "0.5rem",
                      right: "0.5rem",
                      background: "rgba(0,0,0,0.85)",
                      color: "#fbbf24",
                      padding: "0.2rem 0.5rem",
                      borderRadius: "0.375rem",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      backdropFilter: "blur(4px)",
                      border: "1px solid rgba(251,191,36,0.3)",
                    }}
                  >
                    ★ {userRating.toFixed(1)}
                  </div>
                )}
              </div>

              {/* Card Meta & Inline Star Widget */}
              <div style={{ padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, justifyContent: "space-between" }}>
                <div>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      margin: 0,
                    }}
                    title={item.title}
                  >
                    {item.title}
                  </p>
                  {year && <p style={{ fontSize: "0.75rem", color: "var(--text-faint)", margin: 0 }}>{year}</p>}
                </div>

                {/* Inline Star Rating Control */}
                <CardStarRating
                  value={userRating}
                  onChange={(val) => handleRateItem(item.id, val)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
