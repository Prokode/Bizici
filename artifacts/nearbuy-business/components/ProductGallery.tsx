import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ZoomablePhoto } from "@/components/ZoomablePhoto";
import { useColors } from "@/hooks/useColors";

/** One product, one swipeable slideshow; tapping opens its full zoom gallery. */
export function ProductGallery({ photos, label, height = 220 }: { photos: string[]; label?: string; height?: number }) {
  const colors = useColors();
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const photoKey = photos.join("\n");
  useEffect(() => { setIndex(0); scroll.current?.scrollTo({ x: 0, animated: false }); }, [photoKey]);
  if (!photos.length) return null;
  return <View onLayout={event => {
    const next = event.nativeEvent.layout.width;
    if (next !== width) { setWidth(next); setIndex(0); scroll.current?.scrollTo({ x: 0, animated: false }); }
  }} style={{ width: "100%", height, overflow: "hidden", borderRadius: 12 }}>
    {width > 0 && <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
      nestedScrollEnabled onMomentumScrollEnd={event => setIndex(Math.max(0, Math.min(photos.length - 1,
        Math.round(event.nativeEvent.contentOffset.x / width))))}>
      {photos.map((uri, i) => <ZoomablePhoto key={`${uri}:${i}`} source={{ uri }} photos={photos}
        accessibilityLabel={label} resizeMode="cover" style={{ width, height }} />)}
    </ScrollView>}
    {photos.length > 1 && <View pointerEvents="none" style={[styles.counter, { backgroundColor: colors.background }]}>
      <Text style={{ color: colors.foreground, fontSize: 12 }}>{index + 1} / {photos.length}</Text>
    </View>}
  </View>;
}
const styles = StyleSheet.create({ counter: { position: "absolute", bottom: 8, right: 8, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 } });
