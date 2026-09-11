import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import Navbar from "@/app/components/Navbar";
import { headers } from "next/headers";
import Link from "next/link";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export const metadata = {
  title: "Tiles — Home",
  description: "Your personal darkroom film archive.",
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

      {/* ── Centered Hero Greeting ── */}
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "calc(100vh - 90px)",
          padding: "2rem",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Soft Cream Radial Glow Orb */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 520,
            height: 520,
            borderRadius: "9999px",
            background: "radial-gradient(circle, rgba(242, 237, 227, 0.06) 0%, transparent 68%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 2, maxWidth: 640 }}>
          {/* Avatar Ring with Warm-White Glow */}
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: "9999px",
              background: "#171715",
              border: "1px solid rgba(242, 237, 227, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "var(--cream-primary)",
              margin: "0 auto 2rem",
              boxShadow: "0 0 36px rgba(242, 237, 227, 0.12), 0 0 0 4px rgba(242, 237, 227, 0.05)",
              overflow: "hidden",
            }}
            aria-hidden="true"
          >
            {image ? (
              <Image
                src={image}
                alt=""
                width={88}
                height={88}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initials
            )}
          </div>

          <h1
            style={{
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              color: "var(--cream-primary)",
              lineHeight: 1.1,
              marginBottom: "1rem",
            }}
          >
            Hello, {name ?? email}.
          </h1>

          <p
            style={{
              fontSize: "1.125rem",
              color: "var(--text-muted)",
              maxWidth: 480,
              margin: "0 auto 2.75rem",
              lineHeight: 1.6,
            }}
          >
            Your private darkroom archive is ready. Explore curated cinema, catalog watches, and discover new titles.
          </p>

          {/* Two CTAs: Solid Cream Button + Ghost Outline Button */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/discover"
              id="cta-discover"
              style={{
                padding: "0.8rem 2rem",
                borderRadius: "9999px",
                background: "var(--cream-primary)",
                color: "#0a0a09",
                fontWeight: 700,
                fontSize: "0.9375rem",
                textDecoration: "none",
                boxShadow: "0 0 24px rgba(242, 237, 227, 0.2)",
                transition: "all 0.2s ease",
                letterSpacing: "0.01em",
              }}
              className="hover:scale-[1.02] hover:bg-[#e8e2d5]"
            >
              Discover Films
            </Link>
            <Link
              href="/watchlist"
              id="cta-watchlist"
              style={{
                padding: "0.8rem 2rem",
                borderRadius: "9999px",
                background: "rgba(242, 237, 227, 0.03)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(242, 237, 227, 0.2)",
                color: "var(--cream-primary)",
                fontWeight: 600,
                fontSize: "0.9375rem",
                textDecoration: "none",
                boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
                transition: "all 0.2s ease",
                letterSpacing: "0.01em",
              }}
              className="hover:border-[rgba(242,237,227,0.4)] hover:bg-[rgba(242,237,227,0.08)]"
            >
              My Watchlist
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
