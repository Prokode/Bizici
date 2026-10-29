import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { ZoomablePhoto } from "@/components/ZoomablePhoto";
import { Button } from "@/components/ui/Button";

export function ServicePhotoEditor({ photos, onChange, disabled }: {
  photos: string[]; onChange: (photos: string[]) => void; disabled: boolean;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const [error, setError] = useState(false);
  const [picking, setPicking] = useState(false);
  const add = async () => {
    setPicking(true);
    setError(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], allowsMultipleSelection: true,
        selectionLimit: 20 - photos.length, quality: 0.85,
      });
      if (!result.canceled) {
        onChange([...new Set([...photos, ...result.assets.map((asset) => asset.uri)])].slice(0, 20));
      }
    } catch {
      setError(true);
    } finally {
      setPicking(false);
    }
  };
  return <View style={{ marginTop: 20, gap: 10 }}>
    <Text style={{ color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" }}>
      {t("serviceGallery.title")} ({photos.length}/20)
    </Text>
    <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{t("serviceGallery.hint")}</Text>
    {photos.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {photos.map((uri, index) => <View key={uri} style={{ marginRight: 12 }}>
        <ZoomablePhoto source={{ uri }} photos={photos} style={{ width: 112, height: 112, borderRadius: colors.radius }} />
        <Pressable accessibilityRole="button" accessibilityLabel={t("serviceGallery.remove", { index: index + 1 })}
          disabled={disabled || picking} onPress={() => onChange(photos.filter((photo) => photo !== uri))}
          testID={`remove-service-photo-${index}`}
          style={{ position: "absolute", top: 4, right: 4, padding: 8, borderRadius: 20, backgroundColor: colors.background }}>
          <Feather name="x" size={16} color={colors.destructive} />
        </Pressable>
      </View>)}
    </ScrollView>}
    <Button title={t("serviceGallery.add")} variant="outline" onPress={add}
      disabled={disabled || picking || photos.length >= 20} loading={picking} />
    {error && <Text style={{ color: colors.destructive }}>{t("serviceGallery.pickError")}</Text>}
  </View>;
}
