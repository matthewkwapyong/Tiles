import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Navbar from "@/app/components/Navbar";
import ProfileClient from "./ProfileClient";

export const metadata = {
  title: "Profile & Taste Archive — Tiles",
  description: "Your personalized film taste breakdown, ratings, and review archive.",
};

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export interface UserStats {
  total_watched: number;
  total_watchlist: number;
  total_rated: number;
  total_reviewed: number;
  joined_at: string | null;
}

export interface GenreWeight {
  genre_name: string;
  weight: number;
}

export interface TasteBreakdown {
  top_genres: GenreWeight[];
  least_favorite_genres: GenreWeight[];
}

export interface UserRatingItem {
  rating: number;
  updated_at: string;
  media: {
    id: number;
    tmdb_id: number;
    media_type: "movie" | "tv";
    title: string;
    poster_path: string | null;
    release_date: string | null;
    vote_average: number | null;
    genres: string[];
    popularity: number | null;
  };
}

export interface UserReviewItem {
  id: number;
  body: string;
  rating: number | null;
  created_at: string;
  updated_at: string;
  media: {
    id: number;
    tmdb_id: number;
    media_type: "movie" | "tv";
    title: string;
    poster_path: string | null;
    release_date: string | null;
    vote_average: number | null;
    genres: string[];
    popularity: number | null;
  };
}

export interface PaginatedRatings {
  items: UserRatingItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface PaginatedReviews {
  items: UserReviewItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") ?? "";

  // 1. Fetch user stats
  let stats: UserStats = {
    total_watched: 0,
    total_watchlist: 0,
    total_rated: 0,
    total_reviewed: 0,
    joined_at: null,
  };
  try {
    const res = await fetch(`${BACKEND_URL}/users/me/stats`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (res.ok) {
      stats = await res.json();
    }
  } catch (e) {
    console.error("Error fetching user stats:", e);
  }

  // 2. Fetch taste breakdown
  let taste: TasteBreakdown | null = null;
  try {
    const res = await fetch(`${BACKEND_URL}/users/me/taste-breakdown`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (res.ok) {
      taste = await res.json();
    }
  } catch (e) {
    console.error("Error fetching taste breakdown:", e);
  }

  // 3. Fetch paginated ratings
  let ratingsData: PaginatedRatings = {
    items: [],
    total: 0,
    page: 1,
    limit: 24,
    total_pages: 0,
  };
  try {
    const res = await fetch(`${BACKEND_URL}/users/me/ratings?page=1&limit=24`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (res.ok) {
      ratingsData = await res.json();
    }
  } catch (e) {
    console.error("Error fetching paginated ratings:", e);
  }

  // 4. Fetch paginated reviews
  let reviewsData: PaginatedReviews = {
    items: [],
    total: 0,
    page: 1,
    limit: 20,
    total_pages: 0,
  };
  try {
    const res = await fetch(`${BACKEND_URL}/users/me/reviews?page=1&limit=20`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (res.ok) {
      reviewsData = await res.json();
    }
  } catch (e) {
    console.error("Error fetching paginated reviews:", e);
  }

  return (
    <div className="min-h-screen bg-[#0a0a09] text-[#f2ede3]">
      <Navbar session={session} />
      <ProfileClient
        user={session.user}
        stats={stats}
        taste={taste}
        initialRatings={ratingsData}
        initialReviews={reviewsData}
      />
    </div>
  );
}
