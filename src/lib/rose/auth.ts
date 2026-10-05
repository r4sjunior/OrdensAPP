import { createHash } from "crypto";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";

// Ver a Rose (inclusive senhas master) basta estar logado no Clerk — isso é checado
// pelo middleware e pelas rotas. Aqui fica só a senha do painel de edição (/rose/admin).
const ADMIN_PASSWORD = process.env.ROSE_ADMIN_PASSWORD;

const token = (secret: string) => createHash("sha256").update(`rose:admin:${secret}`).digest("hex");

export const ADMIN_COOKIE = "rose_admin";

/** Sem ROSE_ADMIN_PASSWORD configurada o painel fica fechado. */
export function checkAdminPassword(password: string): string | null {
  return ADMIN_PASSWORD && password.trim() === ADMIN_PASSWORD ? token(ADMIN_PASSWORD) : null;
}

export function isAdmin(): boolean {
  return !!ADMIN_PASSWORD && cookies().get(ADMIN_COOKIE)?.value === token(ADMIN_PASSWORD);
}

/** Logado no Clerk (login Google do OrdensAPP). */
export async function signedIn(): Promise<boolean> {
  const { userId } = await auth();
  return !!userId;
}
