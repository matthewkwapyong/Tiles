"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface SearchBarProps {
  defaultValue?: string;
  defaultSource?: string;
  mediaType?: string;
}

/**
 * Search bar with Library / TMDB source toggle.
 * On submit, updates the URL with ?q=, ?source=, and the current ?type= filter.
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
    <div>
      {/* Source toggle */}
      <div
        style={{
          display: "inline-flex",
          borderRadius: "0.625rem",
          border: "1px solid var(--border-subtle)",
          overflow: "hidden",
          marginBottom: "0.75rem",
        }}
        role="group"
        aria-label="Search source"
      >
        {(["db", "tmdb"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSource(s)}
            id={`source-toggle-${s}`}
            style={{
              padding: "0.3125rem 0.875rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              fontFamily: "inherit",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
              background:
                source === s ? "var(--accent)" : "transparent",
              color:
                source === s ? "#fff" : "var(--text-muted)",
              letterSpacing: s === "tmdb" ? "0.02em" : undefined,
            }}
            aria-pressed={source === s}
          >
            {s === "db" ? "My Library" : "TMDB"}
          </button>
        ))}
      </div>

      {/* Search row */}
      <form onSubmit={handleSubmit} className="search-row" role="search">
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          {/* Search icon */}
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              position: "absolute",
              left: "0.875rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-faint)",
              pointerEvents: "none",
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>

          <input
            ref={inputRef}
            id="search-input"
            type="search"
            className="search-input"
            placeholder={
              source === "tmdb"
                ? "Search TMDB for any movie or TV show…"
                : "Search your library…"
            }
            defaultValue={defaultValue}
            autoComplete="off"
            style={{
              paddingLeft: "2.5rem",
              paddingRight: defaultValue ? "2.25rem" : "1rem",
            }}
          />

          {defaultValue && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              style={{
                position: "absolute",
                right: "0.625rem",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--text-faint)",
                cursor: "pointer",
                fontSize: "1.125rem",
                lineHeight: 1,
                padding: 0,
              }}
            >
              ×
            </button>
          )}
        </div>

        <button type="submit" className="btn-search" id="search-submit-btn">
          Search
        </button>
      </form>

      {/* Source hint */}
      {source === "tmdb" && (
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--text-faint)",
            marginTop: "-0.5rem",
            marginBottom: "0.75rem",
          }}
        >
          Results are fetched live from TMDB and saved to your library.
        </p>
      )}
    </div>
  );
}
