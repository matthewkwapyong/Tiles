"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Client-side wrapper that makes useSession() available anywhere in the tree.
 * Layout.tsx is a Server Component, so this thin wrapper is needed to opt in.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
