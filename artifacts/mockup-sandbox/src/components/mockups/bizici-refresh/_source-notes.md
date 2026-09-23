# BizIci current-screen extraction

## Sources

- Consumer discovery: `artifacts/nearbuy/app/(tabs)/index.tsx`
- Consumer navigation chrome: `artifacts/nearbuy/app/(tabs)/_layout.tsx`
- Business shop list: `artifacts/nearbuy-business/app/(home)/index.tsx`
- Business stack chrome: `artifacts/nearbuy-business/app/(home)/_layout.tsx`
- Shared visual tokens: both apps' `constants/colors.ts`, `hooks/useColors.ts`, root font setup, and the business `Card.tsx` / `Badge.tsx`
- French labels: each app's `lib/i18n/locales/fr.json`

## Extraction compromises

- React Native views/styles were translated to DOM and CSS/Tailwind while retaining source dimensions, spacing, radii, shadows, colors, weights, and screen chrome.
- Expo Router, Clerk, React Query, geolocation, haptics, safe-area hooks, and API clients are intentionally replaced by local state/no-op interactions.
- Consumer uses the source's real web fallback list rather than a native map. Product-photo slots use the source fallback treatment because no real catalog media ships with the app.
- Lucide icons stand in for Feather's matching glyphs. Plus Jakarta Sans is loaded at group scope only.
- The populated business baseline exercises invitations, seller/helper roles, and open/closed badges instead of the source's empty/loading states.

## Mock data and retained actions

- Consumer: three plausible Paris businesses with products/services, distances, stock counts, prices, and opening states. Search clearing and All/Products/Services filtering work; card and tab navigation are no-ops.
- Business: three owned/assisted shops plus one pending invitation. Shop rows, invitation, and new-shop FAB retain pressed affordances but do not navigate.

## UX weaknesses to address in redesign

- Consumer controls stack into the first 160 px and compete visually; count and filter pills float over content/map without a clear hierarchy.
- Consumer web fallback foregrounds a platform limitation before discovery, and compact 80 px product tiles make names and product imagery hard to scan.
- Shop cards do not clearly distinguish product, service, and hybrid businesses; tapping a service-capable hybrid can lead to ambiguous detail behavior.
- Bottom navigation has five equal-priority destinations and no stronger discovery-to-action path; the prominent search field duplicates the Search tab.
- Business home is primarily a switcher, with no at-a-glance operational metrics, alerts, inventory health, or next task.
- Business role/open badges are small uppercase pills with high visual repetition; open state may be confused with account/availability state.
- The floating new-shop CTA overlays scroll content and is overemphasized for a relatively infrequent action.
- Invitation context is limited to a count; the inviter, shop, role, and urgency remain hidden until another screen.