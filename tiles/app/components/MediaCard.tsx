import Image from "next/image";
import Link from "next/link";

const TMDB_IMG = "https://image.tmdb.org/t/p/w342";

export interface MediaSummary {
  id: number;
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  release_date: string | null;
  vote_average: number | null;
  genres: string[];
  popularity: number | null;
}

/**
 * Poster-style media card — Film-Noir Monochrome Edition.
 * Features subtle film-stock desaturation, cream rating badge, and frosted lift.
 */
export default function MediaCard({ item }: { item: MediaSummary }) {
  const year = item.release_date?.slice(0, 4) ?? null;
  const rating = item.vote_average ? item.vote_average.toFixed(1) : null;

  return (
    <Link href={`/media/${item.id}`} className="media-card" aria-label={item.title}>
      {/* Poster */}
      <div className="media-card-poster">
        {item.poster_path ? (
          <Image
            src={`${TMDB_IMG}${item.poster_path}`}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 160px, (max-width: 1024px) 180px, 200px"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div className="poster-placeholder" aria-hidden="true">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>
          </div>
        )}

        {/* Type pill */}
        <span className="media-type-pill">
          {item.media_type === "movie" ? "Film" : "Series"}
        </span>

        {/* Rating badge — strictly cream and black */}
        {rating && (
          <span className="rating-badge" aria-label={`Rating: ${rating}`}>
            <span style={{ fontSize: "0.6875rem", opacity: 0.9 }}>★</span> {rating}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="media-card-info">
        <p className="media-card-title" title={item.title}>
          {item.title}
        </p>
        {year && <p className="media-card-year">{year}</p>}
      </div>
    </Link>
  );
}
