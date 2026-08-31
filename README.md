# Ordens de Serviço

App para registrar a quantidade de ordens de serviço realizadas por dia, com
login via Google e extratos diário, semanal e mensal.

**Stack:** Next.js 14 (App Router) · NextAuth (Auth.js v5, login Google) ·
Prisma · Postgres (Neon / Vercel Postgres) · Tailwind CSS.

Cada clique em "Registrar ordem" cria um registro com a data escolhida
(padrão: hoje) vinculado ao seu usuário. Não guarda nenhum outro detalhe —
só data e usuário, como pedido.

---

## 1. Pré-requisitos

- Node.js 18+
- Uma conta na [Vercel](https://vercel.com)
- Uma conta no [Google Cloud Console](https://console.cloud.google.com)
  (para o login com Google)
- Um banco Postgres — o mais simples é criar direto pela Vercel
  (Storage → Postgres, que usa Neon por baixo)

---

## 2. Criar o banco de dados

1. No [dashboard da Vercel](https://vercel.com/dashboard), vá em **Storage → Create Database → Postgres** (Neon).
2. Depois de criado, abra a aba **.env.local** do banco e copie os valores de
   `DATABASE_URL` e `DIRECT_URL` (ou `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING`
   — se só existirem esses nomes, use `POSTGRES_URL` como `DATABASE_URL` e
   `POSTGRES_URL_NON_POOLING` como `DIRECT_URL`).

Se preferir, pode criar o banco direto em [neon.tech](https://neon.tech) e
usar a connection string de lá — funciona igual, é só Postgres padrão.

---

## 3. Criar as credenciais do Google (OAuth)

1. Acesse [console.cloud.google.com](https://console.cloud.google.com) → crie um projeto (ou use um existente).
2. Vá em **APIs e serviços → Tela de consentimento OAuth**, configure como
   "Externo", preencha nome do app e e-mail de suporte.
3. Vá em **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**.
   - Tipo de aplicativo: **Aplicativo da Web**
   - **Origens JavaScript autorizadas:**
     - `http://localhost:3000` (para testar local)
     - `https://SEU-PROJETO.vercel.app` (depois do deploy)
   - **URIs de redirecionamento autorizados:**
     - `http://localhost:3000/api/auth/callback/google`
     - `https://SEU-PROJETO.vercel.app/api/auth/callback/google`
4. Copie o **Client ID** e o **Client Secret** gerados.

---

## 4. Configurar variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

```bash
cp .env.example .env
```

```
DATABASE_URL="..."       # do passo 2
DIRECT_URL="..."         # do passo 2
AUTH_SECRET="..."        # gere com: openssl rand -base64 33
GOOGLE_CLIENT_ID="..."   # do passo 3
GOOGLE_CLIENT_SECRET="..."
```

---

## 5. Rodar localmente

```bash
npm install
npm run db:push     # cria as tabelas no banco a partir do prisma/schema.prisma
npm run dev
```

Abra `http://localhost:3000`, entre com sua conta Google e teste.

---

## 6. Subir para o GitHub

```bash
git init
git add .
git commit -m "app de ordens de serviço"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/ordens-app.git
git push -u origin main
```

---

## 7. Deploy na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório do GitHub.
2. Se o banco já foi criado pela própria Vercel (passo 2), conecte-o ao
   projeto em **Settings → Storage** — isso já injeta `DATABASE_URL` e
   `DIRECT_URL` automaticamente.
3. Em **Settings → Environment Variables**, adicione (se ainda não vieram do
   banco): `AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
4. Faça o deploy. Depois de publicado, volte no Google Cloud Console e
   confirme que a URL final (`https://SEU-PROJETO.vercel.app`) está nas
   origens/redirects autorizados (passo 3).
5. Depois do primeiro deploy, rode `npm run db:push` **apontando para o
   banco de produção** (ou rode `npx prisma db push` localmente usando o
   `.env` com as credenciais de produção) para criar as tabelas lá também.

---

## Estrutura

```
src/
  auth.ts                  # configuração do NextAuth (login Google)
  middleware.ts             # protege /dashboard, /extrato e /api/orders
  lib/prisma.ts             # cliente Prisma
  lib/dates.ts              # helpers de data/semana/mês
  app/
    page.tsx                # login
    dashboard/page.tsx      # registrar ordens do dia
    extrato/page.tsx        # extrato diário/semanal/mensal
    api/orders/             # criar, listar, apagar ordens
    api/orders/summary/     # totais agregados por período
prisma/schema.prisma        # modelos: User, Account, Session, Order
```

## Extensões possíveis

- Exportar o extrato em PDF/CSV
- Meta mensal de ordens com barra de progresso
- Múltiplos usuários vendo o total da equipe (hoje cada um só vê o seu)
