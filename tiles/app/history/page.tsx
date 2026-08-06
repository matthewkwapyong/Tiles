import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import HistoryClient from "./HistoryClient";
import { headers } from "next/headers";

export const metadata = {
  title: "Watch History — Tiles",
  description: "Your log of watched movies and TV shows.",
};

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export default async function HistoryPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  // Forward cookie header from incoming request to backend
  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") ?? "";

  let history = [];
  try {
    const res = await fetch(`${BACKEND_URL}/history`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (res.ok) {
      history = await res.json();
    }
  } catch (e) {
    console.error("History fetch error:", e);
  }

  return (
    <div className="cinema-bg" style={{ minHeight: "100vh" }}>
      <Navbar session={session} />

      <div style={{ padding: "2rem 2rem 0", maxWidth: 800, margin: "0 auto" }}>
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            margin: "1.5rem 0 1.5rem",
          }}
        >
          Watch History
        </h1>
      </div>

      <HistoryClient initialHistory={history} />
    </div>
  );
}
