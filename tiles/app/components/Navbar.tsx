import { Session } from "next-auth";
import { signOut } from "@/auth";
import Image from "next/image";
import Link from "next/link";

interface NavbarProps {
  session: Session;
}

/**
 * Shared navigation bar — Server Component.
 * Receives the current Auth.js session as a prop.
 */
export default function Navbar({ session }: NavbarProps) {
  const { name, email, image } = session.user ?? {};

  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (email?.[0] ?? "?").toUpperCase();

  return (
    <nav className="home-nav">
      {/* Brand + nav links */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "0.375rem",
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 12px var(--accent-glow)",
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: "1rem",
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            Tiles
          </span>
        </Link>

        <Link
          href="/discover"
          style={{
            fontSize: "0.9375rem",
            color: "var(--text-muted)",
            textDecoration: "none",
            fontWeight: 500,
            transition: "color 0.15s",
          }}
        >
          Discover
        </Link>
        <Link
          href="/recommendations"
          style={{
            fontSize: "0.9375rem",
            color: "var(--text-muted)",
            textDecoration: "none",
            fontWeight: 500,
            transition: "color 0.15s",
          }}
        >
          Recommendations
        </Link>
        <Link
          href="/watchlist"
          style={{
            fontSize: "0.9375rem",
            color: "var(--text-muted)",
            textDecoration: "none",
            fontWeight: 500,
            transition: "color 0.15s",
          }}
        >
          Watchlist
        </Link>
        <Link
          href="/history"
          style={{
            fontSize: "0.9375rem",
            color: "var(--text-muted)",
            textDecoration: "none",
            fontWeight: 500,
            transition: "color 0.15s",
          }}
        >
          History
        </Link>
      </div>

      {/* User controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
        <span
          style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}
          aria-hidden="true"
        >
          {email}
        </span>

        <div className="avatar" aria-label={`Avatar for ${name ?? email}`}>
          {image ? (
            <Image
              src={image}
              alt={name ?? "User avatar"}
              width={36}
              height={36}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initials
          )}
        </div>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/auth/signin" });
          }}
        >
          <button type="submit" className="btn-signout" id="signout-btn">
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}
