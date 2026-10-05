import AdminLogin from "@/components/AdminLogin";
import AdminPanel from "@/components/AdminPanel";
import Header from "@/components/Header";
import { isAdmin } from "@/lib/auth";
import { listEntries, listMisses } from "@/lib/store";
import { CATEGORIES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isAdmin()) {
    return (
      <>
        <Header active="admin" />
        <AdminLogin />
      </>
    );
  }

  const [entries, misses] = await Promise.all([listEntries(), listMisses()]);
  const categories = Array.from(new Set([...CATEGORIES, ...entries.map((e) => e.category)]));

  return (
    <>
      <Header active="admin" />
      <AdminPanel entries={entries} misses={misses} categories={categories} />
    </>
  );
}
