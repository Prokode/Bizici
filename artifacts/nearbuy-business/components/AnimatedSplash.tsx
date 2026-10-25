import React, { useEffect } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Ellipse, G, Path, Rect } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";

/**
 * BizIci Pro animated splash.
 *
 * Sequence (mirrors the customer app):
 *   1. Orange location pin appears (drops & settles).
 *   2. The green storefront materialises inside the pin.
 *   3. Three green sparks burst above-left of the pin.
 *   4. The navy base/shadow appears under the pin.
 *   5. The whole composition shrinks and slides up.
 *   6. The "BizIci" wordmark + "Espace Pro" tagline fade in.
 *
 * On web the animation is skipped.
 */

const PIN_W = 220;
const PIN_H = 280;

type Props = {
  onFinish: () => void;
};

export function AnimatedSplash({ onFinish }: Props) {
  const { t } = useTranslation();
  const colors = useColors();
  const pinOpacity = useSharedValue(0);
  const pinTranslate = useSharedValue(-60);
  const storeOpacity = useSharedValue(0);
  const storeScale = useSharedValue(0.6);
  const sparksOpacity = useSharedValue(0);
  const sparksScale = useSharedValue(0.4);
  const baseOpacity = useSharedValue(0);
  const baseScale = useSharedValue(0.4);

  const groupScale = useSharedValue(1);
  const groupTranslate = useSharedValue(0);

  const wordOpacity = useSharedValue(0);
  const wordTranslate = useSharedValue(20);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    if (Platform.OS === "web") {
      const t = setTimeout(onFinish, 50);
      return () => clearTimeout(t);
    }

    pinOpacity.value = withTiming(1, { duration: 500 });
    pinTranslate.value = withSpring(0, {
      damping: 10,
      stiffness: 90,
      mass: 1.1,
    });

    storeOpacity.value = withDelay(900, withTiming(1, { duration: 600 }));
    storeScale.value = withDelay(
      900,
      withSpring(1, { damping: 10, stiffness: 120 }),
    );

    sparksOpacity.value = withDelay(1900, withTiming(1, { duration: 400 }));
    sparksScale.value = withDelay(
      1900,
      withSequence(
        withSpring(1.2, { damping: 6, stiffness: 160 }),
        withSpring(1, { damping: 9, stiffness: 200 }),
      ),
    );

    baseOpacity.value = withDelay(2700, withTiming(1, { duration: 500 }));
    baseScale.value = withDelay(
      2700,
      withSpring(1, { damping: 10, stiffness: 110 }),
    );

    groupScale.value = withDelay(
      3800,
      withTiming(0.5, {
        duration: 720,
        easing: Easing.inOut(Easing.cubic),
      }),
    );
    groupTranslate.value = withDelay(
      3800,
      withTiming(-100, {
        duration: 720,
        easing: Easing.inOut(Easing.cubic),
      }),
    );

    wordOpacity.value = withDelay(4200, withTiming(1, { duration: 600 }));
    wordTranslate.value = withDelay(
      4200,
      withSpring(0, { damping: 11, stiffness: 100 }),
    );

    containerOpacity.value = withDelay(
      5700,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }, () => {
        runOnJS(onFinish)();
      }),
    );
  }, [
    pinOpacity,
    pinTranslate,
    storeOpacity,
    storeScale,
    sparksOpacity,
    sparksScale,
    baseOpacity,
    baseScale,
    groupScale,
    groupTranslate,
    wordOpacity,
    wordTranslate,
    containerOpacity,
    onFinish,
  ]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const groupStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: groupTranslate.value },
      { scale: groupScale.value },
    ],
  }));

  const pinStyle = useAnimatedStyle(() => ({
    opacity: pinOpacity.value,
    transform: [{ translateY: pinTranslate.value }],
  }));

  const storeStyle = useAnimatedStyle(() => ({
    opacity: storeOpacity.value,
    transform: [{ scale: storeScale.value }],
  }));

  const sparksStyle = useAnimatedStyle(() => ({
    opacity: sparksOpacity.value,
    transform: [{ scale: sparksScale.value }],
  }));

  const baseStyle = useAnimatedStyle(() => ({
    opacity: baseOpacity.value,
    transform: [{ scale: baseScale.value }],
  }));

  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ translateY: wordTranslate.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { backgroundColor: colors.background }, containerStyle]}
    >
      <Animated.View style={[styles.wordmarkWrap, wordStyle]}>
        <View style={styles.wordmarkRow}>
          <Text style={styles.wordmark}>
            <Text style={{ color: colors.foreground }}>Biz</Text>
            <Text style={{ color: colors.primary }}>Ici</Text>
          </Text>
          <View style={[styles.proBadge, { backgroundColor: colors.primary }]}>
            <Text style={[styles.proBadgeText, { color: colors.primaryForeground }]}>PRO</Text>
          </View>
        </View>
        <Text style={styles.tagline}>
          <Text style={{ color: colors.foreground }}>{t("onboarding.splashTaglineFirst")}</Text>
          <Text style={{ color: colors.primary }}>{t("onboarding.splashTaglineSecond")}</Text>
        </Text>
      </Animated.View>

      <Animated.View style={[styles.group, groupStyle]}>
        <Animated.View style={[styles.layer, baseStyle]}>
          <Svg width={PIN_W} height={PIN_H} viewBox="0 0 100 130">
            <Ellipse cx="50" cy="120" rx="18" ry="5" fill={colors.foreground} />
          </Svg>
        </Animated.View>

        <Animated.View style={[styles.layer, pinStyle]}>
          <Svg width={PIN_W} height={PIN_H} viewBox="0 0 100 130">
            <Path
              d="M 50 6
                 C 26 6 8 24 8 47
                 C 8 75 50 118 50 118
                 C 50 118 92 75 92 47
                 C 92 24 74 6 50 6 Z"
              fill={colors.primary}
            />
            <Path
              d="M 50 16
                 C 32 16 18 30 18 47
                 C 18 64 32 78 50 78
                 C 68 78 82 64 82 47
                 C 82 30 68 16 50 16 Z"
              fill={colors.background}
            />
          </Svg>
        </Animated.View>

        <Animated.View style={[styles.layer, storeStyle]}>
          <Svg width={PIN_W} height={PIN_H} viewBox="0 0 100 130">
            <G>
              <Path
                d="M 28 31 H 72 V 38
                   Q 66.5 43 61 38
                   Q 55.5 43 50 38
                   Q 44.5 43 39 38
                   Q 33.5 43 28 38 Z"
                fill={colors.primary}
              />
              <Rect x="33" y="31" width="6" height="7" fill={colors.primaryForeground} />
              <Rect x="44" y="31" width="6" height="7" fill={colors.primaryForeground} />
              <Rect x="55" y="31" width="6" height="7" fill={colors.primaryForeground} />
              <Rect x="66" y="31" width="6" height="7" fill={colors.primaryForeground} />

              <Path d="M 30 41 H 70 V 70 H 30 Z" fill={colors.foreground} />

              <Rect
                x="34"
                y="48"
                width="13"
                height="22"
                rx="1.2"
                fill={colors.background}
              />
              <Rect x="36" y="51" width="3" height="4" fill={colors.accent} />

              <Rect
                x="52"
                y="53"
                width="13"
                height="15"
                rx="1.5"
                fill={colors.accent}
              />
              <Path
                d="M 55 53 Q 55 48 58.5 48 Q 62 48 62 53"
                stroke={colors.accent}
                strokeWidth={1.6}
                fill="none"
                strokeLinecap="round"
              />
            </G>
          </Svg>
        </Animated.View>

        <Animated.View style={[styles.layer, sparksStyle]}>
          <Svg width={PIN_W} height={PIN_H} viewBox="0 0 100 130">
            <G stroke={colors.accent} strokeWidth={2.4} strokeLinecap="round">
              <Path d="M 14 24 L 6 18" />
              <Path d="M 22 12 L 18 4" />
              <Path d="M 33 10 L 33 2" />
            </G>
          </Svg>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  group: {
    width: PIN_W,
    height: PIN_H,
    position: "relative",
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    width: PIN_W,
    height: PIN_H,
  },
  wordmarkWrap: {
    position: "absolute",
    top: "18%",
    alignItems: "center",
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  wordmark: {
    fontSize: 56,
    fontWeight: "800",
    letterSpacing: -1,
  },
  proBadge: {
    marginLeft: 8,
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  tagline: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
});
