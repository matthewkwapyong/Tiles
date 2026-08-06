"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import StarRatingWidget from "@/app/components/StarRatingWidget";

const BACKEND = "/api/backend";

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

export default function InteractionsSection({ mediaId }: { mediaId: number }) {
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
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [logNotes, setLogNotes] = useState<string>("");
  const [loggingWatch, setLoggingWatch] = useState<boolean>(false);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      // 1. Rating
      const resRating = await fetch(`${BACKEND}/api/media/${mediaId}/rating`, { credentials: "include" });
      if (resRating.ok) {
        const data = await resRating.json();
        setRating(data.rating);
      }

      // 2. Watchlist
      const resWl = await fetch(`${BACKEND}/api/media/${mediaId}/watchlist`, { credentials: "include" });
      if (resWl.ok) {
        const data = await resWl.json();
        setInWatchlist(data.in_watchlist);
      }

      // 3. My Review
      const resMyRev = await fetch(`${BACKEND}/api/media/${mediaId}/review/me`, { credentials: "include" });
      if (resMyRev.ok) {
        const data: ReviewItem | null = await resMyRev.json();
        if (data) {
          setMyReviewText(data.body);
          setHasMyReview(true);
        }
      }

      // 4. Community Reviews
      const resComRev = await fetch(`${BACKEND}/api/media/${mediaId}/reviews`, { credentials: "include" });
      if (resComRev.ok) {
        const data: ReviewItem[] = await resComRev.json();
        setCommunityReviews(data);
      }

      // 5. Watch logs
      const resLogs = await fetch(`${BACKEND}/api/media/${mediaId}/watched`, { credentials: "include" });
      if (resLogs.ok) {
        const data: WatchLogEntry[] = await resLogs.json();
        setWatchLogs(data);
      }
    } catch (e) {
      console.error("Failed loading media interactions:", e);
    }
  }, [mediaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Rating Handlers ────────────────────────────────────────────────────────
  const handleSetRating = async (val: number) => {
    const newRating = val === rating ? null : val;
    setRating(newRating);

    try {
      if (newRating === null) {
        await fetch(`${BACKEND}/api/media/${mediaId}/rating`, {
          method: "DELETE",
          credentials: "include",
        });
      } else {
        await fetch(`${BACKEND}/api/media/${mediaId}/rating`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: newRating }),
          credentials: "include",
        });
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
      await fetch(`${BACKEND}/api/media/${mediaId}/watchlist`, {
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
      const res = await fetch(`${BACKEND}/api/media/${mediaId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: myReviewText.trim() }),
        credentials: "include",
      });

      if (res.ok) {
        setHasMyReview(true);
        // Refresh community reviews
        const resComRev = await fetch(`${BACKEND}/api/media/${mediaId}/reviews`, { credentials: "include" });
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
      const res = await fetch(`${BACKEND}/api/media/${mediaId}/review`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setMyReviewText("");
        setHasMyReview(false);
        // Refresh community reviews
        const resComRev = await fetch(`${BACKEND}/api/media/${mediaId}/reviews`, { credentials: "include" });
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
      const res = await fetch(`${BACKEND}/api/media/${mediaId}/watched`, {
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
        const resLogs = await fetch(`${BACKEND}/api/media/${mediaId}/watched`, { credentials: "include" });
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
      const res = await fetch(`${BACKEND}/api/watched/${logId}`, {
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

  return (
    <div style={{ marginTop: "2rem" }}>
      {/* ── Action Buttons Bar ── */}
      <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap", alignItems: "center" }}>
        {/* Watchlist button */}
        <button
          id="btn-watchlist-toggle"
          onClick={handleToggleWatchlist}
          style={{
            padding: "0.625rem 1.25rem",
            borderRadius: "0.625rem",
            background: inWatchlist ? "rgba(99,102,241,0.2)" : "transparent",
            border: `1px solid ${inWatchlist ? "var(--accent)" : "var(--border-subtle)"}`,
            color: inWatchlist ? "#a5b4fc" : "var(--text-primary)",
            fontWeight: 600,
            fontSize: "0.9375rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.15s ease",
            fontFamily: "inherit",
          }}
        >
          {inWatchlist ? "✓ In Watchlist" : "+ Watchlist"}
        </button>

        {/* Log Watch button */}
        <button
          id="btn-log-watch"
          onClick={() => setShowLogModal(true)}
          style={{
            padding: "0.625rem 1.25rem",
            borderRadius: "0.625rem",
            background: "transparent",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
            fontWeight: 600,
            fontSize: "0.9375rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.15s ease",
            fontFamily: "inherit",
          }}
        >
          <span>👁 Log Watch</span>
          {watchLogs.length > 0 && (
            <span
              style={{
                background: "var(--bg-surface)",
                padding: "0.1rem 0.45rem",
                borderRadius: "9999px",
                fontSize: "0.75rem",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {watchLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* ── Interactive 10-Point / 5-Star Rating Widget ── */}
      <div style={{ marginTop: "1.75rem" }}>
        <StarRatingWidget value={rating} onChange={handleSetRating} />
      </div>

      {/* ── Watched Logs List ── */}
      {watchLogs.length > 0 && (
        <div style={{ marginTop: "1.5rem", maxWidth: 540 }}>
          <h3 style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.75rem" }}>
            Watch Log History ({watchLogs.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {watchLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.625rem 0.875rem",
                  borderRadius: "0.5rem",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "0.875rem",
                }}
              >
                <div>
                  <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    {new Date(log.watched_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  {log.notes && (
                    <span style={{ color: "var(--text-muted)", marginLeft: "0.625rem", fontStyle: "italic" }}>
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
                    fontSize: "0.8125rem",
                    padding: "0.2rem",
                  }}
                  title="Delete log entry"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Log Watch Modal ── */}
      {showLogModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
          onClick={() => setShowLogModal(false)}
        >
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "1rem",
              padding: "1.5rem",
              width: "100%",
              maxWidth: 420,
              boxShadow: "0 20px 48px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "1rem" }}>
              Log a Watch
            </h3>
            <form onSubmit={handleAddWatchLog}>
              <label style={{ display: "block", fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.375rem" }}>
                Watched Date
              </label>
              <input
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.625rem",
                  borderRadius: "0.5rem",
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  fontSize: "0.9375rem",
                  marginBottom: "1rem",
                  fontFamily: "inherit",
                }}
              />

              <label style={{ display: "block", fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: "0.375rem" }}>
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Watched in cinema with friends"
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.625rem",
                  borderRadius: "0.5rem",
                  background: "var(--bg-base)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  fontSize: "0.9375rem",
                  marginBottom: "1.25rem",
                  fontFamily: "inherit",
                }}
              />

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    background: "transparent",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-muted)",
                    fontSize: "0.875rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loggingWatch}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "0.5rem",
                    background: "var(--accent)",
                    border: "none",
                    color: "#fff",
                    fontSize: "0.875rem",
                    fontWeight: 600,
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

      {/* ── Reviews Section ── */}
      <div style={{ marginTop: "3rem" }}>
        <h2 className="section-title">Reviews</h2>

        {/* User's Own Review Form */}
        <form onSubmit={handleSaveReview} style={{ marginBottom: "2rem", maxWidth: 680 }}>
          <textarea
            placeholder="Write your review here..."
            value={myReviewText}
            onChange={(e) => setMyReviewText(e.target.value)}
            rows={4}
            style={{
              width: "100%",
              padding: "0.875rem 1rem",
              borderRadius: "0.75rem",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              fontSize: "0.9375rem",
              fontFamily: "inherit",
              outline: "none",
              resize: "vertical",
              marginBottom: "0.75rem",
            }}
          />
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="submit"
              disabled={reviewSaving || !myReviewText.trim()}
              style={{
                padding: "0.5rem 1.25rem",
                borderRadius: "0.5rem",
                background: "var(--accent)",
                border: "none",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: "pointer",
                opacity: !myReviewText.trim() ? 0.6 : 1,
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
                  borderRadius: "0.5rem",
                  background: "transparent",
                  border: "1px solid var(--border-subtle)",
                  color: "#f87171",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                }}
              >
                Delete Review
              </button>
            )}
          </div>
        </form>

        {/* Community Reviews Stream */}
        {communityReviews.length === 0 ? (
          <p style={{ color: "var(--text-faint)", fontStyle: "italic", fontSize: "0.9375rem" }}>
            No reviews yet. Be the first to leave a review!
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: 680 }}>
            {communityReviews.map((rev) => (
              <div
                key={rev.id}
                style={{
                  padding: "1rem 1.25rem",
                  borderRadius: "0.75rem",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.625rem" }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "9999px",
                      background: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: "0.8125rem",
                      color: "#fff",
                      overflow: "hidden",
                    }}
                  >
                    {rev.user_image ? (
                      <Image src={rev.user_image} alt="" width={32} height={32} style={{ objectFit: "cover" }} />
                    ) : (
                      (rev.user_name?.[0] ?? "?").toUpperCase()
                    )}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)" }}>
                      {rev.user_name ?? "Anonymous"}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-faint)" }}>
                      {new Date(rev.updated_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: "0.9375rem", color: "var(--text-muted)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {rev.body}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
