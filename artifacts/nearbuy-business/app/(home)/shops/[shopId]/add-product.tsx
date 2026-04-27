import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Platform, Image, TouchableOpacity } from "react-native";
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

export default function AddProductScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ shopId: string; photoUri?: string; base64?: string }>();
  const shopId = params.shopId;

  const [mode, setMode] = useState<"choose" | "form">("choose");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const createProduct = useCreateProduct();
  const analyzePhoto = useAnalyzeProductPhoto();

  useEffect(() => {
    if (params.photoUri) {
      handlePhotoSelected(params.photoUri as string, params.base64 as string);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.photoUri]);

  const handlePhotoSelected = (uri: string, base64?: string) => {
    setPhotoUri(uri);
    setMode("form");
    if (base64 && shopId) {
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

  const handleSave = () => {
    if (!shopId) return;
    const priceCents = priceStr.trim() ? Math.round(parseFloat(priceStr) * 100) : null;
    createProduct.mutate(
      {
        shopId,
        data: {
          name,
          category: category.trim() || null,
          price: priceCents,
          tags,
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
      {photoUri && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: photoUri }} style={[styles.imagePreview, { borderRadius: colors.radius }]} />
          {analyzePhoto.isPending && (
            <View style={[styles.analyzingOverlay, { backgroundColor: "rgba(0,0,0,0.5)", borderRadius: colors.radius }]}>
              <Text style={{ color: "#fff", fontFamily: "PlusJakartaSans_600SemiBold", marginTop: 8 }}>
                AI is analyzing...
              </Text>
            </View>
          )}
        </View>
      )}

      <Input label="Product Name *" placeholder="e.g. Ripe Bananas" value={name} onChangeText={setName} />
      <Input label="Category (Optional)" placeholder="e.g. Fruits" value={category} onChangeText={setCategory} />
      <Input label="Price ($) (Optional)" placeholder="0.00" value={priceStr} onChangeText={setPriceStr} keyboardType="decimal-pad" />

      <View style={{ marginBottom: 16 }}>
        <Input
          label="Tags"
          placeholder="e.g. organic, local (comma separated)"
          value={tagInput}
          onChangeText={(text) => {
            if (text.endsWith(",")) {
              const newTag = text.slice(0, -1).trim();
              if (newTag && !tags.includes(newTag)) setTags([...tags, newTag]);
              setTagInput("");
            } else {
              setTagInput(text);
            }
          }}
          onSubmitEditing={() => {
            const newTag = tagInput.trim();
            if (newTag && !tags.includes(newTag)) setTags([...tags, newTag]);
            setTagInput("");
          }}
        />
        {tags.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {tags.map((tag) => (
              <View
                key={tag}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.muted,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 16,
                }}
              >
                <Text style={{ color: colors.foreground, fontSize: 14 }}>{tag}</Text>
                <Feather
                  name="x"
                  size={14}
                  color={colors.mutedForeground}
                  style={{ marginLeft: 6 }}
                  onPress={() => setTags(tags.filter((t) => t !== tag))}
                />
              </View>
            ))}
          </View>
        )}
      </View>

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
  imagePreviewContainer: { height: 200, marginBottom: 24, position: "relative" },
  imagePreview: { width: "100%", height: "100%" },
  analyzingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
});
