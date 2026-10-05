import { promises as fs } from "fs";
import path from "path";
import type { Entry, Miss } from "./types";
import { normalize } from "./search";

// Armazenamento em arquivos JSON dentro de /data — suficiente para ver o app rodando.
// Na integração com o OrdensAPP isto vira tabelas no Postgres (mesmas funções, outro miolo).
const DIR = path.join(process.cwd(), "data");
const KB = path.join(DIR, "kb.json");
const MISSES = path.join(DIR, "misses.json");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown) {
  await fs.mkdir(DIR, { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, file);
}

export async function listEntries(): Promise<Entry[]> {
  return readJson<Entry[]>(KB, []);
}

export async function getEntry(slug: string): Promise<Entry | undefined> {
  return (await listEntries()).find((e) => e.slug === slug);
}

export function slugify(s: string): string {
  return normalize(s).replace(/ /g, "-").slice(0, 60) || `item-${Date.now()}`;
}

export async function saveEntry(input: Omit<Entry, "id" | "hits" | "updatedAt" | "source"> & { originalSlug?: string }) {
  const all = await listEntries();
  const { originalSlug, ...data } = input;
  const i = all.findIndex((e) => e.slug === (originalSlug ?? data.slug));
  const now = new Date().toISOString();
  if (i >= 0) {
    all[i] = { ...all[i], ...data, id: data.slug, updatedAt: now };
  } else {
    if (all.some((e) => e.slug === data.slug)) throw new Error("Já existe uma resposta com esse endereço.");
    all.push({ ...data, id: data.slug, hits: 0, source: "novo", updatedAt: now });
  }
  await writeJson(KB, all);
  // se alguém já tinha buscado isso sem resposta, tira da lista de lacunas
  await resolveMisses([data.title, ...data.keywords]);
}

export async function deleteEntry(slug: string) {
  await writeJson(KB, (await listEntries()).filter((e) => e.slug !== slug));
}

export async function bumpHit(slug: string) {
  const all = await listEntries();
  const e = all.find((x) => x.slug === slug);
  if (!e) return;
  e.hits += 1;
  await writeJson(KB, all);
}

export async function listMisses(): Promise<Miss[]> {
  const all = await readJson<Miss[]>(MISSES, []);
  return all.sort((a, b) => b.count - a.count || b.lastAt.localeCompare(a.lastAt));
}

export async function logMiss(query: string) {
  const q = normalize(query);
  if (q.length < 2) return;
  const all = await readJson<Miss[]>(MISSES, []);
  const m = all.find((x) => x.query === q);
  if (m) {
    m.count += 1;
    m.lastAt = new Date().toISOString();
  } else {
    all.push({ query: q, count: 1, lastAt: new Date().toISOString() });
  }
  await writeJson(MISSES, all);
}

export async function resolveMisses(phrases: string[]) {
  const keys = new Set(phrases.map(normalize));
  const all = await readJson<Miss[]>(MISSES, []);
  await writeJson(MISSES, all.filter((m) => !keys.has(m.query)));
}

export async function dismissMiss(query: string) {
  await resolveMisses([query]);
}
