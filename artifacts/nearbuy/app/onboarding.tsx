import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";
import { useRouter, type Href } from "expo-router";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";

export const ONBOARDING_SEEN_KEY = "nearbuy.consumer.onboarding.seen";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

type SlideDef = {
  key: string;
  titleKey: string;
  bodyKey: string;
  chipKey: string;
  visual: "logo" | "icon";
  iconName?: keyof typeof Feather.glyphMap;
  gradient: [string, string];
};

const SLIDE_DEFS: SlideDef[] = [
  {
    key: "discover",
    titleKey: "onboarding.slide1Title",
    bodyKey: "onboarding.slide1Body",
    chipKey: "onboarding.slide1Chip",
    visual: "logo",
    gradient: ["#F58220", "#E26A0A"],
  },
  {
    key: "search",
    titleKey: "onboarding.slide2Title",
    bodyKey: "onboarding.slide2Body",
    chipKey: "onboarding.slide2Chip",
    visual: "icon",
    iconName: "search",
    gradient: ["#FF8A3D", "#FF5E62"],
  },
  {
    key: "visual",
    titleKey: "onboarding.slide3Title",
    bodyKey: "onboarding.slide3Body",
    chipKey: "onboarding.slide3Chip",
    visual: "icon",
    iconName: "camera",
    gradient: ["#A855F7", "#EC4899"],
  },
  {
    key: "karma",
    titleKey: "onboarding.slide4Title",
    bodyKey: "onboarding.slide4Body",
    chipKey: "onboarding.slide4Chip",
    visual: "icon",
    iconName: "award",
    gradient: ["#0EA5E9", "#22D3EE"],
  },
  {
    key: "run",
    titleKey: "onboarding.slide5Title",
    bodyKey: "onboarding.slide5Body",
    chipKey: "onboarding.slide5Chip",
    visual: "icon",
    iconName: "shopping-bag",
    gradient: ["#10B981", "#06B6D4"],
  },
];

type SlideProps = {
  slide: SlideDef;
  index: number;
  scrollX: SharedValue<number>;
};

function OnboardingSlide({ slide, index, scrollX }: SlideProps) {
  const colors = useColors();
  const { t } = useTranslation();

  const inputRange = [
    (index - 1) * SCREEN_W,
    index * SCREEN_W,
    (index + 1) * SCREEN_W,
  ];

  const heroStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.8, 1, 0.8],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      Extrapolation.CLAMP,
    );
    return { transform: [{ scale }], opacity };
  });

  const orbAStyle = useAnimatedStyle(() => {
    const tx = interpolate(
      scrollX.value,
      inputRange,
      [-80, 0, 80],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateX: tx }] };
  });

  const orbBStyle = useAnimatedStyle(() => {
    const tx = interpolate(
      scrollX.value,
      inputRange,
      [80, 0, -80],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateX: tx }] };
  });

  const chipStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    const ty = interpolate(
      scrollX.value,
      inputRange,
      [20, 0, 20],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateY: ty }] };
  });

  const titleStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    const ty = interpolate(
      scrollX.value,
      inputRange,
      [40, 0, 40],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateY: ty }] };
  });

  const bodyStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    const ty = interpolate(
      scrollX.value,
      inputRange,
      [60, 0, 60],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateY: ty }] };
  });

  return (
    <View style={[styles.slide, { width: SCREEN_W }]}>
      <LinearGradient
        colors={slide.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Animated.View style={[styles.heroOrbA, orbAStyle]} />
        <Animated.View style={[styles.heroOrbB, orbBStyle]} />
        <Animated.View style={heroStyle}>
          {slide.visual === "logo" ? (
            <Image
              source={require("../assets/images/bizici-logo-transparent.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.iconHalo}>
              <Feather
                name={slide.iconName ?? "circle"}
                size={88}
                color="#ffffff"
              />
            </View>
          )}
        </Animated.View>
      </LinearGradient>

      <View style={styles.copy}>
        <Animated.View
          style={[
            styles.chip,
            { backgroundColor: colors.accent, borderColor: colors.border },
            chipStyle,
          ]}
        >
          <Text style={[styles.chipText, { color: colors.accentForeground }]}>
            {t(slide.chipKey)}
          </Text>
        </Animated.View>
        <Animated.Text
          style={[styles.title, { color: colors.foreground }, titleStyle]}
        >
          {t(slide.titleKey)}
        </Animated.Text>
        <Animated.Text
          style={[
            styles.description,
            { color: colors.mutedForeground },
            bodyStyle,
          ]}
        >
          {t(slide.bodyKey)}
        </Animated.Text>
      </View>
    </View>
  );
}

type DotProps = {
  i: number;
  scrollX: SharedValue<number>;
  color: string;
};

function Dot({ i, scrollX, color }: DotProps) {
  const inputRange = [
    (i - 1) * SCREEN_W,
    i * SCREEN_W,
    (i + 1) * SCREEN_W,
  ];
  const style = useAnimatedStyle(() => {
    const w = interpolate(
      scrollX.value,
      inputRange,
      [8, 28, 8],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolation.CLAMP,
    );
    return { width: w, opacity };
  });
  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: color }, style]}
    />
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const listRef = useRef<FlatList<SlideDef>>(null);
  const [index, setIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const slides = useMemo(() => SLIDE_DEFS, []);

  const finish = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, "1");
    } catch {
      // ignore
    }
    router.replace("/(tabs)" as Href);
  }, [router]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollX.value = e.nativeEvent.contentOffset.x;
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (index < slides.length - 1) {
      const nextIndex = index + 1;
      listRef.current?.scrollToOffset({
        offset: nextIndex * SCREEN_W,
        animated: true,
      });
      setIndex(nextIndex);
    } else {
      finish();
    }
  };

  const isLast = index === slides.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={finish} hitSlop={12}>
          <Text style={styles.skip}>{t("onboarding.skip")}</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumEnd}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({
          length: SCREEN_W,
          offset: SCREEN_W * i,
          index: i,
        })}
        renderItem={({ item, index: i }) => (
          <OnboardingSlide slide={item} index={i} scrollX={scrollX} />
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <Dot key={s.key} i={i} scrollX={scrollX} color={colors.primary} />
          ))}
        </View>
        <Button
          title={isLast ? t("onboarding.start") : t("onboarding.next")}
          onPress={next}
          fullWidth
          size="lg"
          icon={
            <Feather
              name={isLast ? "arrow-right-circle" : "arrow-right"}
              size={20}
              color="#ffffff"
            />
          }
        />
      </View>
    </View>
  );
}

const HERO_HEIGHT = Math.min(SCREEN_H * 0.5, 480);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  skip: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  slide: {
    flex: 1,
  },
  hero: {
    height: HERO_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  heroOrbA: {
    position: "absolute",
    top: -60,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  heroOrbB: {
    position: "absolute",
    bottom: -80,
    right: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  logo: {
    height: 260,
    width: 320,
  },
  iconHalo: {
    height: 200,
    width: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  copy: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 16,
  },
  chipText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 14,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 340,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
