# NearBuy Suite

## Overview

The NearBuy Suite, branded as BizIci, is a two-sided marketplace designed to connect local businesses with customers through "BizIci Pro" (seller app) and "BizIci" (customer app) mobile applications. Its primary goal is to digitize local commerce, enhance customer shopping experiences with map-centric and visual search, and provide robust inventory and service management tools for businesses. The platform aims to foster community engagement and facilitate efficient local transactions, including product sales, service bookings, and appointment management.

## User Preferences

I prefer concise and clear communication. When making changes, please prioritize iterative development and ask for confirmation before implementing major architectural shifts or significant feature changes.

## System Architecture

The NearBuy suite is built as a pnpm monorepo, utilizing a shared Node.js/Express backend with MongoDB for data persistence and Clerk for authentication.

**Mobile Applications (Expo React Native):**
- **BizIci Pro (Seller App):** Enables shop owners and staff to manage shop details, products, services, and customer interactions.
- **BizIci (Customer App):** Allows customers to discover products and services, perform visual searches, book appointments, and interact with shops, incorporating `react-native-maps` for location-based features and `Fuse.js` for search.

**Web Applications (React + Vite SPA):**
- **BizIci Admin:** A dedicated administration panel for platform management, user, shop, product, and service CRUD operations, and moderation. Supports `super_admin`, `admin`, and `moderator` roles.
- **BizIci Marketing Site:** A public-facing site for marketing, information, and data privacy-compliant account deletion requests.

**UI/UX Decisions:**
- **Consistent Branding:** Utilizes a unified BizIci brand palette (orange `#F58220`, navy `#1B2A5C`, green `#7FB927`) and shared visual assets (`bizici-pin.png`) across all applications.
- **Animated Splash Screens:** All applications feature a synchronized, six-step animated splash sequence during cold-start.
- **Theming:** Admin and Marketing web apps use Tailwind v4 with HSL tokens derived from the BizIci palette, supporting light and dark modes.
- **Internationalization:** All applications support French and English localization using `i18next`.

**Backend (Node.js/Express):**
- **Clerk Integration:** Manages user authentication, sign-in, sign-up, and role-based access control.
- **MongoDB Models:** Key models include `User`, `Shop`, `Product`, `Service`, `Appointment`, `Conversation`, and `Message`, with geospatial and compound indexes for optimized queries.
- **API Endpoints:** Categorized into public and authenticated endpoints, supporting operations from product search to real-time chat and appointment management. The `visual-search` endpoint processes base64-encoded images.
- **Codegen Workflow:** OpenAPI specifications are used to generate React Query hooks, types, and Zod schemas for API interactions.

**Core Features:**
- **Shop & Product/Service Management:** Comprehensive tools for sellers to manage their offerings, including AI-powered photo analysis for products and detailed service configurations.
- **Search Capabilities:** Includes text-based fuzzy search and a visual search feature for products.
- **Customer Engagement:** Features a karma system for customer rewards, 1:1 customer-seller chat with push notifications, and shop review/rating mechanisms.
- **Roles & Permissions:** Differentiates between Seller and SubSeller roles within shops.
- **Appointment System:** A full lifecycle for booking, confirming, declining, completing, and reviewing appointments between customers and service providers, integrated within chat threads.
- **Fulfillment & Execution Locations:** Configurable options for product fulfillment (pickup, delivery) and service execution locations (at shop, at customer, both), with corresponding search filters and booking considerations.
- **Services Marketplace:** Supports service-based businesses with distinct service categories, customizable pricing models (fixed, hourly, quote), and detailed provider profiles.
- **Shopping Run (Course):** Allows customers to create a list of product queries and find available items in nearby shops, guiding them through an optimized shopping route.
- **KYC Validation:** Sellers/providers must submit an ID document (CNI, passport, or driver's license) on first login via a persistent banner in BizIci Pro. Admins review submissions in the admin web app's "Validations KYC" queue and approve or reject (with reason). Only shops with `kyc.status="approved"` appear in customer search/map results. Storage: `KycDocument` collection holds the base64 images; `Shop.kyc` embeds the status. Approve also flips `serviceProvider.isVerified=true` for service shops. Pre-existing shops without `kyc.status` are excluded from public discovery (intentional strict-by-default behavior). Seed helper: `pnpm --filter @workspace/scripts run seed:pending-kyc`.
- **Legal Pages & Signup Consent:** Privacy Policy and Terms of Use are served from the shared composite lib `@workspace/legal-content` (`lib/legal-content/src/index.ts`), which exports structured FR + EN documents (`privacyDoc`, `termsDoc`), a `fillPlaceholders` / `fillDoc` helper, and convenience getters `getPrivacyDoc(lang, overrides?)` / `getTermsDoc(lang, overrides?)`. The getters auto-fill `defaultPlaceholders` (visible `[À compléter]` / `[To be completed]` markers) so unwired company-info tokens never leak as raw `{COMPANY_*}`. **Before publishing**, replace these with real values (legal name, SIREN, RCS city, address, host info, mediator) by passing an `overrides` map. Routes: marketing site exposes `/confidentialite` + `/privacy` and `/conditions` + `/terms` (footer links via `SiteFooter.tsx`); both Expo apps expose `app/legal/privacy.tsx` and `app/legal/terms.tsx` *outside* the `(auth)` group so signed-in users can also reach them. Both signup screens (`app/(auth)/sign-up.tsx`) require a mandatory consent checkbox (`acceptedTerms` state, `requireTermsOrAlert()` helper) that gates both the email/password handler and the Google SSO handler; the submit button is disabled until accepted. **Server-side audit trail (DONE)**: `lib/legal-content/src/index.ts` exports `LEGAL_VERSION = "2026-05-01"` (bump whenever the corpus changes). `lib/db/src/models/User.ts` carries an optional `consent: { acceptedAt, version, source: "email"|"google"|"apple"|"unknown" }` subdoc (`null` for accounts pre-existing this feature). `POST /api/me/consent` (in `artifacts/api-server/src/routes/me.ts`, behind `requireAuth`) accepts `{ version, source? }`, validates them, and idempotently writes the subdoc — a repeat call with the same version is a no-op (preserves the original `acceptedAt`); a newer version overwrites. Both Expo apps ship a thin `lib/consentApi.ts` wrapper (`recordConsent(...)`) called fire-and-forget from `signUp.finalize` (email/password) and from each successful SSO `setActive` (Google/Apple) — wrapped in try/catch so an audit-trail failure never blocks navigation.

**Apple Sign-In (UI ONLY)**: All four auth screens (`sign-in` + `sign-up` × 2 apps) render a black "Continuer avec Apple" button below Google, hidden on Android per Apple HIG (`Platform.OS !== "android"`). Each app collapses Google + Apple into a single `onSSO(strategy, source)` callback that calls `startSSOFlow({ strategy: "oauth_apple" | "oauth_google", redirectUrl })`. i18n keys `auth.continueApple` / `auth.errorApple` added in FR + EN for both apps. **The button will fail until the user enables `oauth_apple` in the Clerk dashboard, configures Sign in with Apple in the Apple Developer portal, and adds the `expo-apple-authentication` plugin to `app.config.ts`** — that wiring is intentionally out of scope and must be done by the user.

## External Dependencies

- **Clerk:** For user authentication and identity management.
- **MongoDB Atlas:** Cloud-hosted database for data storage.
- **OpenAI:** Used for AI photo analysis, integrated via Replit AI Integrations proxy.
- **Expo:** Development framework for building cross-platform mobile applications.
- **`react-native-maps`:** For map functionalities and location services in mobile applications.
- **`Fuse.js`:** For client-side fuzzy search implementation.