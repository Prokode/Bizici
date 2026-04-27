# NearBuy Business

Multi-tenant mobile + backend stack for shop owners (street vendors, market stall owners) to digitize their inventory so nearby customers can discover what they sell. Sellers can own multiple shops and invite SubSellers to help manage individual shops. Built as a pnpm monorepo with an Expo React Native app, a Node/Express + Postgres + PostGIS backend, and Clerk for authentication.

## Artifacts

- `artifacts/nearbuy-business` — Expo React Native app (mobile + web preview), serves at `/`
- `artifacts/api-server` — Node/Express API server, port 8080, base path `/api`
- `artifacts/mockup-sandbox` — Vite preview server for canvas mockups (template, unused)

## Roles

- **Seller** — owns one or many shops. Can do anything on shops they own (edit shop details, manage inventory, view requests, invite/remove helpers).
- **SubSeller (Helper)** — invited by a Seller to help with one specific shop. Can manage that shop's inventory and respond to requests, but cannot edit shop details or manage other helpers.

A user can simultaneously be a Seller of some shops and a Helper on others.

## Database (PostgreSQL + PostGIS)

All primary keys are `uuid` (`gen_random_uuid()` default). PostGIS GEOGRAPHY(Point, 4326) columns power radius/distance queries.

- `users` — `clerk_user_id` (unique), email, name, timestamps. Auto-created on first authenticated request.
- `shops` — `seller_id` (FK → users), name, location (geography point), market_name, stall_info, is_open
- `shop_members` — `shop_id` × `user_id` membership with role enum (`seller` | `sub_seller`). Unique on (shop_id, user_id).
- `shop_invitations` — pending email-based invites to a shop with role, token (unique), and `clerk_invitation_id`.
- `products` — shop_id (FK), name, price (cents int), category, tags (text[]), image_url, stock_status enum (`in_stock` | `out_of_stock`), last_verified_at
- `broadcast_requests` — user_id, query, location, status enum (`active` | `found` | `expired`)

GIST indexes on the GEOGRAPHY columns power radius/distance queries via `ST_DWithin` and `ST_Distance`.

## Authentication (Clerk)

The API server runs Clerk as a managed proxy: `clerkProxyMiddleware` forwards `/__clerk/*` to Clerk's frontend API, so the mobile app can use `proxyUrl` to talk to Clerk through our domain. `clerkMiddleware()` populates `req.auth` from the bearer token. The `requireAuth` middleware resolves the Clerk user → DB user (auto-creating on first hit) and attaches the result as `req.user`.

The mobile app:
- Wraps the root in `ClerkProvider` + `ClerkLoaded` (`app/_layout.tsx`).
- Uses Clerk's custom-flow APIs (`useSignIn`, `useSignUp`, `useSSO`) for email/password and Google OAuth.
- After sign-in, `(home)/_layout.tsx` registers `setAuthTokenGetter(() => getToken())` so every API call carries `Authorization: Bearer <jwt>`.

## API endpoints (under `/api`, all require Bearer auth)

- `GET /healthz` (public)
- `GET /me` — current user + their shops with role
- `GET /shops`, `POST /shops` (creator becomes the Seller)
- `GET /shops/:shopId`, `PUT /shops/:shopId` (Seller only), `PATCH /shops/:shopId/open`, `GET /shops/:shopId/qr`, `GET /shops/:shopId/summary`
- `GET /shops/:shopId/products`, `POST`, `PATCH /shops/:shopId/products/:id`, `DELETE`, `POST /shops/:shopId/products/analyze-photo`
- `GET /shops/:shopId/requests`, `POST /shops/:shopId/requests/:id/found`, `POST /shops/:shopId/requests/:id/expire`
- `GET /shops/:shopId/members`, `POST /shops/:shopId/members/invite` (Seller only), `DELETE /shops/:shopId/members/:userId` (Seller only), `DELETE /shops/:shopId/invitations/:invitationId` (Seller only)
- `GET /invitations` — current user's pending invitations (joined by email)
- `POST /invitations/:token/accept` — accepts and creates `shop_members` row

When the first shop is created the backend seeds 4 demo broadcast requests at random points within 200–2000 m of the shop so the Requests feed has content immediately.

## Codegen workflow

OpenAPI spec lives at `lib/api-spec/openapi.yaml`. Run:

```
pnpm --filter @workspace/api-spec run codegen
```

This regenerates:
- `lib/api-client-react/src/generated/` — React Query hooks & types
- `lib/api-zod/src/generated/` — Zod schemas used by the backend for body validation

## Mobile app structure

```
app/
  _layout.tsx              ClerkProvider + ClerkLoaded + providers
  index.tsx                Auth-aware redirect (signed in → /(home), else → /(auth)/sign-in)
  (auth)/                  Public auth screens
    _layout.tsx            Stack; redirects to /(home) when already signed in
    sign-in.tsx            Email/password + Google SSO
    sign-up.tsx            Email/password (with email code verification) + Google SSO
  (home)/                  Authenticated area
    _layout.tsx            Auth gate; wires setAuthTokenGetter(() => getToken())
    index.tsx              Shop list (role badge per shop, pending-invite banner, "+ New shop" FAB)
    new-shop.tsx           Two-step create shop flow (form + map pin)
    invitations.tsx        Pending invitations list with Accept button
    shops/[shopId]/
      _layout.tsx          Stack with (tabs), add-product, camera, edit
      edit.tsx             Edit shop details (Seller only)
      add-product.tsx      AI photo analysis or manual product entry (shop-scoped)
      camera.tsx           Capture photo, return to add-product
      (tabs)/              Per-shop tabs
        _layout.tsx        Inventory / Requests / Profile tabs
        index.tsx          Inventory list (HeaderSummary uses /shops/:id/summary)
        requests.tsx       Broadcast requests for this shop
        profile.tsx        Shop profile, Open/Closed switch, QR, Helpers section (Seller only), Sign out
components/
  HelpersSection.tsx       List/invite/remove helpers (used in profile, Seller only)
  HeaderSummary.tsx        Per-shop summary chip
  ShopMapPicker[.web].tsx  Native uses react-native-maps; web uses coord pad
  ShopMapPreview[.web].tsx Native map preview; web fallback
```

## Integrations

- Clerk (managed) — authentication via email/password and Google SSO; SubSeller invites via email/token
- OpenAI (via Replit AI Integrations proxy) — used by `/shops/:shopId/products/analyze-photo` for product photo → JSON
- PostgreSQL with PostGIS extension enabled

## Environment variables

- `CLERK_SECRET_KEY` (api-server) — Clerk secret key
- `CLERK_PUBLISHABLE_KEY` — Clerk publishable key (exposed to Expo as `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` via the dev script)
- `DATABASE_URL` — Postgres connection string
- `SESSION_SECRET` — Express session secret

## Known notes

- `react-native-maps` pinned to 1.18.0 (Expo suggests 1.20.1 but 1.18.0 is the stable choice in this stack); not added to the `plugins` array in `app.json`
- Demo broadcast requests are inserted on first shop creation only
- Drizzle schema is the source of truth; use `pnpm --filter @workspace/db run db:push --force` to sync the database. (One historical exception: when the schema was first reworked, raw SQL was used because `db:push` hangs on a PostGIS `spatial_ref_sys` false-positive rename in this non-TTY environment. The schema files match the live DB so subsequent `db:push` runs see no diff.)
