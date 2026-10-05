import { NextResponse } from "next/server";
import { signedIn } from "@/lib/rose/auth";
import { bumpHit } from "@/lib/rose/store";

export async function POST(req: Request) {
  if (!(await signedIn())) return NextResponse.json({ error: "Faça login." }, { status: 401 });
  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  if (slug) await bumpHit(slug);
  return NextResponse.json({ ok: true });
}
