import { isAdm } from "@/lib/adm";
import { prisma } from "@/lib/prisma";
import { getOpenDraw, getParticipants, toView, type Participant } from "@/lib/draw";
import { campaignPhase, CAMPAIGN } from "@/lib/campaign";
import AdmLogin from "@/components/AdmLogin";
import AdmPanel from "@/components/AdmPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "ADM — Sorteio da Caixinha de Gela", robots: { index: false } };

// Área do adm: só para fazer o sorteio da Caixinha de Gela (login próprio, fora do Google).
export default async function AdmPage() {
  if (!isAdm()) {
    return <AdmLogin configured={!!process.env.ADM_USER && !!process.env.ADM_PASSWORD} />;
  }

  const [participants, open, history] = await Promise.all([
    getParticipants(),
    getOpenDraw(true),
    prisma.draw.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <AdmPanel
      participants={participants.sort((a, b) => b.weight - a.weight)}
      openDraw={open ? toView(open, null) : null}
      phase={campaignPhase()}
      campaignEnd={CAMPAIGN.end}
      history={history.map((d) => {
        const winner = (d.participants as Participant[])[d.winnerIndex];
        return {
          id: d.id,
          createdAt: d.createdAt.toISOString(),
          test: d.test,
          participants: (d.participants as Participant[]).length,
          winnerName: winner?.name ?? "?",
          winnerImageUrl: winner?.imageUrl ?? "",
          winnerLuck: winner?.luck ?? 0,
        };
      })}
    />
  );
}
