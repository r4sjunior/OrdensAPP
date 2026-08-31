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
5. Depois do primeiro deploy, rode `npm run db:push` **apontando para o
   banco de produção** (ou rode `npx prisma db push` localmente usando o
   `.env` com as credenciais de produção) para criar a tabela lá também.

---

## Estrutura

```
src/
  middleware.ts              # protege /dashboard e /extrato via Clerk
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

## Extensões possíveis

- Exportar o extrato em PDF/CSV
- Meta mensal de ordens com barra de progresso
- Múltiplos usuários vendo o total da equipe (hoje cada um só vê o seu)
