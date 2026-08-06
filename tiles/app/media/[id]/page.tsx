import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import InteractionsSection from "./InteractionsSection";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const TMDB_IMG_W500 = "https://image.tmdb.org/t/p/w500";
const TMDB_IMG_BACKDROP = "https://image.tmdb.org/t/p/w1280";
const TMDB_IMG_FACE = "https://image.tmdb.org/t/p/w185";

interface CastMember {
  id: number;
  name: string;
  character?: string;
  profile_path?: string;
  order?: number;
}

interface MediaDetail {
  id: number;
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  original_title?: string;
  overview?: string;
  tagline?: string;
  poster_path?: string;
  backdrop_path?: string;
  homepage?: string;
  release_date?: string;
  status?: string;
  genres: string[];
  language?: string;
  runtime?: number;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  cast_crew: {
    cast?: CastMember[];
    crew?: Array<{ id: number; name: string; job: string; department: string; profile_path?: string }>;
  };
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/media/${id}`, { cache: "no-store" });
    if (!res.ok) return { title: "Media — Tiles" };
    const item: MediaDetail = await res.json();
    return {
      title: `${item.title} — Tiles`,
      description: item.overview,
    };
  } catch {
    return { title: "Media — Tiles" };
  }
}

export default async function MediaDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { id } = await params;
  const res = await fetch(`${BACKEND_URL}/media/${id}`, { cache: "no-store" });

  if (res.status === 404) notFound();
  if (!res.ok) {
    return (
      <div className="cinema-bg" style={{ minHeight: "100vh" }}>
        <Navbar session={session} />
        <div className="empty-state">
          <span className="empty-icon">⚠️</span>
          <p className="empty-title">Could not load this title</p>
          <p className="empty-sub">Backend returned {res.status}.</p>
          <Link href="/discover" style={{ color: "var(--accent)", marginTop: "0.5rem" }}>
            ← Back to Discover
          </Link>
        </div>
      </div>
    );
  }

  const item: MediaDetail = await res.json();

  const year = item.release_date?.slice(0, 4);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;
  const cast = (item.cast_crew?.cast ?? [])
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
    .slice(0, 12);
  const directors = (item.cast_crew?.crew ?? []).filter((c) => c.job === "Director");

  return (
    <div className="cinema-bg" style={{ minHeight: "100vh" }}>
      <Navbar session={session} />

      {/* ── Backdrop ── */}
      {item.backdrop_path ? (
        <div className="detail-backdrop">
          <Image
            src={`${TMDB_IMG_BACKDROP}${item.backdrop_path}`}
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover" }}
          />
        </div>
      ) : (
        <div
          className="detail-backdrop"
          style={{ background: "var(--bg-surface)" }}
          aria-hidden="true"
        />
      )}

      <div className="detail-body">
        {/* ── Hero: poster + meta ── */}
        <div className="detail-hero">
          {/* Poster */}
          <div className="detail-poster" aria-hidden="true">
            {item.poster_path ? (
              <Image
                src={`${TMDB_IMG_W500}${item.poster_path}`}
                alt={`${item.title} poster`}
                width={220}
                height={330}
                style={{ width: "100%", height: "auto", display: "block" }}
                priority
              />
            ) : (
              <div
                style={{
                  aspectRatio: "2/3",
                  background: "var(--bg-card)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "3rem",
                }}
              >
                🎬
              </div>
            )}
          </div>

          {/* Text meta */}
          <div className="detail-meta">
            <h1 className="detail-title">{item.title}</h1>

            {item.tagline && <p className="detail-tagline">{item.tagline}</p>}

            {item.genres.length > 0 && (
              <div className="genre-row" aria-label="Genres">
                {item.genres.map((g) => (
                  <span key={g} className="genre-tag">{g}</span>
                ))}
              </div>
            )}

            <div className="detail-stats">
              {rating && (
                <span>
                  ★{" "}
                  <span className="stat-value">{rating}</span>
                  {item.vote_count && (
                    <span style={{ marginLeft: "0.25rem", fontSize: "0.875rem" }}>
                      ({item.vote_count.toLocaleString()} votes)
                    </span>
                  )}
                </span>
              )}
              {year && (
                <span>
                  <span className="stat-value">{year}</span>
                </span>
              )}
              {item.runtime && (
                <span>
                  <span className="stat-value">
                    {Math.floor(item.runtime / 60)}h {item.runtime % 60}m
                  </span>
                </span>
              )}
              {item.status && (
                <span>
                  <span className="stat-value">{item.status}</span>
                </span>
              )}
              <span
                style={{
                  padding: "0.125rem 0.5rem",
                  borderRadius: "9999px",
                  background: "rgba(99,102,241,0.15)",
                  color: "#a5b4fc",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                }}
              >
                {item.media_type === "movie" ? "Movie" : "TV Show"}
              </span>
            </div>

            {directors.length > 0 && (
              <p style={{ marginTop: "0.75rem", fontSize: "0.9375rem", color: "var(--text-muted)" }}>
                Directed by{" "}
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  {directors.map((d) => d.name).join(", ")}
                </span>
              </p>
            )}

            {/* Live Interactive Section (Rating, Watchlist, Watched Log, Reviews) */}
            <InteractionsSection mediaId={item.id} />
          </div>
        </div>

        {/* ── Overview ── */}
        {item.overview && (
          <p className="detail-overview">{item.overview}</p>
        )}

        {/* ── Cast ── */}
        {cast.length > 0 && (
          <section aria-labelledby="cast-heading">
            <h2 id="cast-heading" className="section-title">Cast</h2>
            <div className="cast-grid">
              {cast.map((member) => (
                <div key={member.id} className="cast-card">
                  <div className="cast-photo">
                    {member.profile_path ? (
                      <Image
                        src={`${TMDB_IMG_FACE}${member.profile_path}`}
                        alt={member.name}
                        width={110}
                        height={165}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-faint)",
                          fontSize: "1.5rem",
                        }}
                        aria-hidden="true"
                      >
                        👤
                      </div>
                    )}
                  </div>
                  <p className="cast-name">{member.name}</p>
                  {member.character && (
                    <p className="cast-character">{member.character}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Back link ── */}
        <Link
          href="/discover"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            marginTop: "3rem",
            color: "var(--text-muted)",
            textDecoration: "none",
            fontSize: "0.9375rem",
            transition: "color 0.15s ease",
          }}
        >
          ← Back to Discover
        </Link>
      </div>
    </div>
  );
}
