import Link from "next/link";

export default function Header({ active }: { active?: "busca" | "admin" }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rose-96.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-full border-2 border-stamp" />
          <div className="leading-tight">
            <div className="font-display font-bold">Rose</div>
            <div className="text-xs text-inkSoft">ajuda de campo</div>
          </div>
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/" className={active === "busca" ? "font-medium text-ink" : "text-inkSoft hover:text-ink"}>
            Buscar
          </Link>
          <Link href="/admin" className={active === "admin" ? "font-medium text-ink" : "text-inkSoft hover:text-ink"}>
            Painel
          </Link>
        </nav>
      </div>
    </header>
  );
}
