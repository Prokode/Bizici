/**
 * Karma summary for the signed-in customer (`/api/me/karma`).
 *
 * Unlike most auth-required wrappers we take the `baseUrl` + `token`
 * explicitly here because the call site (the profile screen) already has
 * the Clerk session token in hand and we don't want to depend on
 * `customFetch`'s global getter from this single read.
 */

export type KarmaEvent = {
  id: string;
  kind: "welcome" | "stock_confirmation" | "stock_report" | "broadcast";
  points: number;
  note: string | null;
  createdAt: string;
};

export type KarmaSummary = {
  points: number;
  recentEvents: KarmaEvent[];
};

export async function fetchMyKarma(
  baseUrl: string,
  token: string,
): Promise<KarmaSummary> {
  const res = await fetch(`${baseUrl}/api/me/karma`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`fetchMyKarma failed: ${res.status}`);
  return (await res.json()) as KarmaSummary;
}
