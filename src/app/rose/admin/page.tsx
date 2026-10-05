import NavBar from "@/components/NavBar";
import AdminLogin from "@/components/rose/AdminLogin";
import AdminPanel from "@/components/rose/AdminPanel";
import RoseHeader from "@/components/rose/RoseHeader";
import { isAdmin } from "@/lib/rose/auth";
import { listEntries, listMisses } from "@/lib/rose/store";
import { CATEGORIES } from "@/lib/rose/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!isAdmin()) {
    return (
      <>
        <NavBar active="rose" />
        <RoseHeader active="admin" />
        <AdminLogin />
      </>
    );
  }

  const [entries, misses] = await Promise.all([listEntries(), listMisses()]);
  const categories = Array.from(new Set([...CATEGORIES, ...entries.map((e) => e.category)]));

  return (
    <>
      <NavBar active="rose" />
      <RoseHeader active="admin" />
      <AdminPanel entries={entries} misses={misses} categories={categories} />
    </>
  );
}
