import React, { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, Switch, Text, View } from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CategoryPicker } from "@/components/CategoryPicker";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import {
  useUpdateService,
  useDeleteService,
  getListShopServicesQueryOptions,
  getListShopServicesQueryKey,
  type Service,
  type ServiceUpdateInputPricingType,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PricingTypeSelector } from "@/components/PricingTypeSelector";

export default function EditServiceScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { shopId, serviceId } = useLocalSearchParams<{
    shopId: string;
    serviceId: string;
  }>();

  // We piggy-back on the cached list rather than calling getService individually
  // — the list is already fetched on the services tab and contains everything
  // the form needs.
  const { data: services } = useQuery({
    ...getListShopServicesQueryOptions(shopId as string),
    enabled: !!shopId,
  });
  const existing = services?.find((s) => s.id === serviceId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [pricingType, setPricingType] =
    useState<ServiceUpdateInputPricingType>("fixed");
  const [priceStr, setPriceStr] = useState("");
  const [durationStr, setDurationStr] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description ?? "");
      setCategoryIds(existing.categories?.map((c) => c.id) ?? []);
      setPricingType(existing.pricingType);
      setPriceStr(
        existing.price != null ? (existing.price / 100).toFixed(2) : "",
      );
      setDurationStr(
        existing.durationMinutes != null ? String(existing.durationMinutes) : "",
      );
      setIsActive(existing.isActive);
    }
  }, [existing]);

  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const handleSave = () => {
    if (!shopId || !serviceId || !title.trim()) return;
    setError(null);
    const priceCents =
      pricingType !== "quote" && priceStr.trim()
        ? Math.round(parseFloat(priceStr) * 100)
        : null;
    const durationMinutes = durationStr.trim()
      ? Math.max(0, parseInt(durationStr, 10) || 0)
      : null;
    updateService.mutate(
      {
        shopId: shopId as string,
        id: serviceId as string,
        data: {
          title: title.trim(),
          description: description.trim() || null,
          categoryIds,
          pricingType,
          price: priceCents,
          durationMinutes,
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

  const performDelete = () => {
    if (!shopId || !serviceId) return;
    deleteService.mutate(
      { shopId: shopId as string, id: serviceId as string },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListShopServicesQueryKey(shopId as string),
          });
          router.back();
        },
      },
    );
  };

  const handleDelete = () => {
    if (Platform.OS === "web") {
      // RN-Web has no native Alert.alert; fall back to confirm so the action
      // is still gated by an explicit confirmation step.
      // eslint-disable-next-line no-alert
      if (window.confirm(t("editService.deleteConfirm"))) performDelete();
      return;
    }
    Alert.alert(t("editService.deleteConfirm"), undefined, [
      { text: t("editService.deleteConfirmNo"), style: "cancel" },
      {
        text: t("editService.deleteConfirmYes"),
        style: "destructive",
        onPress: performDelete,
      },
    ]);
  };

  if (!existing) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: t("editService.screenTitle") }} />
      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.content}>
        <Input
          label={t("newService.title")}
          value={title}
          onChangeText={setTitle}
        />
        <Input
          label={t("newService.description")}
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
            value={priceStr}
            onChangeText={setPriceStr}
            keyboardType="decimal-pad"
          />
        ) : null}

        <Input
          label={t("newService.durationMinutes")}
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

        <Button
          title={t("newService.save")}
          size="lg"
          loading={updateService.isPending}
          disabled={!title.trim() || updateService.isPending}
          onPress={handleSave}
          style={{ marginTop: 24 }}
        />
        <Button
          title={t("editService.delete")}
          variant="ghost"
          loading={deleteService.isPending}
          onPress={handleDelete}
          style={{ marginTop: 8 }}
          textStyle={{ color: colors.destructive }}
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
