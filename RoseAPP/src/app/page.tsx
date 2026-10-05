import Header from "@/components/Header";
import SearchApp from "@/components/SearchApp";
import { isTeam } from "@/lib/auth";
import { listEntries } from "@/lib/store";
import { CATEGORIES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const entries = await listEntries();
  const used = new Set(entries.map((e) => e.category));
  const categories = [...CATEGORIES.filter((c) => used.has(c)), ...[...used].filter((c) => !(CATEGORIES as readonly string[]).includes(c))];

  return (
    <>
      <Header active="busca" />
      <SearchApp categories={categories} team={isTeam()} />
    </>
  );
}
