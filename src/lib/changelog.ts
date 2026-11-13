// Últimas atualizações do app, mostradas na barra de status no rodapé.
// Para anunciar algo novo: adicione um item NO TOPO da lista (o mais recente primeiro).

export type Update = {
  date: string; // AAAA-MM-DD
  text: string;
};

export const UPDATES: Update[] = [
  { date: "2026-11-12", text: "Caixinha de Gela: tickets valem até 11/12 às 20h; dá para depositar sorte até o fim do dia" },
  { date: "2026-11-12", text: "Na roleta do sorteio entra quem registrou OS no app" },
  { date: "2026-11-12", text: "Caixinha de Gela: a campanha agora termina em 11/12, dia da confraternização (antes era 20/12)" },
  { date: "2026-11-12", text: "Escala de novembro disponível na Help Rose" },
  { date: "2026-11-12", text: "Nova barra de atualizações no rodapé do app" },
  { date: "2026-10-19", text: "Melhorias no APOIO DROP e nas notificações" },
  { date: "2026-10-12", text: "Correção no reset semanal do ranking" },
  { date: "2026-10-12", text: "APOIO DROP: alertas por notificação mesmo com o app fechado" },
  { date: "2026-10-08", text: "Novo botão APOIO DROP para pedir ajuda com localização" },
  { date: "2026-10-08", text: "Ranking atualizado e campanha Caixinha de Gela" },
  { date: "2026-10-05", text: "Painel: média, dias trabalhados e total zeram a cada mês" },
  { date: "2026-10-05", text: "Help Rose chegou ao app" },
  { date: "2026-10-05", text: "Indicador de quem está online" },
  { date: "2026-09-29", text: "Ranking e pódio semanal" },
];
