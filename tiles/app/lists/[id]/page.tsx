import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Navbar from "@/app/components/Navbar";
import ListDetailClient from "./ListDetailClient";
import { headers } from "next/headers";

interface Props {
  params: Promise<{ id: string }>;
}

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") ?? "";

  try {
    const res = await fetch(`${BACKEND_URL}/lists/${id}`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return { title: "List Detail — Tiles" };
    const detail = await res.json();
    return {
      title: `${detail.title} — Tiles Lists`,
      description: detail.description || `Folder containing ${detail.items?.length || 0} titles.`,
    };
  } catch {
    return { title: "List Detail — Tiles" };
  }
}

export default async function ListDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const { id } = await params;

  // Forward cookie header from incoming request to backend
  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") ?? "";

  let detail = null;
  try {
    const res = await fetch(`${BACKEND_URL}/lists/${id}`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (res.ok) {
      detail = await res.json();
    }
  } catch (e) {
    console.error("List detail fetch error:", e);
  }

  return (
    <div className="cinema-bg" style={{ minHeight: "100vh" }}>
      <Navbar session={session} />
      <ListDetailClient initialDetail={detail} />
    </div>
  );
}
