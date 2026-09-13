"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MediaSummary } from "@/app/components/MediaCard";

const TMDB_IMG = "https://image.tmdb.org/t/p/w92";

/**
 * Interactive Search Dialogue & Navbar Trigger.
 * Film-Noir Monochrome aesthetic with CMD+K keyboard shortcut.
 */
export default function NavSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<"db" | "tmdb">("db");
  const [results, setResults] = useState<MediaSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut (Cmd+K / Ctrl+K) to toggle search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-focus input when modal opens & reset query state when closing
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  // Debounced search query fetching
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const url = `/api/backend/media?q=${encodeURIComponent(
          query.trim()
        )}&source=${source}&page=1`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setResults((data.items ?? []).slice(0, 6)); // Top 6 quick results
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error("Failed to fetch search suggestions", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query, source]);

  // Handle submit (Go to full discover page)
  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    setIsOpen(false);
    if (trimmed) {
      router.push(`/discover?q=${encodeURIComponent(trimmed)}&source=${source}`);
    } else {
      router.push(`/discover`);
    }
  };

  // Keyboard navigation within results list (Arrow Up / Down, Enter, Esc)
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < results.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && results[selectedIndex]) {
        e.preventDefault();
        const item = results[selectedIndex];
        setIsOpen(false);
        router.push(`/media/${item.id}`);
      } else {
        handleSubmit(e);
      }
    }
  };

  return (
    <>
      {/* ── Navbar Trigger Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="nav-search-btn"
        aria-label="Open search dialog (Ctrl+K)"
        title="Search titles (Ctrl+K)"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: 0.85 }}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="nav-search-text">Search...</span>
        <kbd className="nav-search-kbd">⌘K</kbd>
      </button>

      {/* ── Search Dialogue Overlay ── */}
      {isOpen && (
        <div
          className="search-modal-overlay"
          onClick={() => setIsOpen(false)}
          onKeyDown={handleModalKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label="Search media archive"
        >
          <div
            ref={modalRef}
            className="search-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Input Row */}
            <form onSubmit={handleSubmit} className="search-modal-input-wrap">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--text-muted)", flexShrink: 0 }}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(-1);
                }}
                placeholder={
                  source === "tmdb"
                    ? "Search TMDB globally..."
                    : "Search archive titles..."
                }
                className="search-modal-input"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setResults([]);
                    inputRef.current?.focus();
                  }}
                  className="search-modal-clear"
                  aria-label="Clear input"
                >
                  ✕
                </button>
              )}

              {/* Source Toggle Pills */}
              <div className="search-modal-source-toggle">
                <button
                  type="button"
                  onClick={() => setSource("db")}
                  className={`source-pill ${source === "db" ? "active" : ""}`}
                >
                  Archive
                </button>
                <button
                  type="button"
                  onClick={() => setSource("tmdb")}
                  className={`source-pill ${source === "tmdb" ? "active" : ""}`}
                >
                  TMDB
                </button>
              </div>
            </form>

            {/* Results / Status Body */}
            <div className="search-modal-body">
              {loading && (
                <div className="search-modal-status">
                  <div className="search-spinner" />
                  <span>Searching catalog...</span>
                </div>
              )}

              {!loading && query.trim() && results.length === 0 && (
                <div className="search-modal-status">
                  <span>No entries found for "{query}"</span>
                </div>
              )}

              {!loading && results.length > 0 && (
                <div className="search-results-list" role="listbox">
                  {results.map((item, index) => {
                    const year = item.release_date?.slice(0, 4);
                    const isSelected = index === selectedIndex;

                    return (
                      <Link
                        key={item.id}
                        href={`/media/${item.id}`}
                        onClick={() => setIsOpen(false)}
                        className={`search-result-item ${
                          isSelected ? "selected" : ""
                        }`}
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        {/* Mini Poster */}
                        <div className="search-result-poster">
                          {item.poster_path ? (
                            <Image
                              src={`${TMDB_IMG}${item.poster_path}`}
                              alt={item.title}
                              fill
                              sizes="36px"
                              style={{ objectFit: "cover" }}
                            />
                          ) : (
                            <div className="poster-placeholder-sm">🎬</div>
                          )}
                        </div>

                        {/* Title & Metadata */}
                        <div className="search-result-info">
                          <div className="search-result-title-row">
                            <span className="search-result-title">
                              {item.title}
                            </span>
                            {year && (
                              <span className="search-result-year">{year}</span>
                            )}
                          </div>
                          <div className="search-result-sub-row">
                            <span className="search-result-type">
                              {item.media_type === "movie" ? "Film" : "Series"}
                            </span>
                            {item.genres && item.genres.length > 0 && (
                              <span className="search-result-genre">
                                • {item.genres.slice(0, 2).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Rating */}
                        {item.vote_average ? (
                          <div className="search-result-rating">
                            ★ {item.vote_average.toFixed(1)}
                          </div>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              )}

              {!query.trim() && (
                <div className="search-modal-hint">
                  <p>Type a movie or series title to begin searching.</p>
                  <div className="search-shortcuts-row">
                    <span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
                    <span><kbd>↵</kbd> Select</span>
                    <span><kbd>ESC</kbd> Close</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer view all button */}
            {query.trim() && (
              <div className="search-modal-footer">
                <button
                  type="button"
                  onClick={() => handleSubmit()}
                  className="search-modal-view-all"
                >
                  View all results for "{query}" in Discover →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
