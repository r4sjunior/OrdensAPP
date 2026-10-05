import { NextResponse } from "next/server";
import { checkCode, COOKIE } from "@/lib/auth";

const MAX_AGE = 60 * 60 * 24 * 90; // 90 dias no celular do técnico

export async function POST(req: Request) {
  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const tok = checkCode("team", code ?? "");
  if (!tok) return NextResponse.json({ error: "Código errado." }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE.team, tok, { httpOnly: true, sameSite: "lax", maxAge: MAX_AGE, path: "/" });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE.team);
  return res;
}
