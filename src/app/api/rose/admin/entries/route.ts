import { NextResponse } from "next/server";
import { isAdmin, signedIn } from "@/lib/rose/auth";
import { deleteEntry, saveEntry, slugify } from "@/lib/rose/store";
import type { Media } from "@/lib/rose/types";

type Body = {
  originalSlug?: string;
  slug?: string;
  title?: string;
  category?: string;
  keywords?: string[];
  content?: string;
  media?: Media[];
  sensitive?: boolean;
};

export async function POST(req: Request) {
  if (!(await signedIn()) || !isAdmin()) return NextResponse.json({ error: "Sem acesso." }, { status: 401 });
  const b = (await req.json()) as Body;
  const title = b.title?.trim();
  if (!title) return NextResponse.json({ error: "Dê um título para a resposta." }, { status: 400 });
  const keywords = (b.keywords ?? []).map((k) => k.trim()).filter(Boolean);
  if (keywords.length === 0) keywords.push(title);
  const slug = b.originalSlug ?? slugify(b.slug || title);
  try {
    await saveEntry({
      originalSlug: b.originalSlug,
      slug,
      title,
      category: b.category?.trim() || "Procedimentos",
      keywords,
      content: b.content ?? "",
      media: b.media ?? [],
      sensitive: !!b.sensitive,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 409 });
  }
  return NextResponse.json({ ok: true, slug });
}

export async function DELETE(req: Request) {
  if (!(await signedIn()) || !isAdmin()) return NextResponse.json({ error: "Sem acesso." }, { status: 401 });
  const slug = new URL(req.url).searchParams.get("slug");
  if (slug) await deleteEntry(slug);
  return NextResponse.json({ ok: true });
}
