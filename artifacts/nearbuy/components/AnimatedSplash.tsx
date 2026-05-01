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

/**
 * BizIci animated splash.
 *
 * Sequence:
 *   1. Orange location pin appears (drops & settles).
 *   2. The green storefront materialises inside the pin.
 *   3. Three green sparks burst above-left of the pin.
 *   4. The navy base/shadow appears under the pin.
 *   5. The whole composition shrinks and slides up.
 *   6. The "BizIci" wordmark fades in below it.
 *
 * On web the animation is skipped — Reanimated 4 + the workspace dev preview
 * combination is unstable and the OS splash already covers the cold start.
 */

const ORANGE = "#F58220";
const NAVY = "#1B2A5C";
const GREEN = "#7FB927";
const AWNING = "#8FCB2E";

const PIN_W = 220;
const PIN_H = 280;

type Props = {
  onFinish: () => void;
};

export function AnimatedSplash({ onFinish }: Props) {
  // Each layer has its own opacity/scale so we can choreograph independently.
  const pinOpacity = useSharedValue(0);
  const pinTranslate = useSharedValue(-60);
  const storeOpacity = useSharedValue(0);
  const storeScale = useSharedValue(0.6);
  const sparksOpacity = useSharedValue(0);
  const sparksScale = useSharedValue(0.4);
  const baseOpacity = useSharedValue(0);
  const baseScale = useSharedValue(0.4);

  // The whole pin composition shrinks + lifts at the end.
  const groupScale = useSharedValue(1);
  const groupTranslate = useSharedValue(0);

  // Wordmark + container fade.
  const wordOpacity = useSharedValue(0);
  const wordTranslate = useSharedValue(20);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    if (Platform.OS === "web") {
      const t = setTimeout(onFinish, 50);
      return () => clearTimeout(t);
    }

    // 1) Pin drops in
    pinOpacity.value = withTiming(1, { duration: 320 });
    pinTranslate.value = withSpring(0, { damping: 9, stiffness: 110 });

    // 2) Storefront pops inside
    storeOpacity.value = withDelay(450, withTiming(1, { duration: 280 }));
    storeScale.value = withDelay(
      450,
      withSpring(1, { damping: 8, stiffness: 140 }),
    );

    // 3) Three sparks burst
    sparksOpacity.value = withDelay(820, withTiming(1, { duration: 240 }));
    sparksScale.value = withDelay(
      820,
      withSequence(
        withSpring(1.15, { damping: 6, stiffness: 180 }),
        withSpring(1, { damping: 8, stiffness: 200 }),
      ),
    );

    // 4) Navy base appears
    baseOpacity.value = withDelay(1180, withTiming(1, { duration: 260 }));
    baseScale.value = withDelay(
      1180,
      withSpring(1, { damping: 9, stiffness: 130 }),
    );

    // 5) Whole composition shrinks + slides up
    groupScale.value = withDelay(
      1700,
      withTiming(0.55, {
        duration: 520,
        easing: Easing.inOut(Easing.cubic),
      }),
    );
    groupTranslate.value = withDelay(
      1700,
      withTiming(-90, {
        duration: 520,
        easing: Easing.inOut(Easing.cubic),
      }),
    );

    // 6) Wordmark fades in below the shrunken pin
    wordOpacity.value = withDelay(2050, withTiming(1, { duration: 380 }));
    wordTranslate.value = withDelay(
      2050,
      withSpring(0, { damping: 10, stiffness: 120 }),
    );

    // Final fade-out → onFinish
    containerOpacity.value = withDelay(
      2850,
      withTiming(0, { duration: 380, easing: Easing.out(Easing.quad) }, () => {
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
      style={[styles.container, containerStyle]}
    >
      {/* Wordmark sits at the top — revealed after the pin shrinks */}
      <Animated.View style={[styles.wordmarkWrap, wordStyle]}>
        <Text style={styles.wordmark}>
          <Text style={{ color: NAVY }}>Biz</Text>
          <Text style={{ color: GREEN }}>Ici</Text>
        </Text>
        <Text style={styles.tagline}>
          <Text style={{ color: NAVY }}>Trouvez tout </Text>
          <Text style={{ color: ORANGE }}>près de vous</Text>
        </Text>
      </Animated.View>

      <Animated.View style={[styles.group, groupStyle]}>
        {/* Layer 4: navy base/shadow under the pin tip */}
        <Animated.View style={[styles.layer, baseStyle]}>
          <Svg width={PIN_W} height={PIN_H} viewBox="0 0 100 130">
            <Ellipse cx="50" cy="120" rx="18" ry="5" fill={NAVY} />
          </Svg>
        </Animated.View>

        {/* Layer 1: orange pin */}
        <Animated.View style={[styles.layer, pinStyle]}>
          <Svg width={PIN_W} height={PIN_H} viewBox="0 0 100 130">
            <Path
              d="M 50 6
                 C 26 6 8 24 8 47
                 C 8 75 50 118 50 118
                 C 50 118 92 75 92 47
                 C 92 24 74 6 50 6 Z"
              fill={ORANGE}
            />
            {/* Inner white window so the store reads cleanly */}
            <Path
              d="M 50 16
                 C 32 16 18 30 18 47
                 C 18 64 32 78 50 78
                 C 68 78 82 64 82 47
                 C 82 30 68 16 50 16 Z"
              fill="#ffffff"
            />
          </Svg>
        </Animated.View>

        {/* Layer 2: storefront inside the pin window */}
        <Animated.View style={[styles.layer, storeStyle]}>
          <Svg width={PIN_W} height={PIN_H} viewBox="0 0 100 130">
            <G>
              {/* Awning base (green) */}
              <Path
                d="M 30 33 L 70 33 L 65 41 L 35 41 Z"
                fill={GREEN}
              />
              {/* Awning stripes (lighter green slivers) */}
              <Path d="M 36 33 L 33 41 L 38 41 L 41 33 Z" fill={AWNING} />
              <Path d="M 48 33 L 45 41 L 50 41 L 53 33 Z" fill={AWNING} />
              <Path d="M 60 33 L 57 41 L 62 41 L 65 41 L 65 33 Z" fill={AWNING} />
              {/* Building (navy) */}
              <Rect x="34" y="41" width="32" height="24" rx="1.5" fill={NAVY} />
              {/* Door (navy with green hint) */}
              <Rect x="38" y="46" width="9" height="19" rx="1" fill="#0E1530" />
              {/* Shopping bag (green) on the right */}
              <Rect x="52" y="50" width="10" height="13" rx="1.5" fill={GREEN} />
              <Path
                d="M 54 50 C 54 47.5 56 46 57 46 C 58 46 60 47.5 60 50"
                stroke={GREEN}
                strokeWidth={1.2}
                fill="none"
              />
            </G>
          </Svg>
        </Animated.View>

        {/* Layer 3: three green sparks above-left of the pin */}
        <Animated.View style={[styles.layer, sparksStyle]}>
          <Svg width={PIN_W} height={PIN_H} viewBox="0 0 100 130">
            <G stroke={GREEN} strokeWidth={2.4} strokeLinecap="round">
              {/* left spark */}
              <Path d="M 14 24 L 6 18" />
              {/* upper spark */}
              <Path d="M 22 12 L 18 4" />
              {/* upper-right spark */}
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
    backgroundColor: "#ffffff",
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
  wordmark: {
    fontSize: 56,
    fontWeight: "800",
    letterSpacing: -1,
  },
  tagline: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "500",
  },
});
