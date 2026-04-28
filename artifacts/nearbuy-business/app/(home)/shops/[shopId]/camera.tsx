import React, { useRef } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";

export default function CameraScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { shopId } = useLocalSearchParams<{ shopId: string }>();

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: "#000" }} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
        <Feather name="camera" size={64} color={colors.mutedForeground} style={{ marginBottom: 24 }} />
        <Text style={[styles.permissionTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
          {t("camera.permTitle")}
        </Text>
        <Text style={[styles.permissionDesc, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
          {t("camera.permDesc")}
        </Text>
        <Button title={t("camera.grant")} onPress={requestPermission} />
        <Button title={t("common.cancel")} variant="ghost" onPress={() => router.back()} style={{ marginTop: 12 }} />
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      if (photo) {
        router.replace({
          pathname: `/(home)/shops/${shopId}/add-product`,
          params: { photoUri: photo.uri, base64: photo.base64 },
        });
      }
    }
  };

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} facing="back">
        <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Feather name="x" size={28} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.shutterBtn} onPress={takePicture}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: "space-between" },
  header: { paddingHorizontal: 16, paddingTop: 16, alignItems: "flex-start" },
  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  footer: { alignItems: "center", paddingBottom: 32 },
  shutterBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center" },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff" },
  permissionContainer: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  permissionTitle: { fontSize: 24, marginBottom: 12, textAlign: "center" },
  permissionDesc: { fontSize: 16, textAlign: "center", marginBottom: 32, lineHeight: 24 },
});
