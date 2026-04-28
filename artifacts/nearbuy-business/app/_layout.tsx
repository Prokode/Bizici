import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { ClerkProvider, ClerkLoaded, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";

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
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

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

function NotificationTapHandler() {
  useEffect(() => {
    const handleResponse = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      if (
        data?.type === "chat_message" &&
        typeof data.conversationId === "string" &&
        typeof data.shopId === "string"
      ) {
        setTimeout(() => {
          router.push(
            `/(home)/shops/${data.shopId}/chat/${data.conversationId}` as never,
          );
        }, 50);
      }
    };

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });

    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => sub.remove();
  }, []);
  return null;
}

function PushRegistrationBridge() {
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    let cancelled = false;

    if (isSignedIn) {
      (async () => {
        const token = await registerForPushNotificationsAsync();
        if (cancelled || !token) return;
        try {
          await registerPushTokenWithServer(token);
          await rememberRegisteredToken(token);
        } catch {
          // 409 / network error — retry next sign-in
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
  }, [isLoaded, isSignedIn]);
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
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <AuthTokenBridge />
                  <PushRegistrationBridge />
                  <NotificationTapHandler />
                  <Slot />
                  {!animationDone && (
                    <AnimatedSplash onFinish={() => setAnimationDone(true)} />
                  )}
                </KeyboardProvider>
              </GestureHandlerRootView>
            </QueryClientProvider>
          </ErrorBoundary>
        </SafeAreaProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
