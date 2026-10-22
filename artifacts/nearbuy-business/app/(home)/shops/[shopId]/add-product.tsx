import React, { useState, useEffect, useRef } from "react";
import { Alert, StyleSheet, Text, View, Platform, TouchableOpacity, ScrollView } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useShopId } from "@/hooks/useShopId";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams, Stack } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  useCreateProduct,
  useUpdateProduct,
  getListProductsQueryOptions,
  type Product,
  useAnalyzeProductPhoto,
  getListProductsQueryKey,
  getGetShopQueryOptions,
  getGetShopSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { CategoryPicker } from "@/components/CategoryPicker";
import { useTranslation } from "react-i18next";
import { prepareProductPhotos } from "@/lib/productPhotoPreparation";
import { ZoomablePhoto } from "@/components/ZoomablePhoto";
import { uploadProductPhoto } from "@/lib/uploadProductPhoto";
import { optionValues, optionDraft } from "@/lib/optionValues";

export default function AddProductScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ shopId: string; photoUri?: string; base64?: string; productId?: string }>();
  const shopId = useShopId();
  const productId = typeof params.productId === "string" && params.productId ? params.productId : null;
  const isEdit = !!productId;
  const productsQuery = useQuery({
    ...getListProductsQueryOptions(shopId as string),
    enabled: !!shopId && isEdit,
  });
  const editingProduct: Product | undefined = isEdit
    ? productsQuery.data?.find((p) => p.id === productId)
    : undefined;
  const { data: shop } = useQuery({
    ...getGetShopQueryOptions(shopId as string),
    enabled: !!shopId,
  });

  const [mode, setMode] = useState<"choose" | "form">(isEdit ? "form" : "choose");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [quantityStr, setQuantityStr] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [colorsList, setColorsList] = useState<string[]>([]);
  const [colorInput, setColorInput] = useState("");
  const [sizesList, setSizesList] = useState<string[]>([]);
  const [sizeInput, setSizeInput] = useState("");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const saveLock = useRef(false);
  const uploadedPhotos = useRef(new Map<string, string>());

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const analyzePhoto = useAnalyzeProductPhoto();
  const isSaving = isUploading || createProduct.isPending || updateProduct.isPending;

  const initializedForId = useRef<string | null>(null);
  useEffect(() => {
    if (!editingProduct || initializedForId.current === editingProduct.id) return;
    initializedForId.current = editingProduct.id;
    const p = editingProduct;
    setName(p.name ?? "");
    setBrand(p.brand ?? "");
    setDescription(p.description ?? "");
    setCategory(p.category ?? "");
    setPriceStr(p.price != null ? (p.price / 100).toFixed(2) : "");
    setQuantityStr(p.quantity != null ? String(p.quantity) : "");
    setTags(p.tags ?? []);
    setColorsList(optionValues(p.colors ?? []));
    setSizesList(optionValues(p.sizes ?? []));
    setCategoryIds((p.categories ?? []).map((c) => c.id));
    setPhotos(p.photos && p.photos.length > 0 ? p.photos : p.imageUrl ? [p.imageUrl] : []);
  }, [editingProduct]);

  useEffect(() => {
    if (params.photoUri) {
      handlePhotoSelected(params.photoUri as string, params.base64 as string);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.photoUri]);

  const handlePhotoSelected = (uri: string, base64?: string) => {
    setPhotos((prev) => (prev.includes(uri) ? prev : [...prev, uri]));
    setMode("form");
    if (!isEdit && base64 && shopId && photos.length === 0) {
      analyzePhoto.mutate(
        { shopId, data: { imageBase64: base64 } },
        {
          onSuccess: (data) => {
            setName(data.name);
            setCategory(data.category || "");
            setPriceStr(data.price != null ? (data.price / 100).toFixed(2) : "");
            if (data.tags) setTags(data.tags);
          },
        }
      );
    }
  };

  const handlePickImage = async () => {
    if (isSaving) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      handlePhotoSelected(result.assets[0].uri, result.assets[0].base64 ?? undefined);
    }
  };

  const handleAddPhoto = async () => {
    if (isSaving) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleRemovePhoto = (uri: string) => {
    if (isSaving) return;
    setPhotos((prev) => prev.filter((p) => p !== uri));
  };

  const handleSave = async () => {
    if (saveLock.current || isSaving) return;
    setSaveError(null);
    const fail = (message: string) => {
      setSaveError(message);
      Alert.alert(t("common.error"), message);
    };
    if (!shopId) { fail(t("addProduct.missingShop")); return; }
    const priceCents = priceStr.trim() ? Math.round(Number(priceStr.replace(",", ".")) * 100) : 0;
    const quantity = quantityStr.trim() ? Number(quantityStr) : 1;
    if (!name.trim() || !Number.isSafeInteger(priceCents) || priceCents < 0 ||
        !Number.isSafeInteger(quantity) || quantity < 0) {
      fail(t("addProduct.invalidValues"));
      return;
    }
    if (isEdit && (!productId || !editingProduct)) { fail(t("addProduct.notFound")); return; }
    saveLock.current = true;
    setIsUploading(true);
    let resolvedPhotos: string[];
    try {
      resolvedPhotos = await prepareProductPhotos(
        photos, (uri) => uploadProductPhoto(shopId, uri), uploadedPhotos.current,
      );
      setPhotos(resolvedPhotos);
    } catch {
      fail(t("addProduct.uploadError"));
      setIsUploading(false);
      saveLock.current = false;
      return;
    }
    setIsUploading(false);
    const releaseSave = () => { saveLock.current = false; };
    if (isEdit) {
      // Only editable fields are sent; stockStatus, variations, weight, dimension,
      // applyDiscount and other metadata are left untouched on the server.
      updateProduct.mutate(
        {
          shopId,
          id: productId,
          data: {
            name: name.trim(),
            brand: brand.trim() || null,
            description: description.trim() || null,
            price: priceCents,
            quantity,
            tags,
            colors: optionValues(colorsList, colorInput),
            sizes: optionValues(sizesList, sizeInput),
            categoryIds,
            photos: resolvedPhotos,
          },
        },
        {
          onError: () => fail(t("addProduct.saveError")),
          onSettled: releaseSave,
          onSuccess: (updated) => {
            queryClient.setQueryData(getListProductsQueryKey(shopId), (old: Product[] | undefined) =>
              old?.map((p) => (p.id === productId ? { ...p, ...updated } : p))
            );
            queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) });
            queryClient.invalidateQueries({ queryKey: getGetShopSummaryQueryKey(shopId) });
            router.back();
          },
        }
      );
      return;
    }
    createProduct.mutate(
      {
        shopId,
        data: {
          name: name.trim(),
          brand: brand.trim() || null,
          description: description.trim() || null,
          category: category.trim() || null,
          price: priceCents,
          quantity,
          tags,
          colors: optionValues(colorsList, colorInput),
          sizes: optionValues(sizesList, sizeInput),
          categoryIds,
          photos: resolvedPhotos,
          stockStatus: "in_stock",
        },
      },
      {
        onError: () => fail(t("addProduct.saveError")),
        onSettled: releaseSave,
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey(shopId) });
          queryClient.invalidateQueries({ queryKey: getGetShopSummaryQueryKey(shopId) });
          router.back();
        },
      }
    );
  };

  const renderChipInput = (
    label: string,
    placeholder: string,
    value: string,
    setValue: (v: string) => void,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => (
    <View style={{ marginBottom: 16 }}>
      <Input
        label={label}
        placeholder={placeholder}
        value={value}
        autoCorrect={false}
        onChangeText={(text) => {
          const { complete, draft } = optionDraft(text);
          if (complete.length) setList(current => optionValues([...current, ...complete]));
          setValue(draft);
        }}
        onSubmitEditing={() => {
          setList(current => optionValues(current, value));
          setValue("");
        }}
      />
      {list.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {list.map((item) => (
            <View
              key={item}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: colors.muted,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 14 }}>{item}</Text>
              <Feather
                name="x"
                size={14}
                color={colors.mutedForeground}
                style={{ marginLeft: 6 }}
                onPress={() => setList(list.filter((t) => t !== item))}
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (isEdit && !editingProduct) {
    return (
      <View style={[styles.container, styles.stateBox, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: t("addProduct.editTitle") }} />
        {productsQuery.isLoading ? (
          <Text style={{ color: colors.foreground }}>{t("common.loading")}</Text>
        ) : (
          <>
            <Text style={{ color: colors.foreground, textAlign: "center", marginBottom: 16 }}>
              {productsQuery.isError ? t("common.error") : t("addProduct.notFound")}
            </Text>
            {productsQuery.isError && (
              <Button title={t("common.retry")} loading={productsQuery.isFetching} onPress={() => void productsQuery.refetch()} style={{ marginBottom: 8 }} />
            )}
            <Button title={t("common.back")} variant="ghost" onPress={() => router.back()} />
          </>
        )}
      </View>
    );
  }

  if (mode === "choose") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.chooseContent}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
            {t("addProduct.howAdd")}
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              if (Platform.OS === "web") {
                handlePickImage();
              } else {
                router.push(`/(home)/shops/${shopId}/camera`);
              }
            }}
          >
            <Card style={styles.optionCard}>
              <View style={styles.optionBtnContent}>
                <View style={[styles.iconWrapper, { backgroundColor: colors.accent }]}>
                  <Feather name="camera" size={32} color={colors.accentForeground} />
                </View>
                <View style={styles.optionTextWrapper}>
                  <Text style={[styles.optionTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
                    {t("addProduct.photoToInventory")}
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
                    {t("addProduct.photoToInventoryDesc")}
                  </Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.85} onPress={() => setMode("form")}>
            <Card style={styles.optionCard}>
              <View style={styles.optionBtnContent}>
                <View style={[styles.iconWrapper, { backgroundColor: colors.muted }]}>
                  <Feather name="edit-3" size={32} color={colors.foreground} />
                </View>
                <View style={styles.optionTextWrapper}>
                  <Text style={[styles.optionTitle, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
                    {t("addProduct.manualEntry")}
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
                    {t("addProduct.manualEntryDesc")}
                  </Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.formContent}
    >
      {isEdit && <Stack.Screen options={{ title: t("addProduct.editTitle") }} />}
      {photos.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {photos.map((uri) => (
              <View key={uri} style={[styles.photoChip, { borderRadius: colors.radius }]}>
                <ZoomablePhoto source={{ uri }} photos={photos} style={[styles.photoImage, { borderRadius: colors.radius }]} />
                <TouchableOpacity
                  testID="remove-product-photo"
                  disabled={isSaving}
                  style={[styles.photoRemove, { backgroundColor: colors.background }]}
                  onPress={() => handleRemovePhoto(uri)}
                >
                  <Feather name="x" size={14} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
          {analyzePhoto.isPending && (
            <Text style={{ color: colors.mutedForeground, marginTop: 8, fontStyle: "italic" }}>
              {t("addProduct.analyzing")}
            </Text>
          )}
        </View>
      )}

      <Button
        title={t("addProduct.addPhoto")}
        variant="secondary"
        onPress={handleAddPhoto}
        disabled={isSaving}
        testID="add-product-photo"
        style={{ marginBottom: 16 }}
      />

      <Input label={t("addProduct.productName")} placeholder={t("addProduct.productNamePlaceholder")} value={name} onChangeText={setName} />
      <Input label={t("addProduct.brand")} placeholder={t("addProduct.brandPlaceholder")} value={brand} onChangeText={setBrand} />
      <Input
        label={t("addProduct.description")}
        placeholder={t("addProduct.descriptionPlaceholder")}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        style={{ minHeight: 80, textAlignVertical: "top" }}
      />
      {!isEdit && <Input label={t("addProduct.legacyCategory")} placeholder={t("addProduct.legacyCategoryPlaceholder")} value={category} onChangeText={setCategory} />}

      <CategoryPicker selectedIds={categoryIds} onChange={setCategoryIds} label={t("addProduct.categories")} />

      <Input
        label={`${t("addProduct.price")}${shop?.currency?.code ? ` (${shop.currency.code})` : ""}`}
        placeholder={t("addProduct.pricePlaceholder")}
        value={priceStr}
        onChangeText={setPriceStr}
        keyboardType="decimal-pad"
      />
      <Input label={t("addProduct.quantity")} placeholder={t("addProduct.quantityPlaceholder")} value={quantityStr} onChangeText={setQuantityStr} keyboardType="number-pad" />

      {renderChipInput(t("addProduct.tags"), t("addProduct.tagsPlaceholder"), tagInput, setTagInput, tags, setTags)}
      {renderChipInput(t("addProduct.colors"), t("addProduct.colorsPlaceholder"), colorInput, setColorInput, colorsList, setColorsList)}
      {renderChipInput(t("addProduct.sizes"), t("addProduct.sizesPlaceholder"), sizeInput, setSizeInput, sizesList, setSizesList)}

      <View style={{ flex: 1 }} />

      <Button
        title={isUploading ? t("addProduct.uploading") : isEdit ? t("addProduct.update") : t("addProduct.save")}
        testID="save-product"
        size="lg"
        disabled={!name.trim() || analyzePhoto.isPending || isSaving}
        loading={isSaving}
        onPress={handleSave}
        style={{ marginTop: 24 }}
      />
      {saveError && <Text accessibilityRole="alert" style={{ color: colors.destructive, marginTop: 12 }}>{saveError}</Text>}
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stateBox: { alignItems: "center", justifyContent: "center", padding: 24 },
  chooseContent: { padding: 24, flex: 1, justifyContent: "center" },
  title: { fontSize: 24, marginBottom: 32, textAlign: "center" },
  optionCard: { marginBottom: 16 },
  optionBtn: { padding: 0, height: "auto" },
  optionBtnContent: { flexDirection: "row", padding: 20, alignItems: "center" },
  iconWrapper: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginRight: 16 },
  optionTextWrapper: { flex: 1 },
  optionTitle: { fontSize: 18, marginBottom: 4 },
  optionDesc: { fontSize: 14 },
  formContent: { padding: 24, flexGrow: 1 },
  photoChip: { position: "relative", overflow: "visible" },
  photoImage: { width: 120, height: 120 },
  photoRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});
