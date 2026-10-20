import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { isGuestProfileRoute } from "../../artifacts/nearbuy-business/lib/guestProfile";

const read = (app: string, path: string) =>
  readFileSync(new URL(`../../artifacts/${app}/${path}`, import.meta.url), "utf8");

test("only the seller's account-level profile route is public", () => {
  assert.equal(isGuestProfileRoute(["(home)", "profile"]), true);
  for (const route of [
    [], ["(home)"], ["(home)", "index"], ["(home)", "new-shop"],
    ["(home)", "invitations"], ["account-security"], ["profile"],
    ["(home)", "shops", "123", "(tabs)", "profile"],
    ["(home)", "profile", "account-security"], ["(auth)", "profile"],
  ]) assert.equal(isGuestProfileRoute(route), false, route.join("/"));
  const layout = read("nearbuy-business", "app/(home)/_layout.tsx");
  assert.match(layout, /isGuestProfileRoute\(segments\)/);
  assert.match(layout, /if \(!isSignedIn && !isGuestProfile\) return <Redirect/);
});

test("both apps omit login preferences but preserve them in both profile states", () => {
  for (const app of ["nearbuy", "nearbuy-business"]) {
    const login = read(app, "app/(auth)/sign-in.tsx");
    const profile = read(app, `app/${app === "nearbuy" ? "(tabs)" : "(home)"}/profile.tsx`);
    assert.doesNotMatch(login, /OnboardingPreferences/);
    const [beforeAuth, guest, signedIn] = profile.split(/if \(!isSignedIn\) \{|const displayName =|const points =/);
    assert.ok(beforeAuth);
    assert.match(guest, /<OnboardingPreferences testIDPrefix="profile"/);
    assert.equal((profile.match(/<OnboardingPreferences testIDPrefix="profile"/g) ?? []).length, 2);
    if (app === "nearbuy-business") {
      assert.doesNotMatch(guest.split("\n  return (")[0], /security-open|common.signOut|userProfile.email/);
      assert.match(login, /guest-profile-open/);
      assert.match(login, /router.push\("\/\(home\)\/profile"\)/);
    }
    for (const locale of ["fr", "en"]) {
      const translations = JSON.parse(read(app, `lib/i18n/locales/${locale}.json`));
      for (const key of ["themeLabel", "themeLight", "themeDark", "themeSystem", "themeSaveError"])
        assert.ok(translations.onboarding[key], `${app}/${locale}/${key}`);
      for (const key of ["language", "languageFr", "languageEn"])
        assert.ok(translations.common[key], `${app}/${locale}/${key}`);
    }
  }
});

test("both apps use identical preference controls and distinct device-local theme storage", () => {
  assert.equal(read("nearbuy", "components/OnboardingPreferences.tsx"), read("nearbuy-business", "components/OnboardingPreferences.tsx"));
  assert.match(read("nearbuy", "lib/theme.ts"), /nearbuy_customer_theme/);
  assert.match(read("nearbuy-business", "lib/theme.ts"), /nearbuy_business_theme/);
});
