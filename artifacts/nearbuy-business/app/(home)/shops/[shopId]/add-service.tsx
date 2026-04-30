import React, { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CategoryPicker } from "@/components/CategoryPicker";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import {
  useCreateService,
  getListShopServicesQueryKey,
  type ServiceCreateInputPricingType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PricingTypeSelector } from "@/components/PricingTypeSelector";

export default function AddServiceScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [pricingType, setPricingType] =
    useState<ServiceCreateInputPricingType>("fixed");
  const [priceStr, setPriceStr] = useState("");
  const [durationStr, setDurationStr] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createService = useCreateService();

  const handleSave = () => {
    if (!shopId || !title.trim()) return;
    setError(null);
    const priceCents =
      pricingType !== "quote" && priceStr.trim()
        ? Math.round(parseFloat(priceStr) * 100)
        : null;
    const durationMinutes = durationStr.trim()
      ? Math.max(0, parseInt(durationStr, 10) || 0)
      : null;
    createService.mutate(
      {
        shopId: shopId as string,
        data: {
          title: title.trim(),
          description: description.trim() || null,
          categoryIds,
          pricingType,
          price: priceCents,
          durationMinutes,
          photos: [],
          tags: [],
          isActive,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListShopServicesQueryKey(shopId as string),
          });
          router.back();
        },
        onError: (err: any) => {
          setError(err?.message ?? t("newService.saveError"));
        },
      },
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: t("newService.screenTitle") }} />
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.content}>
        <Input
          label={t("newService.title")}
          placeholder={t("newService.titlePlaceholder")}
          value={title}
          onChangeText={setTitle}
        />
        <Input
          label={t("newService.description")}
          placeholder={t("newService.descriptionPlaceholder")}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Text
          style={[
            styles.sectionLabel,
            {
              color: colors.foreground,
              fontFamily: "PlusJakartaSans_600SemiBold",
            },
          ]}
        >
          {t("newService.categories")}
        </Text>
        <CategoryPicker
          selectedIds={categoryIds}
          onChange={setCategoryIds}
          kind="service"
          label=""
        />

        <Text
          style={[
            styles.sectionLabel,
            {
              color: colors.foreground,
              fontFamily: "PlusJakartaSans_600SemiBold",
              marginTop: 16,
            },
          ]}
        >
          {t("newService.pricingType")}
        </Text>
        <PricingTypeSelector value={pricingType} onChange={setPricingType} />

        {pricingType !== "quote" ? (
          <Input
            label={t("newService.price")}
            placeholder={t("newService.pricePlaceholder")}
            value={priceStr}
            onChangeText={setPriceStr}
            keyboardType="decimal-pad"
          />
        ) : null}

        <Input
          label={t("newService.durationMinutes")}
          placeholder={t("newService.durationPlaceholder")}
          value={durationStr}
          onChangeText={setDurationStr}
          keyboardType="number-pad"
        />

        <View style={styles.toggleRow}>
          <Text
            style={{
              flex: 1,
              color: colors.foreground,
              fontFamily: "PlusJakartaSans_500Medium",
            }}
          >
            {t("newService.isActive")}
          </Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ true: colors.primary }}
          />
        </View>

        {error ? (
          <Text style={{ color: colors.destructive, marginTop: 8 }}>
            {error}
          </Text>
        ) : null}

        <View style={{ flex: 1 }} />

        <Button
          title={t("newService.save")}
          size="lg"
          loading={createService.isPending}
          disabled={!title.trim() || createService.isPending}
          onPress={handleSave}
          style={{ marginTop: 24 }}
        />
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, flexGrow: 1 },
  sectionLabel: { fontSize: 14, marginTop: 16, marginBottom: 8 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
});
