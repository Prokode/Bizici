import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, type ImageProps } from "react-native";
import { useTranslation } from "react-i18next";
import { PhotoViewer } from "@/components/PhotoViewer";
import { galleryPhotos } from "@/lib/photoGallery";

/** Image-compatible thumbnail; opening it never triggers the surrounding card. */
export function ZoomablePhoto({ photos, loadPhotos, style, accessibilityLabel, ...props }: ImageProps & {
  photos?: string[]; loadPhotos?: (signal: AbortSignal) => Promise<string[]>;
}) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadedPhotos, setLoadedPhotos] = useState<string[] | null>(null);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);
  const source = props.source;
  const uri = source && !Array.isArray(source) && typeof source === "object" && "uri" in source ? source.uri : undefined;
  if (!uri) return <Image {...props} accessibilityLabel={accessibilityLabel} style={style} />;
  const gallery = galleryPhotos(loadedPhotos ?? photos, uri);
  const label = accessibilityLabel || t("photoViewer.photo");
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={t("photoViewer.open")}
      accessibilityState={{ busy: loading }} disabled={loading}
      accessibilityHint={label} style={style} onPress={async event => {
        event.stopPropagation();
        if (!loadPhotos) { setVisible(true); return; }
        const controller = new AbortController();
        request.current = controller;
        const timeout = setTimeout(() => controller.abort(), 15_000);
        setLoading(true);
        try {
          const result = await loadPhotos(controller.signal);
          if (controller.signal.aborted) throw new Error("Photo request cancelled");
          setLoadedPhotos(result);
          setVisible(true);
        } catch {
          if (!mounted.current) return;
          const message = t("photoViewer.loadError");
          if (Platform.OS === "web" && typeof window !== "undefined") window.alert(message);
          else Alert.alert(message);
        } finally {
          clearTimeout(timeout);
          if (mounted.current) setLoading(false);
        }
      }}>
      <Image {...props} accessibilityLabel={label}
        style={[StyleSheet.absoluteFillObject, { borderRadius: StyleSheet.flatten(style)?.borderRadius }]} />
      {loading && <ActivityIndicator pointerEvents="none" style={StyleSheet.absoluteFillObject} />}
    </Pressable>
    {visible && <PhotoViewer photos={gallery} initialIndex={Math.max(0, gallery.indexOf(uri))}
      label={label} onClose={() => setVisible(false)} />}
  </>;
}
