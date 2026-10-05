import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { search } from "@/lib/rose/search";
import { listEntries } from "@/lib/rose/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Faça login." }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const entries = listEntries();

  if (!q.trim()) {
    const top = [...entries].sort((a, b) => b.hits - a.hits);
    return NextResponse.json({ hits: top.map((entry) => ({ entry, score: 0, confidence: "baixa" })), answered: true });
  }

  const hits = search(entries, q, 12);
  const answered = hits.some((h) => h.confidence !== "baixa");
  return NextResponse.json({ answered, hits });
}
