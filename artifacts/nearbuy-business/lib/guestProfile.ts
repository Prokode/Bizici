/** The only account-level route that guests may view in the seller home stack. */
export function isGuestProfileRoute(segments: readonly string[]): boolean {
  return segments.length === 2 && segments[0] === "(home)" && segments[1] === "profile";
}
