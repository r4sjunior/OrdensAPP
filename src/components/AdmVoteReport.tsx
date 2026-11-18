"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VoteReport } from "@/lib/vote";
import { MAPA_POLL, fmtDay } from "@/lib/voteConfig";

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

// Documento da votação (só no /adm). Nunca mostra nomes; enquanto está aberta mostra só
// a participação, porque o parcial SIM/NÃO poderia revelar o voto de quem acabou de votar.
export default function AdmVoteReport({ report }: { report: VoteReport }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const missing = Math.max(0, report.eligible - report.voted);

  async function close() {
    if (
      !window.confirm(
        `Encerrar a votação agora com ${report.voted} de ${report.eligible} votos?\n\nA contagem será aberta e o app liga ou remove o mapa na hora. Não dá para desfazer.`
      )
    )
      return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/adm/votacao/close", { method: "POST" }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const body = await res?.json().catch(() => null);
      setError(body?.error ?? "Não foi possível encerrar.");
      return;
    }
    router.refresh();
  }

  return (
    <section className="mt-6 card p-4 sm:p-6 print:shadow-none">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold text-ink">🗳️ Documento da votação</h2>
          <p className="text-xs text-inkSoft">Consulta do adm · voto secreto, sem nomes</p>
        </div>
        <button type="button" onClick={() => window.print()} className="btn-ghost shrink-0 px-3 py-2 text-xs print:hidden">
          Imprimir
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-inkSoft">Assunto</dt>
          <dd className="text-ink">{report.title}</dd>
        </div>
        <div>
          <dt className="text-xs text-inkSoft">Pergunta</dt>
          <dd className="text-ink">{report.question}</dd>
        </div>
        <div>
          <dt className="text-xs text-inkSoft">Abertura</dt>
          <dd className="text-ink">{fmtDay(report.start)}/{report.start.slice(0, 4)} às 00:00</dd>
        </div>
        <div>
          <dt className="text-xs text-inkSoft">Quem vota</dt>
          <dd className="text-ink">
            Técnicos ativos: com OS registrada nos {MAPA_POLL.activeDays} dias antes da abertura ({report.eligible})
          </dd>
        </div>
        <div>
          <dt className="text-xs text-inkSoft">Situação</dt>
          <dd className="font-semibold text-ink">
            {report.phase === "soon"
              ? "Ainda não abriu"
              : report.phase === "open"
                ? "Aberta"
                : `Encerrada em ${fmtDateTime(report.closedAt!)} ${report.closedBy === "adm" ? "(pelo adm)" : "(todos os ativos votaram)"}`}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-inkSoft">Participação</dt>
          <dd className="text-ink">
            {report.voted} de {report.eligible} votaram{report.phase !== "closed" && ` · faltam ${missing}`}
          </dd>
        </div>
      </dl>

      {report.phase === "closed" ? (
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl bg-teal/10 p-3">
            <p className="font-mono text-3xl font-bold text-teal">{report.yes}</p>
            <p className="text-xs text-inkSoft">a favor (SIM)</p>
          </div>
          <div className="rounded-xl bg-stamp/10 p-3">
            <p className="font-mono text-3xl font-bold text-stamp">{report.no}</p>
            <p className="text-xs text-inkSoft">contra (NÃO)</p>
          </div>
          <p className="col-span-2 mt-1 text-sm font-semibold text-ink">
            Resultado: {report.outcome === "aprovado" ? "APROVADO — mapa da equipe ligado" : "REJEITADO — função removida do app"}
          </p>
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-paper px-3 py-2 text-xs text-inkSoft">
          🔐 A contagem SIM/NÃO fica criptografada até o fim. Ela é aberta sozinha quando todos os ativos votarem (ou se
          o adm encerrar), e aí aparecem só os totais.
        </p>
      )}

      <p className="mt-4 text-[11px] leading-snug text-inkSoft">
        Como o sigilo é garantido: nenhum voto individual é gravado. Existe só um contador criptografado (AES-256-GCM)
        somado a cada voto. Para impedir voto duplo fica guardado apenas um código (HMAC) de quem já votou, sem horário e
        sem o voto. Regra: precisa de maioria SIM; empate não aprova.
      </p>

      {report.phase === "open" && (
        <div className="mt-4 print:hidden">
          <button type="button" onClick={close} disabled={busy} className="btn-ghost w-full text-sm">
            {busy ? "Encerrando…" : "Encerrar votação agora (com os votos que já entraram)"}
          </button>
          {error && <p className="mt-2 text-sm text-stamp">{error}</p>}
        </div>
      )}
    </section>
  );
}
