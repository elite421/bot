# Environment Setup (Local Development)

This project now uses a single Next.js app with built‑in API routes (no separate Express server).

Because `.env` files are git-ignored, we provide non-hidden samples you can copy and rename.

## Next.js (App + API)

1) Copy sample to actual env file at project root:

```bash
cp env.local.sample .env.local
```

2) Edit `.env.local` as needed (example):

```ini
# Public API base used by the browser (defaults to /api if omitted)
NEXT_PUBLIC_API_URL=/api

# NextAuth (admin)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=change_me_in_local

# Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:MqHSLcbilaKYNlGlBJvhhBHsqLcIYyFC@centerbeam.proxy.rlwy.net:45511/railway?sslmode=require
# Note: the internal host (postgres.railway.internal:5432) only works inside Railway.
# For local/Vercel, use the PUBLIC proxy host above.

# App JWT for API routes
JWT_SECRET=dev_dev_dev_change_me

# Optional bot integration
BOT_SERVICE_URL=http://localhost:4002
BOT_INTERNAL_KEY=dev-secret-key
COMPANY_WHATSAPP_NUMBER=+919756862551

Run the app (frontend + API) in dev on port 3000:

```bash
npm run dev
```

Site: http://localhost:3000

API base: http://localhost:3000/api

## Optional

- If you set `NEXT_PUBLIC_PAYMENT_LINK_URL`, the dashboard will show purchase links.

## Notes

- Frontend env vars must be prefixed with `NEXT_PUBLIC_` to be exposed to the browser.
- For production, use secure secrets and production-appropriate values. Never commit real secrets.
