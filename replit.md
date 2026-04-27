# NearBuy Suite

Two-sided marketplace built as a pnpm monorepo:

- **NearBuy Business** — Expo React Native app for shop owners to digitize their inventory (Sellers + SubSeller helpers).
- **NearBuy** — Expo React Native app for customers to discover products in nearby shops (map-centric search, visual search, "Still There?" Karma verification, broadcast requests).

Both mobile apps share the same Node/Express + MongoDB (Mongoose) backend and Clerk authentication. Each ships as an independent app with its own bundle ID (`com.nearbuy.business.app` / `com.nearbuy.app`), but only one mobile app can be registered in the Replit preview pane at a time. **NearBuy (customer)** is currently the registered one. The other runs in parallel via a manual workflow and is reached through its dev URL.

## Artifacts / Packages

- `artifacts/nearbuy` — Expo React Native (customer side), port 20248. **Currently registered as the mobile artifact in the Replit preview pane** (title "NearBuy", previewPath `/`). Note: the underlying artifact id is still `artifacts/nearbuy-business` because Replit does not allow changing artifact ids after creation; only the toml's title/dir/run/port were swapped.
- `artifacts/nearbuy-business` — Expo React Native (seller side), runs on port 20247 via the manual workflow `NearBuy Business (background)`. Not in the preview pane; reachable through its dev URL or by re-swapping the registration.
- `artifacts/api-server` — Node/Express API server, port 8080, base path `/api`.
- `artifacts/mockup-sandbox` — Vite preview server for canvas mockups (template, unused).

### Swapping which app is in the preview pane

Only one mobile app can be registered at a time. To put the **seller** app back in the preview:

1. `mv artifacts/nearbuy/.replit-artifact/artifact.toml artifacts/nearbuy-business/.replit-artifact/artifact.toml`
2. Edit a sibling `artifact.edit.toml` to set `title = "NearBuy Business"`, `localPort = 20247`, env `PORT = "20247"`, and run commands pointing to `@workspace/nearbuy-business` (keep `id = "artifacts/nearbuy-business"`).
3. Call `verifyAndReplaceArtifactToml` to commit.
4. Configure a manual workflow (e.g. "NearBuy (background)") to keep the customer app running on port 20248.

## Code sharing between the two mobile apps

Both apps reuse the same logo (`assets/images/icon.png`), splash animation (`components/AnimatedSplash.tsx`), color palette (`constants/colors.ts`), `useColors` hook, and UI primitives (`components/ui/*`). These are currently duplicated as a copy in each package; if churn becomes a problem, extract them into a shared `lib/mobile-ui` workspace package.

## NearBuy (customer) app structure

- `app/_layout.tsx` — Clerk + React Query providers, AnimatedSplash overlay.
- `app/index.tsx` — first-launch routing: shows onboarding once (`AsyncStorage` key `nearbuy.consumer.onboarding.seen`), then `(tabs)`.
- `app/onboarding.tsx` — 4-slide pager with full-bleed gradient hero per slide (welcome / search / visual search / Karma).
- `app/(tabs)/_layout.tsx` — 4 tabs: Carte (map), Recherche (search), Photo (visual search), Profil (Clerk + Karma).
- `app/(tabs)/index.tsx` — full-screen `react-native-maps` with GPS permission via `expo-location`, top search bar that hands off to the Search tab. Status pill shows live shop count. Markers use `components/ShopMarker.tsx` (gradient pin + product-count badge) and tap opens `components/ShopBottomSheet.tsx` (modal with shop details + preview products + "Encore là?" Karma CTA stub). Data comes from `lib/publicApi.ts → fetchNearbyShops` calling `GET /api/public/shops`. Web fallback: maps don't render but the status pill + shop count still update from the live API; geolocation falls back to Paris after a 2 s timeout for headless previews.
- `app/(tabs)/search.tsx` — debounced search input (300 ms) wired to `GET /api/public/search` via `lib/publicApi.ts → fetchSearch`. **Fuse.js** re-ranks results client-side (keys: `name` 0.6 / `brand` 0.2 / `description` 0.1 / `shopName` 0.1, threshold 0.5, `ignoreLocation: true`) so typos like `jeen` still surface `Jean slim brut indigo`. Each result card shows photo / brand / name / price / shop chip / distance + open-status; tapping opens the same `ShopBottomSheet` modal as the map. Empty state: hint card. No-results state: "Diffuser ma demande" CTA (BroadcastRequest endpoint wiring is the next pass).
- `app/(tabs)/camera.tsx` — capture / pick-from-gallery CTAs. Backend visual-search endpoint pending.
- `app/(tabs)/profile.tsx` — signed-out hero + sign-in CTA, signed-in shows name/email + Karma card. Karma always reads 0 until backend is wired.

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

The API server calls `connectMongo()`, `seedDefaultCategories()`, and `seedDemoShops()` on startup; if Mongo is unreachable the server keeps serving (just logs the error) so `/healthz` stays green.

`seedDemoShops()` (in `lib/db/src/seedDemoShops.ts`) is idempotent: if the demo seller (`demo-seller@nearbuy.local`) already owns shops, it skips. Otherwise it inserts 6 Paris shops (Marché des Enfants Rouges, Tech Corner, L'Atelier Denim, Boulangerie du Coin, Bijoux Nadia, Beauté Rose) with ~17 in-stock products so the customer map has content immediately. Products are inserted via `Product.insertMany(..., { lean: true })` rather than `Product.create()` to bypass a Mongoose 9.5.x pre-save hook bug — do NOT change to `Product.create` here.

## Authentication (Clerk)

The API server runs Clerk as a managed proxy: `clerkProxyMiddleware` forwards `/__clerk/*` to Clerk's frontend API, so the mobile app can use `proxyUrl` to talk to Clerk through our domain. `clerkMiddleware()` populates `req.auth` from the bearer token. The `requireAuth` middleware resolves the Clerk user → Mongo `User` (auto-creating on first hit) and attaches the result as `req.user`.

The mobile app:
- Wraps the root in `ClerkProvider` + `ClerkLoaded` (`app/_layout.tsx`).
- Uses Clerk's custom-flow APIs (`useSignIn`, `useSignUp`, `useSSO`) for email/password and Google OAuth.
- After sign-in, `(home)/_layout.tsx` registers `setAuthTokenGetter(() => getToken())` so every API call carries `Authorization: Bearer <jwt>`.

## API endpoints (under `/api`)

### Public (no auth — used by the customer app)

- `GET /healthz`
- `GET /public/shops?lat&lng&radiusKm=5&limit=200` — shops within radius via `$nearSphere`, each with `distanceMeters`, `productCount`, and up to 4 `previewProducts`
- `GET /public/shops/:shopId` — shop detail + full in-stock products list
- `GET /public/search?q&lat&lng&radiusKm=5&limit=60` — products in radius matching `q` (case-insensitive regex on `name`/`brand`/`description`/`tags`/`category`); if the strict regex returns nothing, falls back to **all** in-radius products so the client's Fuse.js can fuzzy-match typos (e.g. `jeen` → `Jean slim brut indigo`)

### Authenticated (Bearer JWT, all under `/api`)

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
