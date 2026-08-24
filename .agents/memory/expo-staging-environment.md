---
name: Expo staging environment
description: External Expo environment convention for secure, unattended staging builds of both mobile apps.
---

Both mobile Expo projects store `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` as a project-scoped sensitive variable in Expo's `preview` environment. Staging build profiles must remain bound to `preview`, while the public API hostname may stay in the profile's plain `env` section.

**Why:** This lets staging builds run without manual variable entry while keeping the real Clerk publishable key out of Git and tool output.

**How to apply:** Preserve the preview-environment binding for staging builds. Do not add an empty Clerk proxy variable; only configure `EXPO_PUBLIC_CLERK_PROXY_URL` if a real proxy is introduced.