# Rose — ajuda de campo

A Rose nova: app (funciona no celular, pode “instalar” na tela inicial) + bot do Telegram,
os dois usando a mesma base de respostas.

Feito a partir do histórico do grupo **Help Rose** (abr/2023 → out/2026).

## O que melhorou em relação à Rose antiga

| Rose antiga (filtros) | Rose nova |
| --- | --- |
| Só respondia a palavra exata: “senhas master”, “cheque list”, “tv básica”, “wi-fi premium” ficavam sem resposta | Entende acento, plural, erro de digitação e frase do jeito que a pessoa fala (“amino a50 sem áudio como faz”) |
| Senhas master postadas abertas no grupo | Senhas ficam trancadas: no app pedem o código da equipe; no Telegram vão **no privado**, só para quem é membro do grupo |
| CMTS e pacotes eram fotos — não dava para buscar dentro | Tabelas transcritas: dá para buscar `NA40` (qual CMTS) ou o nome de um canal |
| Ninguém sabia o que faltava cadastrar | Painel de **lacunas**: o que o pessoal buscou e não achou, ordenado por quantidade de vezes |
| Cadastro por `/filter` no grupo, com problema de `_` e `*` sumindo das senhas | Painel com formulário, upload de foto/vídeo/PDF/APK, e o bot manda texto puro (senha chega certinha) |

No teste com 54 mensagens reais do grupo (`npm run test:busca`): **Rose antiga acertava 29, a nova acerta 54.**

## Rodar no seu PC

Precisa do Node 18+.

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Para testar no celular, use o IP do PC na mesma rede Wi-Fi
(ex: `http://192.168.0.10:3000`).

- **Código da equipe** (libera as senhas): `equipe2026`
- **Painel** (`/admin`): senha `rose-admin`

Os dois ficam no arquivo `.env` — troque antes de mostrar para alguém.

## Ligar o bot do Telegram

1. No Telegram, fale com o **@BotFather** → `/newbot` → copie o token.
2. Cole em `TELEGRAM_BOT_TOKEN` no `.env`.
3. Ainda no BotFather: `/setprivacy` → escolha o bot → **Disable** (sem isso o bot só enxerga
   comandos no grupo, não as perguntas normais).
4. Rode `npm run bot`, adicione o bot no grupo e mande `/id` lá. Copie o número para
   `TELEGRAM_GROUP_ID` no `.env` e reinicie o bot. É isso que libera as senhas no privado
   para quem é membro do grupo.

Dica: teste num grupo de teste antes de colocar no grupo de verdade, junto com a Rose antiga.

Comandos: `/menu` (ou o velho `/filters`), `/buscar`, `/ajuda`. No grupo não precisa de comando:
mensagem curta que parece pergunta já é respondida; conversa e “kkkk” a Rose ignora.

## Onde ficam os dados

- `data/kb.json` — as respostas. **Tem senhas: está no `.gitignore`, não suba para o GitHub.**
- `data/misses.json` — as lacunas.
- `public/kb/` — fotos, vídeos, PDFs e o APK do OS Mobile. Os vídeos de configuração Huawei/ZTE
  foram comprimidos (105 MB → 7,7 MB e 85 MB → 7 MB).

## O que ainda precisa de alguém da equipe

- **ZTE mesh**: são 3 vídeos, no export só veio o primeiro.
- **CMTS**: a 4ª coluna da foto saiu cortada (nodos NA11, NA18… sem o nome do CMTS).
- **Lacunas já conhecidas do histórico**: código/equipamentos HFC (~50 pedidos), código wifi6,
  DGO, senha Zyxel, sinal ONT Nokia — estão no painel esperando resposta.

## Integração futura com o OrdensAPP

Feito com a mesma base do OrdensAPP (Next.js 14, Tailwind, mesma paleta e fontes) para facilitar.
Quando for integrar: `src/lib/store.ts` troca os arquivos JSON por tabelas no Postgres (Prisma),
e `src/lib/auth.ts` troca o código da equipe pelo login Google (Clerk) que já existe lá.
A busca (`src/lib/search.ts`) e as telas vão como estão.
