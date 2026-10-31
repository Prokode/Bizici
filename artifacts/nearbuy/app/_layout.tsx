import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { router, Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { notificationTarget } from "@/lib/notificationTarget";
import { getGetMyNotificationsQueryKey } from "@workspace/api-client-react";
import React, { useEffect, useState } from "react";
import { AppState, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";

import "@/lib/i18n";
import "@/lib/theme";
import { useColors, useThemeScheme } from "@/hooks/useColors";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  clearRememberedToken,
  readRememberedToken,
  registerForPushNotificationsAsync,
  registerPushTokenWithServer,
  rememberRegisteredToken,
  unregisterPushTokenWithServer,
} from "@/lib/push";
import {
  getGetMeQueryKey,
  setAuthTokenGetter,
  setBaseUrl,
  updateMyLocation,
} from "@workspace/api-client-react";
import {
  clearPendingSignupLocation,
  readPendingSignupLocation,
  subscribeToPendingSignupLocation,
} from "@/lib/pendingSignupLocation";
import { syncPendingSignupLocation } from "@/lib/pendingSignupLocationCore";
import { InterestPreferencesBridge } from "@/components/InterestPreferencesBridge";

function AuthTokenBridge() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => {
      setAuthTokenGetter(null);
    };
  }, [getToken]);
  return null;
}

function PendingSignupLocationBridge() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const queryClient = useQueryClient();
  const [pendingRevision, setPendingRevision] = useState(0);

  useEffect(
    () =>
      subscribeToPendingSignupLocation(() => {
        setPendingRevision((revision) => revision + 1);
      }),
    [],
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;
    let cancelled = false;

    void syncPendingSignupLocation({
      userId,
      readPending: readPendingSignupLocation,
      clearPending: clearPendingSignupLocation,
      getToken,
      updateLocation: (pending, token) =>
        updateMyLocation(pending, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      invalidateMe: () =>
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() }),
      isCancelled: () => cancelled,
    });

    return () => {
      cancelled = true;
    };
  }, [
    getToken,
    isLoaded,
    isSignedIn,
    pendingRevision,
    queryClient,
    userId,
  ]);

  return null;
}

/**
 * Handles tap-to-open for chat notifications. Lives outside the auth-gated
 * bridge so it works even before the user signs in (e.g. cold-start tap).
 */
function NotificationTapHandler() {
  const { isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => {
    if (!target || !isLoaded || !isSignedIn) return;
    const timer = setTimeout(() => { router.push(target as never); setTarget(null); }, 150);
    return () => clearTimeout(timer);
  }, [target, isLoaded, isSignedIn]);
  useEffect(() => {
    // expo-notifications cold-start + listener APIs are not implemented on web.
    if (Platform.OS === "web") return;
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      setTarget(notificationTarget(data));
    };

    // Cold-start tap (notification opened the app from killed state)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    }).catch(() => undefined);

    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    const received = Notifications.addNotificationReceivedListener(() => {
      void queryClient.invalidateQueries({ queryKey: getGetMyNotificationsQueryKey() });
      void queryClient.invalidateQueries({ queryKey: ["chat-conv-list"] });
      void queryClient.invalidateQueries({ queryKey: ["chat-messages"] });
    });
    return () => { sub.remove(); received.remove(); };
  }, [queryClient]);
  return null;
}

/**
 * On sign-in, request OS push permission and register the resulting Expo
 * token with our backend. On sign-out, deregister so we stop pushing to a
 * device the user no longer trusts.
 */
function PushRegistrationBridge() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const [retryRevision, setRetryRevision] = useState(0);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const resume = AppState.addEventListener("change", (state) => {
      if (state === "active") setRetryRevision((value) => value + 1);
    });
    const refresh = Notifications.addPushTokenListener(() => setRetryRevision((value) => value + 1));
    return () => { resume.remove(); refresh.remove(); };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;

    if (isSignedIn) {
      (async () => {
        try {
          const token = await registerForPushNotificationsAsync();
          if (cancelled || !token) return;
          await registerPushTokenWithServer(token);
          // Persist so a future sign-out can deregister even after a cold
          // restart or if this very registration request silently fails next
          // time.
          await rememberRegisteredToken(token);
        } catch {
          // 409 (token belongs to another user) or network error — leave
          // remembered token untouched so the next sign-in can retry.
        }
      })();
    } else {
      (async () => {
        const remembered = await readRememberedToken();
        if (!remembered) return;
        await unregisterPushTokenWithServer(remembered);
        await clearRememberedToken();
      })();
    }

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, userId, retryRevision]);
  return null;
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

if (process.env.EXPO_PUBLIC_DOMAIN) {
  setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
}

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

export default function RootLayout() {
  const colors = useColors();
  const scheme = useThemeScheme();
  useEffect(() => {
    if (Platform.OS !== "web") {
      void SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
    }
  }, [colors.background]);
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    ...Feather.font,
    ...Ionicons.font,
  });
  const [animationDone, setAnimationDone] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      proxyUrl={proxyUrl}
    >
      <ClerkLoaded>
        <SafeAreaProvider>
          <ErrorBoundary>
            <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
                <StatusBar style={scheme === "dark" ? "light" : "dark"} />
                <KeyboardProvider>
                  <CurrencyProvider>
                  <AuthTokenBridge />
                  <PendingSignupLocationBridge />
                  <InterestPreferencesBridge />
                  <PushRegistrationBridge />
                  <NotificationTapHandler />
                  <Slot />
                  {!animationDone && (
                    <AnimatedSplash onFinish={() => setAnimationDone(true)} />
                  )}
                  </CurrencyProvider>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
