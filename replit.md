# NearBuy Business

Multi-tenant mobile + backend stack for shop owners (street vendors, market stall owners) to digitize their inventory so nearby customers can discover what they sell. Sellers can own multiple shops and invite SubSellers to help manage individual shops. Built as a pnpm monorepo with an Expo React Native app, a Node/Express + MongoDB (Mongoose) backend, and Clerk for authentication.

## Artifacts

- `artifacts/nearbuy-business` — Expo React Native app (mobile + web preview), serves at `/`
- `artifacts/api-server` — Node/Express API server, port 8080, base path `/api`
- `artifacts/mockup-sandbox` — Vite preview server for canvas mockups (template, unused)

## Roles

- **Seller** — owns one or many shops. Can do anything on shops they own (edit shop details, manage inventory, view requests, invite/remove helpers).
- **SubSeller (Helper)** — invited by a Seller to help with one specific shop. Can manage that shop's inventory and respond to requests, but cannot edit shop details or manage other helpers.

A user can simultaneously be a Seller of some shops and a Helper on others.

## Database (MongoDB Atlas + Mongoose)

All primary keys are MongoDB `ObjectId`s, serialized as 24-char hex strings in API responses (the OpenAPI spec uses plain `string` for all ids).

Connection lives in `lib/db/src/connect.ts` (`connectMongo()`, idempotent via cached promise). Models in `lib/db/src/models/`:

- `User` — `clerkUserId` (unique), `email`, `name`, timestamps. Auto-created on first authenticated request.
- `Shop` — `name`, `marketName`, `stallInfo`, `location` (GeoJSON `Point` + `2dsphere` index), `isOpen`, `sellerId`.
- `ShopMember` — `shopId` × `userId`, role enum (`seller` | `sub_seller`). Unique on (`shopId`, `userId`).
- `ShopInvitation` — pending email-based invites with role, `token` (unique), `clerkInvitationId`, `acceptedAt`, `createdBy`.
- `Category` — `name`, `slug` (unique), optional `parent` (self-ref), optional `icon`. 8 default French categories seeded on startup if collection is empty (Vêtements, Alimentation, Électronique, Maison & Déco, Beauté & Soins, Bijoux & Accessoires, Chaussures, Autre).
- `Product` — `shop` (ref Shop, required), `seller` (ref User, derived from shop), `name`, `slug` (auto from name), `brand`, `description`, `price` (cents), `quantity` (default 1), `colors[]`, `photos[]`, `sizes[]`, `categories[]` (ref Category), `weight`, `dimension` (height/length/width), `variations[]` (sku/price/quantity/colors/photos/dimension), `rating`, `reviews`, `totalSell`, `applyDiscount`, `tags[]`, `stockStatus` enum, plus legacy fields `imageUrl` / `category` (plain text) / `lastVerifiedAt`. Soft-delete via `deletedAt`.
- `Discount` — per-product discount with `code`, `percentOff`, `validFrom`, `validTo`, `isActive`.
- `BroadcastRequest` — `userId`, `query`, `location` (GeoJSON `Point` + `2dsphere`), `status` enum (`active` | `found` | `expired`).

`2dsphere` indexes on `Shop.location` and `BroadcastRequest.location` power radius/distance queries via `$nearSphere` / `$geoWithin`.

The API server calls `connectMongo()` and `seedDefaultCategories()` on startup; if Mongo is unreachable the server keeps serving (just logs the error) so `/healthz` stays green.

## Authentication (Clerk)

The API server runs Clerk as a managed proxy: `clerkProxyMiddleware` forwards `/__clerk/*` to Clerk's frontend API, so the mobile app can use `proxyUrl` to talk to Clerk through our domain. `clerkMiddleware()` populates `req.auth` from the bearer token. The `requireAuth` middleware resolves the Clerk user → Mongo `User` (auto-creating on first hit) and attaches the result as `req.user`.

The mobile app:
- Wraps the root in `ClerkProvider` + `ClerkLoaded` (`app/_layout.tsx`).
- Uses Clerk's custom-flow APIs (`useSignIn`, `useSignUp`, `useSSO`) for email/password and Google OAuth.
- After sign-in, `(home)/_layout.tsx` registers `setAuthTokenGetter(() => getToken())` so every API call carries `Authorization: Bearer <jwt>`.

## API endpoints (under `/api`, all require Bearer auth)

- `GET /healthz` (public)
- `GET /me` — current user + their shops with role
- `GET /shops`, `POST /shops` (creator becomes the Seller, `ShopMember(seller)` row also created)
- `GET /shops/:shopId`, `PUT /shops/:shopId` (Seller only), `PATCH /shops/:shopId/open`, `GET /shops/:shopId/qr`, `GET /shops/:shopId/summary`
- `GET /shops/:shopId/products`, `POST`, `PATCH /shops/:shopId/products/:id`, `DELETE`, `POST /shops/:shopId/products/analyze-photo`
- `GET /shops/:shopId/products/:productId/discounts`, `POST` same, `DELETE /shops/:shopId/products/:productId/discounts/:discountId`
- `GET /categories`
- `GET /shops/:shopId/requests`, `POST /shops/:shopId/requests/:id/found`, `POST /shops/:shopId/requests/:id/expire` (geo-scoped to shop's radius)
- `GET /shops/:shopId/members`, `POST /shops/:shopId/members/invite` (Seller only), `DELETE /shops/:shopId/members/:userId` (Seller only), `DELETE /shops/:shopId/invitations/:invitationId` (Seller only)
- `GET /invitations` — current user's pending invitations (joined by email)
- `POST /invitations/:token/accept` — accepts and creates `ShopMember` row

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
      add-product.tsx      AI photo analysis or manual product entry; surfaces brand, description, multi-photo, colors, sizes, multi-category picker
      camera.tsx           Capture photo, return to add-product
      (tabs)/              Per-shop tabs
        _layout.tsx        Inventory / Requests / Profile tabs
        index.tsx          Inventory list (thumbnail = photos[0] || imageUrl, brand line above name)
        requests.tsx       Broadcast requests for this shop
        profile.tsx        Shop profile, Open/Closed switch, QR, Helpers section (Seller only), Sign out
components/
  CategoryPicker.tsx       Horizontal multi-select chips backed by GET /categories
  HelpersSection.tsx       List/invite/remove helpers (used in profile, Seller only)
  HeaderSummary.tsx        Per-shop summary chip
  ShopMapPicker[.web].tsx  Native uses react-native-maps; web uses coord pad
  ShopMapPreview[.web].tsx Native map preview; web fallback
```

## Integrations

- Clerk (managed) — authentication via email/password and Google SSO; SubSeller invites via email/token
- OpenAI (via Replit AI Integrations proxy) — used by `/shops/:shopId/products/analyze-photo` for product photo → JSON
- MongoDB Atlas — primary persistence (Mongoose ODM)

## Environment variables

- `CLERK_SECRET_KEY` (api-server) — Clerk secret key
- `CLERK_PUBLISHABLE_KEY` — Clerk publishable key (exposed to Expo as `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` via the dev script)
- `MONGODB_URI` — MongoDB Atlas connection string (SRV format). Atlas Network Access must allow `0.0.0.0/0` for Replit's dynamic IPs.
- `SESSION_SECRET` — Express session secret

## Known notes

- `react-native-maps` pinned to 1.18.0 (Expo suggests 1.20.1 but 1.18.0 is the stable choice in this stack); not added to the `plugins` array in `app.json`
- Demo broadcast requests are inserted on first shop creation only
- The legacy Postgres database (`DATABASE_URL`) is no longer used by the application but remains provisioned (orphaned tables — drop later if desired). All persistence is in MongoDB Atlas now.
- Atlas auth note: Atlas returns the misleading error `bad auth : authentication failed` for both wrong credentials AND IP-not-allowlisted. If you hit it from Replit, first verify Network Access has `0.0.0.0/0` Active.
