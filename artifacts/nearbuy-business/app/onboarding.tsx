import React, { useCallback, useRef, useState } from "react";
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

export const ONBOARDING_SEEN_KEY = "nearbuy.onboarding.seen";

const { width: SCREEN_W } = Dimensions.get("window");

type FeatureBullet = {
  icon: keyof typeof Feather.glyphMap;
  labelKey: string;
};

type Slide = {
  key: string;
  titleKey: string;
  descriptionKey: string;
  visual: "logo" | "icon";
  iconName?: keyof typeof Feather.glyphMap;
  gradient: [string, string];
  bullets?: FeatureBullet[];
};

const slides: Slide[] = [
  {
    key: "welcome",
    titleKey: "onboarding.slide1Title",
    descriptionKey: "onboarding.slide1Body",
    visual: "logo",
    gradient: ["#F58220", "#E26A0A"],
  },
  {
    key: "setup",
    titleKey: "onboarding.slide2Title",
    descriptionKey: "onboarding.slide2Body",
    visual: "icon",
    iconName: "shield",
    gradient: ["#1B2A5C", "#3A4F8A"],
    bullets: [
      { icon: "map-pin", labelKey: "onboarding.slide2Bullet1" },
      { icon: "clock", labelKey: "onboarding.slide2Bullet2" },
      { icon: "check-circle", labelKey: "onboarding.slide2Bullet3" },
    ],
  },
  {
    key: "inventory",
    titleKey: "onboarding.slide3Title",
    descriptionKey: "onboarding.slide3Body",
    visual: "icon",
    iconName: "camera",
    gradient: ["#7FB927", "#5C9618"],
    bullets: [
      { icon: "image", labelKey: "onboarding.slide3Bullet1" },
      { icon: "tag", labelKey: "onboarding.slide3Bullet2" },
      { icon: "package", labelKey: "onboarding.slide3Bullet3" },
    ],
  },
  {
    key: "services",
    titleKey: "onboarding.slide4Title",
    descriptionKey: "onboarding.slide4Body",
    visual: "icon",
    iconName: "calendar",
    gradient: ["#F58220", "#C8520A"],
    bullets: [
      { icon: "list", labelKey: "onboarding.slide4Bullet1" },
      { icon: "clock", labelKey: "onboarding.slide4Bullet2" },
      { icon: "check-square", labelKey: "onboarding.slide4Bullet3" },
    ],
  },
  {
    key: "chat",
    titleKey: "onboarding.slide5Title",
    descriptionKey: "onboarding.slide5Body",
    visual: "icon",
    iconName: "message-circle",
    gradient: ["#1B2A5C", "#2E4280"],
    bullets: [
      { icon: "send", labelKey: "onboarding.slide5Bullet1" },
      { icon: "bell", labelKey: "onboarding.slide5Bullet2" },
      { icon: "users", labelKey: "onboarding.slide5Bullet3" },
    ],
  },
  {
    key: "discovery",
    titleKey: "onboarding.slide6Title",
    descriptionKey: "onboarding.slide6Body",
    visual: "icon",
    iconName: "trending-up",
    gradient: ["#7FB927", "#3F8013"],
    bullets: [
      { icon: "map", labelKey: "onboarding.slide6Bullet1" },
      { icon: "star", labelKey: "onboarding.slide6Bullet2" },
      { icon: "award", labelKey: "onboarding.slide6Bullet3" },
    ],
  },
];

type SlideProps = {
  slide: Slide;
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

  const visualStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.7, 1, 0.7],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.3, 1, 0.3],
      Extrapolation.CLAMP,
    );
    const rotate = interpolate(
      scrollX.value,
      inputRange,
      [-15, 0, 15],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ scale }, { rotate: `${rotate}deg` }],
      opacity,
    };
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

  const bulletsStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    const ty = interpolate(
      scrollX.value,
      inputRange,
      [80, 0, 80],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateY: ty }] };
  });

  return (
    <View style={[styles.slide, { width: SCREEN_W }]}>
      <Animated.View style={[styles.visualWrap, visualStyle]}>
        {slide.visual === "logo" ? (
          <Image
            source={require("../assets/images/bizici-pin.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : (
          <LinearGradient
            colors={slide.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <Feather
              name={slide.iconName ?? "circle"}
              size={72}
              color="#ffffff"
            />
          </LinearGradient>
        )}
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
        {t(slide.descriptionKey)}
      </Animated.Text>

      {slide.bullets ? (
        <Animated.View style={[styles.bullets, bulletsStyle]}>
          {slide.bullets.map((b) => (
            <View
              key={b.labelKey}
              style={[
                styles.bulletRow,
                {
                  backgroundColor: colors.muted,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.bulletIcon,
                  { backgroundColor: slide.gradient[0] + "22" },
                ]}
              >
                <Feather name={b.icon} size={18} color={slide.gradient[0]} />
              </View>
              <Text
                style={[styles.bulletText, { color: colors.foreground }]}
                numberOfLines={2}
              >
                {t(b.labelKey)}
              </Text>
            </View>
          ))}
        </Animated.View>
      ) : null}
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
      [8, 24, 8],
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

type ProgressBarProps = {
  scrollX: SharedValue<number>;
  total: number;
  color: string;
  trackColor: string;
};

function ProgressBar({ scrollX, total, color, trackColor }: ProgressBarProps) {
  const style = useAnimatedStyle(() => {
    const max = (total - 1) * SCREEN_W;
    const ratio = max > 0 ? Math.min(1, Math.max(0, scrollX.value / max)) : 0;
    // Always show at least one slide's worth of progress filled.
    const minPct = 1 / total;
    const pct = Math.max(minPct, ratio * (1 - minPct) + minPct);
    return { width: `${pct * 100}%` };
  });
  return (
    <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
      <Animated.View
        style={[styles.progressFill, { backgroundColor: color }, style]}
      />
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const scrollX = useSharedValue(0);

  const finish = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, "1");
    } catch {
      // ignore — worst case it'll show again next launch
    }
    router.replace("/(auth)/sign-in" as Href);
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
        <View style={styles.progressWrap}>
          <ProgressBar
            scrollX={scrollX}
            total={slides.length}
            color={colors.primary}
            trackColor={colors.border}
          />
          <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
            {`${index + 1} / ${slides.length}`}
          </Text>
        </View>
        <Pressable onPress={finish} hitSlop={12}>
          <Text style={[styles.skip, { color: colors.mutedForeground }]}>
            {t("onboarding.skip")}
          </Text>
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
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },
  progressWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "600",
    minWidth: 36,
    textAlign: "right",
  },
  skip: {
    fontSize: 15,
    fontWeight: "600",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  visualWrap: {
    height: 200,
    width: 200,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  logo: {
    height: 200,
    width: 200,
  },
  iconCircle: {
    height: 160,
    width: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1B2A5C",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 340,
    marginBottom: 24,
  },
  bullets: {
    width: "100%",
    maxWidth: 360,
    gap: 10,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  bulletIcon: {
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
