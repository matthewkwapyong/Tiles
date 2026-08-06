import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Navbar from "@/app/components/Navbar";

import { headers } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export const metadata = {
  title: "Home — Tiles",
  description: "Your personal movie collection.",
};

export default async function HomePage() {
  const session = await auth();

  // Redirect unauthenticated users to the sign-in page
  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Redirect users who haven't completed onboarding to /onboarding
  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") ?? "";
  try {
    const resStatus = await fetch(`${BACKEND_URL}/onboarding/status`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (resStatus.ok) {
      const status = await resStatus.json();
      if (!status.onboarding_completed) {
        redirect("/onboarding");
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    console.error("Home page onboarding status check error:", e);
  }

  const { name, email, image } = session.user;
  const initials = name
    ? name
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (email?.[0] ?? "?").toUpperCase();

  return (
    <div className="cinema-bg" style={{ minHeight: "100vh" }}>
      <Navbar session={session} />

      {/* ── Hero greeting ── */}
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 73px)",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        {/* Glow orb */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 480,
            height: 480,
            borderRadius: "9999px",
            background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative" }}>
          {/* User avatar — large */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "9999px",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "#fff",
              margin: "0 auto 1.75rem",
              boxShadow: "0 0 40px var(--accent-glow), 0 0 0 3px rgba(99,102,241,0.2)",
              overflow: "hidden",
            }}
            aria-hidden="true"
          >
            {image ? (
              <Image
                src={image}
                alt=""
                width={80}
                height={80}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initials
            )}
          </div>

          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "var(--text-primary)",
              lineHeight: 1.1,
              marginBottom: "0.75rem",
            }}
          >
            Hello,{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {name ?? email}
            </span>
            .
          </h1>

          <p
            style={{
              fontSize: "1.125rem",
              color: "var(--text-muted)",
              maxWidth: 480,
              margin: "0 auto 2.5rem",
            }}
          >
            Your personal movie collection is ready. Start rating, reviewing, and discovering films.
          </p>

          {/* CTA placeholder — swap with real links as you build out the app */}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="/discover"
              id="cta-discover"
              style={{
                padding: "0.6875rem 1.5rem",
                borderRadius: "0.625rem",
                background: "var(--accent)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.9375rem",
                textDecoration: "none",
                boxShadow: "0 0 20px var(--accent-glow)",
                transition: "all 0.15s ease",
              }}
            >
              Discover Films
            </a>
            <a
              href="/watchlist"
              id="cta-watchlist"
              style={{
                padding: "0.6875rem 1.5rem",
                borderRadius: "0.625rem",
                background: "transparent",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                fontWeight: 600,
                fontSize: "0.9375rem",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              My Watchlist
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
