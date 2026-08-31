import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function NavBar({ active }: { active: "dashboard" | "extrato" }) {
  const session = await auth();

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-8">
          <div className="flex h-8 w-8 items-center justify-center rounded-sm border-2 border-stamp font-display text-xs font-bold text-stamp">
            OS
          </div>
          <nav className="flex gap-6 text-sm">
            <Link
              href="/dashboard"
              className={
                active === "dashboard"
                  ? "font-medium text-ink"
                  : "text-inkSoft hover:text-ink"
              }
            >
              Registrar
            </Link>
            <Link
              href="/extrato"
              className={
                active === "extrato"
                  ? "font-medium text-ink"
                  : "text-inkSoft hover:text-ink"
              }
            >
              Extrato
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-xs text-inkSoft sm:inline">
            {session?.user?.email}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button type="submit" className="btn-ghost">
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
