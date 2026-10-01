"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import MediaCard from "@/app/components/MediaCard";
import type {
  UserStats,
  TasteBreakdown,
  PaginatedRatings,
  PaginatedReviews,
} from "./page";

interface ProfileClientProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  stats: UserStats;
  taste: TasteBreakdown | null;
  initialRatings: PaginatedRatings;
  initialReviews: PaginatedReviews;
}

const TMDB_THUMB = "https://image.tmdb.org/t/p/w92";

export default function ProfileClient({
  user,
  stats,
  taste,
  initialRatings,
  initialReviews,
}: ProfileClientProps) {
  const [activeTab, setActiveTab] = useState<"ratings" | "reviews">("ratings");

  const initials = user.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (user.email?.[0] ?? "?").toUpperCase();

  const joinedYearMonth = stats.joined_at
    ? new Date(stats.joined_at).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : null;

  const hasTasteVector =
    taste !== null &&
    (taste.top_genres.length > 0 || taste.least_favorite_genres.length > 0);

  const maxTopWeight = taste?.top_genres.length
    ? Math.max(...taste.top_genres.map((g) => Math.abs(g.weight)), 0.01)
    : 1;

  return (
    <main style={{ maxWidth: 1160, margin: "0 auto", padding: "2.5rem 1.5rem 6rem" }}>
      {/* ── 1. HEADER CARD ─────────────────────────────────────────────────── */}
      <section
        style={{
          padding: "2rem 2.25rem",
          borderRadius: "1.25rem",
          background: "#141412",
          border: "1px solid rgba(242, 237, 227, 0.15)",
          boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6)",
          marginBottom: "2.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          {/* Avatar */}
          <div
            style={{
              width: "5rem",
              height: "5rem",
              borderRadius: "9999px",
              background: "#1c1c19",
              border: "2px solid rgba(242, 237, 227, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.75rem",
              fontWeight: 800,
              color: "#f2ede3",
              overflow: "hidden",
              boxShadow: "0 0 24px rgba(242, 237, 227, 0.08)",
              flexShrink: 0,
            }}
          >
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "User avatar"}
                width={80}
                height={80}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initials
            )}
          </div>

          <div>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 700,
                color: "#f2ede3",
                margin: 0,
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
              }}
            >
              {user.name ?? "Film Enthusiast"}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginTop: "0.4rem" }}>
              <span style={{ fontSize: "0.875rem", color: "#8f897c" }}>{user.email}</span>
              {joinedYearMonth && (
                <>
                  <span style={{ color: "rgba(242, 237, 227, 0.2)" }}>•</span>
                  <span style={{ fontSize: "0.8125rem", color: "#8f897c" }}>
                    Member since {joinedYearMonth}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Calibration Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "9999px",
              fontSize: "0.8125rem",
              fontWeight: 600,
              letterSpacing: "0.03em",
              background: hasTasteVector
                ? "rgba(29, 158, 117, 0.12)"
                : "rgba(212, 175, 55, 0.12)",
              border: hasTasteVector
                ? "1px solid rgba(29, 158, 117, 0.4)"
                : "1px solid rgba(212, 175, 55, 0.4)",
              color: hasTasteVector ? "#1D9E75" : "#d4af37",
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: hasTasteVector ? "#1D9E75" : "#d4af37",
                boxShadow: hasTasteVector
                  ? "0 0 8px #1D9E75"
                  : "0 0 8px #d4af37",
              }}
            />
            {hasTasteVector ? "Taste Vector Calibrated" : "Calibration Pending"}
          </span>
        </div>
      </section>

      {/* ── 2. STATS ROW (4 Stat Cards) ───────────────────────────────────── */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          marginBottom: "3rem",
        }}
      >
        {/* Total Watched */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderRadius: "1rem",
            background: "#141412",
            border: "1px solid rgba(242, 237, 227, 0.12)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#8f897c" }}>
              Total Watched
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#f2ede3", marginTop: "0.2rem" }}>
              {stats.total_watched}
            </div>
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8f897c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </div>

        {/* Total Watchlist */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderRadius: "1rem",
            background: "#141412",
            border: "1px solid rgba(242, 237, 227, 0.12)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#8f897c" }}>
              Watchlist
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#d4af37", marginTop: "0.2rem" }}>
              {stats.total_watchlist}
            </div>
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </div>

        {/* Total Rated */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderRadius: "1rem",
            background: "#141412",
            border: "1px solid rgba(242, 237, 227, 0.12)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#8f897c" }}>
              Total Rated
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#f2ede3", marginTop: "0.2rem" }}>
              {stats.total_rated}
            </div>
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f2ede3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>

        {/* Total Reviewed */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderRadius: "1rem",
            background: "#141412",
            border: "1px solid rgba(242, 237, 227, 0.12)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "#8f897c" }}>
              Total Reviews
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#1D9E75", marginTop: "0.2rem" }}>
              {stats.total_reviewed}
            </div>
          </div>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </div>
      </section>

      {/* ── 3. TASTE BREAKDOWN SECTION ───────────────────────────────────── */}
      <section style={{ marginBottom: "4rem" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#f2ede3",
              margin: 0,
            }}
          >
            Taste Breakdown & Genre Profile
          </h2>
        </div>
        <p style={{ fontSize: "0.875rem", color: "#8f897c", marginTop: 0, marginBottom: "1.5rem" }}>
          Real-time weights computed from your rating history across the 26-dimensional genre vector space.
        </p>

        {!hasTasteVector ? (
          /* Empty State — No taste vector yet */
          <div
            style={{
              padding: "3rem 2rem",
              borderRadius: "1.25rem",
              background: "#141412",
              border: "1px dashed rgba(242, 237, 227, 0.2)",
              textAlign: "center",
            }}
          >
            <div style={{ display: "inline-flex", padding: "1rem", borderRadius: "50%", background: "rgba(242, 237, 227, 0.05)", marginBottom: "1rem" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#8f897c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="6"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <h3
              style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f2ede3", margin: "0 0 0.5rem" }}
            >
              Taste Calibration Required
            </h3>
            <p style={{ fontSize: "0.9375rem", color: "#8f897c", maxWidth: 500, margin: "0 auto 1.5rem" }}>
              Your personalized genre taste profile hasn't been generated yet. Rate movies during onboarding to build your 26-dimensional vector embedding.
            </p>
            <Link
              href="/onboarding"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.75rem",
                borderRadius: "9999px",
                background: "#f2ede3",
                color: "#0a0a09",
                fontWeight: 700,
                fontSize: "0.875rem",
                textDecoration: "none",
                boxShadow: "0 0 20px rgba(242, 237, 227, 0.2)",
                transition: "transform 0.15s ease",
              }}
            >
              Calibrate Film Taste →
            </Link>
          </div>
        ) : (
          <div>
            {/* Top Genres (Top 5) */}
            {taste.top_genres.length > 0 && (
              <div style={{ marginBottom: "2rem" }}>
                <h3
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#1D9E75",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15"/>
                  </svg>
                  Top Favorite Genres
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "1rem",
                  }}
                >
                  {taste.top_genres.map((genre) => {
                    const pct = Math.min(100, Math.max(10, (Math.abs(genre.weight) / maxTopWeight) * 100));
                    return (
                      <div
                        key={genre.genre_name}
                        style={{
                          padding: "1rem 1.25rem",
                          borderRadius: "0.875rem",
                          background: "#141412",
                          border: "1px solid rgba(242, 237, 227, 0.12)",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.625rem",
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "#f2ede3" }}>
                            {genre.genre_name}
                          </span>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "#1D9E75",
                              background: "rgba(29, 158, 117, 0.15)",
                              border: "1px solid rgba(29, 158, 117, 0.3)",
                              padding: "0.15rem 0.5rem",
                              borderRadius: "9999px",
                            }}
                          >
                            +{genre.weight.toFixed(3)}
                          </span>
                        </div>
                        {/* Bar */}
                        <div
                          style={{
                            height: 6,
                            borderRadius: 9999,
                            background: "rgba(242, 237, 227, 0.08)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              background: "linear-gradient(90deg, #1D9E75, #41c998)",
                              borderRadius: 9999,
                              boxShadow: "0 0 10px rgba(29, 158, 117, 0.4)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Least Favorite Genres (Bottom 3) — Visually De-emphasized */}
            {taste.least_favorite_genres.length > 0 && (
              <div
                style={{
                  marginTop: "2rem",
                  padding: "1.25rem",
                  borderRadius: "1rem",
                  background: "rgba(20, 20, 18, 0.5)",
                  border: "1px solid rgba(242, 237, 227, 0.06)",
                }}
              >
                <h3
                  style={{
                    fontSize: "0.8125rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#8f897c",
                    margin: "0 0 1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                  Least Favorite Genres
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: "0.75rem",
                  }}
                >
                  {taste.least_favorite_genres.map((genre) => (
                    <div
                      key={genre.genre_name}
                      style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "0.625rem",
                        background: "rgba(242, 237, 227, 0.02)",
                        border: "1px solid rgba(242, 237, 227, 0.06)",
                        opacity: 0.75,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontSize: "0.84375rem", color: "#8f897c", fontWeight: 600 }}>
                        {genre.genre_name}
                      </span>
                      <span
                        style={{
                          fontSize: "0.71875rem",
                          color: "#8f897c",
                          fontFamily: "monospace",
                        }}
                      >
                        {genre.weight < 0 ? "" : "+"}{genre.weight.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── 4. TABBED SECTIONS (Ratings & Reviews) ────────────────────────── */}
      <section>
        {/* Tab Selection Navigation Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            borderBottom: "1px solid rgba(242, 237, 227, 0.12)",
            marginBottom: "2rem",
            paddingBottom: "0.25rem",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("ratings")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.75rem 0.5rem",
              fontSize: "1.125rem",
              fontWeight: 700,
              color: activeTab === "ratings" ? "#f2ede3" : "#8f897c",
              borderBottom:
                activeTab === "ratings"
                  ? "2px solid #f2ede3"
                  : "2px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            My Ratings ({initialRatings.total})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reviews")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.75rem 0.5rem",
              fontSize: "1.125rem",
              fontWeight: 700,
              color: activeTab === "reviews" ? "#f2ede3" : "#8f897c",
              borderBottom:
                activeTab === "reviews"
                  ? "2px solid #f2ede3"
                  : "2px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            My Reviews ({initialReviews.total})
          </button>
        </div>

        {/* TAB 1: RATINGS GRID */}
        {activeTab === "ratings" && (
          <div>
            {initialRatings.items.length === 0 ? (
              <div
                style={{
                  padding: "3rem 1.5rem",
                  borderRadius: "1rem",
                  background: "#141412",
                  border: "1px solid rgba(242, 237, 227, 0.08)",
                  textAlign: "center",
                }}
              >
                <div style={{ display: "inline-flex", padding: "0.875rem", borderRadius: "50%", background: "rgba(242, 237, 227, 0.05)", marginBottom: "0.75rem" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8f897c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
                <h4 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#f2ede3", margin: "0 0 0.25rem" }}>
                  No Ratings Logged
                </h4>
                <p style={{ fontSize: "0.875rem", color: "#8f897c", margin: 0 }}>
                  Browse films or series and rate them on a 1.0 – 10.0 scale to build your archive.
                </p>
              </div>
            ) : (
              <div className="media-grid">
                {initialRatings.items.map((item) => (
                  <div key={item.media.id} style={{ position: "relative" }}>
                    <MediaCard item={item.media} />
                    {/* User Rating Overlay Badge */}
                    <div
                      style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        background: "#0a0a09",
                        border: "1px solid rgba(242, 237, 227, 0.3)",
                        color: "#f2ede3",
                        fontSize: "0.75rem",
                        fontWeight: 800,
                        padding: "0.2rem 0.55rem",
                        borderRadius: "9999px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.8)",
                        pointerEvents: "none",
                        zIndex: 10,
                      }}
                    >
                      ★ {item.rating.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REVIEWS LIST */}
        {activeTab === "reviews" && (
          <div>
            {initialReviews.items.length === 0 ? (
              <div
                style={{
                  padding: "3rem 1.5rem",
                  borderRadius: "1rem",
                  background: "#141412",
                  border: "1px solid rgba(242, 237, 227, 0.08)",
                  textAlign: "center",
                }}
              >
                <div style={{ display: "inline-flex", padding: "0.875rem", borderRadius: "50%", background: "rgba(242, 237, 227, 0.05)", marginBottom: "0.75rem" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8f897c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </div>
                <h4 style={{ fontSize: "1.125rem", fontWeight: 700, color: "#f2ede3", margin: "0 0 0.25rem" }}>
                  No Reviews Written
                </h4>
                <p style={{ fontSize: "0.875rem", color: "#8f897c", margin: 0 }}>
                  Share your thoughts on movies you've watched to see your reviews listed here.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {initialReviews.items.map((rev) => (
                  <article
                    key={rev.id}
                    style={{
                      padding: "1.25rem 1.5rem",
                      borderRadius: "1rem",
                      background: "#141412",
                      border: "1px solid rgba(242, 237, 227, 0.12)",
                      boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
                      display: "flex",
                      gap: "1.25rem",
                      alignItems: "flex-start",
                    }}
                  >
                    {/* Poster Thumbnail */}
                    <Link
                      href={`/media/${rev.media.id}`}
                      style={{
                        position: "relative",
                        width: 48,
                        height: 72,
                        borderRadius: "0.5rem",
                        overflow: "hidden",
                        background: "#1c1c19",
                        flexShrink: 0,
                        border: "1px solid rgba(242, 237, 227, 0.1)",
                      }}
                    >
                      {rev.media.poster_path ? (
                        <Image
                          src={`${TMDB_THUMB}${rev.media.poster_path}`}
                          alt={rev.media.title}
                          fill
                          sizes="48px"
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            color: "#8f897c",
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                            <line x1="7" y1="2" x2="7" y2="22" />
                            <line x1="17" y1="2" x2="17" y2="22" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                          </svg>
                        </div>
                      )}
                    </Link>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                          marginBottom: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <Link
                          href={`/media/${rev.media.id}`}
                          style={{
                            fontWeight: 700,
                            fontSize: "1.0625rem",
                            color: "#f2ede3",
                            textDecoration: "none",
                          }}
                        >
                          {rev.media.title}
                        </Link>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          {rev.rating !== null && (
                            <span
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: "#f2ede3",
                                background: "rgba(242, 237, 227, 0.1)",
                                border: "1px solid rgba(242, 237, 227, 0.2)",
                                padding: "0.15rem 0.5rem",
                                borderRadius: "9999px",
                              }}
                            >
                              ★ {rev.rating.toFixed(1)}
                            </span>
                          )}

                          <time style={{ fontSize: "0.75rem", color: "#8f897c" }}>
                            {new Date(rev.created_at).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </time>
                        </div>
                      </div>

                      {/* Review Excerpt / Body */}
                      <blockquote
                        style={{
                          fontSize: "0.9375rem",
                          lineHeight: 1.5,
                          color: "#e8e2d5",
                          margin: 0,
                          paddingLeft: "0.75rem",
                          borderLeft: "2px solid rgba(242, 237, 227, 0.25)",
                        }}
                      >
                        "{rev.body}"
                      </blockquote>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
