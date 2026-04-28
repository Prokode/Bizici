# NearBuy Suite

## Overview

NearBuy is a two-sided marketplace connecting local shops with customers via "NearBuy Business" (seller app) and "NearBuy" (customer app) mobile applications. Its core purpose is to digitize local commerce, enhance customer shopping with map-centric and visual search, and provide robust inventory management for businesses. The project aims for community engagement through features like "Still There?" verification and broadcast requests.

## User Preferences

I prefer concise and clear communication. When making changes, please prioritize iterative development and ask for confirmation before implementing major architectural shifts or significant feature changes.

## System Architecture

The NearBuy suite operates as a pnpm monorepo, utilizing a shared Node.js/Express backend with MongoDB (Mongoose) for data persistence and Clerk for authentication.

**Mobile Applications (Expo React Native):**
- **NearBuy Business (Seller App):** Manages shop details, inventory, and customer interactions for shop owners and staff.
- **NearBuy (Customer App):** Facilitates product discovery, visual search, and interaction with shops, incorporating `react-native-maps` and `Fuse.js` for search.

**UI/UX Decisions:**
- Consistent branding across both mobile apps, including logo, splash animation, color palette (orange to pink gradient), and UI components.
- The customer app features a 4-slide onboarding pager with full-bleed gradient heroes.

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

## External Dependencies

- **Clerk:** User authentication and identity management.
- **MongoDB Atlas:** Cloud-hosted NoSQL database for data storage.
- **OpenAI (via Replit AI Integrations proxy):** Powers AI photo analysis for product details.
- **Expo:** Development framework for cross-platform React Native applications.
- **`react-native-maps`:** Provides map components and location services for mobile apps.
- **`Fuse.js`:** Client-side library for fuzzy search capabilities.