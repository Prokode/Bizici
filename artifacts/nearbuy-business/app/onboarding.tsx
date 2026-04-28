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

type Slide = {
  key: string;
  titleKey: string;
  descriptionKey: string;
  visual: "logo" | "icon";
  iconName?: keyof typeof Feather.glyphMap;
  gradient: [string, string];
};

const slides: Slide[] = [
  {
    key: "welcome",
    titleKey: "onboarding.slide1Title",
    descriptionKey: "onboarding.slide1Body",
    visual: "logo",
    gradient: ["#FF6B35", "#FF3D7F"],
  },
  {
    key: "inventory",
    titleKey: "onboarding.slide2Title",
    descriptionKey: "onboarding.slide2Body",
    visual: "icon",
    iconName: "package",
    gradient: ["#FF8A3D", "#FF5E62"],
  },
  {
    key: "nearby",
    titleKey: "onboarding.slide3Title",
    descriptionKey: "onboarding.slide3Body",
    visual: "icon",
    iconName: "map-pin",
    gradient: ["#F97316", "#EAB308"],
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
      <Animated.View style={[styles.visualWrap, visualStyle]}>
        {slide.visual === "logo" ? (
          <Image
            source={require("../assets/images/icon.png")}
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
              size={80}
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
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  skip: {
    fontSize: 15,
    fontWeight: "600",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  visualWrap: {
    height: 240,
    width: 240,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
  },
  logo: {
    height: 220,
    width: 220,
  },
  iconCircle: {
    height: 180,
    width: 180,
    borderRadius: 90,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF3D7F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 320,
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
