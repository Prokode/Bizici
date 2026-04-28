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
      Alert.alert("Note requise", "Choisissez de 1 à 5 étoiles.");
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
        Alert.alert(
          "Avis impossible",
          "Vous ne pouvez pas évaluer une boutique dont vous êtes vendeur.",
        );
      } else {
        Alert.alert(
          "Erreur",
          err?.message ?? "Impossible d'enregistrer votre avis.",
        );
      }
    }
  };

  const handleDelete = async () => {
    if (!shopId) return;
    Alert.alert(
      "Supprimer mon avis",
      "Voulez-vous vraiment retirer votre avis sur cette boutique ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
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
              Alert.alert(
                "Erreur",
                err?.message ?? "Impossible de supprimer votre avis.",
              );
            }
          },
        },
      ],
    );
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
              {isEditing ? "Modifier mon avis" : "Donner mon avis"}
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
                placeholder="Commentaire (optionnel, 1000 car. max)"
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
                title={isEditing ? "Mettre à jour" : "Publier mon avis"}
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
                  <Text style={styles.deleteText}>Supprimer mon avis</Text>
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
