import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const THEME_PREFS = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof THEME_PREFS)[number];

const STORAGE_KEY = "nearbuy_customer_theme";
let current: ThemePreference = "system";
// Set once the user picks a theme this session, so a late storage read
// never overrides an explicit selection.
let userSelected = false;
const listeners = new Set<() => void>();

function apply(pref: ThemePreference) {
  if (pref === current) return;
  current = pref;
  // Best effort: keeps native chrome (alerts, keyboards) in sync. Rendering
  // does not depend on it - useColors reads the store directly, so this also
  // works on web where the override is a no-op.
  try {
    Appearance.setColorScheme(pref === "system" ? null : pref);
  } catch {
    // unsupported platform
  }
  listeners.forEach((l) => l());
}

AsyncStorage.getItem(STORAGE_KEY)
  .then((stored) => {
    if (userSelected) return;
    if (stored && THEME_PREFS.includes(stored as ThemePreference)) {
      apply(stored as ThemePreference);
    }
  })
  .catch(() => {});

export function getThemePreference(): ThemePreference {
  return current;
}

/**
 * Applies the preference immediately, then persists it. Rejects if the
 * write fails so callers can tell the user it won't survive a restart.
 */
export async function setThemePreference(pref: ThemePreference): Promise<void> {
  userSelected = true;
  apply(pref);
  await AsyncStorage.setItem(STORAGE_KEY, pref);
}

/** useSyncExternalStore-compatible subscription. */
export function subscribeThemePreference(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
