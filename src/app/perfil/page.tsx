import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import NavBar from "@/components/NavBar";
import ProfilePhoto from "@/components/ProfilePhoto";

export const metadata = { title: "Perfil — Ordens de Serviço" };

export default async function PerfilPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  return (
    <>
      <NavBar active="perfil" />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <ProfilePhoto />
      </main>
    </>
  );
}
