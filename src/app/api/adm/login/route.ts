import { NextRequest, NextResponse } from "next/server";
import { ADM_COOKIE, ADM_COOKIE_MAX_AGE, admToken, checkAdmLogin } from "@/lib/adm";

// POST /api/adm/login  { user, password } -> cookie de sessão do /adm
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const user = String(body?.user ?? "");
  const password = String(body?.password ?? "");
  const token = admToken();

  if (!token || !checkAdmLogin(user, password)) {
    // atraso para dificultar chutar a senha
    await new Promise((r) => setTimeout(r, 1000));
    return NextResponse.json({ error: "Usuário ou senha incorretos." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADM_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADM_COOKIE_MAX_AGE,
  });
  return res;
}

// DELETE /api/adm/login -> sair do /adm
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADM_COOKIE);
  return res;
}
