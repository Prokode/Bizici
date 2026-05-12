/**
 * Barrel for resource-scoped API wrappers. Prefer importing the specific
 * resource module (`@/lib/api/appointments`) so unused code is tree-shaken,
 * but this barrel is provided for screens that need symbols from many
 * resources at once.
 */
export * from "./appointments";
export * from "./conversations";
export * from "./consent";
