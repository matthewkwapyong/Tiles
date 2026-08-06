import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import MediaCard, { MediaSummary } from "@/app/components/MediaCard";
import SearchBar from "./SearchBar";
import SyncButton from "./SyncButton";
import Link from "next/link";

export const metadata = {
  title: "Discover — Tiles",
  description: "Browse and search popular movies and TV shows.",
};

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const PAGE_SIZE = 20;

interface BrowseResponse {
  items: MediaSummary[];
  page: number;
  page_size: number;
}

interface DiscoverPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    page?: string;
    source?: string;
  }>;
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const params = await searchParams;
  const q = params.q ?? "";
  const mediaType = params.type ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const source = params.source === "tmdb" ? "tmdb" : "db";

  // Build backend URL
  const url = new URL("/media", BACKEND_URL);
  if (q) url.searchParams.set("q", q);
  if (mediaType) url.searchParams.set("type", mediaType);
  url.searchParams.set("page", String(page));
  url.searchParams.set("source", source);

  let data: BrowseResponse | null = null;
  let error: string | null = null;

  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    data = await res.json();
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  const items = data?.items ?? [];
  const hasMore = items.length === PAGE_SIZE;

  // Pagination URL builder (preserves all filters)
  const pageUrl = (p: number) => {
    const ps = new URLSearchParams();
    if (q) ps.set("q", q);
    if (mediaType) ps.set("type", mediaType);
    if (source !== "db") ps.set("source", source);
    ps.set("page", String(p));
    return `/discover?${ps.toString()}`;
  };

  // Type filter tab URL builder
  const typeUrl = (t: string) => {
    const ps = new URLSearchParams();
    if (q) ps.set("q", q);
    if (t) ps.set("type", t);
    if (source !== "db") ps.set("source", source);
    return `/discover?${ps.toString()}`;
  };

  // Heading text
  const heading = q
    ? source === "tmdb"
      ? `TMDB results for "${q}"`
      : `Library results for "${q}"`
    : "Discover";

  return (
    <div className="cinema-bg" style={{ minHeight: "100vh" }}>
      <Navbar session={session} />

      <div className="discover-header">
        {/* Page heading + sync button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            margin: "1.5rem 0 1.25rem",
          }}
        >
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {heading}
          </h1>

          {/* Sync button — client island */}
          <SyncButton />
        </div>

        {/* Search bar with source toggle (client island) */}
        <SearchBar defaultValue={q} defaultSource={source} mediaType={mediaType} />

        {/* Type filter tabs */}
        <div className="filter-tabs" role="tablist" aria-label="Filter by type">
          {[
            { label: "All", value: "" },
            { label: "Movies", value: "movie" },
            { label: "TV Shows", value: "tv" },
          ].map(({ label, value }) => (
            <Link
              key={value}
              href={typeUrl(value)}
              role="tab"
              aria-selected={mediaType === value}
              className={`filter-tab${mediaType === value ? " active" : ""}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Error state ── */}
      {error && (
        <div className="empty-state">
          <span className="empty-icon">⚠️</span>
          <p className="empty-title">Could not reach the backend</p>
          <p className="empty-sub">
            Make sure the Axum server is running on port 8000 and the DB has been synced.
          </p>
          <p
            className="empty-sub"
            style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}
          >
            {error}
          </p>
        </div>
      )}

      {/* ── Empty results ── */}
      {!error && items.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">🎬</span>
          <p className="empty-title">
            {q
              ? source === "tmdb"
                ? "No results from TMDB"
                : "Nothing in your library matches"
              : "No media in the cache yet"}
          </p>
          <p className="empty-sub">
            {q && source === "db"
              ? 'Try switching to "TMDB" to search the full catalogue.'
              : !q
              ? 'Click "Sync TMDB" to pull popular titles, or search TMDB directly.'
              : "Try a different search term."}
          </p>
        </div>
      )}

      {/* ── Media grid ── */}
      {items.length > 0 && (
        <>
          {/* Result count / source badge */}
          <p
            style={{
              padding: "0 2rem 0.75rem",
              maxWidth: 1400,
              margin: "0 auto",
              fontSize: "0.875rem",
              color: "var(--text-faint)",
            }}
          >
            {source === "tmdb" && q && (
              <span
                style={{
                  display: "inline-block",
                  marginRight: "0.5rem",
                  padding: "0.1rem 0.5rem",
                  borderRadius: "0.375rem",
                  background: "rgba(99,102,241,0.12)",
                  color: "#a5b4fc",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                }}
              >
                TMDB
              </span>
            )}
            {items.length} title{items.length !== 1 ? "s" : ""}
            {q ? " found" : ""}
          </p>

          <div className="media-grid" role="list" aria-label="Media items">
            {items.map((item) => (
              <div key={item.id} role="listitem">
                <MediaCard item={item} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Pagination ── */}
      {(page > 1 || hasMore) && (
        <nav className="pagination" aria-label="Pagination">
          {page > 1 && (
            <Link href={pageUrl(page - 1)} className="page-link" aria-label="Previous page">
              ← Prev
            </Link>
          )}
          <span className="page-link active" aria-current="page">
            {page}
          </span>
          {hasMore && (
            <Link href={pageUrl(page + 1)} className="page-link" aria-label="Next page">
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
