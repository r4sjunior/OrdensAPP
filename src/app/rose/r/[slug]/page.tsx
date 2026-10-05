import Link from "next/link";
import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import EntryCard from "@/components/rose/EntryCard";
import RoseHeader from "@/components/rose/RoseHeader";
import { getEntry } from "@/lib/rose/store";

export const dynamic = "force-dynamic";

export default async function EntryPage({ params }: { params: { slug: string } }) {
  const entry = await getEntry(params.slug);
  if (!entry) notFound();

  return (
    <>
      <NavBar active="rose" />
      <RoseHeader />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/rose" className="text-sm text-inkSoft hover:text-ink">
          ← Voltar para a busca
        </Link>
        <div className="mt-4">
          <EntryCard entry={entry} open highlight />
        </div>
      </main>
    </>
  );
}
