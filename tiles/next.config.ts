import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://lh3.googleusercontent.com/**"),
      new URL("https://image.tmdb.org/**"),
      new URL("https://avatars.githubusercontent.com/**"),
    ],
  },
  async rewrites() {    
    return [
      {
        source: "/api/backend/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
