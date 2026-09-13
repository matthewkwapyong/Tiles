import { Session } from "next-auth";
import { signOut } from "@/auth";
import Image from "next/image";
import Link from "next/link";
import NavSearch from "./NavSearch";

interface NavbarProps {
  session: Session;
}

/**
 * Floating Pill Navbar — Server Component.
 * Film-noir monochrome aesthetic: cream, black, and frosted glass.
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
    <nav className="floating-pill-nav" aria-label="Main Navigation">
      {/* Brand + Navigation Links */}
      <div style={{ display: "flex", alignItems: "center", gap: "1.75rem" }}>
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.625rem",
            textDecoration: "none",
          }}
        >
          {/* Minimal monochrome film-strip icon badge */}
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "9999px",
              background: "#171715",
              border: "1px solid rgba(242, 237, 227, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 12px rgba(242, 237, 227, 0.08)",
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#f2ede3"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <line x1="2" y1="7" x2="7" y2="7" />
              <line x1="2" y1="17" x2="7" y2="17" />
              <line x1="17" y1="17" x2="22" y2="17" />
              <line x1="17" y1="7" x2="22" y2="7" />
            </svg>
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: "0.9375rem",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--cream-primary)",
            }}
          >
            Tiles
          </span>
        </Link>

        {/* Pill Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
          <Link href="/discover" className="nav-link">
            Discover
          </Link>
          <Link href="/recommendations" className="nav-link">
            Recommendations
          </Link>
          <Link href="/watchlist" className="nav-link">
            Watchlist
          </Link>
          <Link href="/lists" className="nav-link">
            Lists
          </Link>
          <Link href="/history" className="nav-link">
            History
          </Link>
        </div>
      </div>

      {/* User Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
        <NavSearch />

        {email && (
          <span
            style={{
              fontSize: "0.8125rem",
              color: "var(--text-muted)",
              letterSpacing: "0.01em",
            }}
            aria-hidden="true"
          >
            {email}
          </span>
        )}

        {/* Avatar Pill */}
        <div
          style={{
            width: "2rem",
            height: "2rem",
            borderRadius: "9999px",
            background: "#171715",
            border: "1px solid rgba(242, 237, 227, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "var(--cream-primary)",
            overflow: "hidden",
            flexShrink: 0,
            boxShadow: "0 0 10px rgba(242, 237, 227, 0.05)",
          }}
          aria-label={`Avatar for ${name ?? email}`}
        >
          {image ? (
            <Image
              src={image}
              alt={name ?? "User avatar"}
              width={32}
              height={32}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            initials
          )}
        </div>

        {/* Ghost Pill Sign Out */}
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
