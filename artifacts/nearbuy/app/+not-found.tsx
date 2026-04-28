import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { useColors } from "@/hooks/useColors";

export default function NotFoundScreen() {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: "404" }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {t("notFound.title")}
        </Text>
        <Link href="/" style={[styles.link, { color: colors.primary }]}>
          {t("notFound.goHome")}
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  title: { fontSize: 18, fontWeight: "600", marginBottom: 12 },
  link: { fontSize: 16, paddingVertical: 12 },
});
