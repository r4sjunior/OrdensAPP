"use client";

import Link from "next/link";
import { useState } from "react";
import type { Entry } from "@/lib/rose/types";

const URL_RE = /(https?:\/\/[^\s]+)/g;

function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noreferrer" className="break-all text-teal underline">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function MediaView({ media }: { media: Entry["media"] }) {
  if (media.length === 0) return null;
  return (
    <div className="mt-3 space-y-3">
      {media.map((m) => {
        if (m.type === "image")
          return (
            <a key={m.src} href={m.src} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.src} alt={m.name} loading="lazy" className="w-full rounded-sm border border-line bg-white" />
            </a>
          );
        if (m.type === "video")
          return <video key={m.src} src={m.src} controls preload="metadata" className="w-full rounded-sm border border-line bg-ink" />;
        if (m.type === "audio") return <audio key={m.src} src={m.src} controls className="w-full" />;
        return (
          <a key={m.src} href={m.src} download={m.type === "file" ? m.name : undefined} target="_blank" rel="noreferrer" className="btn-ghost w-full justify-start">
            <span aria-hidden>{m.type === "pdf" ? "📄" : "⬇️"}</span>
            <span className="truncate">{m.name}</span>
          </a>
        );
      })}
    </div>
  );
}

export default function EntryCard({
  entry,
  open: initiallyOpen = false,
  highlight = false,
}: {
  entry: Entry;
  open?: boolean;
  highlight?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [copied, setCopied] = useState(false);

  function toggle() {
    if (!open) fetch("/api/rose/hit", { method: "POST", body: JSON.stringify({ slug: entry.slug }) }).catch(() => {});
    setOpen(!open);
  }

  async function copy() {
    await navigator.clipboard.writeText(entry.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <article className={`rounded-sm border bg-white/50 ${highlight ? "border-stamp" : "border-line"}`}>
      <button type="button" onClick={toggle} className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left" aria-expanded={open}>
        <div className="min-w-0">
          <div className="font-display text-[15px] font-bold leading-snug">
            {entry.sensitive && <span aria-label="sigiloso">🔒 </span>}
            {entry.title}
          </div>
          <div className="mt-0.5 text-xs text-inkSoft">{entry.category}</div>
        </div>
        <span className={`mt-1 shrink-0 text-inkSoft transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="border-t border-line px-4 pb-4 pt-3">
          {entry.content && (
            <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-relaxed">
              <Linkified text={entry.content} />
            </pre>
          )}
          <MediaView media={entry.media} />
          <div className="mt-3 flex flex-wrap gap-2">
            {entry.content && (
              <button type="button" onClick={copy} className="btn-ghost">
                {copied ? "Copiado ✓" : "Copiar texto"}
              </button>
            )}
            <Link href={`/rose/r/${entry.slug}`} className="btn-ghost">
              Link direto
            </Link>
          </div>
        </div>
      )}
    </article>
  );
}
