"use client";

import { useEffect, useState } from "react";
import { ensurePushSubscription, isIosBrowser, pushStatus, type PushStatus } from "@/lib/pushClient";

// /perfil: estado dos alertas do SOS DROP neste aparelho + botão de teste, que manda um
// push de verdade pelo servidor (confere chaves, inscrição e a notificação do Android).
export default function PushSettings() {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const s = pushStatus();
    setStatus(s);
    if (s === "granted") ensurePushSubscription(false).catch(() => {});
  }, []);

  async function enable() {
    setMessage(null);
    try {
      setStatus(await ensurePushSubscription(true));
    } catch {
      setStatus(pushStatus());
      setMessage({ ok: false, text: "Não foi possível ativar neste navegador." });
    }
  }

  async function test() {
    setBusy(true);
    setMessage(null);
    try {
      await ensurePushSubscription(false);
      const res = await fetch("/api/push/test", { method: "POST" });
      const body = await res.json().catch(() => null);
      setMessage(
        res.ok
          ? { ok: true, text: "Alerta enviado! Minimize a aba: a notificação vermelha deve aparecer em alguns segundos." }
          : { ok: false, text: body?.error ?? "Não foi possível enviar o teste." }
      );
    } catch {
      setMessage({ ok: false, text: "Sem internet: tente de novo." });
    } finally {
      setBusy(false);
    }
  }

  const badge =
    status === "granted"
      ? { cls: "bg-emerald-100 text-emerald-700", text: "Ativo" }
      : status === "denied"
        ? { cls: "bg-red-100 text-red-700", text: "Bloqueado" }
        : status === "prompt"
          ? { cls: "bg-amber-100 text-amber-700", text: "Desativado" }
          : { cls: "bg-paperDim text-inkSoft", text: "Indisponível" };

  return (
    <section className="card mt-6 p-6 sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-red-700 font-display text-xs font-bold text-white shadow-lg shadow-red-600/30">
            SOS
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Alertas do SOS DROP</h2>
            <p className="text-sm text-inkSoft">Pedidos de apoio com som e vibração, mesmo com a aba minimizada.</p>
          </div>
        </div>
        {status && <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>{badge.text}</span>}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {status === "prompt" && (
          <button type="button" onClick={enable} className="btn-sos flex-1 py-3 text-sm">
            Ativar alertas
          </button>
        )}
        {status === "granted" && (
          <button type="button" onClick={test} disabled={busy} className="btn-sos flex-1 py-3 text-sm">
            {busy ? "Enviando…" : "Testar alerta"}
          </button>
        )}
      </div>

      {message && (
        <p className={`mt-3 rounded-xl px-3 py-2 text-sm ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {message.text}
        </p>
      )}

      {status === "denied" && (
        <p className="mt-3 text-sm text-inkSoft">
          As notificações deste site estão bloqueadas. Toque no cadeado ao lado do endereço → Permissões → Notificações →
          Permitir, e recarregue a página.
        </p>
      )}
      {status === "unsupported" && (
        <p className="mt-3 text-sm text-inkSoft">
          {isIosBrowser()
            ? "No iPhone: Compartilhar → Adicionar à Tela de Início, e abra o app por lá para ativar."
            : "Este navegador não recebe notificações. No Android use o Google Chrome."}
        </p>
      )}

      <details className="mt-4 rounded-2xl bg-paper px-4 py-3 text-sm text-inkSoft ring-1 ring-black/5">
        <summary className="cursor-pointer font-medium text-ink">Não aparece como pop-up no Android?</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Configurações do celular → Apps → Chrome → Notificações.</li>
          <li>Abra a categoria com o nome deste site.</li>
          <li>Ative <strong>“Mostrar na tela” / “Pop-up”</strong> e escolha <strong>“Alertar”</strong> com som.</li>
          <li>Desative a economia de bateria para o Chrome (Bateria → Sem restrições).</li>
          <li>Modo “Não perturbe” bloqueia o som: libere o Chrome nas exceções.</li>
        </ol>
      </details>
    </section>
  );
}
