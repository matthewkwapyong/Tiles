import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tiles — Cinema & Taste Archive",
  description: "A darkroom film-noir archive for your movie and TV collections.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0a0a09] text-[#f2ede3]">
        {/* Fixed static background */}
        <div className="static-bg" aria-hidden="true" />
        {/* Global analog film grain layer */}
        <div className="film-grain" aria-hidden="true" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
