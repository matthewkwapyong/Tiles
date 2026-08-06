"use client";

import { useState, useRef } from "react";

interface StarRatingWidgetProps {
  value: number | null;
  onChange: (val: number | null) => void;
}

const RATING_LABELS: Record<number, string> = {
  1.0: "Appalling (1/10)",
  1.5: "Horrible (1.5/10)",
  2.0: "Very Bad (2/10)",
  2.5: "Bad (2.5/10)",
  3.0: "Poor (3/10)",
  3.5: "Subpar (3.5/10)",
  4.0: "Weak (4/10)",
  4.5: "Below Average (4.5/10)",
  5.0: "Average (5/10)",
  5.5: "Decent (5.5/10)",
  6.0: "Fair (6/10)",
  6.5: "Good (6.5/10)",
  7.0: "Very Good (7/10)",
  7.5: "Great (7.5/10)",
  8.0: "Excellent (8/10)",
  8.5: "Superb (8.5/10)",
  9.0: "Amazing (9/10)",
  9.5: "Near Masterpiece (9.5/10)",
  10.0: "Masterpiece (10/10)",
};

/**
 * Premium 10-point / 5-star interactive rating control.
 * Supports half-star precision (19 steps from 1.0 to 10.0).
 * Features half-star clip rendering, hover preview, score label, and clear button.
 */
export default function StarRatingWidget({ value, onChange }: StarRatingWidgetProps) {
  const [hoverVal, setHoverVal] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeVal = hoverVal !== null ? hoverVal : value ?? 0;

  // Calculates 1.0 - 10.0 score based on mouse position across the 5 star elements
  const calculateScore = (e: React.MouseEvent<HTMLDivElement>, starIndex: number) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;

    // Each star index (0..4) corresponds to 2.0 rating points.
    // Left half = (starIndex * 2) + 1.0
    // Right half = (starIndex * 2) + 2.0
    const points = isLeftHalf ? starIndex * 2 + 1.0 : starIndex * 2 + 2.0;
    return points;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, starIndex: number) => {
    const score = calculateScore(e, starIndex);
    setHoverVal(score);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>, starIndex: number) => {
    const score = calculateScore(e, starIndex);
    // Toggling off if clicking exact same value
    if (value === score) {
      onChange(null);
    } else {
      onChange(score);
    }
  };

  const currentLabel = RATING_LABELS[activeVal] ?? (activeVal > 0 ? `${activeVal.toFixed(1)} / 10` : "No Rating");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.625rem",
        padding: "1.25rem",
        borderRadius: "0.875rem",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        maxWidth: 540,
      }}
    >
      {/* Header with Title and Current Value */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.9375rem", fontWeight: 600, color: "var(--text-primary)" }}>
          Your Rating
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          {activeVal > 0 && (
            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: "#fbbf24",
                background: "rgba(251, 191, 36, 0.12)",
                padding: "0.2rem 0.6rem",
                borderRadius: "9999px",
                border: "1px solid rgba(251, 191, 36, 0.25)",
              }}
            >
              ★ {activeVal.toFixed(1)} / 10 ({(activeVal / 2).toFixed(1)} ★)
            </span>
          )}
          {value !== null && (
            <button
              id="clear-rating-btn"
              type="button"
              onClick={() => {
                setHoverVal(null);
                onChange(null);
              }}
              style={{
                background: "transparent",
                border: "1px solid var(--border-subtle)",
                borderRadius: "0.375rem",
                color: "var(--text-muted)",
                fontSize: "0.75rem",
                fontWeight: 500,
                padding: "0.2rem 0.5rem",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Remove your rating"
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* Interactive 5-Star Row (each star has left/right half = 0.5 star / 1.0 point) */}
      <div
        ref={containerRef}
        style={{ display: "flex", gap: "0.375rem", alignItems: "center", cursor: "pointer" }}
        onMouseLeave={() => setHoverVal(null)}
        role="slider"
        aria-label="Rating slider"
        aria-valuemin={1}
        aria-valuemax={10}
        aria-valuenow={value ?? 0}
      >
        {Array.from({ length: 5 }, (_, starIndex) => {
          // Points needed for full star and half star
          const starFullPoints = (starIndex + 1) * 2;
          const starHalfPoints = starFullPoints - 1;

          const isFull = activeStars(activeVal, starFullPoints);
          const isHalf = !isFull && activeStars(activeVal, starHalfPoints);

          return (
            <div
              key={starIndex}
              onMouseMove={(e) => handleMouseMove(e, starIndex)}
              onClick={(e) => handleClick(e, starIndex)}
              style={{
                position: "relative",
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.12s ease",
                transform: hoverVal !== null && Math.ceil(hoverVal / 2) === starIndex + 1 ? "scale(1.18)" : "scale(1)",
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                style={{ overflow: "visible", filter: isFull || isHalf ? "drop-shadow(0 0 8px rgba(251, 191, 36, 0.4))" : "none" }}
              >
                <defs>
                  <linearGradient id={`star-half-grad-${starIndex}`}>
                    <stop offset="50%" stopColor="#fbbf24" />
                    <stop offset="50%" stopColor="var(--text-faint)" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill={isFull ? "#fbbf24" : isHalf ? `url(#star-half-grad-${starIndex})` : "var(--text-faint)"}
                  stroke={isFull || isHalf ? "#f59e0b" : "transparent"}
                  strokeWidth="0.5"
                />
              </svg>
            </div>
          );
        })}

        {/* Dynamic Label preview */}
        <span
          style={{
            marginLeft: "0.75rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: hoverVal !== null ? "#fbbf24" : "var(--text-muted)",
            fontStyle: activeVal === 0 ? "italic" : "normal",
          }}
        >
          {currentLabel}
        </span>
      </div>
    </div>
  );
}

function activeStars(activeVal: number, targetPoints: number): boolean {
  return activeVal >= targetPoints;
}
