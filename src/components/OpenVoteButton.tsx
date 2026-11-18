"use client";

import { OPEN_VOTE_EVENT } from "./MapaVote";

// Reabre o vídeo/votação do mapa (o componente MapaVote fica no topo do app).
export default function OpenVoteButton({ label }: { label: string }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_VOTE_EVENT))} className="btn-stamp mt-4 w-full sm:w-auto">
      {label}
    </button>
  );
}
