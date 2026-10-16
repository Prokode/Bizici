import { useSyncExternalStore } from "react";
import { useColorScheme } from "react-native";

import colors from "@/constants/colors";
import { getThemePreference, subscribeThemePreference } from "@/lib/theme";

/**
 * Returns the design tokens for the active scheme. An explicit light/dark
 * preference from lib/theme wins; "system" falls back to the device scheme.
 */
export function useColors() {
  const systemScheme = useColorScheme();
  const pref = useSyncExternalStore(
    subscribeThemePreference,
    getThemePreference,
    getThemePreference,
  );
  const scheme = pref === "system" ? systemScheme : pref;
  type Palette = typeof colors.light;
  const colorTokens: {
    light: Palette;
    dark?: Palette;
    radius: typeof colors.radius;
  } = colors;
  const palette =
    scheme === "dark" ? colorTokens.dark ?? colorTokens.light : colorTokens.light;
  return { ...palette, radius: colorTokens.radius };
}
