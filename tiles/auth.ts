import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import PostgresAdapter from "@auth/pg-adapter";
import { Pool } from "pg";

/**
 * Single Postgres connection pool shared by the Auth.js adapter.
 * Re-uses the same DATABASE_URL the Axum backend uses.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  adapter: PostgresAdapter(pool),

  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  /**
   * Use database sessions (not JWTs) so that the Axum backend can validate
   * the session by querying the `sessions` table directly.
   */
  session: { strategy: "database" },

  /**
   * Custom pages — override Auth.js defaults.
   */
  pages: {
    signIn: "/auth/signin",
  },

  callbacks: {
    /**
     * Attach the internal database user.id to the session object so
     * client components can read it via useSession().
     */
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
