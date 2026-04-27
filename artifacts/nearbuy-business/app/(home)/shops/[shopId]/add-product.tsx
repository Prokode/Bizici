import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Platform, Image, TouchableOpacity, ScrollView } from "react-native";
import { useColors } from "@/hooks/useColors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  useCreateProduct,
  useAnalyzeProductPhoto,
  getListProductsQueryKey,
  getGetShopSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { CategoryPicker } from "@/components/CategoryPicker";

export default function AddProductScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ shopId: string; photoUri?: string; base64?: string }>();
  const shopId = params.shopId;

  const [mode, setMode] = useState<"choose" | "form">("choose");
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

  const createProduct = useCreateProduct();
  const analyzePhoto = useAnalyzeProductPhoto();

  useEffect(() => {
    if (params.photoUri) {
      handlePhotoSelected(params.photoUri as string, params.base64 as string);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.photoUri]);

  const handlePhotoSelected = (uri: string, base64?: string) => {
    setPhotos((prev) => (prev.includes(uri) ? prev : [...prev, uri]));
    setMode("form");
    if (base64 && shopId && photos.length === 0) {
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      handlePhotoSelected(result.assets[0].uri, result.assets[0].base64);
    }
  };

  const handleAddPhoto = async () => {
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
    setPhotos((prev) => prev.filter((p) => p !== uri));
  };

  const handleSave = () => {
    if (!shopId) return;
    const priceCents = priceStr.trim() ? Math.round(parseFloat(priceStr) * 100) : 0;
    const quantity = quantityStr.trim() ? Math.max(0, parseInt(quantityStr, 10) || 0) : 1;
    createProduct.mutate(
      {
        shopId,
        data: {
          name,
          brand: brand.trim() || null,
          description: description.trim() || null,
          category: category.trim() || null,
          price: priceCents,
          quantity,
          tags,
          colors: colorsList,
          sizes: sizesList,
          categoryIds,
          photos,
          stockStatus: "in_stock",
        },
      },
      {
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
    setList: (l: string[]) => void
  ) => (
    <View style={{ marginBottom: 16 }}>
      <Input
        label={label}
        placeholder={placeholder}
        value={value}
        onChangeText={(text) => {
          if (text.endsWith(",")) {
            const newItem = text.slice(0, -1).trim();
            if (newItem && !list.includes(newItem)) setList([...list, newItem]);
            setValue("");
          } else {
            setValue(text);
          }
        }}
        onSubmitEditing={() => {
          const newItem = value.trim();
          if (newItem && !list.includes(newItem)) setList([...list, newItem]);
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

  if (mode === "choose") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.chooseContent}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: "PlusJakartaSans_700Bold" }]}>
            How would you like to add a product?
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
                    Photo to Inventory
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
                    Take a picture. AI will fill in the details.
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
                    Manual Entry
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.mutedForeground, fontFamily: "PlusJakartaSans_400Regular" }]}>
                    Type in the product details yourself.
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
      {photos.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {photos.map((uri) => (
              <View key={uri} style={[styles.photoChip, { borderRadius: colors.radius }]}>
                <Image source={{ uri }} style={[styles.photoImage, { borderRadius: colors.radius }]} />
                <TouchableOpacity
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
              AI is analyzing the first photo...
            </Text>
          )}
        </View>
      )}

      <Button
        title="Add a photo"
        variant="secondary"
        onPress={handleAddPhoto}
        style={{ marginBottom: 16 }}
      />

      <Input label="Product Name *" placeholder="e.g. Ripe Bananas" value={name} onChangeText={setName} />
      <Input label="Brand (Optional)" placeholder="e.g. Chiquita" value={brand} onChangeText={setBrand} />
      <Input
        label="Description (Optional)"
        placeholder="Describe the product..."
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
        style={{ minHeight: 80, textAlignVertical: "top" }}
      />
      <Input label="Legacy Category (Optional)" placeholder="e.g. Fruits" value={category} onChangeText={setCategory} />

      <CategoryPicker selectedIds={categoryIds} onChange={setCategoryIds} label="Categories" />

      <Input label="Price ($) (Optional)" placeholder="0.00" value={priceStr} onChangeText={setPriceStr} keyboardType="decimal-pad" />
      <Input label="Quantity (Optional)" placeholder="1" value={quantityStr} onChangeText={setQuantityStr} keyboardType="number-pad" />

      {renderChipInput("Tags", "e.g. organic, local (comma separated)", tagInput, setTagInput, tags, setTags)}
      {renderChipInput("Colors", "e.g. red, blue (comma separated)", colorInput, setColorInput, colorsList, setColorsList)}
      {renderChipInput("Sizes", "e.g. S, M, L (comma separated)", sizeInput, setSizeInput, sizesList, setSizesList)}

      <View style={{ flex: 1 }} />

      <Button
        title="Save Product"
        size="lg"
        disabled={!name.trim() || analyzePhoto.isPending}
        loading={createProduct.isPending}
        onPress={handleSave}
        style={{ marginTop: 24 }}
      />
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
