import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import NavBar from "@/components/NavBar";
import TeamMap from "@/components/TeamMap";

export const metadata = { title: "Mapa da equipe — Ordens de Serviço" };

export default async function MapaPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  return (
    <>
      <NavBar active="mapa" />
      <main className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:px-6 sm:py-10">
        <TeamMap />
      </main>
    </>
  );
}
