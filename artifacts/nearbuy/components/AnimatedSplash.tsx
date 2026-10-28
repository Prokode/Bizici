import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

type Props = {
  onFinish: () => void;
};

type MotionMode = "initial" | "full" | "reduced";

const FINISH_MS = 2200;
const REDUCED_FINISH_MS = 500;

export function AnimatedSplash({ onFinish }: Props) {
  const colors = useColors();
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const completedRef = useRef(false);
  const startedRef = useRef(false);
  const [motionMode, setMotionMode] = useState<MotionMode>("initial");

  const markOpacity = useSharedValue(0);
  const markY = useSharedValue(-22);
  const markScale = useSharedValue(0.9);
  const haloOpacity = useSharedValue(0);
  const haloScale = useSharedValue(0.72);
  const wordOpacity = useSharedValue(0);
  const wordY = useSharedValue(8);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    let mounted = true;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    let preferenceTimer: ReturnType<typeof setTimeout> | undefined;
    let initialResolutionChosen = false;
    let reducedMotionActive = false;

    const clearTimers = () => {
      if (fadeTimer) clearTimeout(fadeTimer);
      if (finishTimer) clearTimeout(finishTimer);
      if (preferenceTimer) clearTimeout(preferenceTimer);
      fadeTimer = undefined;
      finishTimer = undefined;
      preferenceTimer = undefined;
    };

    const finishOnce = () => {
      if (completedRef.current) return;
      completedRef.current = true;
      onFinishRef.current();
    };

    const showReducedMotion = () => {
      if (!mounted || completedRef.current) return;
      clearTimers();
      cancelAnimation(markOpacity);
      cancelAnimation(markY);
      cancelAnimation(markScale);
      cancelAnimation(haloOpacity);
      cancelAnimation(haloScale);
      cancelAnimation(wordOpacity);
      cancelAnimation(wordY);
      cancelAnimation(containerOpacity);
      reducedMotionActive = true;
      setMotionMode("reduced");
      fadeTimer = setTimeout(() => {
        containerOpacity.value = withTiming(0, { duration: 240 });
      }, 100);
      finishTimer = setTimeout(finishOnce, REDUCED_FINISH_MS);
    };

    const startFullMotion = () => {
      if (!mounted || startedRef.current || completedRef.current) return;
      clearTimers();
      startedRef.current = true;
      reducedMotionActive = false;
      setMotionMode("full");
      containerOpacity.value = 1;

      markOpacity.value = withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) });
      markY.value = withSpring(0, { damping: 14, stiffness: 150, mass: 0.85 });
      markScale.value = withSpring(1, { damping: 13, stiffness: 160, mass: 0.9 });

      haloOpacity.value = withDelay(
        280,
        withSequence(
          withTiming(0.3, { duration: 240 }),
          withTiming(0, { duration: 760, easing: Easing.out(Easing.quad) }),
        ),
      );
      haloScale.value = withDelay(
        280,
        withTiming(1.42, { duration: 1000, easing: Easing.out(Easing.quad) }),
      );

      wordOpacity.value = withDelay(520, withTiming(1, { duration: 340 }));
      wordY.value = withDelay(520, withSpring(0, { damping: 15, stiffness: 150 }));

      fadeTimer = setTimeout(() => {
        containerOpacity.value = withTiming(0, { duration: 360, easing: Easing.out(Easing.quad) });
      }, 1780);
      finishTimer = setTimeout(finishOnce, FINISH_MS);
    };

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (shouldReduceMotion) => {
        initialResolutionChosen = true;
        if (preferenceTimer) clearTimeout(preferenceTimer);
        if (shouldReduceMotion) showReducedMotion();
        else {
          if (reducedMotionActive) startedRef.current = false;
          startFullMotion();
        }
      },
    );

    preferenceTimer = setTimeout(() => {
      if (initialResolutionChosen) return;
      initialResolutionChosen = true;
      showReducedMotion();
    }, 275);

    AccessibilityInfo.isReduceMotionEnabled()
      .then((shouldReduceMotion) => {
        if (!mounted || initialResolutionChosen) return;
        initialResolutionChosen = true;
        if (preferenceTimer) clearTimeout(preferenceTimer);
        if (shouldReduceMotion) showReducedMotion();
        else startFullMotion();
      })
      .catch(() => {
        if (!mounted || initialResolutionChosen) return;
        initialResolutionChosen = true;
        if (preferenceTimer) clearTimeout(preferenceTimer);
        showReducedMotion();
      });

    return () => {
      mounted = false;
      clearTimers();
      startedRef.current = false;
      subscription.remove();
      cancelAnimation(markOpacity);
      cancelAnimation(markY);
      cancelAnimation(markScale);
      cancelAnimation(haloOpacity);
      cancelAnimation(haloScale);
      cancelAnimation(wordOpacity);
      cancelAnimation(wordY);
      cancelAnimation(containerOpacity);
    };
  }, [
    containerOpacity,
    haloOpacity,
    haloScale,
    markOpacity,
    markScale,
    markY,
    wordOpacity,
    wordY,
  ]);

  const containerStyle = useAnimatedStyle(() => ({ opacity: containerOpacity.value }));
  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ translateY: markY.value }, { scale: markScale.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ translateY: wordY.value }],
  }));
  const isStatic = motionMode !== "full";

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { backgroundColor: colors.background },
        !isStatic && containerStyle,
      ]}
    >
      <View style={styles.lockup}>
        <View style={styles.markStage}>
          <Animated.View
            style={[
              styles.halo,
              { backgroundColor: colors.primary },
              !isStatic && haloStyle,
              isStatic && styles.staticHalo,
            ]}
          />
          <Animated.Image
            source={require("../assets/images/icibiz-mark.png")}
            resizeMode="contain"
            style={[styles.mark, !isStatic && markStyle]}
          />
        </View>
        <Animated.View style={[styles.wordmark, !isStatic && wordStyle]}>
          <Text style={styles.brand}>
            <Text style={{ color: colors.brandGreen }}>ici</Text>
            <Text style={{ color: colors.primary }}>Biz</Text>
          </Text>
        </Animated.View>
      </View>
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
  lockup: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -8,
  },
  markStage: {
    width: 220,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: 124,
    height: 124,
    borderRadius: 62,
    opacity: 0,
  },
  staticHalo: {
    opacity: 0.09,
    transform: [{ scale: 1.1 }],
  },
  mark: {
    width: 132,
    height: 160,
  },
  wordmark: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 6,
  },
  brand: {
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1.7,
  },
});
