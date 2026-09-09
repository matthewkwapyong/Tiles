import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import MediaCard, { MediaSummary } from "@/app/components/MediaCard";
import Link from "next/link";
import { headers } from "next/headers";

export const metadata = {
  title: "Recommendations — Tiles",
  description: "Personalized movie and TV show recommendations.",
};

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const PAGE_SIZE = 20;

interface BrowseResponse {
  items: MediaSummary[];
  page: number;
  page_size: number;
}

interface RecommendationsPageProps {
  searchParams: Promise<{
    type?: string;
    page?: string;
  }>;
}

export default async function RecommendationsPage({ searchParams }: RecommendationsPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const params = await searchParams;
  const mediaType = params.type ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") ?? "";

  // Build backend URL matching Axum route /recommedation
  const url = new URL("/recommedation", BACKEND_URL);
  if (mediaType) url.searchParams.set("media_type", mediaType);
  url.searchParams.set("page", String(page));

  let data: BrowseResponse | null = null;
  let error: string | null = null;

  try {
    const res = await fetch(url.toString(), {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    data = await res.json();
    console.log(data)
  } catch (e) {
    error = e instanceof Error ? e.message : "Unknown error";
  }

  const items = data?.items ?? [];
  const hasMore = items.length === PAGE_SIZE;

  const pageUrl = (p: number) => {
    const ps = new URLSearchParams();
    if (mediaType) ps.set("type", mediaType);
    ps.set("page", String(p));
    return `/recommendations?${ps.toString()}`;
  };

  const typeUrl = (t: string) => {
    const ps = new URLSearchParams();
    if (t) ps.set("type", t);
    return `/recommendations?${ps.toString()}`;
  };

  return (
    <div className="cinema-bg" style={{ minHeight: "100vh" }}>
      <Navbar session={session} />

      <div className="discover-header">
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
          <div>
            <h1
              style={{
                fontSize: "1.75rem",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Recommended For You ✨
            </h1>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--text-muted)",
                margin: "0.25rem 0 0",
              }}
            >
              Personalized titles selected based on your ratings and taste profile.
            </p>
          </div>
        </div>

        {/* Type filter tabs */}
        <div className="filter-tabs" role="tablist" aria-label="Filter recommendations by type">
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
          <p className="empty-title">Could not fetch recommendations</p>
          <p className="empty-sub">
            Ensure the backend server is running and your session is active.
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
          <span className="empty-icon">✨</span>
          <p className="empty-title">No recommendations yet</p>
          <p className="empty-sub">
            Complete onboarding ratings or rate more movies to generate recommendations.
          </p>
        </div>
      )}

      {/* ── Media grid ── */}
      {items.length > 0 && (
        <>
          <p
            style={{
              padding: "0 2rem 0.75rem",
              maxWidth: 1400,
              margin: "0 auto",
              fontSize: "0.875rem",
              color: "var(--text-faint)",
            }}
          >
            {items.length} recommendation{items.length !== 1 ? "s" : ""}
          </p>

          <div className="media-grid" role="list" aria-label="Recommended media items">
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
