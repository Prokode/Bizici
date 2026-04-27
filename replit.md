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

## External Dependencies

- **Clerk:** Authentication and user management (email/password, Google SSO, invitations).
- **MongoDB Atlas:** Primary database for all application data using Mongoose ODM.
- **OpenAI (via Replit AI Integrations proxy):** Used for product photo analysis to extract product details.
- **Expo:** Framework for building universal React applications.
- **`react-native-maps`:** For displaying maps and location-based services in mobile apps.
- **`Fuse.js`:** Client-side fuzzy search library for product search re-ranking.