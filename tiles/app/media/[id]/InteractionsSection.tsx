"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import AddToListModal from "@/app/components/AddToListModal";

const BACKEND = "/api/backend";
const TMDB_IMG_FACE = "https://image.tmdb.org/t/p/w185";
const TMDB_IMG_W500 = "https://image.tmdb.org/t/p/w500";

export interface CastMember {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
  order?: number;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department?: string;
  profile_path?: string | null;
}

export interface MediaDetail {
  id: number;
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  original_title?: string;
  overview?: string;
  tagline?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  status?: string | null;
  genres: string[];
  runtime?: number | null;
  cast_crew?: {
    cast?: CastMember[];
    crew?: CrewMember[];
  };
  vote_average?: number | null;
  vote_count?: number | null;
}

interface ReviewItem {
  id: number;
  user_id: string;
  user_name?: string;
  user_image?: string;
  body: string;
  created_at: string;
  updated_at: string;
}

interface WatchLogEntry {
  id: number;
  media_item_id: number;
  watched_at: string;
  notes?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * 5-Star Interactive Rating Widget for the "YOUR RATING" card.
 * Supports half-star precision (1 to 10 rating points = 0.5 to 5.0 stars).
 */
function CardStarWidget({
  value,
  onChange,
}: {
  value: number | null;
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
      style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}
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
              width: 28,
              height: 28,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)",
              transform:
                hoverVal !== null && Math.ceil(hoverVal / 2) === starIndex + 1
                  ? "scale(1.2)"
                  : "scale(1)",
            }}
            title={`Rate ${((starIndex + 1) * 2) / 2} stars`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24">
              <defs>
                <linearGradient id={`your-rating-half-${starIndex}`}>
                  <stop offset="50%" stopColor="var(--cream-primary)" />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill={
                  isFull
                    ? "var(--cream-primary)"
                    : isHalf
                    ? `url(#your-rating-half-${starIndex})`
                    : "none"
                }
                stroke="var(--cream-primary)"
                strokeWidth={isFull || isHalf ? "1" : "1.75"}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

export default function InteractionsSection({
  item,
  directors,
  year,
}: {
  item: MediaDetail;
  directors: CrewMember[];
  year: string | null;
}) {
  const mediaId = item.id;

  // Ratings state
  const [rating, setRating] = useState<number | null>(null);

  // Watchlist state
  const [inWatchlist, setInWatchlist] = useState<boolean>(false);

  // Review state
  const [myReviewText, setMyReviewText] = useState<string>("");
  const [hasMyReview, setHasMyReview] = useState<boolean>(false);
  const [communityReviews, setCommunityReviews] = useState<ReviewItem[]>([]);
  const [reviewSaving, setReviewSaving] = useState<boolean>(false);

  // Watched log state
  const [watchLogs, setWatchLogs] = useState<WatchLogEntry[]>([]);
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [logNotes, setLogNotes] = useState<string>("");
  const [loggingWatch, setLoggingWatch] = useState<boolean>(false);

  // Lists (Folders) state
  const [showListModal, setShowListModal] = useState<boolean>(false);
  const [listCount, setListCount] = useState<number>(0);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      // 1. Rating
      const resRating = await fetch(`${BACKEND}/media/${mediaId}/rating`, { credentials: "include" });
      if (resRating.ok) {
        const data = await resRating.json();
        setRating(data.rating);
      }

      // 2. Watchlist
      const resWl = await fetch(`${BACKEND}/media/${mediaId}/watchlist`, { credentials: "include" });
      if (resWl.ok) {
        const data = await resWl.json();
        setInWatchlist(data.in_watchlist);
      }

      // 3. My Review
      const resMyRev = await fetch(`${BACKEND}/media/${mediaId}/review/me`, { credentials: "include" });
      if (resMyRev.ok) {
        const data: ReviewItem | null = await resMyRev.json();
        if (data) {
          setMyReviewText(data.body);
          setHasMyReview(true);
        }
      }

      // 4. Community Reviews
      const resComRev = await fetch(`${BACKEND}/media/${mediaId}/reviews`, { credentials: "include" });
      if (resComRev.ok) {
        const data: ReviewItem[] = await resComRev.json();
        setCommunityReviews(data);
      }

      // 5. Watch logs
      const resLogs = await fetch(`${BACKEND}/media/${mediaId}/watched`, { credentials: "include" });
      if (resLogs.ok) {
        const data: WatchLogEntry[] = await resLogs.json();
        setWatchLogs(data);
      }

      // 6. User lists membership
      const resLists = await fetch(`${BACKEND}/media/${mediaId}/lists`, { credentials: "include" });
      if (resLists.ok) {
        const data = await resLists.json();
        const active = Array.isArray(data) ? data.filter((l: { in_list: boolean }) => l.in_list).length : 0;
        setListCount(active);
      }
    } catch (e) {
      console.error("Failed loading media interactions:", e);
    }
  }, [mediaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Rating Handlers ────────────────────────────────────────────────────────
  const handleSetRating = async (val: number | null) => {
    setRating(val);

    try {
      if (val === null) {
        await fetch(`${BACKEND}/media/${mediaId}/rating`, {
          method: "DELETE",
          credentials: "include",
        });
      } else {
        await fetch(`${BACKEND}/media/${mediaId}/rating`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: val }),
          credentials: "include",
        });

        // Rating automatically logs a watch event; refresh watch logs
        const resLogs = await fetch(`${BACKEND}/media/${mediaId}/watched`, { credentials: "include" });
        if (resLogs.ok) {
          const data: WatchLogEntry[] = await resLogs.json();
          setWatchLogs(data);
        }
      }
    } catch (e) {
      console.error("Rating error:", e);
      loadData();
    }
  };

  // ── Watchlist Handler ──────────────────────────────────────────────────────
  const handleToggleWatchlist = async () => {
    const nextState = !inWatchlist;
    setInWatchlist(nextState);

    try {
      await fetch(`${BACKEND}/media/${mediaId}/watchlist`, {
        method: nextState ? "POST" : "DELETE",
        credentials: "include",
      });
    } catch (e) {
      console.error("Watchlist error:", e);
      setInWatchlist(!nextState);
    }
  };

  // ── Review Handlers ────────────────────────────────────────────────────────
  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myReviewText.trim()) return;

    setReviewSaving(true);
    try {
      const res = await fetch(`${BACKEND}/media/${mediaId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: myReviewText.trim() }),
        credentials: "include",
      });

      if (res.ok) {
        setHasMyReview(true);
        // Refresh community reviews
        const resComRev = await fetch(`${BACKEND}/media/${mediaId}/reviews`, { credentials: "include" });
        if (resComRev.ok) setCommunityReviews(await resComRev.json());
      }
    } catch (e) {
      console.error("Save review error:", e);
    } finally {
      setReviewSaving(false);
    }
  };

  const handleDeleteReview = async () => {
    setReviewSaving(true);
    try {
      const res = await fetch(`${BACKEND}/media/${mediaId}/review`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setMyReviewText("");
        setHasMyReview(false);
        // Refresh community reviews
        const resComRev = await fetch(`${BACKEND}/media/${mediaId}/reviews`, { credentials: "include" });
        if (resComRev.ok) setCommunityReviews(await resComRev.json());
      }
    } catch (e) {
      console.error("Delete review error:", e);
    } finally {
      setReviewSaving(false);
    }
  };

  // ── Watched Log Handlers ───────────────────────────────────────────────────
  const handleAddWatchLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingWatch(true);

    try {
      const res = await fetch(`${BACKEND}/media/${mediaId}/watched`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          watched_at: logDate,
          notes: logNotes.trim() || undefined,
        }),
        credentials: "include",
      });

      if (res.ok) {
        setShowLogModal(false);
        setLogNotes("");
        // Reload watch logs
        const resLogs = await fetch(`${BACKEND}/media/${mediaId}/watched`, { credentials: "include" });
        if (resLogs.ok) setWatchLogs(await resLogs.json());
      }
    } catch (e) {
      console.error("Add watch log error:", e);
    } finally {
      setLoggingWatch(false);
    }
  };

  const handleDeleteWatchLog = async (logId: number) => {
    try {
      const res = await fetch(`${BACKEND}/watched/${logId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setWatchLogs((prev) => prev.filter((l) => l.id !== logId));
      }
    } catch (e) {
      console.error("Delete watch log error:", e);
    }
  };

  // TMDB Stars computation
  const tmdbScoreOutOf5 = item.vote_average ? item.vote_average / 2 : null;
  const tmdbScoreFormatted = tmdbScoreOutOf5
    ? Math.round(tmdbScoreOutOf5 * 10) / 10
    : null;

  // Principal Cast list
  const cast = (item.cast_crew?.cast ?? [])
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .slice(0, 10);

  // Latest watch log entry for the sidebar card
  const latestWatchLog = watchLogs.length > 0 ? watchLogs[0] : null;

  return (
    <>
      {/* ── Top Hero Grid (Poster, Title/Metadata, Rating & Watch Log) ── */}
      <div className="detail-hero-grid">
        {/* Left: Floating Framed Poster with Darkroom Cream Matting */}
        <div className="detail-poster-col">
          <div
            style={{
              borderRadius: "1.25rem",
              background: "rgba(17, 17, 16, 0.8)",
              border: "1px solid rgba(242, 237, 227, 0.12)",
              padding: "0.875rem",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
              backdropFilter: "blur(20px)",
              width: "100%",
            }}
          >
            <div
              style={{
                borderRadius: "0.75rem",
                border: "3.5px solid var(--cream-primary)",
                overflow: "hidden",
                position: "relative",
                aspectRatio: "2/3",
                background: "#0a0a09",
                lineHeight: 0,
              }}
            >
              {item.poster_path ? (
                <Image
                  src={`${TMDB_IMG_W500}${item.poster_path}`}
                  alt={`${item.title} poster`}
                  fill
                  sizes="240px"
                  priority
                  style={{
                    objectFit: "cover",
                    filter: "contrast(1.06) saturate(0.85)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "3rem",
                    color: "var(--text-faint)",
                  }}
                >
                  🎬
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle: Metadata & Actions */}
        <div className="detail-meta-col">
          {/* Pills Row: Media Type + Genres */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.875rem" }}>
            <span
              style={{
                borderRadius: "9999px",
                padding: "0.22rem 0.75rem",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                fontSize: "0.6875rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {item.media_type === "movie" ? "Movie" : "Series"}
            </span>
            {item.genres.map((g) => (
              <span
                key={g}
                style={{
                  borderRadius: "9999px",
                  padding: "0.22rem 0.75rem",
                  background: "rgba(242, 237, 227, 0.03)",
                  border: "1px solid rgba(242, 237, 227, 0.12)",
                  color: "var(--cream-soft)",
                  fontSize: "0.75rem",
                  letterSpacing: "0.02em",
                }}
              >
                {g}
              </span>
            ))}
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: "clamp(2rem, 3.5vw, 3.25rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              color: "var(--cream-primary)",
              margin: "0 0 0.5rem",
            }}
          >
            {item.title}
          </h1>

          {/* Tagline */}
          {item.tagline && (
            <p
              style={{
                fontSize: "1.0625rem",
                color: "var(--text-muted)",
                fontStyle: "italic",
                margin: "0 0 1rem",
              }}
            >
              “{item.tagline}”
            </p>
          )}

          {/* Metadata Row: Year, Duration, Director */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.25rem",
              flexWrap: "wrap",
              fontSize: "0.875rem",
              color: "var(--text-muted)",
              marginBottom: "1rem",
            }}
          >
            {year && <span>{year}</span>}
            {item.runtime && (
              <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>
                  {Math.floor(item.runtime / 60)}h {item.runtime % 60}m
                </span>
              </span>
            )}
            {directors.length > 0 && (
              <span>
                Directed by{" "}
                <strong style={{ color: "var(--cream-primary)", fontWeight: 600 }}>
                  {directors.map((d) => d.name).join(", ")}
                </strong>
              </span>
            )}
          </div>

          {/* TMDB Star Rating */}
          {tmdbScoreOutOf5 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.875rem",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ display: "flex", gap: "3px", color: "var(--cream-primary)" }}>
                {[1, 2, 3, 4, 5].map((s) => {
                  const filled = tmdbScoreOutOf5 >= s - 0.25;
                  return (
                    <svg
                      key={s}
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill={filled ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  );
                })}
              </div>
              <span style={{ color: "var(--cream-primary)", fontWeight: 700 }}>
                {tmdbScoreFormatted}
              </span>
              {item.vote_count && (
                <span style={{ color: "var(--text-muted)", fontSize: "0.8125rem" }}>
                  {item.vote_count.toLocaleString()} votes
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            {/* In watchlist button */}
            <button
              id="btn-watchlist-toggle"
              onClick={handleToggleWatchlist}
              style={{
                padding: "0.55rem 1.35rem",
                borderRadius: "9999px",
                background: inWatchlist ? "var(--cream-primary)" : "rgba(242, 237, 227, 0.05)",
                border: `1px solid ${inWatchlist ? "var(--cream-primary)" : "rgba(242, 237, 227, 0.16)"}`,
                color: inWatchlist ? "#0a0a09" : "var(--cream-primary)",
                boxShadow: inWatchlist
                  ? "0 0 16px rgba(242, 237, 227, 0.25)"
                  : "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
                fontWeight: 600,
                fontSize: "0.8125rem",
                letterSpacing: "0.02em",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                fontFamily: "inherit",
              }}
            >
              {inWatchlist ? "✓ In watchlist" : "+ Watchlist"}
            </button>

            {/* Watch logged button */}
            <button
              id="btn-log-watch"
              onClick={() => setShowLogModal(true)}
              style={{
                padding: "0.55rem 1.35rem",
                borderRadius: "9999px",
                background: watchLogs.length > 0 ? "var(--cream-primary)" : "rgba(242, 237, 227, 0.05)",
                border: `1px solid ${watchLogs.length > 0 ? "var(--cream-primary)" : "rgba(242, 237, 227, 0.16)"}`,
                color: watchLogs.length > 0 ? "#0a0a09" : "var(--cream-primary)",
                boxShadow: watchLogs.length > 0
                  ? "0 0 16px rgba(242, 237, 227, 0.25)"
                  : "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
                fontWeight: 600,
                fontSize: "0.8125rem",
                letterSpacing: "0.02em",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                fontFamily: "inherit",
              }}
            >
              {watchLogs.length > 0 ? "✓ Watch logged" : "👁 Log watch"}
            </button>

            {/* Add to List / Folder button */}
            <button
              id="btn-add-to-list"
              onClick={() => setShowListModal(true)}
              style={{
                padding: "0.55rem 1.35rem",
                borderRadius: "9999px",
                background: listCount > 0 ? "var(--cream-primary)" : "rgba(242, 237, 227, 0.05)",
                border: `1px solid ${listCount > 0 ? "var(--cream-primary)" : "rgba(242, 237, 227, 0.16)"}`,
                color: listCount > 0 ? "#0a0a09" : "var(--cream-primary)",
                boxShadow: listCount > 0
                  ? "0 0 16px rgba(242, 237, 227, 0.25)"
                  : "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
                fontWeight: 600,
                fontSize: "0.8125rem",
                letterSpacing: "0.02em",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                fontFamily: "inherit",
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>{listCount > 0 ? `✓ In ${listCount} ${listCount === 1 ? "list" : "lists"}` : "+ List"}</span>
            </button>
          </div>
        </div>

        {/* Right Column: YOUR RATING Card & WATCH LOG Card (At same level as Media Title) */}
        <div className="detail-sidebar-col">
          {/* ── Card 1: YOUR RATING ── */}
          <div
            className="frosted-glass"
            style={{
              borderRadius: "1.125rem",
              background: "rgba(242, 237, 227, 0.03)",
              border: "1px solid rgba(242, 237, 227, 0.1)",
              padding: "1.25rem 1.5rem",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
            }}
          >
            <h3
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                margin: "0 0 1rem",
              }}
            >
              Your Rating
            </h3>

            {/* Interactive Stars */}
            <CardStarWidget value={rating} onChange={handleSetRating} />

            {/* Subtitle */}
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-muted)",
                margin: "0.75rem 0 0",
              }}
            >
              {rating !== null ? `${(rating / 2).toFixed(1)} out of 5` : "Click to rate"}
            </p>
          </div>

          {/* ── Card 2: WATCH LOG ── */}
          <div
            className="frosted-glass"
            style={{
              borderRadius: "1.125rem",
              background: "rgba(242, 237, 227, 0.03)",
              border: "1px solid rgba(242, 237, 227, 0.1)",
              padding: "1.25rem 1.5rem",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
            }}
          >
            <h3
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                margin: "0 0 1rem",
              }}
            >
              Watch Log
            </h3>

            {latestWatchLog ? (
              <div>
                <div style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
                  {/* Film icon badge */}
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  >
                    <svg
                      width="16"
                      height="16"
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

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--cream-primary)", margin: 0 }}>
                      {watchLogs.length === 1 ? "First viewing" : `Viewing #${watchLogs.length}`}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.15rem 0 0" }}>
                      {new Date(latestWatchLog.watched_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {latestWatchLog.notes && (
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-muted)",
                      fontStyle: "italic",
                      margin: "0.75rem 0 0",
                      lineHeight: 1.5,
                    }}
                  >
                    "{latestWatchLog.notes}"
                  </p>
                )}

                {/* Footer link to See Full History / Log more */}
                <div style={{ marginTop: "1rem", textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => setShowHistoryModal(true)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                      textDecoration: "none",
                      padding: "0.25rem 0.5rem",
                      fontFamily: "inherit",
                      transition: "color 0.15s ease",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--cream-primary)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                  >
                    See full history ({watchLogs.length})
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: "0 0 0.875rem" }}>
                  No viewings recorded yet.
                </p>
                <button
                  type="button"
                  onClick={() => setShowLogModal(true)}
                  className="pill-btn-ghost"
                  style={{
                    width: "100%",
                    padding: "0.45rem 1rem",
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                  }}
                >
                  + Log a watch
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Lower Section (Synopsis, Cast, Reviews) ── */}
      <div className="detail-lower-layout">
        {/* Synopsis */}
        {item.overview && (
          <div style={{ marginBottom: "2.75rem" }}>
            <h2
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                margin: "0 0 1.25rem",
              }}
            >
              Synopsis
            </h2>
            <p
              style={{
                fontSize: "1rem",
                lineHeight: 1.75,
                color: "#d8d2c6",
                margin: 0,
                maxWidth: "75ch",
              }}
            >
              {item.overview}
            </p>
          </div>
        )}

        {/* Cast */}
        {cast.length > 0 && (
          <div style={{ marginBottom: "3rem" }}>
            <h2
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                margin: "0 0 1.25rem",
              }}
            >
              Cast
            </h2>
            <div
              style={{
                display: "flex",
                gap: "1rem",
                overflowX: "auto",
                paddingBottom: "0.5rem",
                scrollbarWidth: "none",
              }}
            >
              {cast.map((member) => (
                <div
                  key={member.id}
                  style={{
                    width: 136,
                    flexShrink: 0,
                    borderRadius: "1.25rem",
                    background: "rgba(242, 237, 227, 0.025)",
                    border: "1px solid rgba(242, 237, 227, 0.08)",
                    padding: "0.75rem",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
                  }}
                >
                  {/* Monogram Box: dark rounded square */}
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "1 / 1",
                      borderRadius: "1rem",
                      background: "rgba(255, 255, 255, 0.035)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    aria-hidden="true"
                  >
                    <span
                      style={{
                        fontSize: "1.375rem",
                        fontWeight: 500,
                        color: "#8f897c",
                        letterSpacing: "0.04em",
                        fontFamily: "inherit",
                      }}
                    >
                      {getInitials(member.name)}
                    </span>
                  </div>

                  {/* Names */}
                  <p
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "var(--cream-primary)",
                      margin: "0.625rem 0 0.15rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={member.name}
                  >
                    {member.name}
                  </p>
                  {member.character && (
                    <p
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--text-muted)",
                        margin: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={member.character}
                    >
                      {member.character}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews Section */}
        <div style={{ marginTop: "1rem" }}>
          <h2
            style={{
              fontSize: "0.6875rem",
              fontWeight: 600,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              margin: "0 0 1rem",
            }}
          >
            Reviews & Notes
          </h2>

          {/* Write review form */}
          <form onSubmit={handleSaveReview} style={{ marginBottom: "2rem" }}>
            <textarea
              placeholder="Write your review or darkroom notes..."
              value={myReviewText}
              onChange={(e) => setMyReviewText(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: "0.875rem 1rem",
                borderRadius: "0.75rem",
                background: "rgba(242, 237, 227, 0.03)",
                border: "1px solid rgba(242, 237, 227, 0.12)",
                color: "var(--cream-primary)",
                fontSize: "0.875rem",
                fontFamily: "inherit",
                outline: "none",
                resize: "vertical",
                marginBottom: "0.75rem",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: "0.625rem" }}>
              <button
                type="submit"
                disabled={reviewSaving || !myReviewText.trim()}
                className="pill-btn-solid"
                style={{
                  padding: "0.5rem 1.25rem",
                  fontSize: "0.8125rem",
                  opacity: !myReviewText.trim() ? 0.4 : 1,
                  cursor: !myReviewText.trim() ? "not-allowed" : "pointer",
                }}
              >
                {reviewSaving ? "Saving..." : hasMyReview ? "Update Review" : "Post Review"}
              </button>
              {hasMyReview && (
                <button
                  type="button"
                  onClick={handleDeleteReview}
                  disabled={reviewSaving}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "9999px",
                    background: "transparent",
                    border: "1px solid rgba(242, 237, 227, 0.14)",
                    color: "var(--text-muted)",
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Delete Review
                </button>
              )}
            </div>
          </form>

          {/* Community Reviews List */}
          {communityReviews.length === 0 ? (
            <p style={{ color: "var(--text-faint)", fontStyle: "italic", fontSize: "0.875rem" }}>
              No community reviews yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {communityReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="frosted-glass"
                  style={{
                    padding: "1rem 1.25rem",
                    borderRadius: "0.875rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "9999px",
                        background: "rgba(242, 237, 227, 0.08)",
                        border: "1px solid rgba(242, 237, 227, 0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                        color: "var(--cream-primary)",
                        overflow: "hidden",
                      }}
                    >
                      {rev.user_image ? (
                        <Image src={rev.user_image} alt="" width={28} height={28} style={{ objectFit: "cover" }} />
                      ) : (
                        (rev.user_name?.[0] ?? "?").toUpperCase()
                      )}
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--cream-primary)", margin: 0 }}>
                        {rev.user_name ?? "Anonymous"}
                      </p>
                      <p style={{ fontSize: "0.6875rem", color: "var(--text-faint)", margin: 0 }}>
                        {new Date(rev.updated_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0 }}>
                    {rev.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Log Watch Modal ── */}
      {showLogModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 10, 9, 0.8)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
          onClick={() => setShowLogModal(false)}
        >
          <div
            className="frosted-glass"
            style={{
              background: "rgba(17, 17, 16, 0.95)",
              border: "1px solid rgba(242, 237, 227, 0.18)",
              borderRadius: "1.125rem",
              padding: "2rem",
              width: "100%",
              maxWidth: 440,
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "var(--cream-primary)",
                letterSpacing: "-0.02em",
                marginBottom: "1.25rem",
              }}
            >
              Log a Watch
            </h3>
            <form onSubmit={handleAddWatchLog}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: "0.5rem",
                }}
              >
                Watched Date
              </label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.625rem",
                  background: "rgba(242, 237, 227, 0.04)",
                  border: "1px solid rgba(242, 237, 227, 0.14)",
                  color: "var(--cream-primary)",
                  fontSize: "0.9375rem",
                  marginBottom: "1.25rem",
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              <label
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: "0.5rem",
                }}
              >
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 35mm projection at the repertory cinema"
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.625rem",
                  background: "rgba(242, 237, 227, 0.04)",
                  border: "1px solid rgba(242, 237, 227, 0.14)",
                  color: "var(--cream-primary)",
                  fontSize: "0.9375rem",
                  marginBottom: "1.5rem",
                  fontFamily: "inherit",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  style={{
                    padding: "0.625rem 1.25rem",
                    borderRadius: "9999px",
                    background: "transparent",
                    border: "1px solid rgba(242, 237, 227, 0.12)",
                    color: "var(--text-muted)",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loggingWatch}
                  className="pill-btn-solid"
                  style={{
                    padding: "0.625rem 1.5rem",
                    fontSize: "0.875rem",
                    fontFamily: "inherit",
                    cursor: "pointer",
                  }}
                >
                  {loggingWatch ? "Saving..." : "Save Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Full History Modal ── */}
      {showHistoryModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 10, 9, 0.8)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
          onClick={() => setShowHistoryModal(false)}
        >
          <div
            className="frosted-glass"
            style={{
              background: "rgba(17, 17, 16, 0.95)",
              border: "1px solid rgba(242, 237, 227, 0.18)",
              borderRadius: "1.125rem",
              padding: "2rem",
              width: "100%",
              maxWidth: 480,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 24px 64px rgba(0, 0, 0, 0.9)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: 700,
                  color: "var(--cream-primary)",
                  margin: 0,
                }}
              >
                Watch History ({watchLogs.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-faint)",
                  cursor: "pointer",
                  fontSize: "1rem",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.625rem", flex: 1, paddingRight: "0.25rem" }}>
              {watchLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    background: "rgba(242, 237, 227, 0.03)",
                    border: "1px solid rgba(242, 237, 227, 0.1)",
                    fontSize: "0.8125rem",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--cream-primary)", fontWeight: 600 }}>
                      {new Date(log.watched_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    {log.notes && (
                      <span style={{ color: "var(--text-muted)", marginLeft: "0.75rem", fontStyle: "italic" }}>
                        "{log.notes}"
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteWatchLog(log.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-faint)",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      padding: "0.25rem",
                    }}
                    title="Delete entry"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => {
                  setShowHistoryModal(false);
                  setShowLogModal(true);
                }}
                className="pill-btn-solid"
                style={{
                  padding: "0.5rem 1.25rem",
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                }}
              >
                + Log Another Watch
              </button>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add To List / Folder Modal */}
      <AddToListModal
        mediaId={mediaId}
        mediaTitle={item.title}
        isOpen={showListModal}
        onClose={() => setShowListModal(false)}
        onListsChanged={loadData}
      />
    </>
  );
}
