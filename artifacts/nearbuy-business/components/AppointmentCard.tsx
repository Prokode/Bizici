import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useColors } from "@/hooks/useColors";
import type { Appointment } from "@/lib/appointmentsApi";

type Variant = "card" | "compact";

type Props = {
  appointment: Appointment;
  /** caller's role on this appointment */
  myRole: "customer" | "seller";
  /** when defined, optimistic-disable buttons during a pending mutation */
  pendingAction?:
    | "accept"
    | "decline"
    | "complete"
    | "cancel"
    | "review"
    | null;
  onAccept?: () => void;
  onDecline?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onReview?: () => void;
  onPress?: () => void;
  variant?: Variant;
};

function statusColor(
  status: Appointment["status"],
  colors: ReturnType<typeof useColors>,
): string {
  switch (status) {
    case "proposed":
      return colors.primary;
    case "confirmed":
      return "#16a34a";
    case "completed":
      return colors.mutedForeground;
    case "declined":
    case "cancelled":
      return "#dc2626";
  }
}

function formatScheduled(iso: string, lang: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(lang, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Inline appointment card. Used both inside the chat thread (as a pinned
 * banner) and on the standalone "Mes rendez-vous" list. Renders the right
 * action buttons based on (status, myRole) per the project rules:
 *
 *   client-only initiates → already happened before this card exists
 *   seller-only accepts/declines (status=proposed)
 *   client-only completes  (status=confirmed)
 *   either may cancel before completion
 *   either may submit a review once completed (handled by parent)
 */
export function AppointmentCard({
  appointment,
  myRole,
  pendingAction,
  onAccept,
  onDecline,
  onComplete,
  onCancel,
  onReview,
  onPress,
  variant = "card",
}: Props) {
  const colors = useColors();
  const { t, i18n } = useTranslation();

  const sc = statusColor(appointment.status, colors);
  const scheduled = formatScheduled(appointment.scheduledAt, i18n.language);

  const isCustomer = myRole === "customer";
  const isSeller = myRole === "seller";

  const canAccept = isSeller && appointment.status === "proposed";
  const canDecline = isSeller && appointment.status === "proposed";
  const canComplete = isCustomer && appointment.status === "confirmed";
  const canCancel =
    appointment.status === "proposed" || appointment.status === "confirmed";
  const canReview = appointment.status === "completed";

  const isPending = (a: NonNullable<Props["pendingAction"]>) =>
    pendingAction === a;
  const anyPending = pendingAction != null;

  const Wrapper: React.ElementType = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={[styles.statusDot, { backgroundColor: sc }]} />
        <Text style={[styles.statusLabel, { color: sc }]}>
          {t(`appointments.status.${appointment.status}`)}
        </Text>
        <View style={{ flex: 1 }} />
        <Feather name="calendar" size={14} color={colors.mutedForeground} />
      </View>

      <Text style={[styles.scheduled, { color: colors.foreground }]}>
        {scheduled}
      </Text>

      {appointment.durationMinutes ? (
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {t("appointments.duration", {
            minutes: appointment.durationMinutes,
          })}
        </Text>
      ) : null}

      {appointment.notes && variant === "card" ? (
        <Text
          style={[styles.notes, { color: colors.foreground }]}
          numberOfLines={3}
        >
          {appointment.notes}
        </Text>
      ) : null}

      {appointment.status === "declined" && appointment.declineReason ? (
        <Text style={[styles.reason, { color: colors.mutedForeground }]}>
          {t("appointments.declinedBecause", {
            reason: appointment.declineReason,
          })}
        </Text>
      ) : null}
      {appointment.status === "cancelled" && appointment.cancelReason ? (
        <Text style={[styles.reason, { color: colors.mutedForeground }]}>
          {t("appointments.cancelledBecause", {
            reason: appointment.cancelReason,
          })}
        </Text>
      ) : null}

      {variant === "card" ? (
        <View style={styles.actionsRow}>
          {canAccept ? (
            <ActionBtn
              label={t("appointments.actions.accept")}
              onPress={onAccept}
              tone="primary"
              loading={isPending("accept")}
              disabled={anyPending}
            />
          ) : null}
          {canDecline ? (
            <ActionBtn
              label={t("appointments.actions.decline")}
              onPress={onDecline}
              tone="danger"
              loading={isPending("decline")}
              disabled={anyPending}
            />
          ) : null}
          {canComplete ? (
            <ActionBtn
              label={t("appointments.actions.complete")}
              onPress={onComplete}
              tone="primary"
              loading={isPending("complete")}
              disabled={anyPending}
            />
          ) : null}
          {canCancel && !canAccept && !canDecline && !canComplete ? (
            <ActionBtn
              label={t("appointments.actions.cancel")}
              onPress={onCancel}
              tone="muted"
              loading={isPending("cancel")}
              disabled={anyPending}
            />
          ) : null}
          {canReview ? (
            <ActionBtn
              label={t("appointments.actions.review")}
              onPress={onReview}
              tone="primary"
              loading={isPending("review")}
              disabled={anyPending}
            />
          ) : null}
        </View>
      ) : null}
    </Wrapper>
  );
}

function ActionBtn({
  label,
  onPress,
  tone,
  loading,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  tone: "primary" | "danger" | "muted";
  loading?: boolean;
  disabled?: boolean;
}) {
  const colors = useColors();
  const bg =
    tone === "primary"
      ? colors.primary
      : tone === "danger"
        ? "#dc2626"
        : colors.muted;
  const fg =
    tone === "muted" ? colors.foreground : colors.primaryForeground ?? "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading || !onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        {
          backgroundColor: bg,
          opacity: disabled || !onPress ? 0.55 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text style={[styles.actionLabel, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  scheduled: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  meta: { fontSize: 12, marginTop: 2 },
  notes: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  reason: { fontSize: 12, fontStyle: "italic", marginTop: 4 },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { fontSize: 13, fontWeight: "700" },
});
