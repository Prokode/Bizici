import React, { useEffect, useState } from "react";
import { Image, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { resolveBrandPhotoUrl } from "@/lib/brandPhoto";

export function BrandPhoto({ uri, name, size = 64, style }: {
  uri?: string | null; name: string; size?: number; style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  const url = resolveBrandPhotoUrl(uri, process.env.EXPO_PUBLIC_DOMAIN);
  useEffect(() => setFailed(false), [url]);
  return (
    <View style={[{
      width: size, height: size, borderRadius: colors.radius, overflow: "hidden",
      backgroundColor: colors.muted, alignItems: "center", justifyContent: "center",
    }, style]}>
      {url && !failed ? (
        <Image
          source={{ uri: url }}
          accessibilityLabel={t("shopBrandPhoto.alt", { name })}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={{ color: colors.primary, fontFamily: "PlusJakartaSans_700Bold", fontSize: Math.min(size * 0.45, 56) }}>
          {(typeof name === "string" ? name.trim().charAt(0).toUpperCase() : "") || "?"}
        </Text>
      )}
    </View>
  );
}
