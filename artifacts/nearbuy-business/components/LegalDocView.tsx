import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { LegalDoc } from "@workspace/legal-content";
import { useColors } from "@/hooks/useColors";
import { Card } from "@/components/ui/Card";

export function LegalDocView({
  doc,
  testIdPrefix,
}: {
  doc: LegalDoc;
  testIdPrefix: string;
}) {
  const colors = useColors();
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: doc.title,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              style={{ paddingHorizontal: 8 }}
              accessibilityRole="button"
            >
              <Feather name="arrow-left" size={22} color={colors.foreground} />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        testID={`${testIdPrefix}-scroll`}
      >
        <Text
          style={[
            styles.title,
            { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" },
          ]}
          testID={`${testIdPrefix}-title`}
        >
          {doc.title}
        </Text>
        <Text
          style={[styles.lastUpdated, { color: colors.mutedForeground }]}
        >
          {t("legal.lastUpdated")}: {doc.lastUpdated}
        </Text>

        <Text
          style={[
            styles.intro,
            { color: colors.foreground, fontFamily: "PlusJakartaSans_400Regular" },
          ]}
        >
          {doc.intro}
        </Text>

        <View style={{ marginTop: 16 }}>
          {doc.sections.map((section, idx) => (
            <View key={idx} style={styles.section}>
              <Text
                style={[
                  styles.heading,
                  {
                    color: colors.primary,
                    fontFamily: "PlusJakartaSans_600SemiBold",
                  },
                ]}
              >
                {section.heading}
              </Text>
              {section.paragraphs.map((p, pIdx) => (
                <Text
                  key={pIdx}
                  style={[
                    styles.paragraph,
                    {
                      color: colors.foreground,
                      fontFamily: "PlusJakartaSans_400Regular",
                    },
                  ]}
                >
                  {p}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <Card style={styles.contactCard}>
          <Text
            style={[
              styles.contactTitle,
              { color: colors.foreground, fontFamily: "PlusJakartaSans_600SemiBold" },
            ]}
          >
            {t("legal.contactTitle")}
          </Text>
          <Text
            style={[
              styles.contactBody,
              {
                color: colors.mutedForeground,
                fontFamily: "PlusJakartaSans_400Regular",
              },
            ]}
          >
            {t("legal.contactBody")} privacy@bizici.fr
          </Text>
        </Card>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 24, marginBottom: 4 },
  lastUpdated: { fontSize: 12, marginBottom: 16 },
  intro: { fontSize: 15, lineHeight: 22 },
  section: { marginTop: 24 },
  heading: { fontSize: 17, marginBottom: 8 },
  paragraph: { fontSize: 14, lineHeight: 21, marginBottom: 8 },
  contactCard: { padding: 16, marginTop: 32 },
  contactTitle: { fontSize: 15, marginBottom: 6 },
  contactBody: { fontSize: 13, lineHeight: 19 },
});
