import NavBar from "@/components/NavBar";
import RoseHeader from "@/components/rose/RoseHeader";
import SearchApp from "@/components/rose/SearchApp";
import { listEntries } from "@/lib/rose/store";
import { CATEGORIES } from "@/lib/rose/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Help Rose — Ordens de Serviço" };

export default async function RosePage() {
  const entries = await listEntries();
  const used = new Set(entries.map((e) => e.category));
  const categories = [...CATEGORIES.filter((c) => used.has(c)), ...[...used].filter((c) => !(CATEGORIES as readonly string[]).includes(c))];

  return (
    <>
      <NavBar active="rose" />
      <RoseHeader active="busca" />
      <SearchApp categories={categories} />
    </>
  );
}
