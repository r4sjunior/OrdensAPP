// Música 8-bit gerada no navegador (Web Audio), sem arquivo de áudio.
// O celular só libera som depois de um toque na tela: chame play() dentro de um onClick.

type Note = [string | null, number]; // [nota (ex: "C5") ou pausa, duração em tempos]

type Sfx =
  | { kind: "slide"; at: number; from: number; to: number; dur: number } // "fiiiu" de escorregão
  | { kind: "fizz"; at: number; dur: number }; // chiado de lata/espuma

export type Song = {
  bpm: number;
  melody: Note[];
  bass: Note[];
  sfx?: Sfx[];
};

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function freq(note: string): number {
  const m = /^([A-G])(#?)(\d)$/.exec(note);
  if (!m) return 0;
  const midi = 12 * (Number(m[3]) + 1) + SEMITONES[m[1]] + (m[2] ? 1 : 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function scheduleVoice(
  ctx: AudioContext,
  out: AudioNode,
  notes: Note[],
  start: number,
  beat: number,
  type: OscillatorType,
  volume: number
) {
  let t = start;
  for (const [note, beats] of notes) {
    const dur = beats * beat;
    if (note) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq(note);
      // envelope curtinho, estilo videogame antigo
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.01);
      gain.gain.setValueAtTime(volume, t + dur * 0.7);
      gain.gain.linearRampToValueAtTime(0, t + dur * 0.95);
      osc.connect(gain).connect(out);
      osc.start(t);
      osc.stop(t + dur);
    }
    t += dur;
  }
}

function scheduleSfx(ctx: AudioContext, out: AudioNode, sfx: Sfx, start: number) {
  const t = start + sfx.at;
  if (sfx.kind === "slide") {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(sfx.from, t);
    osc.frequency.exponentialRampToValueAtTime(sfx.to, t + sfx.dur);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.linearRampToValueAtTime(0, t + sfx.dur);
    osc.connect(gain).connect(out);
    osc.start(t);
    osc.stop(t + sfx.dur);
    return;
  }
  const len = Math.floor(ctx.sampleRate * sfx.dur);
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffer;
  gain.gain.value = 0.12;
  src.connect(gain).connect(out);
  src.start(t);
}

function newContext(): AudioContext | null {
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return AC ? new AC() : null;
}

// Contexto de áudio compartilhado (roleta ao vivo). Tem que ser criado dentro de um
// toque na tela ("Tô dentro!"); depois disso o app pode tocar sons sozinho.
let shared: AudioContext | null = null;

export function unlockAudio(): AudioContext | null {
  if (!shared) shared = newContext();
  shared?.resume().catch(() => {});
  return shared;
}

export function sharedAudio(): AudioContext | null {
  return shared && shared.state !== "closed" ? shared : null;
}

// Bipe curto (contagem regressiva, "tic" da roleta).
export function beep(ctx: AudioContext, frequency: number, duration: number, volume = 0.08) {
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, t);
  gain.gain.linearRampToValueAtTime(0, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration);
}

// Toca a música e devolve uma função para parar. Sem `ctx`, cria um só para ela.
export function playSong(song: Song, ctx?: AudioContext): () => void {
  const own = !ctx;
  const audio = ctx ?? newContext();
  if (!audio) return () => {};
  return schedule(song, audio, own);
}

function schedule(song: Song, ctx: AudioContext, ownContext: boolean): () => void {
  const master = ctx.createGain();
  master.gain.value = 0.6;
  master.connect(ctx.destination);

  const beat = 60 / song.bpm;
  const start = ctx.currentTime + 0.05;
  scheduleVoice(ctx, master, song.melody, start, beat, "square", 0.09);
  scheduleVoice(ctx, master, song.bass, start, beat, "triangle", 0.18);
  for (const s of song.sfx ?? []) scheduleSfx(ctx, master, s, start);

  return () => {
    if (ownContext) ctx.close().catch(() => {});
    else master.disconnect();
  };
}

// Tema da chamada: subida animada (8 compassos a 150 bpm ≈ 12,8s), com o
// escorregão do técnico em 5s e a espuma da caixa abrindo em 9s.
export const CHAMADA_SONG: Song = {
  bpm: 150,
  melody: [
    ["C5", 0.5], ["E5", 0.5], ["G5", 0.5], ["C6", 0.5], ["G5", 0.5], ["E5", 0.5], ["G5", 1],
    ["A5", 0.5], ["F5", 0.5], ["A5", 0.5], ["C6", 0.5], ["A5", 0.5], ["F5", 0.5], ["A5", 1],
    ["G5", 0.5], ["E5", 0.5], ["G5", 0.5], ["B5", 0.5], ["D6", 0.5], ["B5", 0.5], ["G5", 1],
    ["C6", 0.5], ["B5", 0.5], ["A5", 0.5], ["G5", 0.5], ["F5", 0.5], ["E5", 0.5], ["D5", 1],
    ["E5", 0.5], ["E5", 0.5], ["G5", 1], ["E5", 0.5], ["E5", 0.5], ["A5", 1],
    ["F5", 0.5], ["F5", 0.5], ["A5", 1], ["G5", 0.5], ["F5", 0.5], ["E5", 0.5], ["D5", 0.5],
    ["C5", 0.5], ["E5", 0.5], ["G5", 0.5], ["C6", 0.5], ["E6", 0.5], ["D6", 0.5], ["C6", 0.5], ["B5", 0.5],
    ["C6", 1], ["G5", 0.5], ["C6", 0.5], ["E6", 2],
  ],
  bass: [
    ["C3", 1], ["G3", 1], ["C3", 1], ["G3", 1],
    ["F2", 1], ["C3", 1], ["F2", 1], ["C3", 1],
    ["G2", 1], ["D3", 1], ["G2", 1], ["D3", 1],
    ["C3", 1], ["G2", 1], ["F2", 1], ["G2", 1],
    ["C3", 1], ["G3", 1], ["A2", 1], ["E3", 1],
    ["F2", 1], ["C3", 1], ["G2", 1], ["D3", 1],
    ["C3", 1], ["E3", 1], ["G3", 1], ["E3", 1],
    ["C3", 1], ["G2", 1], ["C3", 2],
  ],
  sfx: [
    { kind: "slide", at: 5.0, from: 1400, to: 250, dur: 0.6 },
    { kind: "fizz", at: 9.0, dur: 0.9 },
  ],
};

// Vinheta de Natal (01/12): refrão de "Jingle Bells" (melodia tradicional, domínio
// público) em 8-bit. 8 compassos a 160 bpm = 12s. Batidas das partes da árvore
// encaixando em 1,5s / 3s / 4,5s e o brilho da estrela em 9s.
export const NATAL_SONG: Song = {
  bpm: 160,
  melody: [
    ["E5", 1], ["E5", 1], ["E5", 2],
    ["E5", 1], ["E5", 1], ["E5", 2],
    ["E5", 1], ["G5", 1], ["C5", 1.5], ["D5", 0.5],
    ["E5", 4],
    ["F5", 1], ["F5", 1], ["F5", 1.5], ["F5", 0.5],
    ["F5", 1], ["E5", 1], ["E5", 1], ["E5", 0.5], ["E5", 0.5],
    ["G5", 1], ["G5", 1], ["F5", 1], ["D5", 1],
    ["C5", 1], ["E5", 0.5], ["G5", 0.5], ["C6", 2],
  ],
  bass: [
    ["C3", 1], ["G2", 1], ["C3", 1], ["G2", 1],
    ["C3", 1], ["G2", 1], ["C3", 1], ["G2", 1],
    ["C3", 1], ["G2", 1], ["C3", 1], ["G2", 1],
    ["C3", 1], ["E3", 1], ["G3", 1], ["E3", 1],
    ["F2", 1], ["C3", 1], ["F2", 1], ["C3", 1],
    ["C3", 1], ["G2", 1], ["C3", 1], ["G2", 1],
    ["G2", 1], ["D3", 1], ["G2", 1], ["B2", 1],
    ["C3", 1], ["G2", 1], ["C3", 2],
  ],
  sfx: [
    { kind: "slide", at: 1.5, from: 220, to: 60, dur: 0.15 },
    { kind: "slide", at: 3.0, from: 220, to: 60, dur: 0.15 },
    { kind: "slide", at: 4.5, from: 220, to: 60, dur: 0.15 },
    { kind: "slide", at: 9.0, from: 700, to: 2600, dur: 0.5 },
  ],
};

// Fanfarra do vencedor (original): 2 voltas de 4 compassos a 160 bpm ≈ 12s.
const VICTORY_MELODY: Note[] = [
  ["G4", 0.5], ["C5", 0.5], ["E5", 0.5], ["G5", 1], ["E5", 0.5], ["G5", 1],
  ["A5", 0.5], ["G5", 0.5], ["F5", 0.5], ["A5", 0.5], ["G5", 2],
  ["E5", 0.5], ["F5", 0.5], ["G5", 0.5], ["C6", 0.5], ["B5", 0.5], ["G5", 0.5], ["A5", 0.5], ["B5", 0.5],
  ["C6", 1], ["G5", 0.5], ["E5", 0.5], ["C6", 2],
];
const VICTORY_BASS: Note[] = [
  ["C3", 1], ["G3", 1], ["C3", 1], ["G3", 1],
  ["F2", 1], ["C3", 1], ["G2", 1], ["D3", 1],
  ["C3", 1], ["E3", 1], ["F2", 1], ["G2", 1],
  ["C3", 1], ["G2", 1], ["C3", 2],
];

export const VICTORY_SONG: Song = {
  bpm: 160,
  melody: [...VICTORY_MELODY, ...VICTORY_MELODY.slice(0, -1), ["E6", 0.5], ["G6", 1.5]],
  bass: [...VICTORY_BASS, ...VICTORY_BASS],
  sfx: [{ kind: "fizz", at: 0, dur: 1.2 }],
};

// Sirene do APOIO DROP: dois tons alternando (estilo alarme 8-bit) por `seconds`.
// Devolve uma função para parar antes.
export function siren(ctx: AudioContext, seconds: number): () => void {
  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  const start = ctx.currentTime + 0.02;
  const step = 0.35;
  for (let i = 0; i * step < seconds; i++) {
    const t = start + i * step;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(i % 2 ? 660 : 990, t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.setValueAtTime(0, t + step * 0.9);
    osc.connect(gain).connect(master);
    osc.start(t);
    osc.stop(t + step);
  }
  return () => master.disconnect();
}

// "Ajuda a caminho": arpejo curto subindo, de alívio (≈2s).
export const HELP_ON_THE_WAY_SONG: Song = {
  bpm: 180,
  melody: [
    ["C5", 0.5], ["E5", 0.5], ["G5", 0.5], ["C6", 1],
    ["G5", 0.5], ["C6", 0.5], ["E6", 2],
  ],
  bass: [["C3", 2], ["G2", 1], ["C3", 2.5]],
};
