# Ordens de Serviço

App para registrar a quantidade de ordens de serviço realizadas por dia, com
login via Google (Clerk) e extratos diário, semanal e mensal.

**Stack:** Next.js 14 (App Router) · Clerk (autenticação) · Prisma ·
Postgres (Neon / Vercel Postgres) · Tailwind CSS.

Cada clique em "Registrar ordem" cria um registro com a data escolhida
(padrão: hoje) vinculado ao seu usuário do Clerk. O banco só guarda o
`userId` do Clerk e a data — nenhum outro detalhe, como pedido.

---

## 1. Pré-requisitos

- Node.js 18+
- Uma conta na [Vercel](https://vercel.com)
- Uma conta no [Clerk](https://clerk.com) — você já tem uma instância
  criada (a do endereço "cordovan-grass")
- Um banco Postgres — o mais simples é criar direto pela Vercel
  (Storage → Postgres, que usa Neon por baixo)

---

## 2. Configurar o Clerk

1. Abra o [dashboard do Clerk](https://dashboard.clerk.com) e entre na
   instância que você já criou.
2. Em **Configure → SSO Connections**, ative **Google**. Se quiser que o
   login seja *só* por Google, vá em **Email, phone, username** e desative
   e-mail/senha como método de entrada.
3. Em **Configure → API Keys**, copie a **Publishable key** (`pk_...`) e a
   **Secret key** (`sk_...`).
4. Antes de publicar, no topo do dashboard troque do modo **Development**
   para criar/usar uma instância de **Production** (o Clerk gera outro par
   de chaves `pk_live_...` / `sk_live_...` para produção) e adicione o
   domínio final do seu app (`https://SEU-PROJETO.vercel.app`) em
   **Configure → Domains**.

---

## 3. Criar o banco de dados

1. No [dashboard da Vercel](https://vercel.com/dashboard), vá em **Storage → Create Database → Postgres** (Neon).
2. Depois de criado, abra a aba **.env.local** do banco e copie os valores de
   `DATABASE_URL` e `DIRECT_URL` (ou `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING`
   — se só existirem esses nomes, use `POSTGRES_URL` como `DATABASE_URL` e
   `POSTGRES_URL_NON_POOLING` como `DIRECT_URL`).

Se preferir, pode criar o banco direto em [neon.tech](https://neon.tech) e
usar a connection string de lá — funciona igual, é só Postgres padrão.

---

## 4. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```bash
cp .env.example .env
```

```
DATABASE_URL="..."                         # do passo 3
DIRECT_URL="..."                           # do passo 3
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..." # do passo 2
CLERK_SECRET_KEY="sk_..."                  # do passo 2
```

---

## 5. Rodar localmente

```bash
npm install
npm run db:push     # cria a tabela Order no banco a partir do prisma/schema.prisma
npm run dev
```

Abra `http://localhost:3000`, entre com sua conta Google e teste.

---

## 6. Subir para o GitHub

Use o **GitHub Desktop** (mais confiável que arrastar arquivos pelo site) ou
a linha de comando:

```bash
git init
git add .
git commit -m "app de ordens de serviço"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/OrdensAPP.git
git push -u origin main
```

Confirme no GitHub que as pastas `src/` e `prisma/` realmente aparecem no
repositório antes de seguir para o deploy.

---

## 7. Deploy na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório do GitHub.
2. Se o banco já foi criado pela própria Vercel (passo 3), conecte-o ao
   projeto em **Settings → Storage** — isso já injeta `DATABASE_URL` e
   `DIRECT_URL` automaticamente.
3. Em **Settings → Environment Variables**, adicione
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` e `CLERK_SECRET_KEY` — use as chaves
   de **produção** do Clerk (passo 2.4), não as de desenvolvimento.
4. Faça o deploy.
5. As tabelas são criadas/atualizadas sozinhas a cada deploy (o `build`
   roda `prisma db push`). Se uma mudança no schema for apagar dados, o
   deploy falha e avisa em vez de apagar.

---

## Estrutura

```
src/
  middleware.ts              # protege /dashboard, /extrato, /rose e /perfil via Clerk
  lib/prisma.ts               # cliente Prisma
  lib/dates.ts                 # helpers de data/semana/mês
  app/
    layout.tsx                 # ClerkProvider (pt-BR)
    page.tsx                   # login (Google, via Clerk)
    dashboard/page.tsx         # registrar ordens do dia
    extrato/page.tsx           # extrato diário/semanal/mensal
    api/orders/                # criar, listar, apagar ordens
    api/orders/summary/        # totais agregados por período
prisma/schema.prisma           # modelo único: Order (userId do Clerk + data)
```

## Help Rose

Aba **Help Rose** no topo (à esquerda): busca de senhas, códigos, configurações e
links da equipe técnica. Quem está logado com o Google vê tudo.

- `/rose` — busca · `/rose/r/<slug>` — link direto
- Respostas em `src/lib/rose/kb.json` (editar e fazer deploy). Fotos, vídeos e
  planilhas em `public/kb/`.
- `kb.json` tem as senhas master: **o repositório tem que continuar privado.**

## Sorteio da Caixinha de Gela

Campanha de 01/11 a 11/12 (datas em `src/lib/campaign.ts`).

- **Tickets** (`src/lib/tickets.ts`): 1 por ordem registrada no próprio dia; 1º lugar do
  dia +2, da semana (sáb–sex) +7, do mês +10 (empate: todos ganham). Calculados a partir
  das ordens — nada guardado à parte. Durante a campanha só dá para registrar ordens de hoje.
- **Sorte**: no Registrar, cada um escolhe quantos tickets depositar (não dá para desfazer;
  só entre 01/11 e 11/12). Peso na roleta = 1 + √sorte. Todo cadastrado entra, mesmo com 0.
- **Chamada**: animação 8-bit que abre sozinha uma vez por aparelho e reabre no card.
- **Avatar**: `/perfil` troca a foto (fica no Clerk). Só aparece na roleta.
- **`/adm`**: login próprio (`ADM_USER` / `ADM_PASSWORD` nas variáveis de ambiente).
  Lista quem está na roda com a chance de cada um. **VALENDO** sorteia o vencedor no
  servidor e grava tudo (tabela `Draw`); a roleta aparece em todo celular com o app
  aberto e gira 2 minutos depois, sincronizada. Marque **Teste** para ensaiar sem
  aparecer para ninguém. "Encerrar sorteio" tira a roleta da tela de todos.
- Para testar a campanha antes de novembro, no `.env` local:
  `NEXT_PUBLIC_CAMPAIGN_START="2026-10-01"` (não coloque na Vercel).

## APOIO DROP

Funciona todos os dias das 07:40 às 20:00 (Brasília; `src/lib/apoioHours.ts`): fora disso
o botão fica cinza e pedido aberto sem atendimento expira às 20:00.

Botão vermelho fixo em todas as telas. Ao confirmar, o app pega a localização do GPS e
todos os técnicos recebem o alerta: notificação push (toca mesmo com o app fechado /
tela bloqueada) e, com o app aberto, tela vermelha com o nome piscando, sirene nos
primeiros 30 s (depois só visual), botões Maps/Waze e **VOU AJUDAR**. Quem aceitar
primeiro fica com o apoio e todos recebem "✅ AJUDA A CAMINHO" com o tempo que o
pedido ficou aberto. Quem pediu pode cancelar. Tudo fica gravado na tabela `HelpRequest`.

- Push precisa de `NEXT_PUBLIC_VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY` (Vercel).
- Cada pessoa toca em **Ativar** no aviso do topo uma vez. No iPhone o push só funciona
  com o app instalado (Compartilhar → Adicionar à Tela de Início, iOS 16.4+).
- `public/sw.js` só recebe as notificações; não faz cache de nada.

## Extensões possíveis

- Exportar o extrato em PDF/CSV
- Meta mensal de ordens com barra de progresso
- Múltiplos usuários vendo o total da equipe (hoje cada um só vê o seu)
