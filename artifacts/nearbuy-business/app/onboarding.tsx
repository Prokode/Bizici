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
};

const slides: Slide[] = [
  {
    key: "welcome",
    titleKey: "onboarding.slide1Title",
    descriptionKey: "onboarding.slide1Body",
    visual: "logo",
  },
  {
    key: "inventory",
    titleKey: "onboarding.slide2Title",
    descriptionKey: "onboarding.slide2Body",
    visual: "icon",
    iconName: "package",
  },
  {
    key: "nearby",
    titleKey: "onboarding.slide3Title",
    descriptionKey: "onboarding.slide3Body",
    visual: "icon",
    iconName: "map-pin",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const finish = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, "1");
    } catch {
      // ignore — worst case it'll show again next launch
    }
    router.replace("/(auth)/sign-in" as Href);
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
            <View style={styles.visualWrap}>
              {item.visual === "logo" ? (
                <Image
                  source={require("../assets/images/icon.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              ) : (
                <LinearGradient
                  colors={["#FF6B35", "#FF3D7F"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconCircle}
                >
                  <Feather
                    name={item.iconName ?? "circle"}
                    size={80}
                    color="#ffffff"
                  />
                </LinearGradient>
              )}
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {t(item.titleKey)}
            </Text>
            <Text
              style={[styles.description, { color: colors.mutedForeground }]}
            >
              {t(item.descriptionKey)}
            </Text>
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
                  width: i === index ? 24 : 8,
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
