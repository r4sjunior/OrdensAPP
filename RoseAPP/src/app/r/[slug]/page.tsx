import Link from "next/link";
import { notFound } from "next/navigation";
import EntryCard from "@/components/EntryCard";
import Header from "@/components/Header";
import { isTeam } from "@/lib/auth";
import { toPublic } from "@/lib/public";
import { getEntry } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function EntryPage({ params }: { params: { slug: string } }) {
  const entry = await getEntry(params.slug);
  if (!entry) notFound();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <Link href="/" className="text-sm text-inkSoft hover:text-ink">
          ← Voltar para a busca
        </Link>
        <div className="mt-4">
          <EntryCard entry={toPublic(entry, isTeam())} open highlight />
        </div>
      </main>
    </>
  );
}
