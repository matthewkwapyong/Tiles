import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import WatchlistClient from "./WatchlistClient";
import { headers } from "next/headers";

export const metadata = {
  title: "My Watchlist — Tiles",
  description: "Your saved movies and TV shows to watch.",
};

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export default async function WatchlistPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  // Forward cookie header from incoming request to backend
  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") ?? "";

  let items = [];
  try {
    const res = await fetch(`${BACKEND_URL}/watchlist`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (res.ok) {
      items = await res.json();
    }
  } catch (e) {
    console.error("Watchlist fetch error:", e);
  }

  return (
    <div className="cinema-bg" style={{ minHeight: "100vh" }}>
      <Navbar session={session} />

      <WatchlistClient initialItems={items} />
    </div>
  );
}
