import React, { useCallback, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { useShopId } from "@/hooks/useShopId";
import { ServiceAccessGate } from "@/components/ServiceAccessGate";
import { useTranslation } from "react-i18next";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CategoryPicker } from "@/components/CategoryPicker";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import {
  useCreateService,
  getListShopServicesQueryKey,
  getGetShopQueryOptions,
  type ServiceCreateInputPricingType,
  type ServiceLocationOverride,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PricingTypeSelector } from "@/components/PricingTypeSelector";
import { ServiceLocationOverrideSelector } from "@/components/ServiceLocationSelector";
import { ServicePricingOptionsEditor } from "@/components/ServicePricingOptionsEditor";
import type { ServicePricingOption } from "@/lib/servicePricingOptions";

export default function AddServiceScreen() {
  return <ServiceAccessGate><AddServiceContent /></ServiceAccessGate>;
}

function AddServiceContent() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const shopId = useShopId();
  const { data: shop } = useQuery({ ...getGetShopQueryOptions(shopId ?? ""), enabled: !!shopId });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [pricingType, setPricingType] =
    useState<ServiceCreateInputPricingType>("fixed");
  const [priceStr, setPriceStr] = useState("");
  const [durationStr, setDurationStr] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [serviceLocation, setServiceLocation] =
    useState<ServiceLocationOverride>("inherit");
  const [error, setError] = useState<string | null>(null);
  const [pricingOptions, setPricingOptions] = useState<ServicePricingOption[]>([]);
  const [pricingOptionsErrorKey, setPricingOptionsErrorKey] = useState<string | null>(null);
  const [multiPricingEnabled, setMultiPricingEnabled] = useState(false);

  const createService = useCreateService();
  const handlePricingOptionsChange = useCallback((options: ServicePricingOption[]) => {
    setPricingOptions(options);
  }, []);
  const handlePricingOptionsValidation = useCallback((errorKey: string | null) => {
    setPricingOptionsErrorKey(errorKey);
  }, []);
  const handlePricingOptionsEnabled = useCallback((enabled: boolean) => {
    setMultiPricingEnabled(enabled);
  }, []);

  const handleSave = () => {
    if (!shopId || !title.trim()) return;
    if (pricingType === "fixed" && (pricingOptionsErrorKey || (multiPricingEnabled && !pricingOptions.length))) {
      setError(t(pricingOptionsErrorKey ?? "newService.pricingOptionRequired"));
      return;
    }
    setError(null);
    const usePricingOptions = pricingType === "fixed" && pricingOptions.length > 0;
    const priceCents =
      !usePricingOptions && pricingType !== "quote" && priceStr.trim()
        ? Math.round(parseFloat(priceStr) * 100)
        : null;
    const durationMinutes = !usePricingOptions && durationStr.trim()
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
          pricingOptions: pricingType === "fixed" ? pricingOptions : [],
          photos: [],
          tags: [],
          isActive,
          serviceLocation,
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
          serviceShopId={shopId ?? undefined}
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

        <ServicePricingOptionsEditor
          hidden={pricingType !== "fixed"}
          currencyCode={shop?.currency?.code}
          onOptionsChange={handlePricingOptionsChange}
          onValidationChange={handlePricingOptionsValidation}
          onEnabledChange={handlePricingOptionsEnabled}
        />

        {pricingType !== "quote" && !(pricingType === "fixed" && multiPricingEnabled) ? (
          <Input
            label={`${t("newService.price")}${shop?.currency?.code ? ` (${shop.currency.code})` : ""}`}
            placeholder={t("newService.pricePlaceholder")}
            value={priceStr}
            onChangeText={setPriceStr}
            keyboardType="decimal-pad"
          />
        ) : null}

        {multiPricingEnabled && pricingType === "fixed" ? null : <Input
          label={t("newService.durationMinutes")}
          placeholder={t("newService.durationPlaceholder")}
          value={durationStr}
          onChangeText={setDurationStr}
          keyboardType="number-pad"
        />}

        <ServiceLocationOverrideSelector
          value={serviceLocation}
          onChange={setServiceLocation}
          hint={t("serviceLocation.serviceHint")}
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
