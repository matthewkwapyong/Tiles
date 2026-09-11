"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

const GitHubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84Z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
  </svg>
);

const Spinner = () => (
  <span
    style={{
      display: "inline-block",
      width: 14,
      height: 14,
      border: "2px solid rgba(242, 237, 227, 0.2)",
      borderTopColor: "var(--cream-primary)",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
      marginRight: "0.5rem",
    }}
  />
);

export default function SignInPage() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleSignIn = async (provider: string) => {
    setLoadingProvider(provider);
    await signIn(provider, { callbackUrl: "/" });
  };

  return (
    <div
      className="cinema-bg flex min-h-screen items-center justify-center px-4"
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Background vertical film-strip lines */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          display: "flex",
          justifyContent: "space-around",
          opacity: 0.35,
        }}
      >
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            style={{
              width: 24,
              borderLeft: "1px dashed rgba(242, 237, 227, 0.08)",
              borderRight: "1px dashed rgba(242, 237, 227, 0.08)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              paddingTop: 10,
            }}
          >
            {[...Array(30)].map((_, j) => (
              <div
                key={j}
                style={{
                  width: 8,
                  height: 12,
                  borderRadius: 2,
                  background: "rgba(242, 237, 227, 0.04)",
                  border: "1px solid rgba(242, 237, 227, 0.06)",
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Centered heavy-blur glass card */}
      <div
        className="frosted-glass w-full max-w-sm p-8 sm:p-10"
        style={{
          position: "relative",
          zIndex: 10,
          background: "rgba(17, 17, 16, 0.82)",
          border: "1px solid rgba(242, 237, 227, 0.18)",
          borderRadius: "1.25rem",
          boxShadow:
            "0 32px 80px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(32px)",
        }}
      >
        {/* Brand Header */}
        <div style={{ marginBottom: "2.25rem", textAlign: "center" }}>
          {/* Film strip / reel emblem */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: "50%",
              background: "rgba(242, 237, 227, 0.06)",
              border: "1px solid rgba(242, 237, 227, 0.2)",
              color: "var(--cream-primary)",
              marginBottom: "1.25rem",
              boxShadow: "0 0 24px rgba(242, 237, 227, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
            }}
            aria-hidden="true"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
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

          <h1
            style={{
              fontSize: "1.625rem",
              fontWeight: 700,
              color: "var(--cream-primary)",
              letterSpacing: "-0.03em",
              marginBottom: "0.5rem",
            }}
          >
            Tiles
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", letterSpacing: "0.01em" }}>
            Sign in to your library
          </p>
        </div>

        {/* Ghost-pill OAuth buttons with hover lift */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <button
            id="signin-github"
            onClick={() => handleSignIn("github")}
            disabled={loadingProvider !== null}
            aria-label="Sign in with GitHub"
            className="pill-btn-ghost"
            style={{
              width: "100%",
              padding: "0.75rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              letterSpacing: "0.02em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.625rem",
              cursor: loadingProvider !== null ? "not-allowed" : "pointer",
            }}
          >
            {loadingProvider === "github" ? <Spinner /> : <GitHubIcon />}
            {loadingProvider === "github" ? "Authenticating…" : "Continue with GitHub"}
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              margin: "0.25rem 0",
              color: "var(--text-faint)",
              fontSize: "0.75rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            <div style={{ flex: 1, height: 1, background: "rgba(242, 237, 227, 0.1)" }} />
            <span>or</span>
            <div style={{ flex: 1, height: 1, background: "rgba(242, 237, 227, 0.1)" }} />
          </div>

          <button
            id="signin-google"
            onClick={() => handleSignIn("google")}
            disabled={loadingProvider !== null}
            aria-label="Sign in with Google"
            className="pill-btn-ghost"
            style={{
              width: "100%",
              padding: "0.75rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              letterSpacing: "0.02em",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.625rem",
              cursor: loadingProvider !== null ? "not-allowed" : "pointer",
            }}
          >
            {loadingProvider === "google" ? <Spinner /> : <GoogleIcon />}
            {loadingProvider === "google" ? "Authenticating…" : "Continue with Google"}
          </button>
        </div>

        {/* Subdued footer notes */}
        <p
          style={{
            marginTop: "2rem",
            textAlign: "center",
            fontSize: "0.75rem",
            color: "var(--text-faint)",
            lineHeight: 1.5,
          }}
        >
          Film archive &amp; taste graph. Strict privacy.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
