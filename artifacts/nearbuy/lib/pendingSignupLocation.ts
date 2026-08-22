import AsyncStorage from "@react-native-async-storage/async-storage";

export type PendingSignupLocation = {
  countryCode: string;
  cityId: string;
};

const KEY_PREFIX = "nearbuy.pending-signup-location.v1";
const listeners = new Set<() => void>();

function keyForUser(userId: string) {
  return `${KEY_PREFIX}:${userId}`;
}

export async function savePendingSignupLocation(
  userId: string,
  location: PendingSignupLocation,
) {
  await AsyncStorage.setItem(keyForUser(userId), JSON.stringify(location));
  listeners.forEach((listener) => listener());
}

export function subscribeToPendingSignupLocation(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function readPendingSignupLocation(userId: string) {
  const value = await AsyncStorage.getItem(keyForUser(userId));
  if (!value) return null;
  try {
    return JSON.parse(value) as PendingSignupLocation;
  } catch {
    await AsyncStorage.removeItem(keyForUser(userId));
    return null;
  }
}

export async function clearPendingSignupLocation(userId: string) {
  await AsyncStorage.removeItem(keyForUser(userId));
}