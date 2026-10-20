import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { SignOutButton } from "@clerk/nextjs";
import OnlineBadge from "./OnlineBadge";
import LiveDraw from "./LiveDraw";
import ApoioDrop from "./ApoioDrop";

export default async function NavBar({ active }: { active: "dashboard" | "extrato" | "rose" | "perfil" }) {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    // O desfoque fica numa camada à parte: backdrop-filter no próprio header prenderia
    // os alertas `fixed` (SOS, sorteio) dentro dele.
    <header className="sticky top-0 z-[60] border-b border-black/5 shadow-[0_1px_12px_rgb(26_35_38/0.05)]">
      <div className="absolute inset-0 -z-10 bg-white/70 backdrop-blur-xl" aria-hidden />
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-stamp to-stampDark font-display text-xs font-bold text-white shadow-md shadow-stamp/30 max-[379px]:hidden">
            OS
          </div>
          <nav className="flex items-center gap-1 text-sm sm:gap-2 [&>a]:rounded-xl [&>a]:px-2 [&>a]:py-1.5 [&>a]:transition sm:[&>a]:px-3">
            <Link
              href="/rose"
              className={`flex items-center gap-1.5 whitespace-nowrap ${
                active === "rose"
                  ? "bg-stamp/10 font-medium text-stamp"
                  : "text-inkSoft hover:text-stamp"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/rose-96.png"
                alt=""
                width={20}
                height={20}
                className="h-5 w-5 shrink-0 rounded-full border border-stamp"
              />
              <span>
                <span className="hidden sm:inline">Help </span>Rose
              </span>
            </Link>
            <Link
              href="/dashboard"
              className={
                active === "dashboard"
                  ? "bg-ink font-medium text-white shadow-sm"
                  : "text-inkSoft hover:text-ink"
              }
            >
              Registrar
            </Link>
            <Link
              href="/extrato"
              className={
                active === "extrato"
                  ? "bg-ink font-medium text-white shadow-sm"
                  : "text-inkSoft hover:text-ink"
              }
            >
              Extrato
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <OnlineBadge />
          <LiveDraw />
          <ApoioDrop />
          {email && (
            <span className="hidden text-xs text-inkSoft md:inline">{email}</span>
          )}
          {user && (
            <Link href="/perfil" title="Seu avatar do sorteio" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.imageUrl}
                alt="Perfil"
                width={28}
                height={28}
                className={`h-7 w-7 rounded-full border-2 object-cover ${
                  active === "perfil" ? "border-stamp" : "border-line hover:border-ink"
                }`}
              />
            </Link>
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
