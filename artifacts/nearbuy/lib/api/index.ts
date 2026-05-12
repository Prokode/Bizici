/**
 * Barrel for resource-scoped API wrappers. Prefer importing the specific
 * resource module (`@/lib/api/shops`) so unused code is tree-shaken, but
 * this barrel is provided for screens that need symbols from many
 * resources at once.
 */
export * from "./appointments";
export * from "./conversations";
export * from "./consent";
export * from "./basket";
export * from "./course";
export * from "./shops";
export * from "./search";
export * from "./karma";
export * from "./providers";
export * from "./visualSearch";
