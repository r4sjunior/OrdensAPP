import { NextResponse } from "next/server";
import { signedIn } from "@/lib/rose/auth";
import { search } from "@/lib/rose/search";
import { listEntries, logMiss } from "@/lib/rose/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await signedIn())) return NextResponse.json({ error: "Faça login." }, { status: 401 });
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const entries = await listEntries();

  if (!q.trim()) {
    const top = [...entries].sort((a, b) => b.hits - a.hits);
    return NextResponse.json({ hits: top.map((entry) => ({ entry, score: 0, confidence: "baixa" })), answered: true });
  }

  const hits = search(entries, q, 12);
  const answered = hits.some((h) => h.confidence !== "baixa");
  // só registra lacuna quando a pessoa terminou de digitar (o app manda log=1)
  if (!answered && url.searchParams.get("log") === "1") await logMiss(q);

  return NextResponse.json({ answered, hits });
}
