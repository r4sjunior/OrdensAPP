import { NextResponse } from "next/server";
import { checkCode, COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const tok = checkCode("admin", password ?? "");
  if (!tok) return NextResponse.json({ error: "Senha errada." }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE.admin, tok, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/" });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE.admin);
  return res;
}
