import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { useAuth } from "@clerk/expo";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import { fetchShopDetail, type PublicShop } from "@/lib/publicApi";
import { getOrCreateConversation } from "@/lib/chatApi";

type Props = {
  shop: PublicShop | null;
  onClose: () => void;
};

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2)} €`;
}

export function ShopBottomSheet({ shop, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const visible = shop !== null;
  const [chatLoading, setChatLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["public-shop", shop?.id],
    queryFn: () => fetchShopDetail(shop!.id),
    enabled: !!shop,
  });

  const handleDirectionsPress = async () => {
    if (!shop) return;
    const lat = shop.latitude;
    const lng = shop.longitude;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      Number.isNaN(lat) ||
      Number.isNaN(lng)
    ) {
      Alert.alert(
        "Position indisponible",
        "Cette boutique n'a pas de coordonnées renseignées.",
      );
      return;
    }
    const label = encodeURIComponent(shop.name);
    const universalUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    let primaryUrl = universalUrl;
    if (Platform.OS === "ios") {
      primaryUrl = `maps://?daddr=${lat},${lng}&dirflg=d`;
    } else if (Platform.OS === "android") {
      primaryUrl = `geo:0,0?q=${lat},${lng}(${label})`;
    }
    try {
      const supported = await Linking.canOpenURL(primaryUrl);
      await Linking.openURL(supported ? primaryUrl : universalUrl);
    } catch {
      try {
        await Linking.openURL(universalUrl);
      } catch {
        Alert.alert(
          "Itinéraire indisponible",
          "Aucune application de cartes n'a pu être ouverte.",
        );
      }
    }
  };

  const handleChatPress = async () => {
    if (!shop || !isLoaded) return;
    if (!isSignedIn) {
      onClose();
      router.push(
        `/(auth)/sign-in?next=${encodeURIComponent(
          `/chat-shop/${shop.id}`,
        )}` as Href,
      );
      return;
    }
    setChatLoading(true);
    try {
      const conv = await getOrCreateConversation(shop.id);
      onClose();
      router.push(`/chat/${conv.id}` as Href);
    } catch (err: any) {
      Alert.alert(
        "Discussion indisponible",
        err?.message ?? "Impossible d'ouvrir la discussion. Réessayez.",
      );
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 24,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[styles.handle, { backgroundColor: colors.border }]}
          />

          {shop && (
            <>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.title, { color: colors.foreground }]}
                    numberOfLines={2}
                  >
                    {shop.name}
                  </Text>
                  {shop.marketName && (
                    <Text
                      style={[
                        styles.subtitle,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {shop.marketName}
                    </Text>
                  )}
                </View>
                <Pressable onPress={onClose} hitSlop={16}>
                  <Feather name="x" size={24} color={colors.mutedForeground} />
                </Pressable>
              </View>

              <View style={styles.metaRow}>
                <View
                  style={[
                    styles.chip,
                    {
                      backgroundColor: shop.isOpen
                        ? "#10B98122"
                        : colors.muted,
                      borderColor: shop.isOpen ? "#10B981" : colors.border,
                    },
                  ]}
                >
                  <Feather
                    name={shop.isOpen ? "check-circle" : "moon"}
                    size={12}
                    color={shop.isOpen ? "#10B981" : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: shop.isOpen ? "#10B981" : colors.mutedForeground,
                      },
                    ]}
                  >
                    {shop.isOpen ? "Ouvert" : "Fermé"}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                  <Feather
                    name="map-pin"
                    size={12}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {formatDistance(shop.distanceMeters)}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: colors.muted }]}>
                  <Feather
                    name="package"
                    size={12}
                    color={colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {data?.products?.length ?? shop.productCount} produits
                  </Text>
                </View>
              </View>

              {isLoading && !data ? (
                <View style={styles.loading}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : (
                <FlatList
                  data={data?.products ?? []}
                  keyExtractor={(p) => p.id}
                  contentContainerStyle={{ paddingVertical: 12 }}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                  ListEmptyComponent={
                    <Text
                      style={[
                        styles.empty,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Aucun produit listé pour cette boutique pour le moment.
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <View
                      style={[
                        styles.productRow,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      {item.photos?.[0] ? (
                        <Image
                          source={{ uri: item.photos[0] }}
                          style={styles.productPhoto}
                        />
                      ) : (
                        <View
                          style={[
                            styles.productPhoto,
                            { backgroundColor: colors.muted },
                          ]}
                        >
                          <Feather
                            name="image"
                            size={20}
                            color={colors.mutedForeground}
                          />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.productName,
                            { color: colors.foreground },
                          ]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        {item.brand && (
                          <Text
                            style={[
                              styles.productBrand,
                              { color: colors.mutedForeground },
                            ]}
                            numberOfLines={1}
                          >
                            {item.brand}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={[styles.price, { color: colors.primary }]}
                      >
                        {formatPrice(item.price)}
                      </Text>
                    </View>
                  )}
                />
              )}

              <View style={styles.footer}>
                <Button
                  title="Discuter avec le vendeur"
                  size="lg"
                  loading={chatLoading}
                  onPress={handleChatPress}
                  icon={
                    <Feather
                      name="message-circle"
                      size={18}
                      color={colors.primaryForeground}
                    />
                  }
                  style={{ marginBottom: 8 }}
                />
                <View style={styles.secondaryRow}>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Itinéraire"
                      variant="outline"
                      onPress={handleDirectionsPress}
                      icon={
                        <Feather
                          name="navigation"
                          size={18}
                          color={colors.primary}
                        />
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      title="Encore là ?"
                      variant="outline"
                      onPress={() => {
                        // TODO: Karma "Still There?" verification flow
                      }}
                      icon={
                        <Feather
                          name="check-square"
                          size={18}
                          color={colors.primary}
                        />
                      }
                    />
                  </View>
                </View>
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "80%",
    minHeight: "55%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 2 },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipText: { fontSize: 11, fontWeight: "700" },
  loading: { paddingVertical: 32, alignItems: "center" },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  productPhoto: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  productName: { fontSize: 14, fontWeight: "700" },
  productBrand: { fontSize: 12, marginTop: 2 },
  price: { fontSize: 14, fontWeight: "800" },
  empty: {
    textAlign: "center",
    paddingVertical: 24,
    fontSize: 14,
  },
  footer: {
    paddingTop: 8,
    borderTopColor: "transparent",
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 8,
  },
});
