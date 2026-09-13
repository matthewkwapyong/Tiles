import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import MediaCard, { MediaSummary } from "@/app/components/MediaCard";
import SearchBar from "./SearchBar";
import SyncButton from "./SyncButton";
import Link from "next/link";

export const metadata = {
  title: "Tiles — Discover Archive",
  description: "Browse and search cinema in the darkroom archive.",
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
    console.log(res)
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    data = await res.json();
    console.log(data)
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  const items = data?.items ?? [];
  const hasMore = items.length === PAGE_SIZE;

  // Pagination URL builder
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
      : `Archive results for "${q}"`
    : "Discover Archive";

  return (
    <div className="cinema-bg" style={{ minHeight: "100vh" }}>
      <Navbar session={session} />

      <div className="discover-header">
        {/* Page Heading + Sync Button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            flexWrap: "wrap",
            margin: "2rem 0 1.5rem",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "var(--cream-primary)",
                margin: 0,
              }}
            >
              {heading}
            </h1>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: "0.25rem 0 0" }}>
              Explore cataloged features and series.
            </p>
          </div>

          <SyncButton />
        </div>

        {/* Pill Search Bar with Source Toggle */}
        <SearchBar defaultValue={q} defaultSource={source} mediaType={mediaType} />

        {/* Pill Filter Tabs (All / Movies / TV Shows — Active Tab gets cream glow border) */}
        <div className="filter-tabs" role="tablist" aria-label="Filter by type">
          {[
            { label: "All Titles", value: "" },
            { label: "Films", value: "movie" },
            { label: "Series", value: "tv" },
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
          <span className="empty-icon">⊘</span>
          <p className="empty-title">Unable to reach archive</p>
          <p className="empty-sub">
            Ensure the backend engine is running. ({error})
          </p>
        </div>
      )}

      {/* ── Empty state ── */}
      {!error && items.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">🎬</span>
          <p className="empty-title">No entries found</p>
          <p className="empty-sub">
            Try adjusting your search terms or switch to "TMDB Live" above to pull new titles into the archive.
          </p>
        </div>
      )}

      {/* ── Media grid ── */}
      {items.length > 0 && (
        <div className="media-grid" role="list" aria-label="Media items">
          {items.map((item) => (
            <div key={item.id} role="listitem">
              <MediaCard item={item} />
            </div>
          ))}
        </div>
      )}

      {/* ── Centered Pagination ── */}
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
