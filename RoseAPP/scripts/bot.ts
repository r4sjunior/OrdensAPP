// Rose no Telegram — usa a mesma base e a mesma busca do app.
// Rodar: npm run bot   (precisa de TELEGRAM_BOT_TOKEN no .env)
//
// No grupo: responde perguntas curtas ("senha zte", "achar cto", "NA40") sem precisar de /comando.
// Respostas sigilosas (senhas) nunca aparecem no grupo: vão no privado de quem é membro do grupo.
import { readFile } from "fs/promises";
import path from "path";
import { isGreeting, looksLikeQuery, search, tokens } from "../src/lib/search";
import { bumpHit, getEntry, listEntries, logMiss } from "../src/lib/store";
import type { Entry, Media } from "../src/lib/types";
import { CATEGORIES } from "../src/lib/types";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROUP_ID = process.env.TELEGRAM_GROUP_ID;
const APP_URL = process.env.APP_URL?.replace(/\/$/, "");
if (!TOKEN) {
  console.error("Falta TELEGRAM_BOT_TOKEN no .env (pegue com o @BotFather).");
  process.exit(1);
}

type User = { id: number; first_name: string; username?: string };
type Chat = { id: number; type: "private" | "group" | "supergroup" | "channel"; title?: string };
type Message = { message_id: number; from?: User; chat: Chat; text?: string; reply_to_message?: Message };
type CallbackQuery = { id: string; from: User; message?: Message; data?: string };
type Update = { update_id: number; message?: Message; callback_query?: CallbackQuery };
type Button = { text: string; callback_data?: string; url?: string };

async function tg<T = unknown>(method: string, body: Record<string, unknown> | FormData): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: isForm ? undefined : { "content-type": "application/json" },
    body: isForm ? body : JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!data.ok) throw new Error(`${method}: ${data.description}`);
  return data.result;
}

let botUsername = "";

// ---------- acesso às respostas sigilosas ----------

async function isMember(userId: number): Promise<boolean> {
  if (!GROUP_ID) return false;
  try {
    const m = await tg<{ status: string }>("getChatMember", { chat_id: GROUP_ID, user_id: userId });
    return ["creator", "administrator", "member", "restricted"].includes(m.status);
  } catch {
    return false;
  }
}

// ---------- envio de respostas ----------

const fileIds = new Map<string, string>(); // src -> file_id do Telegram (evita reenviar o mesmo vídeo)

const METHOD: Record<Media["type"], [string, string]> = {
  image: ["sendPhoto", "photo"],
  video: ["sendVideo", "video"],
  audio: ["sendVoice", "voice"],
  pdf: ["sendDocument", "document"],
  file: ["sendDocument", "document"],
};

async function sendMedia(chatId: number, m: Media, replyTo?: number) {
  const [method, field] = METHOD[m.type];
  const base = { chat_id: chatId, reply_to_message_id: replyTo, allow_sending_without_reply: true };
  const cached = fileIds.get(m.src);
  if (cached || APP_URL) {
    await tg(method, { ...base, [field]: cached ?? `${APP_URL}${m.src}` });
    return;
  }
  // rodando local: manda o arquivo direto do disco
  const buf = await readFile(path.join(process.cwd(), "public", m.src));
  const form = new FormData();
  form.append("chat_id", String(chatId));
  if (replyTo) form.append("reply_to_message_id", String(replyTo));
  form.append("allow_sending_without_reply", "true");
  form.append(field, new Blob([buf]), m.name);
  const sent = await tg<Record<string, unknown>>(method, form);
  const id = pickFileId(sent);
  if (id) fileIds.set(m.src, id);
}

function pickFileId(msg: Record<string, unknown>): string | undefined {
  const photo = msg.photo as { file_id: string }[] | undefined;
  if (photo?.length) return photo[photo.length - 1].file_id;
  for (const k of ["video", "voice", "document", "audio"]) {
    const f = msg[k] as { file_id: string } | undefined;
    if (f) return f.file_id;
  }
}

async function sendText(chatId: number, text: string, extra: Record<string, unknown> = {}) {
  // texto puro (sem Markdown): senhas com _ e * chegam certinhas, sem o problema da Rose antiga
  for (let i = 0; i < text.length; i += 4000) {
    await tg("sendMessage", { chat_id: chatId, text: text.slice(i, i + 4000), disable_web_page_preview: true, ...extra });
  }
}

async function sendEntry(chatId: number, e: Entry, replyTo?: number) {
  const link = APP_URL ? `\n\n↗ ${APP_URL}/r/${e.slug}` : "";
  const text = `📌 ${e.title}${e.content ? `\n\n${e.content}` : ""}${link}`;
  await sendText(chatId, text, { reply_to_message_id: replyTo, allow_sending_without_reply: true });
  for (const m of e.media) {
    try {
      await sendMedia(chatId, m);
    } catch (err) {
      console.error(`falha ao mandar ${m.src}:`, (err as Error).message);
    }
  }
  await bumpHit(e.slug);
}

/** Manda a resposta respeitando o sigilo: senha nunca vai para o grupo. */
async function deliver(e: Entry, user: User, chat: Chat, replyTo?: number) {
  if (!e.sensitive) return sendEntry(chat.id, e, replyTo);

  if (!(await isMember(user.id))) {
    const why = GROUP_ID ? "Isso é só para quem está no grupo da equipe." : "Configure TELEGRAM_GROUP_ID no .env para liberar respostas sigilosas.";
    return sendText(chat.id, `🔒 ${e.title}\n\n${why}`, { reply_to_message_id: replyTo });
  }
  if (chat.type === "private") return sendEntry(chat.id, e);

  try {
    await sendEntry(user.id, e);
    await sendText(chat.id, `🔒 ${user.first_name}, te mandei “${e.title}” no privado.`, { reply_to_message_id: replyTo });
  } catch {
    // o Telegram só deixa o bot mandar no privado de quem já deu /start nele
    await sendText(chat.id, `🔒 ${user.first_name}, isso é sigiloso. Toque no botão para eu te mandar no privado:`, {
      reply_to_message_id: replyTo,
      reply_markup: { inline_keyboard: [[{ text: "Abrir no privado", url: `https://t.me/${botUsername}?start=${e.slug}` }]] },
    });
  }
}

function optionsKeyboard(entries: Entry[]): { inline_keyboard: Button[][] } {
  return { inline_keyboard: entries.map((e) => [{ text: `${e.sensitive ? "🔒 " : ""}${e.title}`.slice(0, 60), callback_data: `e:${e.slug}` }]) };
}

async function sendMenu(chatId: number) {
  const all = await listEntries();
  const cats = CATEGORIES.filter((c) => all.some((e) => e.category === c));
  await sendText(chatId, "O que você procura? Pode escolher aqui ou só digitar (ex: “senha zte”, “achar cto”, “NA40”).", {
    reply_markup: { inline_keyboard: cats.map((c, i) => [{ text: c, callback_data: `c:${i}` }]) },
  });
}

const HELP = `Oi! Eu sou a Rose 🌹 — agora mais esperta.

Não precisa decorar palavra exata: escreve do seu jeito.
• senha zte  • achar cto  • ip os mobile
• amino sem áudio  • check list  • NA40 (qual CMTS)

/menu — ver tudo por assunto
Senhas eu mando só no privado, pra não ficarem expostas no grupo.`;

// ---------- tratamento das mensagens ----------

async function onMessage(msg: Message) {
  const text = msg.text?.trim();
  const user = msg.from;
  if (!text || !user) return;
  const chat = msg.chat;
  const isPrivate = chat.type === "private";
  const [cmd, ...rest] = text.split(/\s+/);
  const command = cmd.startsWith("/") ? cmd.slice(1).split("@")[0].toLowerCase() : null;

  if (command === "start") {
    const slug = rest[0];
    const e = slug ? await getEntry(slug) : undefined;
    if (e) return deliver(e, user, chat);
    return sendText(chat.id, HELP);
  }
  if (command === "ajuda" || command === "help") return sendText(chat.id, HELP);
  if (command === "menu" || command === "filters") return sendMenu(chat.id);
  if (command === "id") return sendText(chat.id, `ID deste chat: ${chat.id}`);
  if (command && command !== "buscar" && command !== "rose") return; // comandos de outros bots

  const query = command ? rest.join(" ") : text;
  const mentioned = /\brose\b/i.test(text) || (botUsername && text.includes(`@${botUsername}`)) || msg.reply_to_message?.from?.username === botUsername;

  if (!command && isGreeting(text)) {
    return sendText(chat.id, `Oi, ${user.first_name}! O que posso ajudar? Manda do seu jeito ou usa /menu.`, { reply_to_message_id: msg.message_id });
  }
  // no grupo, só responde o que parece pergunta — conversa e "kkkk" a Rose ignora
  if (!isPrivate && !command && !mentioned && !looksLikeQuery(text)) return;
  if (tokens(query).length === 0) return;

  const hits = search(await listEntries(), query, 5);
  const top = hits[0];

  if (top?.confidence === "alta") return deliver(top.entry, user, chat, msg.message_id);

  const options = hits.filter((h) => h.confidence === "media").slice(0, 4);
  if (options.length > 0) {
    return sendText(chat.id, "Você quis dizer:", { reply_to_message_id: msg.message_id, reply_markup: optionsKeyboard(options.map((h) => h.entry)) });
  }

  // não sabe: registra como lacuna. No grupo só fala se chamaram a Rose (pra não poluir a conversa).
  if (isPrivate || command || mentioned || tokens(query).length <= 3) await logMiss(query);
  if (isPrivate || command || mentioned) {
    const maybe = hits.slice(0, 3).map((h) => h.entry);
    await sendText(chat.id, "Ainda não sei isso 😕 Anotei para o pessoal cadastrar." + (maybe.length ? "\nTalvez seja algum destes:" : ""), {
      reply_to_message_id: msg.message_id,
      ...(maybe.length ? { reply_markup: optionsKeyboard(maybe) } : {}),
    });
  }
}

async function onCallback(cb: CallbackQuery) {
  const chat = cb.message?.chat;
  if (!chat || !cb.data) return;
  await tg("answerCallbackQuery", { callback_query_id: cb.id }).catch(() => {});
  const [kind, value] = [cb.data.slice(0, 1), cb.data.slice(2)];

  if (kind === "e") {
    const e = await getEntry(value);
    if (e) await deliver(e, cb.from, chat, cb.message?.message_id);
  } else if (kind === "c") {
    const all = await listEntries();
    const cats = CATEGORIES.filter((c) => all.some((e) => e.category === c));
    const cat = cats[Number(value)];
    const list = all.filter((e) => e.category === cat).sort((a, b) => b.hits - a.hits);
    await sendText(chat.id, cat ?? "Assuntos", { reply_markup: optionsKeyboard(list) });
  }
}

async function main() {
  const me = await tg<User>("getMe", {});
  botUsername = me.username ?? "";
  await tg("setMyCommands", {
    commands: [
      { command: "menu", description: "Ver tudo por assunto" },
      { command: "buscar", description: "Buscar (ou só escreva a pergunta)" },
      { command: "ajuda", description: "Como usar a Rose" },
    ],
  });
  console.log(`🌹 Rose no ar como @${botUsername}.${GROUP_ID ? "" : " (TELEGRAM_GROUP_ID vazio: respostas sigilosas bloqueadas)"}`);
  console.log(APP_URL ? `Mídias via ${APP_URL}` : "Mídias enviadas direto do disco.");

  let offset = 0;
  for (;;) {
    try {
      const updates = await tg<Update[]>("getUpdates", { offset, timeout: 30, allowed_updates: ["message", "callback_query"] });
      for (const u of updates) {
        offset = u.update_id + 1;
        try {
          if (u.message) await onMessage(u.message);
          if (u.callback_query) await onCallback(u.callback_query);
        } catch (err) {
          console.error("erro tratando mensagem:", (err as Error).message);
        }
      }
    } catch (err) {
      console.error("erro de conexão, tentando de novo:", (err as Error).message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

main().catch((err) => {
  console.error("Não consegui conectar no Telegram:", (err as Error).message);
  console.error("Confira o TELEGRAM_BOT_TOKEN no .env.");
  process.exit(1);
});
