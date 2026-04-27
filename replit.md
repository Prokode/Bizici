# NearBuy Business

Mobile app for shop owners (street vendors, market stall owners) to digitize inventory so nearby customers can discover what they sell. Built as a pnpm monorepo with an Expo React Native app and a Node/Express + Postgres + PostGIS backend.

## Artifacts

- `artifacts/nearbuy-business` — Expo React Native app (mobile + web preview), serves at `/`
- `artifacts/api-server` — Node/Express API server, port 8080, base path `/api`
- `artifacts/mockup-sandbox` — Vite preview server for canvas mockups (template)

## Database (PostgreSQL + PostGIS)

Three tables, all with UUID primary keys and PostGIS GEOGRAPHY(Point, 4326) for locations:

- `shops` — owner_id, name, location (geography point), market_name, stall_info, is_open
- `products` — shop_id (FK), name, price (decimal), category, tags (text[]), image_url, stock_status enum (`in_stock` | `out_of_stock`), last_verified_at
- `broadcast_requests` — user_id, query, location, status enum (`active` | `found` | `expired`)

GIST indexes on the GEOGRAPHY columns power radius/distance queries via `ST_DWithin` and `ST_Distance`.

## API endpoints (under `/api`)

All endpoints require `X-Owner-Id` header (UUID v4 generated and persisted on device).

- `GET /healthz`
- `GET /shop`, `PUT /shop`, `PATCH /shop/open`, `GET /shop/qr`
- `GET /products`, `POST /products`, `PATCH /products/:id`, `DELETE /products/:id`
- `POST /products/analyze-photo` — GPT-4o vision call returning `{name, category, price, tags}`
- `GET /requests` — broadcast requests within 5km of the shop, ordered by distance
- `POST /requests/:id/found`, `POST /requests/:id/expire`
- `GET /summary` — `{totalProducts, inStockCount, outOfStockCount, activeRequestsCount}`

When a shop is first created, the backend seeds 4 demo broadcast requests at random points within 200–2000 m of the shop so the Requests feed has content immediately.

## Codegen workflow

OpenAPI spec lives at `lib/api-spec/openapi.yaml`. Run:

```
pnpm --filter @workspace/api-spec run codegen
```

This regenerates:
- `lib/api-client-react/src/generated/` — React Query hooks & types
- `lib/api-zod/src/generated/` — Zod schemas used by the backend for body validation

## Mobile app structure

- `app/_layout.tsx` — providers, font loading, generates UUID owner ID via `expo-crypto`, sets the API base URL and `X-Owner-Id` header
- `app/onboarding.tsx` — first-run shop setup (name, market, stall info, then map pin)
- `app/(tabs)/index.tsx` — Inventory list with stock toggle and tags chips
- `app/(tabs)/requests.tsx` — Broadcast requests feed
- `app/(tabs)/profile.tsx` — Shop profile with Open/Closed toggle, map preview, QR modal
- `app/add-product.tsx` — AI photo analysis or manual product entry
- `components/ShopMapPicker[.web].tsx`, `components/ShopMapPreview[.web].tsx` — native uses `react-native-maps`, web uses a coord pad / static fallback

## Integrations

- OpenAI (via Replit AI Integrations proxy) — used by `/api/products/analyze-photo` for product photo → JSON
- PostgreSQL with PostGIS extension enabled

## Known notes

- `react-native-maps` pinned to 1.18.0 (Expo suggests 1.20.1 but 1.18.0 is the stable choice in this stack); not added to the `plugins` array in `app.json`
- Owner ID is a UUID v4 stored under AsyncStorage key `nearbuy-owner-id`
- Demo broadcast requests are inserted on first shop creation only
