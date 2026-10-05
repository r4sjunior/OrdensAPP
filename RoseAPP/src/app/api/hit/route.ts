import { NextResponse } from "next/server";
import { bumpHit } from "@/lib/store";

export async function POST(req: Request) {
  const { slug } = (await req.json().catch(() => ({}))) as { slug?: string };
  if (slug) await bumpHit(slug);
  return NextResponse.json({ ok: true });
}
