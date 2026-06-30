---
name: Mobile code duplication across the two Expo apps
description: Why shared RN UI/components are copied verbatim into both nearbuy and nearbuy-business instead of a shared lib
---

There is no shared React Native component library. UI primitives and feature
components are **duplicated verbatim** across the two Expo apps:
`artifacts/nearbuy` (client) and `artifacts/nearbuy-business` (seller).

Examples that exist identically in both: `components/ui/Select.tsx`,
`lib/api/consent.ts`, `components/CountrySelector.tsx`, `components/PhoneInput.tsx`.

**Why:** the repo's established convention — only `lib/*` packages are shared
(api-client, db, legal-content, etc.); RN screen/component code is not factored
into a lib.

**How to apply:** when adding or editing a mobile component, make the same
change in BOTH apps (build in one, `cp` to the other). i18n keys live per-app at
`artifacts/<app>/lib/i18n/locales/{fr,en}.json` and must be added in all four.
Shared imports both apps rely on: `@/hooks/useColors`, `@/components/ui/*`,
generated hooks from `@workspace/api-client-react`. Fonts: `PlusJakartaSans_*`.

Both apps carry the same set of **pre-existing** typecheck errors (ClerkError
`.errors`, `useColors.ts` cast, expo-router typed-path mismatches, and formik/yup
missing in nearbuy-business) — filter typecheck output to your own files.
