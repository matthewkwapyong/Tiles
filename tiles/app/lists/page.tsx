import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import ListsClient from "./ListsClient";
import { headers } from "next/headers";

export const metadata = {
  title: "My Lists — Tiles",
  description: "Your curated folders and custom movie collections.",
};

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export default async function ListsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  // Forward cookie header from incoming request to backend
  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") ?? "";

  let lists = [];
  try {
    const res = await fetch(`${BACKEND_URL}/lists`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (res.ok) {
      lists = await res.json();
    }
  } catch (e) {
    console.error("Lists fetch error:", e);
  }

  return (
    <div className="cinema-bg" style={{ minHeight: "100vh" }}>
      <Navbar session={session} />
      <ListsClient initialLists={lists} />
    </div>
  );
}
