import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useAuth } from "@clerk/expo";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useColors } from "@/hooks/useColors";
import { listConversations } from "@/lib/api/conversations";
import { getGetMyNotificationsQueryKey, useGetMyNotifications } from "@workspace/api-client-react";

export default function TabsLayout() {
  const colors = useColors();
  const { isSignedIn, userId } = useAuth();
  const { t } = useTranslation();
  const notificationQuery = useGetMyNotifications(undefined, { query: { enabled: !!isSignedIn && !!userId, queryKey: [...getGetMyNotificationsQueryKey(), userId ?? "signed-out"], refetchInterval: 15_000, refetchIntervalInBackground: false } });

  const unreadQuery = useQuery({
    queryKey: ["chat-conv-list"],
    queryFn: () => listConversations(),
    enabled: !!isSignedIn,
    refetchInterval: 8000,
    refetchIntervalInBackground: false,
  });
  const totalUnread =
    unreadQuery.data?.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0) ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          // Omit native overrides: undefined also replaces React Navigation's
          // computed height/inset and can collapse the bar on Android.
          ...(Platform.OS === "web" ? { height: 84, paddingBottom: 34 } : {}),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          fontFamily: "PlusJakartaSans_600SemiBold",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("nav.map"),
          tabBarIcon: ({ color, size }) => (
            <Feather name="map" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t("nav.search"),
          tabBarIcon: ({ color, size }) => (
            <Feather name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: t("nav.camera"),
          tabBarIcon: ({ color, size }) => (
            <Feather name="camera" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t("nav.messages"),
          tabBarIcon: ({ color, size }) => (
            <Feather name="message-circle" size={size} color={color} />
          ),
          tabBarBadge: totalUnread > 0 ? totalUnread : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("nav.profile"),
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
          tabBarBadge: (notificationQuery.data?.unreadCount ?? 0) > 0
            ? (notificationQuery.data?.unreadCount ?? 0) > 99 ? "99+" : notificationQuery.data?.unreadCount
            : undefined,
        }}
      />
    </Tabs>
  );
}
