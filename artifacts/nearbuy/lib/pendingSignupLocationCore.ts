export type PendingSignupLocation = {
  countryCode: string;
  cityId: string;
};

export type KeyValueStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export function createPendingSignupLocationStore(
  storage: KeyValueStorage,
  keyPrefix: string,
) {
  const listeners = new Set<() => void>();
  const keyForUser = (userId: string) => `${keyPrefix}:${userId}`;

  return {
    async save(userId: string, location: PendingSignupLocation) {
      await storage.setItem(keyForUser(userId), JSON.stringify(location));
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async read(userId: string) {
      const key = keyForUser(userId);
      const value = await storage.getItem(key);
      if (!value) return null;
      try {
        return JSON.parse(value) as PendingSignupLocation;
      } catch {
        await storage.removeItem(key);
        return null;
      }
    },
    async clear(userId: string) {
      await storage.removeItem(keyForUser(userId));
    },
  };
}

type SyncPendingSignupLocationOptions = {
  userId: string;
  readPending: (userId: string) => Promise<PendingSignupLocation | null>;
  clearPending: (userId: string) => Promise<void>;
  getToken: () => Promise<string | null>;
  updateLocation: (
    location: PendingSignupLocation,
    token: string,
  ) => Promise<void>;
  invalidateMe: () => Promise<void>;
  isCancelled?: () => boolean;
  wait?: (milliseconds: number) => Promise<void>;
  maxAttempts?: number;
};

export type PendingLocationSyncResult =
  | "empty"
  | "synced"
  | "cancelled"
  | "pending";

export async function syncPendingSignupLocation({
  userId,
  readPending,
  clearPending,
  getToken,
  updateLocation,
  invalidateMe,
  isCancelled = () => false,
  wait = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  maxAttempts = 5,
}: SyncPendingSignupLocationOptions): Promise<PendingLocationSyncResult> {
  let pending: PendingSignupLocation | null;
  try {
    pending = await readPending(userId);
  } catch {
    return "pending";
  }
  if (!pending) return "empty";

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (isCancelled()) return "cancelled";
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing session token");
      await updateLocation(pending, token);
      await clearPending(userId);
      if (!isCancelled()) await invalidateMe();
      return "synced";
    } catch {
      if (isCancelled()) return "cancelled";
      if (attempt < maxAttempts - 1) {
        await wait(1000 * 2 ** attempt);
      }
    }
  }

  return "pending";
}