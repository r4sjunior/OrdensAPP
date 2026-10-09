import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getMyCampaign } from "@/lib/tickets";

// GET /api/campaign/me
// Tickets ganhos na campanha (ordens + pódios), quanto já foi depositado como sorte e o peso na roleta.
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  return NextResponse.json(await getMyCampaign(userId));
}
