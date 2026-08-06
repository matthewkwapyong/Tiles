"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

const GitHubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12Z" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84Z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
  </svg>
);

export default function SignInPage() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleSignIn = async (provider: string) => {
    setLoadingProvider(provider);
    await signIn(provider, { callbackUrl: "/" });
  };

  return (
    <div className="cinema-bg flex min-h-screen items-center justify-center px-4">
      {/* Background film-strip decoration */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 2,
              background: "rgba(255,255,255,0.025)",
              top: 0,
              bottom: 0,
              left: `${10 + i * 16}%`,
            }}
          />
        ))}
      </div>

      <div className="glass-card w-full max-w-sm p-8" style={{ position: "relative", zIndex: 1 }}>
        {/* Logo / Brand */}
        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: "0.75rem",
              background: "var(--accent)",
              marginBottom: "1.25rem",
              boxShadow: "0 0 24px var(--accent-glow)",
            }}
            aria-hidden="true"
          >
            {/* Film reel icon */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
              <line x1="12" y1="2" x2="12" y2="5" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="2" y1="12" x2="5" y2="12" />
              <line x1="19" y1="12" x2="22" y2="12" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.03em",
              marginBottom: "0.375rem",
            }}
          >
            Welcome back
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "var(--text-muted)" }}>
            Sign in to your movie collection
          </p>
        </div>

        {/* OAuth buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button
            id="signin-github"
            className="btn-auth btn-github"
            onClick={() => handleSignIn("github")}
            disabled={loadingProvider !== null}
            aria-label="Sign in with GitHub"
          >
            <GitHubIcon />
            {loadingProvider === "github" ? "Connecting…" : "Continue with GitHub"}
          </button>

          <div className="divider">or</div>

          <button
            id="signin-google"
            className="btn-auth btn-google"
            onClick={() => handleSignIn("google")}
            disabled={loadingProvider !== null}
            aria-label="Sign in with Google"
          >
            <GoogleIcon />
            {loadingProvider === "google" ? "Connecting…" : "Continue with Google"}
          </button>
        </div>

        {/* Footer note */}
        <p
          style={{
            marginTop: "1.75rem",
            textAlign: "center",
            fontSize: "0.8125rem",
            color: "var(--text-faint)",
            lineHeight: 1.5,
          }}
        >
          By signing in you agree to our{" "}
          <a href="/terms" style={{ color: "var(--text-muted)" }}>
            Terms
          </a>{" "}
          &amp;{" "}
          <a href="/privacy" style={{ color: "var(--text-muted)" }}>
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
