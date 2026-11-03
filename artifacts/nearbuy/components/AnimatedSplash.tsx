import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

const FINISH_MS = 1200;
const VIEW_BOX = "2 28 25 30.3";

export function AnimatedSplash({ onFinish }: { onFinish: () => void }) {
  const colors = useColors();
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const completedRef = useRef(false);
  const startedRef = useRef(false);
  const [motionMode, setMotionMode] = useState<"initial" | "full" | "reduced">("initial");
  const dotOpacity = useSharedValue(1), dotY = useSharedValue(0);
  const bodyOpacity = useSharedValue(1), bodyY = useSharedValue(0);
  const wingsOpacity = useSharedValue(1), leftWingX = useSharedValue(0), rightWingX = useSharedValue(0);
  const pinRotation = useSharedValue(0), overlayOpacity = useSharedValue(1);

  useEffect(() => {
    let mounted = true, motionResolved = false;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    const clearTimers = () => { clearTimeout(fadeTimer); clearTimeout(finishTimer); };
    const stopAnimations = () => {
      [dotOpacity, dotY, bodyOpacity, bodyY, wingsOpacity, leftWingX, rightWingX, pinRotation, overlayOpacity].forEach(cancelAnimation);
    };
    const finishOnce = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      onFinishRef.current();
    };
    const showReducedMotion = () => {
      if (!mounted || completedRef.current) return;
      clearTimers();
      stopAnimations();
      setMotionMode("reduced");
      finishOnce();
    };
    const startFullMotion = () => {
      if (!mounted || startedRef.current || completedRef.current) return;
      startedRef.current = true;
      setMotionMode("full");
      dotOpacity.value = 0; dotY.value = -11;
      bodyOpacity.value = 0; bodyY.value = 12;
      wingsOpacity.value = 0; leftWingX.value = -12; rightWingX.value = 12;
      pinRotation.value = 0; overlayOpacity.value = 1;
      const arrive = { duration: 380, easing: Easing.out(Easing.cubic) };
      dotOpacity.value = withTiming(1, arrive);
      dotY.value = withTiming(0, arrive);
      wingsOpacity.value = withDelay(75, withTiming(1, arrive));
      leftWingX.value = withDelay(75, withTiming(0, arrive));
      rightWingX.value = withDelay(75, withTiming(0, arrive));
      bodyOpacity.value = withDelay(145, withTiming(1, arrive));
      bodyY.value = withDelay(145, withTiming(0, arrive));
      pinRotation.value = withDelay(635, withSequence(
        withTiming(-1.4, { duration: 55 }), withTiming(1.4, { duration: 55 }),
        withTiming(-1.1, { duration: 55 }), withTiming(1.1, { duration: 55 }),
        withTiming(0, { duration: 60 }),
      ));
      fadeTimer = setTimeout(() => { overlayOpacity.value = withTiming(0, { duration: 180 }); }, FINISH_MS - 180);
      finishTimer = setTimeout(finishOnce, FINISH_MS);
    };
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (reduced) => {
      motionResolved = true;
      if (reduced) showReducedMotion(); else startFullMotion();
    });
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!mounted || motionResolved) return;
      motionResolved = true;
      if (reduced) showReducedMotion(); else startFullMotion();
    }).catch(showReducedMotion);
    return () => {
      mounted = false;
      clearTimers();
      startedRef.current = false;
      subscription.remove();
      stopAnimations();
    };
  }, [dotOpacity, dotY, bodyOpacity, bodyY, wingsOpacity, leftWingX, rightWingX, pinRotation, overlayOpacity]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const pinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${pinRotation.value}deg` }] }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: dotOpacity.value, transform: [{ translateY: dotY.value }] }));
  const bodyStyle = useAnimatedStyle(() => ({ opacity: bodyOpacity.value, transform: [{ translateY: bodyY.value }] }));
  const leftStyle = useAnimatedStyle(() => ({ opacity: wingsOpacity.value, transform: [{ translateX: leftWingX.value }] }));
  const rightStyle = useAnimatedStyle(() => ({ opacity: wingsOpacity.value, transform: [{ translateX: rightWingX.value }] }));
  const full = motionMode === "full";

  return (
    <Animated.View pointerEvents="none" style={[styles.container, { backgroundColor: colors.background }, full && overlayStyle]}>
      <View style={styles.lockup}>
        <View style={styles.markStage}>
          <Animated.View style={[styles.mark, full && pinStyle]}>
            <Svg width="100%" height="100%" viewBox={VIEW_BOX}>
              <Path d="m14.47 29.83c-5.65 0-10.26 4.58-10.26 10.28 0 1.46 0.29 2.85 0.82 4.1 1.77 4.08 6.48 8.7 8.69 10.62 0.53 0.47 1.22 0.49 1.67 0.06 2.33-2.19 6.95-6.7 8.71-10.78 0.52-1.23 0.8-2.59 0.8-4 0-5.7-4.71-10.28-10.43-10.28z" fill={colors.primary} />
            </Svg>
            <Animated.View style={[styles.layer, full && dotStyle]}>
              <Svg width="100%" height="100%" viewBox={VIEW_BOX}><Circle cx="14.53" cy="41.76" r="1.076" fill="#fff" /></Svg>
            </Animated.View>
            <Animated.View style={[styles.layer, full && bodyStyle]}>
              <Svg width="100%" height="100%" viewBox={VIEW_BOX}><Path d="m11.85 45.21c0-0.76 0.62-1.36 1.37-1.36h2.57c0.77 0 1.43 0.58 1.43 1.32v5.24h-5.37v-5.2z" fill="#fff" /></Svg>
            </Animated.View>
            <Animated.View style={[styles.layer, full && leftStyle]}>
              <Svg width="100%" height="100%" viewBox={VIEW_BOX}><Path d="m9.71 34.31c0.18-0.3 0.5-0.5 0.85-0.5h3.21c0.17 0 0.29 0.13 0.26 0.29l-0.82 4.67c-0.12 0.68-0.74 1.16-1.44 1.16h-3.36c-0.97 0-1.5-0.96-1.04-1.69l2.34-3.93z" fill="#fff" /></Svg>
            </Animated.View>
            <Animated.View style={[styles.layer, full && rightStyle]}>
              <Svg width="100%" height="100%" viewBox={VIEW_BOX}><Path d="m19.41 34.31c-0.18-0.3-0.5-0.5-0.85-0.5h-3.17c-0.2 0-0.33 0.15-0.3 0.32l0.82 4.65c0.11 0.68 0.72 1.15 1.42 1.15h3.28c1.01 0 1.53-0.94 1.08-1.68l-2.28-3.94z" fill="#fff" /></Svg>
            </Animated.View>
          </Animated.View>
        </View>
        <Text style={styles.brand}><Text style={{ color: colors.brandGreen }}>ici</Text><Text style={{ color: colors.primary }}>Biz</Text></Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 9999, elevation: 9999 },
  lockup: { alignItems: "center", justifyContent: "center", marginTop: -8 },
  markStage: { width: 220, height: 200, alignItems: "center", justifyContent: "center" },
  mark: { width: 132, height: 160 },
  layer: { ...StyleSheet.absoluteFillObject },
  brand: { marginTop: 6, fontSize: 44, fontWeight: "800", letterSpacing: -1.7 },
});
