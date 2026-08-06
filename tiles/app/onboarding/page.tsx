import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import OnboardingClient from "./OnboardingClient";

export const metadata = {
  title: "Onboarding — Build Your Taste Profile — Tiles",
  description: "Rate movies and TV shows to build your personalized film recommendations.",
};

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  // Check onboarding status
  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") ?? "";

  try {
    const resStatus = await fetch(`${BACKEND_URL}/onboarding/status`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (resStatus.ok) {
      const status = await resStatus.json();
      if (status.onboarding_completed) {
        redirect("/");
      }
    }
  } catch (e) {
    // If redirect throws error, let Next.js handle it
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
    console.error("Onboarding status check error:", e);
  }

  // Fetch curated items list
  let curatedItems = [];
  try {
    const resCurated = await fetch(`${BACKEND_URL}/onboarding/curated`, {
      cache: "no-store",
    });
    if (resCurated.ok) {
      curatedItems = await resCurated.json();
    }
  } catch (e) {
    console.error("Fetch curated onboarding items error:", e);
  }

  return <OnboardingClient initialItems={curatedItems} />;
}
