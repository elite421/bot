# Step-by-Step Setup and Deployment Guide

This guide walks you through local development, cloud database setup, Vercel deploy (Next.js app), and Railway deploy (WhatsApp bot), plus the required environment variables for both processes.

## 1) Prerequisites
- Node.js 18.18+ and npm 9+
- PostgreSQL database (cloud recommended: Neon, Supabase, Railway)
- A WhatsApp-enabled phone number (to test QR login)

## 2) Clone and install
- **Clone** this repository
- **Install** deps:
  - `npm ci`

## 3) Configure a cloud PostgreSQL database
- Create a Postgres instance on Neon/Supabase/Railway.
- Copy its connection string as `DATABASE_URL`.

## 4) Set up local env
- Create `.env.local` at the project root. You can start from `env.local.sample` or the `env.next.example` below.
- Minimal required for local Next.js:
  - `NEXT_PUBLIC_API_URL=/api` (use same-origin to avoid CORS)
  - `NEXTAUTH_URL=http://localhost:3000`
  - `NEXTAUTH_SECRET=<random-32b>`
  - `DATABASE_URL=<your-cloud-postgres-url>`
  - Optional but recommended: `COMPANY_WHATSAPP_NUMBER`, `DEFAULT_COUNTRY_CODE`, `BOT_SERVICE_URL`, `BOT_INTERNAL_KEY`.

## 5) Sync schema and seed admin (against your cloud DB)
- `npx prisma db push`
- `npm run prisma:seed`
  - Seeds admin: email `admin@example.com`, password `admin123`, role `admin` (configurable via env)

## 6) Run locally
- App only: `npm run dev`
- App + Bot together: `npm run dev:all`
  - Bot reads `.env.local` via the `bot:local` script.
- Open http://localhost:3000
  - Test QR login on `/register` (or the page that renders the `QRLogin` component)
  - Admin login: `/admin-login` with `admin@example.com`/`admin123`, then visit `/admin`

## 7) Deploy to Vercel (Next.js app)
- In Vercel → Project → Settings → Environment Variables (Production):
  - `NEXT_PUBLIC_API_URL=/api` (recommended to avoid CORS)
  - `NEXTAUTH_URL=https://<your-next-app>.vercel.app`
  - `NEXTAUTH_SECRET=<random-32b>`
  - `DATABASE_URL=<your-cloud-postgres-url>` (must be the same DB the bot uses)
  - Optional: `COMPANY_WHATSAPP_NUMBER`, `DEFAULT_COUNTRY_CODE`, `BOT_SERVICE_URL=<railway-bot-url>`, `BOT_INTERNAL_KEY=<shared>`, `NEXT_PUBLIC_PAYMENT_LINK_URL`, `PAYMENT_LINK_URL`
- Redeploy the app so the new env is compiled in.

## 8) Deploy to Railway (WhatsApp bot)
- Create a Node service and point it to `cursor/bot.js`.
- Add a writable Volume and mount it at `/data`.
- Set Environment Variables:
  - `APP_URL=https://<your-next-app>.vercel.app`
  - `BACKEND_API_URL=https://<your-next-app>.vercel.app/api` (explicit API base)
  - `BOT_CLIENT_ID=bot-prod`
  - `SESSION_DIR=/data/session`
  - `BOT_INTERNAL_KEY=<shared>` (must match Next app)
  - `DEFAULT_COUNTRY_CODE=91` (adjust as needed)
  - `HEADLESS=true`
  - Optional: `PUPPETEER_EXECUTABLE_PATH` (if required by your buildpack)
  - Optional: `PAYMENT_LINK_URL` or `NEXT_PUBLIC_PAYMENT_LINK_URL`
- Expose port `4002` if needed and confirm the health endpoint `/health`.
- Verify bot QR at `https://<railway-app-domain>/qr`.

## 9) Connect the Next app to the Bot
- In Vercel env for the Next app:
  - `BOT_SERVICE_URL=https://<railway-bot-domain>`
  - `BOT_INTERNAL_KEY=<same-as-railway>`

## 10) Troubleshooting
- **QR 405 / Network error**:
  - Ensure `NEXT_PUBLIC_API_URL=/api` (same origin). If you must use cross-origin, you’ll need CORS handlers—recommended is same-origin.
- **P2021 (table not found)**:
  - Run `npx prisma db push` on the same DB used by Vercel.
- **Admin Unauthorized**:
  - Set `NEXTAUTH_SECRET` and `NEXTAUTH_URL` on Vercel, login at `/admin-login`.
- **Bot says "User not found"**:
  - Ensure Railway bot hits the same DB/app: set `BACKEND_API_URL` to your Next app API and both services share the same `DATABASE_URL` (Next app side).

## 11) Useful scripts
- `npm run dev` → Next dev
- `npm run dev:all` → Next dev + bot
- `npm run prisma:generate` → regenerate Prisma client
- `npm run prisma:migrate` → create migrations (dev)
- `npm run prisma:seed` → seed admin and optional packages

## 12) Environment examples
- See `env.next.example` (Next.js app) and `env.bot.example` (WhatsApp bot) in the repo root for a clean set of vars.
