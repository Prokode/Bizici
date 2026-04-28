# NearBuy Suite

## Overview

NearBuy is a two-sided marketplace designed to connect local shops with customers. The platform consists of two main mobile applications: "NearBuy Business" for shop owners to manage their inventory and "NearBuy" for customers to discover products from nearby shops. The project aims to digitize local commerce, provide a seamless shopping experience for customers through map-centric and visual search, and offer robust inventory management tools for businesses. The long-term vision includes expanding features like "Still There?" Karma verification and broadcast requests to enhance community engagement and product availability.

## User Preferences

I prefer concise and clear communication. When making changes, please prioritize iterative development and ask for confirmation before implementing major architectural shifts or significant feature changes.

## System Architecture

The NearBuy suite is built as a pnpm monorepo, sharing a common Node.js/Express backend with MongoDB (Mongoose) for persistence and Clerk for authentication.

**Mobile Applications (Expo React Native):**
- **NearBuy Business (Seller App):** Allows shop owners and their helpers to manage shop details, inventory, and customer requests.
- **NearBuy (Customer App):** Enables customers to discover products, search visually, and interact with shops. Features include `react-native-maps` for shop discovery, `Fuse.js` for client-side search re-ranking, and a "Karma" system for user engagement.

**UI/UX Decisions:**
- Both apps share a consistent branding, including the same logo, splash animation, color palette (defined in `constants/colors.ts`), and UI primitives for a cohesive user experience.
- The customer app features a 4-slide onboarding pager with full-bleed gradient heroes.
- Design uses a gradient theme (orange to pink) for branding and interactive elements.

**Backend (Node.js/Express):**
- **Clerk Integration:** Acts as a managed proxy for authentication, handling user sign-in/sign-up, SSO, and populating `req.auth` with user information. It also manages user roles (Seller, SubSeller).
- **MongoDB Models:** Key models include `User`, `Shop`, `ShopMember`, `ShopInvitation`, `Category`, `Product`, `Discount`, `BroadcastRequest`, `Conversation`, and `Message`. `2dsphere` indexes are used for efficient geospatial queries. The `Conversation` model has a unique compound index on `{shopId, customerUserId}`; `Message` is indexed on `{conversationId, createdAt:-1}` for efficient pagination.
- **API Endpoints:** Divided into public (e.g., `GET /public/shops`, `GET /public/search`, `POST /public/visual-search` — stub returning up to 6 in-radius products with mock confidence scores, optional `hint` text bias) and authenticated endpoints (e.g., `/me`, `/shops`, `/products`, `/karma`). The Express body limit is set to 10 MB so the visual-search endpoint can accept base64-encoded photos.
- **Codegen Workflow:** OpenAPI spec (`lib/api-spec/openapi.yaml`) generates React Query hooks and types (`lib/api-client-react/src/generated/`) and Zod schemas (`lib/api-zod/src/generated/`) for validation.

**Core Features:**
- **Product Management:** Sellers can add, edit, and delete products, including AI photo analysis for product details.
- **Shop Management:** Sellers can manage shop details, set operating hours, and invite helpers.
- **Search:** Customer app offers debounced text search (Fuse.js fuzzy re-rank) and a visual-search camera tab (`app/(tabs)/camera.tsx`) with capture/gallery/web-upload, an optional text indice, and a results list whose match cards open the shared `ShopBottomSheet`.
- **Karma System:** Tracks customer engagement with points for actions like stock confirmation.
- **Roles:** A user can be a Seller for some shops and a SubSeller (helper) for others.
- **Chat (Customer ↔ Seller):** Signed-in customers can open a 1:1 conversation per shop from the `ShopBottomSheet` ("Discuter avec le vendeur" CTA). A conversation is auto-upserted via `POST /api/conversations { shopId }` (rejected if the caller is already a `ShopMember` of that shop). Threads are paginated through `GET /api/conversations/:id/messages?before=&limit=`; sending uses `POST /api/conversations/:id/messages { text }`. The role is inferred per request from `customerUserId` vs `ShopMember`, so any seller / sub_seller of the shop receives the conversation in their inbox. Customer email is exposed only on the seller view. Unread counters are bumped on the receiving side and reset to 0 on the sending side automatically; `POST /api/conversations/:id/read` resets a side explicitly. The UI uses React Query polling (3s for messages, 5s for conversation lists, 8s for the badge) instead of websockets. Customer routes: `/(tabs)/messages`, `/chat-shop/[shopId]` (resolver), `/chat/[id]` (thread). Business routes: `/(home)/shops/[shopId]/(tabs)/messages` and `/(home)/shops/[shopId]/chat/[conversationId]`. Sign-in / sign-up screens honor a `next` query param to deep-link back into the chat after auth.

**Admin Web Space (NearBuy Admin):**
- Separate React + Vite SPA artifact (`artifacts/nearbuy-admin`) served at base path `/admin/`. It is the back-office for the whole platform and is *not* gated by Clerk — it has its own custom username + password + JWT auth, completely independent from the customer/seller Clerk accounts.
- **Auth model.** A root super-admin is bootstrapped on api-server boot from env vars `ROOT_ADMIN_USERNAME` (default `root`) and `ROOT_ADMIN_PASSWORD` (>=8 chars). The root account always has role `super_admin` and `isRoot=true`, can never be demoted, deleted, or renamed (`bootstrapRootAdmin` re-syncs every boot, so rotating the env var rotates the DB password). Other admins are created from the UI by a super_admin via `POST /api/admin/admins`. Login (`POST /api/admin/auth/login`) issues a 7-day HS256 JWT signed with `ADMIN_JWT_SECRET`, stored in browser `localStorage` as `nearbuy_admin_token` and sent as `Authorization: Bearer <token>` on every `/api/admin/*` request. A simple in-memory sliding-window rate limit (max 8 attempts / 15 min per IP+username) protects the login route from brute-force.
- **Roles.** `super_admin` (full power, manages other admins), `admin` (full destructive access on platform data — users / shops / products / categories / invitations / broadcasts / karma), `moderator` (read-mostly, may only delete messages and conversations). Per-route gating is enforced by the middlewares `requireAdmin`, `requireWriter` (admin or super_admin), and `requireSuperAdmin` (super_admin only). Destructive endpoints reject moderators with a 403.
- **Backend.** All admin endpoints live in `artifacts/api-server/src/routes/admin.ts` and are *intentionally mounted first* in `artifacts/api-server/src/routes/index.ts`, before any router that installs `router.use(requireAuth)` — Express middleware semantics mean those Clerk-auth middlewares would otherwise execute on requests destined for later routers and reject the admin login. Path-prefix scoping (`router.use("/admin", requireAdmin)`) keeps admin auth from leaking onto customer/seller routes. Endpoints cover: dashboard stats (`GET /admin/stats` with last-7-days messages series), users CRUD, shops CRUD + soft-delete, products with soft/hard delete + restore (`POST /admin/products/:id/restore`), categories CRUD, conversations + messages moderation, invitations, broadcasts, karma events, and admins management.
- **Frontend.** Pages (all in French, all under `/admin/`): `/login`, `/` (Dashboard with stat cards + recharts BarChart), `/users`, `/shops`, `/products`, `/categories`, `/conversations` (with thread viewer), `/invitations`, `/broadcasts`, `/karma`, `/admins` (super_admin only). Stack: Wouter routing + react-query + shadcn/ui + a custom dark sidebar with the NearBuy orange (#F47B20) accent. List endpoints follow the `{ items, page, pageSize, total }` envelope; the admins list returns `{ admins }`; messages return `{ items }`. The login screen plays an animated brand splash (gradient pin drops in, shopping bag spins inside, wordmark fades in, then the overlay fades out — ~3.3 s total) before revealing the login form. The splash is gated on a `sessionStorage` flag (`nearbuy_admin_splash_played`) so it plays once per browser session and respects `prefers-reduced-motion`.

## External Dependencies

- **Clerk:** Authentication and user management (email/password, Google SSO, invitations).
- **MongoDB Atlas:** Primary database for all application data using Mongoose ODM.
- **OpenAI (via Replit AI Integrations proxy):** Used for product photo analysis to extract product details.
- **Expo:** Framework for building universal React applications.
- **`react-native-maps`:** For displaying maps and location-based services in mobile apps.
- **`Fuse.js`:** Client-side fuzzy search library for product search re-ranking.