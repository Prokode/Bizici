import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { gallerySwipeDirection } from "@/lib/photoGallery";

type Props = { photos: string[]; initialIndex: number; label: string; onClose: () => void };
const clamp = (value: number, min: number, max: number) => {
  "worklet";
  return Math.min(max, Math.max(min, value));
};

function ZoomImage({ uri, label, canPrevious, canNext, onSwipe }: {
  uri: string; label: string; canPrevious: boolean; canNext: boolean; onSwipe: (direction: number) => void;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const x = useSharedValue(0), y = useSharedValue(0);
  const startX = useSharedValue(0), startY = useSharedValue(0);
  const width = useSharedValue(0), height = useSharedValue(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const changeZoom = (value: number) => {
    const next = clamp(value, 1, 5);
    scale.value = withTiming(next);
    x.value = withTiming(0);
    y.value = withTiming(0);
    setZoom(next);
  };
  const pinch = Gesture.Pinch()
    .onBegin(() => { startScale.value = scale.value; })
    .onUpdate(event => {
      scale.value = clamp(startScale.value * event.scale, 1, 5);
      x.value = clamp(x.value, -width.value * (scale.value - 1) / 2, width.value * (scale.value - 1) / 2);
      y.value = clamp(y.value, -height.value * (scale.value - 1) / 2, height.value * (scale.value - 1) / 2);
    })
    .onFinalize(() => { runOnJS(setZoom)(scale.value); });
  const pan = Gesture.Pan().minDistance(8)
    .onBegin(() => { startX.value = x.value; startY.value = y.value; })
    .onUpdate(event => {
      if (scale.value <= 1.01) {
        const allowed = event.translationX < 0 ? canNext : canPrevious;
        x.value = allowed ? event.translationX : event.translationX / 4;
        y.value = 0;
        return;
      }
      x.value = clamp(startX.value + event.translationX, -width.value * (scale.value - 1) / 2, width.value * (scale.value - 1) / 2);
      y.value = clamp(startY.value + event.translationY, -height.value * (scale.value - 1) / 2, height.value * (scale.value - 1) / 2);
    })
    .onEnd(event => {
      if (scale.value > 1.01) return;
      const direction = gallerySwipeDirection(event.translationX, event.translationY, scale.value, canPrevious, canNext);
      if (direction) {
        x.value = withTiming(direction * -width.value, { duration: 150 }, finished => {
          if (finished) runOnJS(onSwipe)(direction);
        });
      } else x.value = withTiming(0);
    });
  const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd((_event, success) => {
    if (!success) return;
    const next = scale.value > 1 ? 1 : 2;
    scale.value = withTiming(next);
    x.value = withTiming(0);
    y.value = withTiming(0);
    runOnJS(setZoom)(next);
  });
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));
  return <>
    <View style={styles.stage} onLayout={event => {
      width.value = event.nativeEvent.layout.width;
      height.value = event.nativeEvent.layout.height;
      x.value = 0; y.value = 0;
    }}>
      <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)} touchAction="none">
        <Animated.View style={[styles.imageFrame, animatedStyle]}>
          <Image key={attempt} source={{ uri }} resizeMode="contain" style={StyleSheet.absoluteFillObject}
            accessibilityLabel={label}
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setFailed(true); }} />
        </Animated.View>
      </GestureDetector>
      {loading && <ActivityIndicator pointerEvents="none" style={StyleSheet.absoluteFillObject} color={colors.primary} />}
      {failed && <View style={[styles.failure, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, textAlign: "center" }}>{t("photoViewer.loadError")}</Text>
        <Pressable accessibilityRole="button" onPress={() => {
          setFailed(false); setLoading(true); setAttempt(value => value + 1);
        }} style={styles.control}><Text style={{ color: colors.primary }}>{t("common.retry")}</Text></Pressable>
      </View>}
    </View>
    <View style={styles.controls}>
      <ViewerControl icon="minus" label={t("photoViewer.zoomOut")} disabled={zoom <= 1} onPress={() => changeZoom(zoom - 0.5)} />
      <ViewerControl icon="maximize" label={t("photoViewer.reset")} onPress={() => changeZoom(1)} />
      <ViewerControl icon="plus" label={t("photoViewer.zoomIn")} disabled={zoom >= 5} onPress={() => changeZoom(zoom + 0.5)} />
    </View>
  </>;
}

function ViewerControl({ icon, label, onPress, disabled = false }: {
  icon: React.ComponentProps<typeof Feather>["name"]; label: string; onPress: () => void; disabled?: boolean;
}) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
    disabled={disabled} onPress={event => { event.stopPropagation(); onPress(); }}
    style={[styles.control, { opacity: disabled ? 0.35 : 1 }]}>
    <Feather name={icon} size={24} color={colors.foreground} />
  </Pressable>;
}

export function PhotoViewer({ photos, initialIndex, label, onClose }: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(() => clamp(initialIndex, 0, photos.length - 1));
  useEffect(() => {
    setIndex(value => clamp(value, 0, photos.length - 1));
  }, [photos.length]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose(); }
      if (event.key === "ArrowLeft") setIndex(value => Math.max(0, value - 1));
      if (event.key === "ArrowRight") setIndex(value => Math.min(photos.length - 1, value + 1));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, photos.length]);
  return <Modal visible animationType="fade" presentationStyle="fullScreen" statusBarTranslucent
    navigationBarTranslucent onRequestClose={onClose}>
    <GestureHandlerRootView style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View accessibilityViewIsModal style={styles.root}>
        <View style={styles.header}>
          <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>{label}</Text>
          <ViewerControl icon="x" label={t("common.close")} onPress={onClose} />
        </View>
        <ZoomImage key={`${index}:${photos[index]}`} uri={photos[index]} label={label}
          canPrevious={index > 0} canNext={index < photos.length - 1}
          onSwipe={direction => setIndex(value => clamp(value + direction, 0, photos.length - 1))} />
        <Text style={[styles.hint, { color: colors.mutedForeground }]}>{t("photoViewer.hint")}</Text>
        {photos.length > 1 && <View style={styles.controls}>
          <ViewerControl icon="chevron-left" label={t("photoViewer.previous")} disabled={index === 0} onPress={() => setIndex(value => value - 1)} />
          <Text accessibilityLiveRegion="polite" style={{ color: colors.foreground }}>{t("photoViewer.count", { current: index + 1, total: photos.length })}</Text>
          <ViewerControl icon="chevron-right" label={t("photoViewer.next")} disabled={index === photos.length - 1} onPress={() => setIndex(value => value + 1)} />
        </View>}
      </View>
    </GestureHandlerRootView>
  </Modal>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, minHeight: 56 },
  title: { flex: 1, fontFamily: "PlusJakartaSans_600SemiBold", fontSize: 16 },
  stage: { flex: 1, overflow: "hidden" },
  imageFrame: { flex: 1 },
  control: { minWidth: 48, minHeight: 48, padding: 12, alignItems: "center", justifyContent: "center" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20 },
  hint: { textAlign: "center", fontSize: 12, paddingHorizontal: 16, paddingBottom: 12 },
  failure: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", padding: 24 },
});
