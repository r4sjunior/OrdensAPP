import { createHash } from "crypto";
import { cookies } from "next/headers";

// Acesso simples por código, só para ver o app funcionando sem depender de nada.
// Na integração com o OrdensAPP isto passa a usar o login Google (Clerk) que já existe lá.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "rose-admin";
const TEAM_CODE = process.env.TEAM_CODE || "equipe";

const token = (kind: string, secret: string) =>
  createHash("sha256").update(`rose:${kind}:${secret}`).digest("hex");

export const COOKIE = { team: "rose_team", admin: "rose_admin" } as const;

export function checkCode(kind: "team" | "admin", code: string): string | null {
  const secret = kind === "admin" ? ADMIN_PASSWORD : TEAM_CODE;
  return code.trim() === secret ? token(kind, secret) : null;
}

export function isAdmin(): boolean {
  return cookies().get(COOKIE.admin)?.value === token("admin", ADMIN_PASSWORD);
}

/** Pode ver respostas sigilosas (senhas master): equipe ou admin. */
export function isTeam(): boolean {
  return cookies().get(COOKIE.team)?.value === token("team", TEAM_CODE) || isAdmin();
}
