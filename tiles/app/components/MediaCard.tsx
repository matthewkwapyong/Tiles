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
 * Poster-style media card.  Links to /media/:id.
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
          <div className="poster-placeholder" aria-hidden="true">🎬</div>
        )}

        {/* Type pill */}
        <span className="media-type-pill">
          {item.media_type === "movie" ? "Movie" : "TV"}
        </span>

        {/* Rating badge */}
        {rating && (
          <span className="rating-badge" aria-label={`Rating: ${rating}`}>
            ★ {rating}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="media-card-info">
        <p className="media-card-title" title={item.title}>{item.title}</p>
        {year && <p className="media-card-year">{year}</p>}
      </div>
    </Link>
  );
}
