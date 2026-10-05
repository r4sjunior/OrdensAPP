import kb from "./kb.json";
import type { Entry } from "./types";

// Base da Rose: kb.json (vai junto no código; editar e fazer deploy).
// Tem senhas master — o repositório precisa continuar PRIVADO.
const entries = kb as Entry[];

export function listEntries(): Entry[] {
  return entries;
}

export function getEntry(slug: string): Entry | undefined {
  return entries.find((e) => e.slug === slug);
}
