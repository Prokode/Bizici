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
    gradient: ["#FF6B35", "#FF3D7F"],
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
];

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const listRef = useRef<FlatList<SlideDef>>(null);
  const [index, setIndex] = useState(0);

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
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
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
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_W }]}>
            <LinearGradient
              colors={item.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              {item.visual === "logo" ? (
                <Image
                  source={require("../assets/images/icon.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.iconHalo}>
                  <Feather
                    name={item.iconName ?? "circle"}
                    size={88}
                    color="#ffffff"
                  />
                </View>
              )}
              <View style={styles.heroOrbA} />
              <View style={styles.heroOrbB} />
            </LinearGradient>

            <View style={styles.copy}>
              <View
                style={[
                  styles.chip,
                  { backgroundColor: colors.accent, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[styles.chipText, { color: colors.accentForeground }]}
                >
                  {t(item.chipKey)}
                </Text>
              </View>
              <Text style={[styles.title, { color: colors.foreground }]}>
                {t(item.titleKey)}
              </Text>
              <Text
                style={[
                  styles.description,
                  { color: colors.mutedForeground },
                ]}
              >
                {t(item.bodyKey)}
              </Text>
            </View>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.dots}>
          {slides.map((s, i) => (
            <View
              key={s.key}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === index ? colors.primary : colors.border,
                  width: i === index ? 28 : 8,
                },
              ]}
            />
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
    height: 240,
    width: 240,
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
