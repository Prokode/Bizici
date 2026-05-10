# Local Development

How to run the NearBuy / BizIci suite on your own computer after cloning the repo from GitHub.

## Prerequisites

- **Node.js 20+** — https://nodejs.org
- **pnpm 9+** — `npm install -g pnpm`
- **MongoDB** — a connection string (MongoDB Atlas free tier works fine)
- **Clerk account** — https://clerk.com (free tier). You need both the *publishable* and *secret* keys from the same Clerk instance.
- **For the mobile apps:** the [Expo Go](https://expo.dev/client) app on your phone, or Xcode (iOS Simulator) / Android Studio (Android Emulator) on your machine.
- *(Optional)* **OpenAI API key** — only needed for the AI photo-analysis feature in BizIci Pro.

## 1. Install dependencies

```bash
git clone <your-repo-url> nearbuy
cd nearbuy
pnpm install
```

## 2. Environment variables

### Backend / web apps — `.env` at the repo root

The API server auto-loads `<repo-root>/.env` at startup (via Node's `--env-file-if-exists`). Requires Node 22.7+.

```bash
PORT=8080
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/nearbuy
SESSION_SECRET=any-long-random-string

CLERK_SECRET_KEY=sk_test_xxx
CLERK_PUBLISHABLE_KEY=pk_test_xxx

# Optional — only needed for AI photo analysis in BizIci Pro.
# On Replit these are injected automatically by the AI Integrations service.
# Locally, point them at OpenAI directly (or any OpenAI-compatible endpoint):
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
AI_INTEGRATIONS_OPENAI_API_KEY=sk-xxx
```

> The server now boots without these vars; AI endpoints will return an error only when actually called. Skip them if you don't need photo analysis.

### Mobile apps — one `.env` per Expo app

`artifacts/nearbuy/.env` **and** `artifacts/nearbuy-business/.env`:

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
EXPO_PUBLIC_API_URL=http://localhost:8080
```

> When testing on a real phone, replace `localhost` with your computer's LAN IP (e.g. `http://192.168.1.42:8080`) so your phone can reach the API server. Your phone and computer must be on the same Wi-Fi network.

## 3. Generate the typed API client

The frontends consume hooks/types generated from the OpenAPI spec. Run this once after install and again any time the spec changes:

```bash
pnpm --filter @workspace/api-spec run codegen
```

## 4. Run each app

Each app runs in its own terminal:

```bash
# Backend API (default port 8080)
pnpm --filter @workspace/api-server run dev

# Marketing / public site
pnpm --filter @workspace/nearbuy-site run dev

# Admin panel
pnpm --filter @workspace/nearbuy-admin run dev

# BizIci — customer mobile app (Expo)
pnpm --filter @workspace/nearbuy run dev

# BizIci Pro — seller mobile app (Expo)
pnpm --filter @workspace/nearbuy-business run dev
```

### Open them

- **Web apps:** open the URL each Vite server prints (usually `http://localhost:5173`, `http://localhost:5174`, …).
- **Mobile apps:** scan the QR code Expo prints with the Expo Go app on your phone, or press `i` (iOS sim) / `a` (Android emulator) in the Expo terminal.

## 5. Useful scripts

```bash
# Type-check the whole monorepo
pnpm run typecheck

# Type-check just the shared libs
pnpm run typecheck:libs

# Seed a few "pending KYC" shops for admin testing
pnpm --filter @workspace/scripts run seed:pending-kyc
```

## Notes & gotchas

- **Don't run `pnpm dev` at the repo root** — there is no root `dev` script. Always use `pnpm --filter @workspace/<name> run dev`.
- **Port collisions:** if two apps fight for the same port, set `PORT=xxxx` before the dev command (e.g. `PORT=5180 pnpm --filter @workspace/nearbuy-admin run dev`).
- **Clerk keys must match:** the `CLERK_PUBLISHABLE_KEY` used in the frontends and the `CLERK_SECRET_KEY` used by the API must come from the **same** Clerk instance, otherwise authentication will fail silently.
- **Apple Sign-In** is wired in the UI only; it will not work locally until you enable `oauth_apple` in your Clerk dashboard, configure Sign in with Apple in the Apple Developer portal, and add the `expo-apple-authentication` plugin to each app's `app.config.ts`.
- **Replit specifics don't apply locally:** workflow definitions, `BASE_PATH`, and the shared reverse proxy on port 80 are Replit-only conveniences. Locally, each app speaks directly on its own port.
