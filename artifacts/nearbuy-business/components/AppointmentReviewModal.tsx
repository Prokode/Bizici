import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import {
  listAppointmentReviews,
  submitAppointmentReview,
  type AppointmentReview,
} from "@/lib/api/appointments";

type Props = {
  visible: boolean;
  appointmentId: string | null;
  myRole: "customer" | "seller";
  /** Pre-fetched user id of the caller — used to spot the existing review */
  meUserId: string;
  /** Friendly subject — shop name (customer reviewing provider) or client
   * name (provider reviewing client) */
  subjectLabel: string;
  onClose: () => void;
};

/**
 * Bilateral review modal. Reads the current user's existing review (if any)
 * and lets them update it. Direction is enforced by the API based on the
 * caller's role.
 */
export function AppointmentReviewModal({
  visible,
  appointmentId,
  myRole,
  meUserId,
  subjectLabel,
  onClose,
}: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const reviewsQuery = useQuery({
    queryKey: ["appointment-reviews", appointmentId],
    queryFn: () => listAppointmentReviews(appointmentId!),
    enabled: !!appointmentId && visible,
  });

  const myExisting: AppointmentReview | undefined = (
    reviewsQuery.data ?? []
  ).find((r) => r.fromUserId === meUserId);

  // Hydrate from existing review whenever modal opens.
  useEffect(() => {
    if (!visible) return;
    setRating(myExisting?.rating ?? 0);
    setComment(myExisting?.comment ?? "");
    setError(null);
  }, [visible, myExisting?.id, myExisting?.rating, myExisting?.comment]);

  const mutation = useMutation({
    mutationFn: () =>
      submitAppointmentReview(appointmentId!, {
        rating,
        comment: comment.trim() || null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["appointment-reviews", appointmentId],
      });
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      onClose();
    },
    onError: (err: unknown) => {
      setError(
        err instanceof Error
          ? err.message
          : t("appointments.review.errorGeneric"),
      );
    },
  });

  const onSubmit = () => {
    if (!appointmentId) return;
    if (rating < 1 || rating > 5) {
      setError(t("appointments.review.errorRating"));
      return;
    }
    setError(null);
    mutation.mutate();
  };

  const titleKey =
    myRole === "customer"
      ? "appointments.review.titleClient"
      : "appointments.review.titleProvider";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!mutation.isPending) onClose();
      }}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              {t(titleKey, { subject: subjectLabel })}
            </Text>
            <Pressable
              hitSlop={12}
              onPress={() => {
                if (!mutation.isPending) onClose();
              }}
            >
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setRating(n)}
                hitSlop={8}
                style={styles.starBtn}
              >
                <Feather
                  name={n <= rating ? "star" : "star"}
                  size={32}
                  color={n <= rating ? "#f59e0b" : colors.border}
                />
              </Pressable>
            ))}
          </View>

          <Text
            style={[styles.label, { color: colors.foreground, marginTop: 16 }]}
          >
            {t("appointments.review.commentLabel")}
          </Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={t("appointments.review.commentPlaceholder")}
            placeholderTextColor={colors.mutedForeground}
            multiline
            maxLength={1000}
            style={[
              styles.input,
              {
                color: colors.foreground,
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.footer}>
            <Button
              title={
                myExisting
                  ? t("appointments.review.update")
                  : t("appointments.review.submit")
              }
              onPress={onSubmit}
              disabled={mutation.isPending || rating === 0}
              icon={
                mutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="check" size={16} color="#fff" />
                )
              }
            />
          </View>
        </View>
      </View>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: "800", flex: 1, paddingRight: 12 },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginVertical: 8,
  },
  starBtn: { padding: 4 },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: "top",
  },
  errorText: { color: "#dc2626", fontSize: 13, marginTop: 8 },
  footer: { paddingTop: 16 },
});
