import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";

export default async function NavBar({ active }: { active: "dashboard" | "extrato" }) {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border-2 border-stamp font-display text-xs font-bold text-stamp">
            OS
          </div>
          <nav className="flex gap-4 text-sm sm:gap-6">
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

        <div className="flex items-center gap-3 sm:gap-4">
          {email && (
            <span className="hidden text-xs text-inkSoft md:inline">{email}</span>
          )}
          <SignOutButton redirectUrl="/">
            <button type="button" className="btn-ghost px-3 py-2 text-xs sm:px-4 sm:text-sm">
              Sair
            </button>
          </SignOutButton>
        </div>
      </div>
    </header>
  );
}
