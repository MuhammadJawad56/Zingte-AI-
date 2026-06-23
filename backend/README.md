# Zingte API Hub — Backend

Standalone Express API for [Railway](https://railway.app) deployment.

## Quick start (local)

```bash
cd backend
cp .env.example .env
npm install
npm run db:push
npm run db:seed
npm run dev
```

API runs at **http://localhost:4000**

## With frontend (recommended local setup)

**Terminal 1** — backend:
```bash
cd backend && npm run dev
```

**Terminal 2** — frontend (proxies `/api/*` to backend):
```bash
# In project root — set in root .env:
# API_URL=http://localhost:4000
npm run dev
```

Open **http://localhost:3000**

## Deploy to Railway

### Step 1 — Create project
1. Go to [railway.app](https://railway.app) and sign in
2. **New Project** → **Deploy from GitHub repo**
3. Select your `Zingte-AI-` repository

### Step 2 — Set root directory
1. Open your service → **Settings**
2. Set **Root Directory** to `backend`
3. Set **Watch Paths** to `backend/**` (optional)

### Step 3 — Add PostgreSQL database
1. In the project, click **+ New** → **Database** → **PostgreSQL**
2. Railway creates `DATABASE_URL` automatically
3. In `backend/prisma/schema.prisma`, change the datasource to PostgreSQL:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
   (SQLite is fine for local-only dev; Railway requires PostgreSQL.)

### Step 4 — Environment variables
In **Variables**, add:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | (auto from PostgreSQL) |
| `JWT_SECRET` | long random string |
| `FRONTEND_URL` | your frontend URL e.g. `https://your-app.vercel.app` |
| `BACKEND_URL` | your Railway URL e.g. `https://xxx.up.railway.app` |
| `STRIPE_SECRET_KEY` | from Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | from Stripe webhook |
| `SMTP_HOST` | your mail provider |
| `SMTP_USER` | email username |
| `SMTP_PASS` | email password |
| `SMTP_FROM` | sender address |
| `NODE_ENV` | `production` |

### Step 5 — Database setup
After first deploy, open Railway **Shell** and run:
```bash
npx prisma db push
npx tsx prisma/seed.ts
npx tsx prisma/stripe-sync.ts
```

### Step 6 — Stripe webhook
Point Stripe webhook to:
```
https://YOUR-RAILWAY-URL.up.railway.app/api/stripe/webhook
```

### Step 7 — Connect frontend
On Vercel (or local `.env`):
```env
API_URL=https://YOUR-RAILWAY-URL.up.railway.app
NEXT_PUBLIC_APP_URL=https://your-frontend-domain.com
```

The Next.js frontend proxies all `/api/*` requests to Railway.

## API endpoints

| Path | Description |
|------|-------------|
| `GET /api/health` | Health check |
| `POST /api/auth/register` | Sign up |
| `POST /api/auth/login` | Sign in |
| `GET /api/auth/verify-email` | Email verification |
| `POST /api/auth/resend-verification` | Resend verify email |
| `GET /api/catalog` | API catalog |
| `POST /api/stripe/checkout` | Subscribe |
| `POST /api/verify` | Validate API token |

See `src/routes/` for the full list.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot reload |
| `npm run start` | Production server |
| `npm run db:push` | Sync Prisma schema to DB |
| `npm run db:seed` | Seed demo data |
| `npm run stripe:sync` | Sync products to Stripe |
