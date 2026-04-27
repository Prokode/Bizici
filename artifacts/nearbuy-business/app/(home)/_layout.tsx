import React, { useEffect } from "react";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/expo";
import { setAuthTokenGetter } from "@workspace/api-client-react";

export default function HomeLayout() {
  const { isSignedIn, isLoaded, getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => {
      setAuthTokenGetter(null);
    };
  }, [getToken]);

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="index" options={{ title: "Your shops" }} />
      <Stack.Screen name="new-shop" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="invitations" options={{ title: "Invitations", presentation: "modal" }} />
      <Stack.Screen name="shops/[shopId]" options={{ headerShown: false }} />
    </Stack>
  );
}
