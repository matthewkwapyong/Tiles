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
 * Monochrome Star Rating Control — 10-point / 5-star precision.
 * Strict film-noir palette: cream, warm white, and charcoal matte glass.
 */
export default function StarRatingWidget({ value, onChange }: StarRatingWidgetProps) {
  const [hoverVal, setHoverVal] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeVal = hoverVal !== null ? hoverVal : value ?? 0;

  const calculateScore = (e: React.MouseEvent<HTMLDivElement>, starIndex: number) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeftHalf = x < rect.width / 2;
    return isLeftHalf ? starIndex * 2 + 1.0 : starIndex * 2 + 2.0;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, starIndex: number) => {
    const score = calculateScore(e, starIndex);
    setHoverVal(score);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>, starIndex: number) => {
    const score = calculateScore(e, starIndex);
    if (value === score) {
      onChange(null);
    } else {
      onChange(score);
    }
  };

  const currentLabel =
    RATING_LABELS[activeVal] ?? (activeVal > 0 ? `${activeVal.toFixed(1)} / 10` : "Unrated");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        padding: "1.25rem",
        borderRadius: "1rem",
        background: "rgba(242, 237, 227, 0.03)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 12px 32px rgba(0,0,0,0.5)",
        maxWidth: 540,
      }}
    >
      {/* Header with Title and Current Value */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: "0.875rem",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--cream-primary)",
          }}
        >
          Your Rating
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          {activeVal > 0 && (
            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: "var(--cream-primary)",
                background: "rgba(242, 237, 227, 0.08)",
                border: "1px solid rgba(242, 237, 227, 0.2)",
                padding: "0.2rem 0.625rem",
                borderRadius: "9999px",
                letterSpacing: "0.02em",
                boxShadow: "0 0 12px rgba(242, 237, 227, 0.1)",
              }}
            >
              ★ {activeVal.toFixed(1)}
            </span>
          )}
          {value !== null && (
            <button
              type="button"
              onClick={() => onChange(null)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-faint)",
                fontSize: "0.75rem",
                cursor: "pointer",
                padding: "0.2rem 0.4rem",
                borderRadius: "9999px",
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--cream-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-faint)")}
              title="Clear rating"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* 5-Star Interactive Row */}
      <div
        ref={containerRef}
        onMouseLeave={() => setHoverVal(null)}
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          padding: "0.25rem 0",
        }}
        role="group"
        aria-label="Rating out of 10"
      >
        {Array.from({ length: 5 }, (_, starIndex) => {
          const starFullPoints = (starIndex + 1) * 2;
          const starHalfPoints = starFullPoints - 1;
          const isFull = activeVal >= starFullPoints;
          const isHalf = !isFull && activeVal >= starHalfPoints;

          return (
            <div
              key={starIndex}
              onMouseMove={(e) => handleMouseMove(e, starIndex)}
              onClick={(e) => handleClick(e, starIndex)}
              style={{
                position: "relative",
                width: 34,
                height: 34,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.12s ease",
                transform:
                  hoverVal !== null && Math.ceil(hoverVal / 2) === starIndex + 1
                    ? "scale(1.18)"
                    : "scale(1)",
              }}
              title={`Rate ${(starIndex + 1) * 2}/10`}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                style={{
                  filter: isFull || isHalf ? "drop-shadow(0 0 8px rgba(242, 237, 227, 0.35))" : "none",
                  transition: "filter 0.2s ease",
                }}
              >
                <defs>
                  <linearGradient id={`star-half-${starIndex}`}>
                    <stop offset="50%" stopColor="#f2ede3" />
                    <stop offset="50%" stopColor="rgba(242, 237, 227, 0.15)" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill={
                    isFull
                      ? "#f2ede3"
                      : isHalf
                      ? `url(#star-half-${starIndex})`
                      : "rgba(242, 237, 227, 0.15)"
                  }
                  stroke={isFull || isHalf ? "#f2ede3" : "rgba(242, 237, 227, 0.25)"}
                  strokeWidth="1"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          );
        })}
      </div>

      {/* Semantic Helper Label */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontStyle: "italic" }}>
          {currentLabel}
        </span>
        <span style={{ fontSize: "0.6875rem", color: "var(--text-faint)", letterSpacing: "0.04em" }}>
          CLICK TO RATE (0.5 STEP)
        </span>
      </div>
    </div>
  );
}
