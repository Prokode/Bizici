import React from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as Location from "expo-location";
import { useUser } from "@clerk/expo";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import {
  addBasketItem,
  clearBasket,
  fetchBasket,
  removeBasketItem,
  startCourse,
  type Basket,
  type BasketItem,
} from "@/lib/courseApi";

export default function CourseBasketScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const { isSignedIn } = useUser();
  const queryClient = useQueryClient();

  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [starting, setStarting] = React.useState(false);

  const basketQuery = useQuery({
    queryKey: ["basket"],
    enabled: !!isSignedIn,
    queryFn: fetchBasket,
  });

  const items = basketQuery.data?.items ?? [];

  const addMutation = useMutation({
    mutationFn: (q: string) => addBasketItem(q),
    onSuccess: (data) => {
      queryClient.setQueryData<Basket>(["basket"], data);
      setText("");
      setError(null);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "";
      if (msg.toLowerCase().includes("full")) {
        setError(t("course.fullBasket"));
      } else {
        setError(t("course.addError"));
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removeBasketItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["basket"] });
      const prev = queryClient.getQueryData<Basket>(["basket"]);
      if (prev) {
        queryClient.setQueryData<Basket>(["basket"], {
          items: prev.items.filter((it) => it.id !== id),
        });
      }
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["basket"], ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["basket"] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => clearBasket(),
    onSuccess: () => {
      queryClient.setQueryData<Basket>(["basket"], { items: [] });
    },
  });

  const handleAdd = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.length > 120) {
      setError(t("course.tooLong"));
      return;
    }
    addMutation.mutate(trimmed);
  };

  const handleClear = () => {
    Alert.alert(
      t("course.clearConfirmTitle"),
      t("course.clearConfirmBody"),
      [
        { text: t("course.cancel"), style: "cancel" },
        {
          text: t("course.confirm"),
          style: "destructive",
          onPress: () => clearMutation.mutate(),
        },
      ],
    );
  };

  const handleStart = async () => {
    if (items.length === 0) return;
    setStarting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setStarting(false);
        Alert.alert(
          t("course.locationDeniedTitle"),
          t("course.locationDeniedBody"),
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const plan = await startCourse({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        radiusKm: 10,
      });
      queryClient.setQueryData(["course", "plan", "current"], {
        plan,
        center: {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        },
      });
      setStarting(false);
      router.push("/course/run");
    } catch (e) {
      setStarting(false);
      Alert.alert(
        t("course.startError"),
        e instanceof Error ? e.message : "",
      );
    }
  };

  const renderItem = ({ item }: { item: BasketItem }) => (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.bulletDot,
          { backgroundColor: colors.primary },
        ]}
      />
      <Text style={[styles.rowText, { color: colors.foreground }]}>
        {item.query}
      </Text>
      <Pressable
        onPress={() => removeMutation.mutate(item.id)}
        hitSlop={12}
        accessibilityLabel={t("course.remove")}
      >
        <Feather name="x" size={20} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={26} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {t("course.title")}
        </Text>
        {items.length > 0 ? (
          <Pressable onPress={handleClear} hitSlop={12}>
            <Text style={[styles.clearText, { color: colors.destructive }]}>
              {t("course.clear")}
            </Text>
          </Pressable>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        {t("course.subtitle")}
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={(v) => {
            setText(v);
            if (error) setError(null);
          }}
          placeholder={t("course.addPlaceholder")}
          placeholderTextColor={colors.mutedForeground}
          style={[
            styles.input,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
            },
          ]}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
          maxLength={120}
        />
        <Pressable
          onPress={handleAdd}
          disabled={addMutation.isPending || text.trim().length === 0}
          style={[
            styles.addBtn,
            {
              backgroundColor:
                text.trim().length === 0 ? colors.muted : colors.primary,
              opacity: addMutation.isPending ? 0.6 : 1,
            },
          ]}
          accessibilityLabel={t("course.addButton")}
        >
          {addMutation.isPending ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Feather name="plus" size={22} color="#ffffff" />
          )}
        </Pressable>
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          {error}
        </Text>
      ) : null}

      {basketQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Feather
            name="shopping-bag"
            size={56}
            color={colors.mutedForeground}
          />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {t("course.empty")}
          </Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            {t("course.emptyHint")}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListHeaderComponent={
            <Text
              style={[styles.countLabel, { color: colors.mutedForeground }]}
            >
              {t("course.itemsCount", { count: items.length })}
            </Text>
          }
        />
      )}

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 12,
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Button
          title={starting ? t("course.starting") : t("course.start")}
          onPress={handleStart}
          fullWidth
          size="lg"
          disabled={items.length === 0 || starting}
          icon={
            starting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Feather name="navigation" size={18} color="#ffffff" />
            )
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  clearText: { fontSize: 14, fontWeight: "600" },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    paddingHorizontal: 20,
    paddingTop: 6,
    fontSize: 13,
    fontWeight: "500",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyBody: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  countLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  bulletDot: { width: 8, height: 8, borderRadius: 4 },
  rowText: { flex: 1, fontSize: 15, fontWeight: "500" },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
});
