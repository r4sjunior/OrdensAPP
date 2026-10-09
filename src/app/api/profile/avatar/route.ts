import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// POST /api/profile/avatar
// Chamado depois que o usuário troca a foto em /perfil: guarda o endereço da foto
// (lido do Clerk, não do navegador) para ela aparecer nos rankings.
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  await prisma.profile.upsert({
    where: { userId },
    create: { userId, avatarUrl: user.imageUrl },
    update: { avatarUrl: user.imageUrl },
  });
  return NextResponse.json({ avatarUrl: user.imageUrl });
}
