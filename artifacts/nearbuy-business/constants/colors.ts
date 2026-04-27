/**
 * Semantic design tokens for the mobile app.
 *
 * Warm orange/amber and deep teal palette
 */

const colors = {
  light: {
    text: "#1e293b",
    tint: "#e65100",

    background: "#ffffff",
    foreground: "#1e293b",

    card: "#f8fafc",
    cardForeground: "#1e293b",

    primary: "#e65100", // warm orange
    primaryForeground: "#ffffff",

    secondary: "#0f766e", // deep teal
    secondaryForeground: "#ffffff",

    muted: "#f1f5f9",
    mutedForeground: "#64748b",

    accent: "#ffedd5",
    accentForeground: "#ea580c",

    destructive: "#ef4444",
    destructiveForeground: "#ffffff",

    border: "#e2e8f0",
    input: "#e2e8f0",

    success: "#22c55e",
    successForeground: "#ffffff",
  },
  dark: {
    text: "#f8fafc",
    tint: "#f97316",

    background: "#0f172a",
    foreground: "#f8fafc",

    card: "#1e293b",
    cardForeground: "#f8fafc",

    primary: "#f97316", // warm orange
    primaryForeground: "#ffffff",

    secondary: "#14b8a6", // deep teal
    secondaryForeground: "#ffffff",

    muted: "#334155",
    mutedForeground: "#94a3b8",

    accent: "#431407",
    accentForeground: "#fdba74",

    destructive: "#f87171",
    destructiveForeground: "#ffffff",

    border: "#334155",
    input: "#334155",

    success: "#4ade80",
    successForeground: "#ffffff",
  },
  radius: 12,
};

export default colors;
