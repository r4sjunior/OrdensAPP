import type { RoseEntry, RoseMiss } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Entry, Media, Miss } from "./types";
import { normalize } from "./search";

// Base da Rose no Postgres (tabelas RoseEntry e RoseMiss do prisma/schema.prisma).

const toEntry = (r: RoseEntry): Entry => ({
  id: r.slug,
  slug: r.slug,
  title: r.title,
  category: r.category,
  keywords: r.keywords,
  content: r.content,
  media: r.media as Media[],
  sensitive: r.sensitive,
  hits: r.hits,
  source: r.source === "rose" ? "rose" : "novo",
  updatedAt: r.updatedAt.toISOString(),
});

const toMiss = (m: RoseMiss): Miss => ({ query: m.query, count: m.count, lastAt: m.lastAt.toISOString() });

export async function listEntries(): Promise<Entry[]> {
  return (await prisma.roseEntry.findMany()).map(toEntry);
}

export async function getEntry(slug: string): Promise<Entry | undefined> {
  const r = await prisma.roseEntry.findUnique({ where: { slug } });
  return r ? toEntry(r) : undefined;
}

export function slugify(s: string): string {
  return normalize(s).replace(/ /g, "-").slice(0, 60) || `item-${Date.now()}`;
}

export async function saveEntry(input: Omit<Entry, "id" | "hits" | "updatedAt" | "source"> & { originalSlug?: string }) {
  const { originalSlug, ...data } = input;
  const fields = { ...data, media: data.media as object[] };
  if (originalSlug) {
    await prisma.roseEntry.update({ where: { slug: originalSlug }, data: fields });
  } else {
    if (await prisma.roseEntry.findUnique({ where: { slug: data.slug } })) throw new Error("Já existe uma resposta com esse endereço.");
    await prisma.roseEntry.create({ data: { ...fields, source: "novo" } });
  }
  // se alguém já tinha buscado isso sem resposta, tira da lista de lacunas
  await resolveMisses([data.title, ...data.keywords]);
}

export async function deleteEntry(slug: string) {
  await prisma.roseEntry.deleteMany({ where: { slug } });
}

export async function bumpHit(slug: string) {
  await prisma.roseEntry.updateMany({ where: { slug }, data: { hits: { increment: 1 } } });
}

export async function listMisses(): Promise<Miss[]> {
  return (await prisma.roseMiss.findMany({ orderBy: [{ count: "desc" }, { lastAt: "desc" }] })).map(toMiss);
}

export async function logMiss(query: string) {
  const q = normalize(query);
  if (q.length < 2) return;
  await prisma.roseMiss.upsert({
    where: { query: q },
    create: { query: q },
    update: { count: { increment: 1 }, lastAt: new Date() },
  });
}

export async function resolveMisses(phrases: string[]) {
  await prisma.roseMiss.deleteMany({ where: { query: { in: phrases.map(normalize) } } });
}

export async function dismissMiss(query: string) {
  await resolveMisses([query]);
}
