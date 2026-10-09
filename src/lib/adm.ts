// Acesso ao /adm (sorteio da Caixinha de Gela): usuário e senha próprios, fora do
// login Google. Ficam só nas variáveis ADM_USER e ADM_PASSWORD (Vercel / .env).
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADM_COOKIE = "ordens_adm";
export const ADM_COOKIE_MAX_AGE = 60 * 60 * 12; // 12h

function credentials() {
  const user = process.env.ADM_USER;
  const password = process.env.ADM_PASSWORD;
  return user && password ? { user, password } : null;
}

function safeEqual(a: string, b: string) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

// Valor do cookie de sessão: muda sozinho se a senha for trocada.
export function admToken(): string | null {
  const c = credentials();
  return c ? createHmac("sha256", c.password).update(`adm:${c.user}`).digest("hex") : null;
}

export function checkAdmLogin(user: string, password: string): boolean {
  const c = credentials();
  return !!c && safeEqual(user.trim(), c.user) && safeEqual(password, c.password);
}

export function isAdm(): boolean {
  const token = admToken();
  const cookie = cookies().get(ADM_COOKIE)?.value;
  return !!token && !!cookie && safeEqual(cookie, token);
}
