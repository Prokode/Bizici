---
name: NearBuy environment quirks
description: Non-obvious gotchas when working in the NearBuy/BizIci monorepo
---

# NearBuy / BizIci quirks

## grep/ripgrep output masks some tokens as "ln"
When grepping the Expo app source, the tool display sometimes replaces real
identifier substrings (e.g. "Selector", "Modal", "oauth_apple", "Picker",
"selected") with the literal `ln`. This is a **display artifact only** — the
real file content is intact.
**How to apply:** Never trust grep output for exact identifier names in this
repo. Confirm with the `read` tool before concluding a name/strategy is wrong
(e.g. an Apple SSO handler shown as `strategy: "ln"` is actually
`strategy: "oauth_apple"`).

## Pre-existing typecheck errors live in user-pushed code
Both Expo apps (`nearbuy`, `nearbuy-business`) carry typecheck errors that
predate agent work — Clerk `ClerkError.errors`/`.message` access, a
`useColors.ts` TS2352 cast, Expo Router typed-route string mismatches, and an
in-progress Formik refactor in `nearbuy-business` sign-up.
**Why:** The user pushes their own modifications between sessions.
**How to apply:** After editing, scope typecheck to your own files
(`pnpm --filter @workspace/<app> run typecheck 2>&1 | rg <YourFile>`); do not
assume a full clean run, and don't fix these unrelated errors unless asked.

## nearbuy-site screenshots get stuck on the animated splash
All routes mount `AnimatedSplash` on cold load, and each screenshot is a fresh
page context, so app-preview screenshots repeatedly capture the splash
mid-animation instead of the page.
**How to apply:** Append `?splash=skip` to the path when screenshotting
nearbuy-site (mirrors the existing `?splash=force`). Both are gated in
`App.tsx` `shouldPlaySplash()`.
