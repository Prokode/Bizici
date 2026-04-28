import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import { customFetch } from "@workspace/api-client-react";

export type PushPlatform = "ios" | "android" | "web";

const LAST_TOKEN_KEY = "nearbuy.push.lastToken";

/** Persist the last successfully registered token so sign-out can deregister
 *  it even after a cold restart or registration that succeeded in a prior
 *  session. */
export async function rememberRegisteredToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_TOKEN_KEY, token);
  } catch {
    // ignore: storage is best-effort
  }
}

export async function readRememberedToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearRememberedToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LAST_TOKEN_KEY);
  } catch {
    // ignore
  }
}

/**
 * How a notification should appear when the app is foregrounded.
 *
 * On iOS we don't pop a banner if the user is already inside the chat thread
 * the message belongs to, but for v1 we keep it simple and always show.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function platformName(): PushPlatform {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return "web";
}

/**
 * Request OS permission and obtain an Expo push token. Returns null when:
 *   - running in a simulator (Device.isDevice === false)
 *   - the user denied permission
 *   - we don't have a project id (e.g. running in Expo Go without EAS config)
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    // Push tokens cannot be issued on simulators.
    return null;
  }

  // Android requires an explicit channel for proper foreground delivery.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Notifications",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  try {
    const tokenResp = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return tokenResp.data;
  } catch {
    return null;
  }
}

export async function registerPushTokenWithServer(token: string): Promise<void> {
  await customFetch("/api/me/push-tokens", {
    method: "POST",
    body: JSON.stringify({ token, platform: platformName() }),
    headers: { "content-type": "application/json" },
    responseType: "text",
  });
}

export async function unregisterPushTokenWithServer(token: string): Promise<void> {
  try {
    await customFetch("/api/me/push-tokens", {
      method: "DELETE",
      body: JSON.stringify({ token }),
      headers: { "content-type": "application/json" },
      responseType: "text",
    });
  } catch {
    // best-effort: don't surface errors during sign-out
  }
}
