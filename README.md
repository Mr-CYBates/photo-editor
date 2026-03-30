# Photo Editor – PixelCut

AI-powered background removal and photo editing tool.

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Hono (via Cloudflare Pages Functions)
- **Infrastructure**: Cloudflare Pages + D1 + KV
- **AI**: Remove.bg API
- **Auth**: Google OAuth 2.0

## Development

```bash
npm install
npm run dev          # Vite dev server (frontend)
npm run pages:dev    # Full-stack local dev with Pages Functions
```

## Deployment

Automatic via Cloudflare Pages GitHub integration. Push to `main` → auto deploy.

## Project Structure

```
├── src/              # React frontend
│   ├── pages/        # Page components
│   ├── hooks/        # React hooks (auth, credits)
│   └── styles/       # Global CSS
├── functions/        # Cloudflare Pages Functions (API)
│   ├── api/          # /api/* routes (Hono)
│   └── _api/         # Shared API modules (not routed)
├── public/           # Static assets
├── schema.sql        # D1 database schema
└── wrangler.toml     # Cloudflare config
```
# trigger rebuild
