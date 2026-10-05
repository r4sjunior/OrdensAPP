import kb from "./kb.json";
import type { Entry } from "./types";

// Base da Rose: kb.json (vai junto no código; editar e fazer deploy).
// O texto das respostas sigilosas (senha master) NÃO fica no git — o repositório é público.
// Ele vem da variável ROSE_SIGILOSO: base64 de {"slug": "texto"}, configurada na Vercel.
function secrets(): Record<string, string> {
  try {
    return JSON.parse(Buffer.from(process.env.ROSE_SIGILOSO ?? "", "base64").toString("utf-8"));
  } catch {
    return {};
  }
}

export function listEntries(): Entry[] {
  const s = secrets();
  return (kb as Entry[]).map((e) =>
    e.sensitive ? { ...e, content: s[e.slug] ?? "⚠️ Texto sigiloso não configurado no servidor (ROSE_SIGILOSO)." } : e,
  );
}

export function getEntry(slug: string): Entry | undefined {
  return listEntries().find((e) => e.slug === slug);
}
