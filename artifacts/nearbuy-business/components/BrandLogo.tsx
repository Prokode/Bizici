import { Image, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

export function BrandLogo({ size = 20 }: { size?: number }) {
  const colors = useColors();
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="iciBiz"
      style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
    >
      <Image
        source={require("../assets/images/icibiz-mark.png")}
        style={{ width: size, height: size * 1.22 }}
        resizeMode="contain"
      />
      <Text style={{ fontFamily: "PlusJakartaSans_700Bold", fontSize: size, color: colors.brandGreen }}>
        ici<Text style={{ color: colors.primary }}>Biz</Text>
      </Text>
    </View>
  );
}
