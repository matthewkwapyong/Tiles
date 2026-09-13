"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface SearchBarProps {
  defaultValue?: string;
  defaultSource?: string;
  mediaType?: string;
}

/**
 * Pill-shaped glass search bar with Library / TMDB source toggle.
 * Monochrome film-noir edition with cream focus ring.
 */
export default function SearchBar({
  defaultValue = "",
  defaultSource = "db",
  mediaType,
}: SearchBarProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<"db" | "tmdb">(
    defaultSource === "tmdb" ? "tmdb" : "db"
  );

  const buildUrl = (q: string) => {
    const ps = new URLSearchParams();
    if (q) ps.set("q", q);
    if (mediaType) ps.set("type", mediaType);
    ps.set("source", source);
    return `/discover?${ps.toString()}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inputRef.current?.value.trim() ?? "";
    router.push(buildUrl(q));
  };

  const handleClear = () => {
    if (inputRef.current) inputRef.current.value = "";
    const ps = new URLSearchParams();
    if (mediaType) ps.set("type", mediaType);
    router.push(`/discover?${ps.toString()}`);
  };

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      {/* Source Toggle Pill */}
      <div
        style={{
          display: "inline-flex",
          borderRadius: "9999px",
          border: "1px solid var(--border-subtle)",
          background: "rgba(242, 237, 227, 0.03)",
          backdropFilter: "blur(12px)",
          padding: "0.2rem",
          marginBottom: "0.875rem",
        }}
        role="group"
        aria-label="Search source"
      >
        {(["db", "tmdb"] as const).map((s) => {
          const isActive = source === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              id={`source-toggle-${s}`}
              style={{
                padding: "0.35rem 1rem",
                borderRadius: "9999px",
                fontSize: "0.75rem",
                fontWeight: 600,
                fontFamily: "inherit",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s ease",
                background: isActive ? "var(--cream-primary)" : "transparent",
                color: isActive ? "var(--accent-text)" : "var(--text-muted)",
                letterSpacing: "0.04em",
                boxShadow: isActive ? "0 0 12px rgba(242, 237, 227, 0.15)" : "none",
              }}
              aria-pressed={isActive}
            >
              {s === "db" ? "Archive" : "TMDB Live"}
            </button>
          );
        })}
      </div>

      {/* Search Row */}
      <form onSubmit={handleSubmit} className="search-row" role="search">
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          {/* Minimal Search Icon */}
          <svg
            aria-hidden="true"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: "absolute",
              left: "1.125rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>

          <input
            ref={inputRef}
            type="search"
            defaultValue={defaultValue}
            placeholder={
              source === "tmdb"
                ? "Search TMDB globally (auto-saves to archive)..."
                : "Search your local library..."
            }
            className="search-input w-[100%]"
            style={{ paddingLeft: "2.75rem" }}
            aria-label="Search media"
          />

          {defaultValue && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                position: "absolute",
                right: "1rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: "0.25rem",
                fontSize: "0.875rem",
              }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        <button type="submit" className="btn-search">
          Search
        </button>
      </form>
    </div>
  );
}
