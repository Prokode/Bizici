/**
 * Semantic design tokens for the BizIci mobile app.
 *
 * Palette derived from the BizIci logo:
 *  - Orange  #F58220  → primary CTA / brand accent (the pin)
 *  - Navy    #1B2A5C  → headings, "Biz" wordmark, pin base
 *  - Green   #7FB927  → success, "Ici" wordmark, storefront/awning, sparks
 */

const colors = {
  light: {
    text: "#1B2A5C", // navy as primary ink
    tint: "#F58220",

    background: "#ffffff",
    foreground: "#1B2A5C",

    card: "#F7F9FC",
    cardForeground: "#1B2A5C",

    primary: "#F58220", // brand orange
    primaryForeground: "#ffffff",

    secondary: "#1B2A5C", // brand navy
    secondaryForeground: "#ffffff",

    muted: "#EEF2F7",
    mutedForeground: "#64748b",

    accent: "#FFE9D6", // soft orange tint for chips/badges
    accentForeground: "#C2620E",

    destructive: "#ef4444",
    destructiveForeground: "#ffffff",

    border: "#E2E8F0",
    input: "#E2E8F0",

    success: "#7FB927", // brand green
    successForeground: "#ffffff",
  },
  dark: {
    text: "#F8FAFC",
    tint: "#FFA463",

    background: "#0E1530", // deeper navy
    foreground: "#F8FAFC",

    card: "#162048",
    cardForeground: "#F8FAFC",

    primary: "#FFA463", // brighter orange for dark
    primaryForeground: "#0E1530",

    secondary: "#A4B4DD", // soft navy tint
    secondaryForeground: "#0E1530",

    muted: "#1E2A55",
    mutedForeground: "#9AA8C9",

    accent: "#3A2412",
    accentForeground: "#FFC79A",

    destructive: "#f87171",
    destructiveForeground: "#ffffff",

    border: "#2A356A",
    input: "#2A356A",

    success: "#A1D14B", // brighter green for dark
    successForeground: "#0E1530",
  },
  radius: 14,
};

export default colors;
