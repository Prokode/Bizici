import React, { useCallback, useEffect, useRef, useState } from "react";
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
  getGetShopQueryOptions,
  type ServiceUpdateInputPricingType,
  type ServiceLocationOverride,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PricingTypeSelector } from "@/components/PricingTypeSelector";
import { ServiceLocationOverrideSelector } from "@/components/ServiceLocationSelector";
import { useShopId } from "@/hooks/useShopId";
import { ServiceAccessGate } from "@/components/ServiceAccessGate";
import { ServicePricingOptionsEditor } from "@/components/ServicePricingOptionsEditor";
import type { ServicePricingOption } from "@/lib/servicePricingOptions";
import { ServicePhotoEditor } from "@/components/ServicePhotoEditor";
import { prepareProductPhotos } from "@/lib/productPhotoPreparation";
import { uploadProductPhoto } from "@/lib/uploadProductPhoto";
import { serviceFormValues, serviceSaveError } from "@/lib/serviceFormValues";

export default function EditServiceScreen() {
  return <ServiceAccessGate><EditServiceContent /></ServiceAccessGate>;
}

function EditServiceContent() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const shopId = useShopId();
  const { data: shop } = useQuery({ ...getGetShopQueryOptions(shopId ?? ""), enabled: !!shopId });
  const { serviceId } = useLocalSearchParams<{
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
  const [serviceLocation, setServiceLocation] =
    useState<ServiceLocationOverride>("inherit");
  const [error, setError] = useState<string | null>(null);
  const [pricingOptions, setPricingOptions] = useState<ServicePricingOption[]>([]);
  const [pricingOptionsErrorKey, setPricingOptionsErrorKey] = useState<string | null>(null);
  const [multiPricingEnabled, setMultiPricingEnabled] = useState(false);
  const initializedServiceId = useRef<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const uploadedPhotos = useRef(new Map<string, string>());

  useEffect(() => {
    if (existing && initializedServiceId.current !== serviceId) {
      initializedServiceId.current = serviceId ?? null;
      setTitle(existing.title);
      setDescription(existing.description ?? "");
      setCategoryIds(existing.categories?.map((c) => c.id) ?? []);
      setPricingType(existing.pricingType);
      setPriceStr(
        existing.price != null
          ? existing.pricingOptions?.length ? String(existing.price) : (existing.price / 100).toFixed(2)
          : "",
      );
      setDurationStr(
        existing.durationMinutes != null ? String(existing.durationMinutes) : "",
      );
      setIsActive(existing.isActive);
      setPhotos(existing.photos ?? []);
      setServiceLocation(existing.serviceLocation ?? "inherit");
      const options = existing.pricingOptions ?? [];
      setPricingOptions(options);
      setMultiPricingEnabled(options.length > 0);
    }
  }, [existing, serviceId]);

  const handlePricingOptionsChange = useCallback((options: ServicePricingOption[]) => {
    setPricingOptions(options);
  }, []);
  const handlePricingOptionsValidation = useCallback((errorKey: string | null) => {
    setPricingOptionsErrorKey(errorKey);
  }, []);
  const handlePricingOptionsEnabled = useCallback((enabled: boolean) => {
    setMultiPricingEnabled(enabled);
  }, []);

  const updateService = useUpdateService();
  const deleteService = useDeleteService();

  const handleSave = async () => {
    if (!shopId || !serviceId || !title.trim() || saveLock.current) return;
    if (pricingType === "fixed" && multiPricingEnabled &&
      (pricingOptionsErrorKey || pricingOptions.length === 0)) {
      setError(t(pricingOptionsErrorKey ?? "newService.pricingOptionRequired"));
      return;
    }
    setError(null);
    const usePricingOptions = pricingType === "fixed" && multiPricingEnabled;
    let values;
    try {
      values = serviceFormValues(priceStr, usePricingOptions ? "" : durationStr, !usePricingOptions && pricingType !== "quote");
    } catch (err) {
      setError(t(`serviceGallery.${(err as Error).message}`));
      return;
    }
    saveLock.current = true;
    setSaving(true);
    try {
      let resolvedPhotos: string[];
      try {
        resolvedPhotos = await prepareProductPhotos(photos, (uri) => uploadProductPhoto(shopId, uri), uploadedPhotos.current);
      } catch {
        setError(t("serviceGallery.uploadError"));
        return;
      }
      await updateService.mutateAsync(
      {
        shopId: shopId as string,
        id: serviceId as string,
        data: {
          title: title.trim(),
          description: description.trim() || null,
          categoryIds,
          pricingType,
          ...values,
          photos: resolvedPhotos,
          pricingOptions: pricingType === "fixed" ? pricingOptions : [],
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
      },
    );
    } catch (err) {
      setError(serviceSaveError(err, t("newService.saveError")));
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
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
          key={serviceId}
          initialOptions={existing.pricingOptions}
          currencyCode={shop?.currency?.code}
          hidden={pricingType !== "fixed"}
          onOptionsChange={handlePricingOptionsChange}
          onValidationChange={handlePricingOptionsValidation}
          onEnabledChange={handlePricingOptionsEnabled}
        />

        {pricingType !== "quote" && !(pricingType === "fixed" && multiPricingEnabled) ? (
          <Input
            label={`${t("newService.price")}${shop?.currency?.code ? ` (${shop.currency.code})` : ""}`}
            value={priceStr}
            onChangeText={setPriceStr}
            keyboardType="decimal-pad"
          />
        ) : null}

        {pricingType === "fixed" && multiPricingEnabled ? null : <Input
          label={t("newService.durationMinutes")}
          value={durationStr}
          onChangeText={setDurationStr}
          keyboardType="number-pad"
        />}

        <ServicePhotoEditor photos={photos} onChange={setPhotos} disabled={saving} />

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

        <Button
          title={t(saving ? "serviceGallery.saving" : "newService.save")}
          size="lg"
          loading={saving}
          disabled={!title.trim() || saving || deleteService.isPending}
          onPress={handleSave}
          style={{ marginTop: 24 }}
        />
        <Button
          title={t("editService.delete")}
          variant="ghost"
          loading={deleteService.isPending}
          disabled={saving}
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
