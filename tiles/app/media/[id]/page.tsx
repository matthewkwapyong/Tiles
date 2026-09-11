import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import InteractionsSection, { MediaDetail, CrewMember } from "./InteractionsSection";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";
const TMDB_IMG_BACKDROP = "https://image.tmdb.org/t/p/w1280";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/media/${id}`, { cache: "no-store" });
    if (!res.ok) return { title: "Tiles — Title Detail" };
    const item: MediaDetail = await res.json();
    return {
      title: `${item.title} — Tiles Archive`,
      description: item.overview,
    };
  } catch {
    return { title: "Tiles — Title Detail" };
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
          <span className="empty-icon">⊘</span>
          <p className="empty-title">Could not load this title</p>
          <p className="empty-sub">Backend returned {res.status}.</p>
          <Link
            href="/discover"
            style={{
              color: "var(--cream-primary)",
              marginTop: "0.5rem",
              textDecoration: "underline",
              fontSize: "0.875rem",
            }}
          >
            ← Return to Discover
          </Link>
        </div>
      </div>
    );
  }

  const item: MediaDetail = await res.json();
  const year = item.release_date?.slice(0, 4) ?? null;
  const directors = (item.cast_crew?.crew ?? []).filter((c) => c.job === "Director") as CrewMember[];

  return (
    <div className="cinema-bg" style={{ minHeight: "100vh" }}>
      <Navbar session={session} />

      {/* ── Backdrop Banner with Soft Vignette Fade ── */}
      {item.backdrop_path ? (
        <div className="detail-backdrop">
          <Image
            src={`${TMDB_IMG_BACKDROP}${item.backdrop_path}`}
            alt=""
            fill
            priority
            sizes="100vw"
            style={{
              objectFit: "cover",
              objectPosition: "center 25%",
              filter: "contrast(1.1) brightness(0.65) saturate(0.8)",
            }}
          />
        </div>
      ) : (
        <div
          className="detail-backdrop"
          style={{ background: "#0a0a09" }}
          aria-hidden="true"
        />
      )}

      {/* ── Main Detail Body ── */}
      <div className="detail-body">
        <InteractionsSection item={item} directors={directors} year={year} />

        {/* Return to Discover link */}
        <div style={{ marginTop: "4rem" }}>
          <Link
            href="/discover"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--text-muted)",
              textDecoration: "none",
              fontSize: "0.875rem",
              transition: "color 0.2s ease",
            }}
            className="hover:text-[#f2ede3]"
          >
            ← Return to Discover Archive
          </Link>
        </div>
      </div>
    </div>
  );
}
