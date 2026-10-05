import type { Entry } from "./types";

/** Versão da resposta que pode ir para o navegador: sigilosa sem acesso vai "trancada". */
export type PublicEntry = Omit<Entry, "content" | "media"> & {
  content: string;
  media: Entry["media"];
  locked: boolean;
};

export function toPublic(e: Entry, canSeeSensitive: boolean): PublicEntry {
  if (e.sensitive && !canSeeSensitive) {
    return { ...e, content: "", media: [], locked: true };
  }
  return { ...e, locked: false };
}
