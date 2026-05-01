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

## External Dependencies

- **Clerk:** For user authentication and identity management.
- **MongoDB Atlas:** Cloud-hosted database for data storage.
- **OpenAI:** Used for AI photo analysis, integrated via Replit AI Integrations proxy.
- **Expo:** Development framework for building cross-platform mobile applications.
- **`react-native-maps`:** For map functionalities and location services in mobile applications.
- **`Fuse.js`:** For client-side fuzzy search implementation.