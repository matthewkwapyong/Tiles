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

      <div style={{ padding: "2rem 2rem 0", maxWidth: 1400, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            margin: "1.5rem 0 1.5rem",
          }}
        >
          My Watchlist
        </h1>
      </div>

      <WatchlistClient initialItems={items} />
    </div>
  );
}
