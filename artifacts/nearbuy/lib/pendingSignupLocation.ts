import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createPendingSignupLocationStore,
  type PendingSignupLocation,
} from "./pendingSignupLocationCore";

export type { PendingSignupLocation } from "./pendingSignupLocationCore";

const store = createPendingSignupLocationStore(
  AsyncStorage,
  "nearbuy.pending-signup-location.v1",
);

export const savePendingSignupLocation = (
  userId: string,
  location: PendingSignupLocation,
) => store.save(userId, location);
export const subscribeToPendingSignupLocation = store.subscribe;
export const readPendingSignupLocation = store.read;
export const clearPendingSignupLocation = store.clear;