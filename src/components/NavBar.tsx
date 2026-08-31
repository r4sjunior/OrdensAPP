import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";

export default async function NavBar({ active }: { active: "dashboard" | "extrato" }) {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

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
          {email && (
            <span className="hidden text-xs text-inkSoft sm:inline">{email}</span>
          )}
          <SignOutButton redirectUrl="/">
            <button type="button" className="btn-ghost">
              Sair
            </button>
          </SignOutButton>
        </div>
      </div>
    </header>
  );
}
