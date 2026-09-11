"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MediaSummary } from "@/app/components/MediaCard";

const BACKEND = "/api/backend";
const TMDB_IMG = "https://image.tmdb.org/t/p/w342";
const MIN_RATINGS = 10;

/**
 * Compact inline star rating bar for onboarding poster cards.
 * 5 stars with half-star precision (1.0 to 10.0 rating points).
 * Film-noir monochrome cream (#f2ede3) and warm gray.
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
      style={{ display: "flex", gap: "0.25rem", alignItems: "center", justifyContent: "center" }}
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
            onClick={() => {
              const score = hoverVal !== null ? hoverVal : (starIndex + 1) * 2;
              onChange(score === value ? null : score);
            }}
            style={{
              position: "relative",
              width: 22,
              height: 22,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)",
              transform: hoverVal !== null && Math.ceil(hoverVal / 2) === starIndex + 1 ? "scale(1.2)" : "scale(1)",
            }}
            title={`Rate ${((starIndex + 1) * 2).toFixed(0)}/10`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <defs>
                <linearGradient id={`film-star-half-${starIndex}`}>
                  <stop offset="50%" stopColor="var(--cream-primary)" />
                  <stop offset="50%" stopColor="rgba(242, 237, 227, 0.15)" />
                </linearGradient>
              </defs>
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={
                  isFull
                    ? "var(--cream-primary)"
                    : isHalf
                    ? `url(#film-star-half-${starIndex})`
                    : "rgba(242, 237, 227, 0.15)"
                }
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

      // Transition to home
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1500);
    } catch (err) {
      console.error("Batch rating error:", err);
      setError(err instanceof Error ? err.message : "Error submitting ratings");
      setSubmitting(false);
    }
  };

  // If submitting, render full-screen film-noir recommendation calculation overlay
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
            width: 64,
            height: 64,
            borderRadius: "9999px",
            border: "2px solid rgba(242, 237, 227, 0.15)",
            borderTopColor: "var(--cream-primary)",
            animation: "spin 1s linear infinite",
            marginBottom: "2rem",
            boxShadow: "0 0 24px rgba(242, 237, 227, 0.15)",
          }}
        />
        <h2 style={{ fontSize: "1.625rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--cream-primary)", marginBottom: "0.5rem" }}>
          Developing Taste Profile...
        </h2>
        <p style={{ color: "var(--text-muted)", maxWidth: 420, fontSize: "0.9375rem", lineHeight: 1.6 }}>
          Calibrating collaborative vectors from your {ratedCount} ratings. Preparing your personal film archive.
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="cinema-bg" style={{ minHeight: "100vh", paddingBottom: "6rem" }}>
      {/* ── Sticky Glass Progress Header ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "rgba(10, 10, 9, 0.88)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(242, 237, 227, 0.12)",
          padding: "1rem 2rem",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
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
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontWeight: 700, fontSize: "1.125rem", letterSpacing: "-0.02em", color: "var(--cream-primary)" }}>
                Tiles
              </span>
              <span style={{ color: "var(--text-faint)" }}>—</span>
              <span style={{ fontSize: "0.875rem", color: "var(--cream-secondary)", letterSpacing: "0.02em" }}>
                Curate Your Taste
              </span>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: "0.25rem 0 0" }}>
              Rate at least <strong style={{ color: "var(--cream-primary)" }}>{MIN_RATINGS} titles</strong> to initialize your recommendation engine.
            </p>
          </div>

          {/* Glowing Cream Progress Bar & Continue Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div style={{ width: 160 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  marginBottom: "0.375rem",
                  color: isReady ? "var(--cream-bright)" : "var(--text-muted)",
                }}
              >
                <span>{ratedCount} of {MIN_RATINGS} rated</span>
                <span>{Math.min(100, Math.round((ratedCount / MIN_RATINGS) * 100))}%</span>
              </div>
              <div
                style={{
                  width: "100%",
                  height: 6,
                  borderRadius: 9999,
                  background: "rgba(242, 237, 227, 0.08)",
                  overflow: "hidden",
                  border: "1px solid rgba(242, 237, 227, 0.12)",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, (ratedCount / MIN_RATINGS) * 100)}%`,
                    background: "var(--cream-primary)",
                    boxShadow: isReady
                      ? "0 0 12px rgba(242, 237, 227, 0.6)"
                      : "0 0 8px rgba(242, 237, 227, 0.25)",
                    transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              </div>
            </div>

            <button
              id="finish-onboarding-btn"
              onClick={handleSubmitBatch}
              disabled={!isReady || submitting}
              className={isReady ? "pill-btn-solid" : "pill-btn-ghost"}
              style={{
                padding: "0.625rem 1.6rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: isReady ? "pointer" : "not-allowed",
                opacity: isReady ? 1 : 0.4,
              }}
            >
              Continue to Tiles →
            </button>
          </div>
        </div>
      </header>

      {/* ── Pill Search Bar Section ── */}
      <div style={{ maxWidth: 1400, margin: "2.5rem auto 1.5rem", padding: "0 2rem" }}>
        <form onSubmit={handleSearchSubmit} className="search-row" style={{ maxWidth: 540 }}>
          <input
            type="search"
            className="search-input"
            placeholder="Search films to rate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn-search" disabled={searching}>
            {searching ? "Searching..." : "Search"}
          </button>
        </form>
      </div>

      {error && (
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto 1.5rem",
            padding: "0 2rem",
            color: "var(--cream-primary)",
            fontSize: "0.875rem",
          }}
        >
          Notice: {error}
        </div>
      )}

      {/* ── Curated Rateable Media Grid ── */}
      <div className="media-grid" style={{ maxWidth: 1400, margin: "0 auto", padding: "0 2rem" }}>
        {items.map((item) => {
          const userRating = ratings[item.id];
          const year = item.release_date?.slice(0, 4);

          return (
            <div
              key={item.id}
              className="frosted-glass poster-hover-wrapper"
              style={{
                borderRadius: "1rem",
                overflow: "hidden",
                border: userRating
                  ? "1px solid var(--cream-primary)"
                  : "1px solid rgba(242, 237, 227, 0.12)",
                boxShadow: userRating
                  ? "0 0 20px rgba(242, 237, 227, 0.18)"
                  : "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Poster Image with monochrome desaturated filter */}
              <div style={{ position: "relative", aspectRatio: "2/3", background: "rgba(10, 10, 9, 0.8)", overflow: "hidden" }}>
                {item.poster_path ? (
                  <Image
                    src={`${TMDB_IMG}${item.poster_path}`}
                    alt={item.title}
                    fill
                    sizes="200px"
                    className="poster-img"
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
                      fontSize: "2rem",
                      color: "var(--cream-muted)",
                    }}
                  >
                    🎞
                  </div>
                )}

                {/* Rated overlay badge */}
                {userRating && (
                  <div
                    style={{
                      position: "absolute",
                      top: "0.5rem",
                      right: "0.5rem",
                      background: "rgba(10, 10, 9, 0.85)",
                      color: "var(--cream-primary)",
                      padding: "0.2rem 0.55rem",
                      borderRadius: "9999px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      backdropFilter: "blur(12px)",
                      border: "1px solid rgba(242, 237, 227, 0.3)",
                      boxShadow: "0 0 10px rgba(242, 237, 227, 0.2)",
                    }}
                  >
                    ★ {userRating.toFixed(1)}
                  </div>
                )}
              </div>

              {/* Card Meta & Inline Star Widget */}
              <div
                style={{
                  padding: "0.875rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  flex: 1,
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "var(--cream-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      margin: 0,
                    }}
                    title={item.title}
                  >
                    {item.title}
                  </p>
                  {year && (
                    <p style={{ fontSize: "0.75rem", color: "var(--text-faint)", margin: "0.15rem 0 0" }}>
                      {year}
                    </p>
                  )}
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
