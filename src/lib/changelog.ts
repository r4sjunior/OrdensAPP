// Últimas atualizações do app, mostradas na barra de status no rodapé.
// Para anunciar algo novo: adicione um item NO TOPO da lista (o mais recente primeiro).

export type Update = {
  date: string; // AAAA-MM-DD
  text: string;
};

export const UPDATES: Update[] = [
  { date: "2026-11-26", text: "Pódio e ranking com balões de fala: o líder provoca e quem é ultrapassado reclama" },
  { date: "2026-11-26", text: "Caixinha de Gela: o sorteio agora é dia 10/12 e a campanha termina nesse dia (tickets valem até as 20h)" },
  { date: "2026-11-18", text: "Mapa da equipe desativado: a localização só volta se a equipe aprovar na votação secreta (a partir de 19/11)" },
  { date: "2026-11-17", text: "Novo mapa da equipe: toque no logo OS no topo e veja qual técnico está mais perto (07:40 às 20:00)" },
  { date: "2026-11-12", text: "Escala de novembro disponível na Help Rose" },
  { date: "2026-11-12", text: "Troque sua foto no Perfil (toque no seu avatar no topo): ela aparece nos rankings e na roleta do sorteio" },
  { date: "2026-11-12", text: "Caixinha de Gela: tickets valem até 11/12 às 20h; dá para depositar sorte até o fim do dia" },
  { date: "2026-11-12", text: "Na roleta do sorteio entra só quem registrou OS durante a campanha" },
  { date: "2026-11-12", text: "Caixinha de Gela: a campanha agora termina em 11/12, dia da confraternização (antes era 20/12)" },
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
