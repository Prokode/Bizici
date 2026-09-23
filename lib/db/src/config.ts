/** Workspace previews use the staging secret; deployed services keep MONGODB_URI. */
export function mongoUri(env: Record<string, string | undefined>): string | undefined {
  if (env.NODE_ENV === "development" && env.STAGING_MONGODB_URI) {
    return env.STAGING_MONGODB_URI;
  }
  return env.MONGODB_URI;
}