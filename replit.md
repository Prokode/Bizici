# NearBuy Suite

## Overview

BizIci is a two-sided marketplace connecting local shops with customers via "BizIci Pro" (seller app, dir `nearbuy-business`) and "BizIci" (customer app, dir `nearbuy`) mobile applications. Its core purpose is to digitize local commerce, enhance customer shopping with map-centric and visual search, and provide robust inventory management for businesses. The project aims for community engagement through features like "Still There?" verification and broadcast requests.

### BizIci Branding (both mobile apps)

Both apps share the same brand language. Palette derived from the BizIci logo:

- Primary orange `#F58220` — pin, CTA, brand accent
- Navy `#1B2A5C` — wordmark "Biz", headings, ink, pin base
- Green `#7FB927` — wordmark "Ici", success states, storefront awning, sparks

The cold-start splash (`components/AnimatedSplash.tsx` in each Expo app) plays the same six-step Reanimated sequence on mobile (skipped on web), totalling ~6 s before fade-out: orange pin drops in → green storefront with scalloped awning materialises inside → three green sparks burst → navy oval base appears under the pin → composition shrinks/lifts → "BizIci" wordmark + tagline fade in. The seller app variant adds a small orange "PRO" badge next to the wordmark and uses tagline "Gérez votre boutique"; the customer variant uses "Trouvez tout près de vous".

App identifiers:

- Customer app: name "BizIci", scheme `bizici`, bundle `com.bizici.app`.
- Seller app: name "BizIci Pro", scheme `bizici-pro`, bundle `com.bizici.pro`.
- Internal slugs (`nearbuy`, `nearbuy-business`), package names (`@workspace/nearbuy`, `@workspace/nearbuy-business`), and AsyncStorage keys (`nearbuy.*`) intentionally preserved to avoid breaking workspace tooling and existing user state.

Static brand bitmaps live in each app's `assets/images/`:

- `bizici-pin.png` — AI-regenerated transparent-background **pin only** (no wordmark), used as app icon, OS splash, web favicon, notification icon, and onboarding hero. Faithfully matches the reference logo (orange teardrop, scalloped green awning + stripes, navy door with green window, green shopping bag with handle, three green sparks, navy oval base).
- `bizici-logo.png` — original full reference logo (pin + wordmark on white background), kept as brand reference.
- `bizici-logo-transparent.png` — auto-bg-removed version of the original, kept as fallback.

## User Preferences

I prefer concise and clear communication. When making changes, please prioritize iterative development and ask for confirmation before implementing major architectural shifts or significant feature changes.

## System Architecture

The NearBuy suite operates as a pnpm monorepo, utilizing a shared Node.js/Express backend with MongoDB (Mongoose) for data persistence and Clerk for authentication.

**Mobile Applications (Expo React Native):**
- **NearBuy Business (Seller App):** Manages shop details, inventory, and customer interactions for shop owners and staff.
- **NearBuy (Customer App):** Facilitates product discovery, visual search, and interaction with shops, incorporating `react-native-maps` and `Fuse.js` for search.

**UI/UX Decisions:**
- Consistent BizIci branding across **all four artifacts** (customer app, seller app, admin web, marketing site): orange `#F58220` / navy `#1B2A5C` / green `#7FB927` palette, shared `bizici-pin.png`, "Biz" navy + "Ici" green wordmark.
- The customer app features a 4-slide onboarding pager with BizIci gradient heroes.
- **Admin web (`nearbuy-admin`):** Tailwind v4 HSL tokens in `src/index.css` (light + dark) target the BizIci palette (primary 26 91% 54%, sidebar navy 225 55% 23%). Sidebar header in `AdminLayout.tsx` uses `<img src="/bizici-pin.png">` + bicolor wordmark + "Admin" subtitle. The login card replaced the legacy "N" monogram badge with the same `bizici-pin.png`. The cold-start splash (`AnimatedSplash.tsx` + `.css`) plays a six-stage CSS choreography mirroring the mobile Reanimated splash: pin drops in (0–700 ms) → navy oval base scales out (700–1200 ms) → scalloped green awning + storefront materialise inside the white window (900–1500 ms) → three green sparks burst out of the pin (1300–1700 ms) → composition lifts/scales (1700–2200 ms) → "Biz Ici Admin" wordmark fades in (1900–2700 ms) → fade-out at 2900 ms. Honors `prefers-reduced-motion`. Splash flag stored in `sessionStorage` (`nearbuy_admin_splash_played`). Browser tab title is "BizIci Admin"; favicon is the BizIci pin SVG. The 404 page uses semantic `bg-background`/`text-foreground`/`text-destructive` tokens.
- **Marketing site (`nearbuy-site`):** Same Tailwind v4 token rewrite (replaced placeholder `red` values). Header logo is the `<NearBuyLogo>` component (kept under that internal name) re-rendered with the BizIci pin SVG. Hero gradient text now goes orange→green. All `bg-orange-500`/`text-orange-600`/etc. Tailwind classes were swapped for arbitrary BizIci hex (`bg-[#F58220]`, `text-[#F58220]`, `bg-[#F58220]/10`) so colors match the brand exactly rather than Tailwind's stock orange. All copy ("NearBuy" / "NearBuy Business") rewritten to "BizIci" / "BizIci Pro" in pages, footer (`SiteFooter.tsx`), and locales (`fr.json` + `en.json`); support email migrated to `support@bizici.app`. Favicon and `<title>` updated. The 404 page uses semantic tokens. Internal slugs (`nearbuy-admin`, `nearbuy-site`, `NearBuyLogo`) intentionally preserved.

**Backend (Node.js/Express):**
- **Clerk Integration:** Handles authentication, user sign-in/sign-up, SSO, and user role management (Seller, SubSeller).
- **MongoDB Models:** Key models include `User`, `Shop`, `Product`, `Conversation`, `Message`, `ShopReview`, and `PushToken`. Geospatial indexes (`2dsphere`) are used for location-based queries, and compound indexes optimize chat message retrieval.
- **API Endpoints:** Divided into public endpoints for general access (e.g., `public/shops`, `public/search`, `public/visual-search`) and authenticated endpoints for user-specific operations (e.g., `/me`, `/shops`, `/products`). The `visual-search` endpoint supports base64-encoded images up to 10 MB.
- **Codegen Workflow:** OpenAPI specifications generate React Query hooks, types, and Zod schemas for validation.

**Core Features:**
- **Product and Shop Management:** Allows sellers to manage products (including AI photo analysis) and shop details.
- **Search:** Includes text search with `Fuse.js` fuzzy re-ranking and a visual search camera tab.
- **Karma System:** Rewards customer engagement with points.
- **Roles:** Supports distinct roles for users (Seller, SubSeller) within different shops.
- **Chat:** Enables 1:1 customer-seller conversations with unread counters, push notifications, and dedicated UI flows for both apps.
- **Seller Mini-Dashboard:** Provides per-shop metrics and analytics for shop owners.
- **Reviews & Ratings:** Customers can rate and review shops, with denormalized averages displayed on shop profiles.
- **Admin Web Space (NearBuy Admin):** A separate React + Vite SPA for platform administration, featuring its own JWT authentication system. It includes comprehensive CRUD operations for users, shops, products, categories, and moderation tools for conversations and reviews. Supports `super_admin`, `admin`, and `moderator` roles with fine-grained access control.
- **Internationalization (FR/EN):** All three applications (customer, seller, admin) use `i18next` for full French and English localization, with dynamic language switching.
- **Public Marketing Site (NearBuy — Site vitrine):** A public-facing React + Vite SPA for marketing and account deletion requests, ensuring compliance with data privacy regulations.
- **Course (Shopping Run):** Customers build a basket of free-text product queries (max 30, case-insensitive de-dup), then start a "course" that resolves each query against in-radius shops via a single `$nearSphere` lookup plus regex matching on product name/brand/description/tags. The mobile UI walks through one stop at a time, sorted by distance, with "Diriger" (deep-links to native maps via `maps://`/`geo:`/Google Maps fallback) and "Suivant" buttons. Backend: `Basket` model (singleton per user) + `/me/basket*` and `/me/basket/start-course` endpoints. Mobile: `app/course/` stack (basket + run screens) accessible from the Profile tab.
- **Bilateral Appointments + Reviews:** A booking lifecycle on top of every chat thread. Only the customer can initiate (`POST /api/me/appointments` with `{shopId, scheduledAt, serviceId?, notes?}`); the seller (or any sub-seller) can accept/decline; the customer marks it completed; either side may cancel before completion. Models: `Appointment` (status: `proposed | confirmed | declined | completed | cancelled`, cached `conversationId`) and `AppointmentReview` (one per direction, unique compound index `(appointmentId, direction)`). Once `completed`, both sides leave a 1-5 star review + optional comment via `POST /api/me/appointments/:id/reviews`. Aggregates are recomputed automatically: client→provider scores update `Shop.serviceProvider.appointmentRating` + `appointmentReviewsCount`; provider→client scores update `User.trustRating` + `trustReviewsCount` (lets a provider gauge a customer before accepting). The conversation's `lastMessageAt` is bumped on every appointment event so the chat list re-sorts. **Customer UI (`artifacts/nearbuy`):** banner of `<AppointmentCard>` above the chat messages (`app/chat/[id].tsx`), `+` calendar button in the input bar to open the booking modal (text inputs YYYY-MM-DD + HH:MM, no datetimepicker dep), `Réserver un RDV` CTA on `app/provider/[shopId].tsx`, standalone list at `app/appointments/index.tsx`, header calendar icon → that list, review modal post-completion. **Business UI (`artifacts/nearbuy-business`):** same banner with Accept/Refuse/Cancel/Review actions in `app/(home)/shops/[shopId]/chat/[conversationId].tsx`, list at `app/(home)/shops/[shopId]/appointments.tsx`. Both apps share the wire types via `lib/appointmentsApi.ts` (no codegen — these routes are MVP and not in the OpenAPI spec yet) and reuse the project-wide `useColors`/`Button` primitives. i18n keys live under `appointments.*` in both apps' `fr.json` + `en.json`.
- **Execution Location & Fulfillment:** Two orthogonal axes describe *where* a transaction happens. **Services**: `Shop.serviceProvider.serviceLocation` (`at_shop | at_customer | both`, default `at_shop`) is the provider's default execution mode; each `Service` may override with `at_shop | at_customer | both | inherit` (default `inherit`). The customer-facing serializer exposes both the raw value and a resolved `effectiveServiceLocation`. The public services search accepts `?serviceLocation=` (`at_customer` matches services that go to the customer; `both` matches only providers that explicitly do both). **Products**: `Shop.fulfillment` (`pickup_only | delivery_only | both`, default `pickup_only`) plus optional `Shop.deliveryRadiusKm` (1–100, clamped). **Appointments** snapshot the resolved mode at booking time (`Appointment.serviceLocation`) and require a `customerAddress` whenever the mode is `at_customer`; when the provider supports `both`, the customer must explicitly pick. **Business UI:** `ServiceLocationSelector` on the provider profile, `ServiceLocationOverrideSelector` on each service form (with an explicit "Hériter" option), `ShopFulfillmentSelector` + delivery-radius input on the shop edit screen (gated when `kind !== "services"` and fulfillment isn't pickup-only). **Customer UI:** `LocationBadge` + `FulfillmentBadge` on `ProviderBottomCard`, `ShopBottomSheet`, the provider profile (`app/provider/[shopId].tsx`), and `AppointmentCard`. Search has a "Vient chez moi" filter chip that sends `serviceLocation=at_customer`. The booking modal (`AppointmentBookingModal`) shows an at-shop / at-home picker only when the resolved mode is `both`, and reveals a multi-line address field whenever the resulting mode is `at_customer`. i18n keys live under `serviceLocation.*` and `fulfillment.*` in all three apps' FR + EN locale files.
- **Services Marketplace:** A second product line on top of the same Shop spine. Each `Shop` carries a `kind` field (`products` | `services` | `hybrid`, default `products` for backward compat) and an embedded `serviceProvider` sub-document (firstName, lastName, age, hideAge, bio, yearsExperience, certifications[], serviceRadiusKm, portfolioPhotos[], isVerified). A separate `Service` collection (parallel to `Product`, no stock) holds individual offerings with one of three pricing models — `fixed` (price+duration), `hourly` (price/hour), or `quote` (on request). The `Category` model gained a `kind` field (`product` | `service`) and 10 default service categories are seeded on boot (coiffure, jardinage, cours particuliers, retouches/couture, plomberie, électricité, ménage, garde d'enfants, bricolage, peinture). **Privacy:** `age` is publicly visible by default; each provider can set `hideAge: true` to strip it from public payloads. **Endpoints:** public `/api/services/{categories,search,:id,providers/:shopId}` (search is `$nearSphere` on Shop with `kind ∈ {services, hybrid}` then service lookup), seller-gated `/api/me/shops/:shopId/{services,provider-profile}` (CRUD). **Customer UI:** Search tab has a `Produits / Services` segmented control; service mode shows category chips and groups results into provider cards that link to a dedicated `app/provider/[shopId].tsx` screen (hero, name+age, certifications, services, portfolio carousel, "Discuter" CTA reusing `/chat-shop/{shopId}`). **Business UI:** shop wizard exposes a "type de boutique" selector; when services/hybrid, a "Mon profil prestataire" tab appears alongside a "Services" CRUD tab. Demo data can be seeded with `pnpm --filter @workspace/scripts run seed:demo-services` (idempotent — creates Salon Anaïs at Châtelet with three coiffure services).

## External Dependencies

- **Clerk:** User authentication and identity management.
- **MongoDB Atlas:** Cloud-hosted NoSQL database for data storage.
- **OpenAI (via Replit AI Integrations proxy):** Powers AI photo analysis for product details.
- **Expo:** Development framework for cross-platform React Native applications.
- **`react-native-maps`:** Provides map components and location services for mobile apps.
- **`Fuse.js`:** Client-side library for fuzzy search capabilities.