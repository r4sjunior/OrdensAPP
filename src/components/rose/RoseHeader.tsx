import Link from "next/link";

// Faixa da Rose logo abaixo do NavBar do OrdensAPP.
export default function RoseHeader() {
  return (
    <div className="border-b border-line bg-paperDim/60">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/rose" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/rose-96.png" alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-full border-2 border-stamp" />
          <div className="leading-tight">
            <div className="font-display text-sm font-bold">Rose</div>
            <div className="text-xs text-inkSoft">ajuda de campo</div>
          </div>
        </Link>
      </div>
    </div>
  );
}
