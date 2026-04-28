import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import {
  useGetMyReview,
  useUpsertMyReview,
  useDeleteMyReview,
} from "@workspace/api-client-react";

type Props = {
  shopId: string | null;
  shopName: string | null;
  onClose: () => void;
};

/**
 * Modal that lets a signed-in customer create, edit, or delete their own
 * review for a given shop. Reads the existing review (if any) via
 * `useGetMyReview` so we open in "edit" mode automatically. After a
 * successful write/delete we invalidate the public shop + reviews caches so
 * the bottom sheet's average and review list refresh immediately.
 */
export function ReviewModal({ shopId, shopName, onClose }: Props) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const visible = shopId !== null;

  // The orval-generated wrapper supplies a default queryKey/queryFn, so
  // passing only `enabled` is safe at runtime even though the strict
  // UseQueryOptions type asks for `queryKey` too.
  const myReviewQuery = useGetMyReview(shopId ?? "", {
    query: { enabled: visible } as any,
  });
  const upsert = useUpsertMyReview();
  const remove = useDeleteMyReview();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  // Sync local state with the fetched review every time the modal reopens or
  // the underlying data changes (e.g. user just signed in).
  useEffect(() => {
    if (!visible) return;
    const r = myReviewQuery.data;
    if (r) {
      setRating(r.rating);
      setComment(r.comment ?? "");
    } else {
      setRating(0);
      setComment("");
    }
  }, [visible, myReviewQuery.data]);

  const isEditing = !!myReviewQuery.data;
  const submitting = upsert.isPending || remove.isPending;

  const handleSubmit = async () => {
    if (!shopId) return;
    if (rating < 1 || rating > 5) {
      Alert.alert(t("review.ratingPrompt"), "1 – 5");
      return;
    }
    try {
      await upsert.mutateAsync({
        shopId,
        data: { rating, comment: comment.trim() || null },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["shop-reviews", shopId] }),
        queryClient.invalidateQueries({ queryKey: ["public-shop", shopId] }),
        queryClient.invalidateQueries({ queryKey: ["nearby-shops"] }),
      ]);
      onClose();
    } catch (err: any) {
      const status = err?.status as number | undefined;
      if (status === 403) {
        Alert.alert(t("common.error"), t("review.selfReviewError"));
      } else {
        Alert.alert(t("common.error"), err?.message ?? t("common.error"));
      }
    }
  };

  const handleDelete = async () => {
    if (!shopId) return;
    Alert.alert(t("review.deleteConfirm"), "", [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await remove.mutateAsync({ shopId });
            await Promise.all([
              queryClient.invalidateQueries({
                queryKey: ["shop-reviews", shopId],
              }),
              queryClient.invalidateQueries({
                queryKey: ["public-shop", shopId],
              }),
              queryClient.invalidateQueries({ queryKey: ["nearby-shops"] }),
            ]);
            onClose();
          } catch (err: any) {
            Alert.alert(t("common.error"), err?.message ?? t("common.error"));
          }
        },
      },
    ]);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={[
            styles.card,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {t("review.title")}
            </Text>
            <Pressable onPress={onClose} hitSlop={16}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>
          {shopName && (
            <Text
              style={[styles.subtitle, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {shopName}
            </Text>
          )}

          {myReviewQuery.isLoading ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => setRating(n)}
                    hitSlop={8}
                    style={styles.starButton}
                  >
                    <Feather
                      name="star"
                      size={36}
                      color={n <= rating ? "#F59E0B" : colors.border}
                    />
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder={t("review.commentPlaceholder")}
                placeholderTextColor={colors.mutedForeground}
                multiline
                maxLength={1000}
                style={[
                  styles.textArea,
                  {
                    color: colors.foreground,
                    backgroundColor: colors.muted,
                    borderColor: colors.border,
                  },
                ]}
              />
              <Text
                style={[styles.counter, { color: colors.mutedForeground }]}
              >
                {comment.length} / 1000
              </Text>

              <Button
                title={isEditing ? t("review.update") : t("review.submit")}
                onPress={handleSubmit}
                loading={upsert.isPending}
                disabled={submitting || rating < 1}
                style={{ marginTop: 8 }}
              />
              {isEditing && (
                <Pressable
                  onPress={handleDelete}
                  disabled={submitting}
                  style={styles.deleteRow}
                >
                  <Feather name="trash-2" size={14} color="#EF4444" />
                  <Text style={styles.deleteText}>{t("review.deleteMine")}</Text>
                </Pressable>
              )}
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
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 4 },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
    marginVertical: 18,
  },
  starButton: { padding: 4 },
  textArea: {
    minHeight: 96,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top",
  },
  counter: {
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
    marginBottom: 4,
  },
  deleteRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
  deleteText: { color: "#EF4444", fontSize: 13, fontWeight: "600" },
});
