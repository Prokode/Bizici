import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { useColors } from "@/hooks/useColors";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "destructive" | "outline" | "success";
  style?: ViewStyle;
}

export function Badge({ children, variant = "default", style }: BadgeProps) {
  const colors = useColors();

  const getBackgroundColor = () => {
    switch (variant) {
      case "default": return colors.primary;
      case "secondary": return colors.secondary;
      case "destructive": return colors.destructive;
      case "success": return colors.success || "#22c55e"; // Fallback if missing
      case "outline": return "transparent";
      default: return colors.primary;
    }
  };

  const getTextColor = () => {
    if (variant === "outline") return colors.foreground;
    switch (variant) {
      case "default": return colors.primaryForeground;
      case "secondary": return colors.secondaryForeground;
      case "destructive": return colors.destructiveForeground;
      case "success": return colors.successForeground || "#ffffff"; // Fallback
      default: return colors.primaryForeground;
    }
  };

  const getBorderColor = () => {
    if (variant === "outline") return colors.border;
    return "transparent";
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === "outline" ? 1 : 0,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: getTextColor(), fontFamily: "PlusJakartaSans_600SemiBold" },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    textTransform: "uppercase",
  },
});