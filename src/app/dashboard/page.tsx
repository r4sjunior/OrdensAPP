import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getOrderStats } from "@/lib/stats";
import { getMyCampaign } from "@/lib/tickets";
import { todayISO } from "@/lib/dates";
import { lateDatesFor } from "@/lib/lateEntries";
import NavBar from "@/components/NavBar";
import OrderLogger from "@/components/OrderLogger";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  const today = todayISO();

  const [orders, stats, campaign, user] = await Promise.all([
    prisma.order.findMany({
      where: {
        userId,
        date: new Date(`${today}T00:00:00.000Z`),
      },
      orderBy: { createdAt: "desc" },
    }),
    getOrderStats(userId),
    getMyCampaign(userId),
    currentUser(),
  ]);
  // Dias passados que o adm liberou para este técnico lançar (só durante a campanha).
  const lateDates = lateDatesFor(user?.primaryEmailAddress?.emailAddress);

  return (
    <>
      <NavBar active="dashboard" />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <OrderLogger
          initialDate={today}
          initialOrders={orders.map((o) => ({
            id: o.id,
            date: o.date.toISOString(),
            createdAt: o.createdAt.toISOString(),
          }))}
          initialStats={stats}
          initialCampaign={campaign}
          lateDates={lateDates}
        />
      </main>
    </>
  );
}
