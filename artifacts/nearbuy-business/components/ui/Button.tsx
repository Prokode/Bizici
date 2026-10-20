import React from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ViewStyle, TextStyle } from "react-native";
import { useColors } from "@/hooks/useColors";
import * as Haptics from "expo-haptics";

interface ButtonProps {
  onPress: () => void;
  title?: string;
  icon?: React.ReactNode;
  variant?: "primary" | "secondary" | "outline" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
  testID?: string;
  accessibilityLabel?: string;
  numberOfLines?: number;
}

export function Button({
  onPress,
  title,
  icon,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  style,
  textStyle,
  fullWidth,
  testID,
  accessibilityLabel,
  numberOfLines,
}: ButtonProps) {
  const colors = useColors();

  const getBackgroundColor = () => {
    if (disabled) return colors.muted;
    switch (variant) {
      case "primary": return colors.primary;
      case "secondary": return colors.secondary;
      case "outline": return "transparent";
      case "destructive": return colors.destructive;
      case "ghost": return "transparent";
      default: return colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return colors.mutedForeground;
    switch (variant) {
      case "primary": return colors.primaryForeground;
      case "secondary": return colors.secondaryForeground;
      case "outline": return colors.primary;
      case "destructive": return colors.destructiveForeground;
      case "ghost": return colors.foreground;
      default: return colors.primaryForeground;
    }
  };

  const getBorderColor = () => {
    if (variant === "outline") {
      return disabled ? colors.muted : colors.border;
    }
    return "transparent";
  };

  const getPadding = () => {
    switch (size) {
      case "sm": return { paddingVertical: 8, paddingHorizontal: 12 };
      case "lg": return { paddingVertical: 16, paddingHorizontal: 24 };
      case "md":
      default: return { paddingVertical: 12, paddingHorizontal: 16 };
    }
  };

  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled || loading}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!(disabled || loading), busy: !!loading }}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: variant === "outline" ? 1 : 0,
          borderRadius: colors.radius,
        },
        getPadding(),
        fullWidth && { width: "100%" },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={title ? styles.iconRight : styles.iconOnly}>{icon}</View>}
          {title && (
            <Text
              numberOfLines={numberOfLines}
              style={[
                styles.text,
                { color: getTextColor(), fontFamily: "PlusJakartaSans_600SemiBold" },
                size === "lg" && { fontSize: 18 },
                size === "sm" && { fontSize: 14 },
                textStyle,
              ]}
            >
              {title}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
    maxWidth: "100%",
  },
  iconRight: {
    marginRight: 8,
    flexShrink: 0,
  },
  iconOnly: {
    flexShrink: 0,
  },
  text: {
    flexShrink: 1,
    fontSize: 16,
    textAlign: "center",
  },
});