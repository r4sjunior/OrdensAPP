import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import NavBar from "@/components/NavBar";
import ExtratoView from "@/components/ExtratoView";

export default async function ExtratoPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  return (
    <>
      <NavBar active="extrato" />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <ExtratoView />
      </main>
    </>
  );
}
