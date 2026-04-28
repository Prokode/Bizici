import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Platform } from "react-native";
import { useAuth } from "@clerk/expo";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { useColors } from "@/hooks/useColors";
import { listConversations } from "@/lib/chatApi";

export default function TabsLayout() {
  const colors = useColors();
  const { isSignedIn } = useAuth();
  const { t } = useTranslation();

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
          height: Platform.OS === "web" ? 84 : undefined,
          paddingBottom: Platform.OS === "web" ? 34 : undefined,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
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
        }}
      />
    </Tabs>
  );
}
