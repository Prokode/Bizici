import React from "react";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/expo";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { useColors } from "@/hooks/useColors";

export default function HomeLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const { t } = useTranslation();
  const colors = useColors();
  const isDark = useColorScheme() === "dark";

  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;

  return (
    <>
      <StatusBar
        style={isDark ? "light" : "dark"}
        backgroundColor={colors.background}
      />
      <Stack
        screenOptions={{
          headerBackTitle: t("common.back"),
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: {
            color: colors.foreground,
            fontFamily: "PlusJakartaSans_700Bold",
          },
          headerShadowVisible: false,
          statusBarStyle: isDark ? "light" : "dark",
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false, title: t("shopList.yourShops") }} />
        <Stack.Screen name="new-shop" options={{ headerShown: false, presentation: "fullScreenModal" }} />
        <Stack.Screen name="invitations" options={{ title: t("invitations.title"), presentation: "modal" }} />
        <Stack.Screen name="shops/[shopId]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
