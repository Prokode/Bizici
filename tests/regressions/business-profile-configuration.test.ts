import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path: string) => readFileSync(new URL(`../../artifacts/nearbuy-business/${path}`, import.meta.url), "utf8");
const configuration = read("app/(home)/shops/[shopId]/(tabs)/profile.tsx");
const profile = read("app/(home)/profile.tsx");

test("Business startup skips native notification-response APIs on web", () => {
  const layout = read("app/_layout.tsx");
  const start = layout.indexOf("function NotificationTapHandler");
  const handler = layout.slice(start, layout.indexOf("function PushRegistrationBridge", start));
  assert.ok(handler.indexOf('if (Platform.OS === "web") return;') >= 0);
  assert.ok(handler.indexOf('if (Platform.OS === "web") return;') < handler.indexOf("Notifications.getLastNotificationResponseAsync"));
});

test("personal profile is outside shop routes and reads the authenticated identity", () => {
  assert.match(profile, /useUser\(\)/);
  assert.match(profile, /primaryEmailAddress/);
  assert.match(profile, /user\?\.fullName/);
  assert.match(profile, /\/account-security/);
  assert.match(profile, /OnboardingPreferences/);
  assert.doesNotMatch(profile, /useLocalSearchParams|getGetShop|shopId/);
  assert.match(read("app/(home)/_layout.tsx"), /Stack.Screen name="profile"/);
});

test("shop configuration excludes personal account controls", () => {
  assert.match(configuration, /ShopConfigurationScreen/);
  assert.match(configuration, /ShopMapPreview/);
  assert.match(configuration, /HelpersSection/);
  assert.match(configuration, /profile.editDetails/);
  assert.match(configuration, /section: "location"/);
  assert.doesNotMatch(configuration, /useClerk|signOut|LanguageSwitcher|account-security|ONBOARDING_SEEN/);
  const tabs = read("app/(home)/shops/[shopId]/(tabs)/_layout.tsx");
  assert.doesNotMatch(tabs, /t\("nav.profile"\)/);
  assert.match(tabs, /gearshape/);
  assert.match(tabs, /shopConfiguration.tab/);
});

test("profile remains reachable in loading, failed, empty and populated shop-list states", () => {
  const list = read("app/(home)/index.tsx");
  assert.equal(list.match(/testID="profile-open"/g)?.length, 3);
  assert.match(list, /router.push\("\/\(home\)\/profile"\)/);
  assert.match(list, /flex: 1, minWidth: 0/);
});

test("shop reads show loading and retry states instead of silently returning null", () => {
  for (const source of [configuration, read("app/(home)/shops/[shopId]/edit.tsx")]) {
    assert.match(source, /timeoutMs: 15_000/);
    assert.match(source, /ActivityIndicator/);
    assert.match(source, /shopConfiguration.loadError/);
    assert.match(source, /shopQuery.refetch/);
    assert.doesNotMatch(source, /if \(!shop.*return null/);
  }
});

test("shop edits are seller-only and refresh both shop details and shop list", () => {
  const edit = read("app/(home)/shops/[shopId]/edit.tsx");
  assert.match(edit, /!isSeller \|\| updateShop.isPending/);
  assert.match(edit, /shopConfiguration.readOnly/);
  assert.match(edit, /section === "location" \? 2 : 1/);
  assert.match(edit, /getGetShopQueryKey\(shopId/);
  assert.match(edit, /getListShopsQueryKey\(\)/);
});

test("new profile and configuration copy exists in French and English", () => {
  const en = JSON.parse(read("lib/i18n/locales/en.json"));
  const fr = JSON.parse(read("lib/i18n/locales/fr.json"));
  for (const group of ["userProfile", "shopConfiguration"]) {
    assert.deepEqual(Object.keys(en[group]).sort(), Object.keys(fr[group]).sort());
    for (const value of [...Object.values(en[group]), ...Object.values(fr[group])]) {
      assert.equal(typeof value, "string");
      assert.ok(value);
    }
  }
});
