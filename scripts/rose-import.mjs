// Importa a base da Rose (kb.json e misses.json do RoseAPP) para o Postgres.
// Rodar: npm run rose:import            (lê RoseAPP/data)
//        npm run rose:import -- outra/pasta
// Respostas que já existem no banco (mesmo slug) não são sobrescritas.
import { readFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

const dir = process.argv[2] ?? path.join("RoseAPP", "data");
const prisma = new PrismaClient();

async function readJson(file) {
  try {
    return JSON.parse(await readFile(path.join(dir, file), "utf-8"));
  } catch {
    return [];
  }
}

const entries = await readJson("kb.json");
const misses = await readJson("misses.json");
if (entries.length === 0) {
  console.error(`Nada para importar: não achei ${path.join(dir, "kb.json")}.`);
  process.exit(1);
}

let created = 0;
for (const e of entries) {
  const exists = await prisma.roseEntry.findUnique({ where: { slug: e.slug } });
  if (exists) continue;
  await prisma.roseEntry.create({
    data: {
      slug: e.slug,
      title: e.title,
      category: e.category,
      keywords: e.keywords ?? [],
      content: e.content ?? "",
      media: e.media ?? [],
      sensitive: !!e.sensitive,
      hits: e.hits ?? 0,
      source: e.source ?? "rose",
    },
  });
  created++;
}

for (const m of misses) {
  await prisma.roseMiss.upsert({
    where: { query: m.query },
    create: { query: m.query, count: m.count, lastAt: new Date(m.lastAt) },
    update: {},
  });
}

console.log(`Rose: ${created} respostas novas (${entries.length - created} já existiam), ${misses.length} lacunas.`);
await prisma.$disconnect();
