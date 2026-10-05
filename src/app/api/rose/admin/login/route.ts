import { NextResponse } from "next/server";
import { ADMIN_COOKIE, checkAdminPassword, signedIn } from "@/lib/rose/auth";

export async function POST(req: Request) {
  if (!(await signedIn())) return NextResponse.json({ error: "Faça login." }, { status: 401 });
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const tok = checkAdminPassword(password ?? "");
  if (!tok) return NextResponse.json({ error: "Senha errada." }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, tok, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
