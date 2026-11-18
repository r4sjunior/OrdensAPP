import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import NavBar from "@/components/NavBar";
import TeamMap from "@/components/TeamMap";
import OpenVoteButton from "@/components/OpenVoteButton";
import { getMapaVoteState } from "@/lib/vote";
import { MAPA_POLL, fmtDay } from "@/lib/voteConfig";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mapa da equipe — Ordens de Serviço" };

export default async function MapaPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  const vote = await getMapaVoteState(userId);
  // Removido pela votação: a página deixa de existir para o usuário.
  if (vote.feature === "rejected") redirect("/dashboard");

  const missing = Math.max(0, vote.eligibleCount - vote.votedCount);

  return (
    <>
      <NavBar active="mapa" />
      <main className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:px-6 sm:py-10">
        {vote.feature === "approved" ? (
          <TeamMap />
        ) : (
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-ink">Mapa da equipe</h1>
              <p className="text-sm text-inkSoft">Localização dos técnicos em tempo real para o SOS DROP</p>
            </div>

            <div className="card p-6 text-center">
              <p className="text-4xl">🔒</p>
              <p className="mt-2 font-display text-lg font-bold text-ink">Desativado aguardando a aprovação da equipe</p>
              <p className="mt-2 text-sm text-inkSoft">
                A atualização de 17/11 mostrava no mapa onde cada técnico está, para o SOS DROP achar quem está mais
                perto. Como <strong className="text-ink">localização é um dado pessoal</strong>, a função foi desligada e
                ninguém está sendo localizado. Ela só volta se a maioria dos técnicos ativos votar <strong>SIM</strong>.
              </p>
              <ul className="mx-auto mt-4 max-w-md space-y-1 text-left text-sm text-inkSoft">
                <li>🗳️ Votação {vote.phase === "soon" ? `abre em ${fmtDay(MAPA_POLL.start)}` : "aberta"}: cada técnico ativo vota SIM ou NÃO.</li>
                <li>🔐 Voto secreto e criptografado: no fim aparece só o total a favor e contra, sem nomes.</li>
                <li>✅ Maioria SIM: o mapa volta a funcionar sozinho.</li>
                <li>❌ Maioria NÃO (ou empate): a função é removida do app.</li>
              </ul>

              {vote.phase === "open" && vote.eligibleCount > 0 && (
                <p className="mt-4 text-sm text-ink">
                  <strong className="font-mono">{vote.votedCount}</strong> de{" "}
                  <strong className="font-mono">{vote.eligibleCount}</strong> já votaram · faltam{" "}
                  <strong className="font-mono text-stamp">{missing}</strong>
                </p>
              )}

              <OpenVoteButton
                label={vote.phase === "open" && vote.canVote && !vote.voted ? "🗳️ Ver o vídeo e votar" : "▶ Ver o vídeo explicativo"}
              />
            </div>
          </div>
        )}
      </main>
    </>
  );
}
