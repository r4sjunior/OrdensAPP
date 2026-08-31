import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import NavBar from "@/components/NavBar";
import OrderLogger from "@/components/OrderLogger";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  const today = new Date().toISOString().slice(0, 10);

  const orders = await prisma.order.findMany({
    where: {
      userId,
      date: new Date(`${today}T00:00:00.000Z`),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <NavBar active="dashboard" />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <OrderLogger
          initialDate={today}
          initialOrders={orders.map((o) => ({
            id: o.id,
            date: o.date.toISOString(),
            createdAt: o.createdAt.toISOString(),
          }))}
        />
      </main>
    </>
  );
}
