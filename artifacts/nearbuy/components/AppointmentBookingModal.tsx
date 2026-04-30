import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { useColors } from "@/hooks/useColors";
import {
  createAppointment,
  type Appointment,
} from "@/lib/appointmentsApi";

type Service = { id: string; title: string };

type Props = {
  visible: boolean;
  shopId: string;
  shopName: string;
  services?: Service[];
  onClose: () => void;
  onCreated?: (appt: Appointment) => void;
};

/**
 * Lightweight booking sheet for the customer to propose a new appointment.
 * Keeps deps minimal (no datetimepicker) — uses two text inputs with strict
 * parsing so the API only sees an ISO datetime ≥ now.
 */
export function AppointmentBookingModal({
  visible,
  shopId,
  shopName,
  services,
  onClose,
  onCreated,
}: Props) {
  const colors = useColors();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setDate("");
    setTime("");
    setServiceId(null);
    setNotes("");
    setError(null);
  };

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof createAppointment>[0]) =>
      createAppointment(input),
    onSuccess: (appt) => {
      void qc.invalidateQueries({ queryKey: ["appointments"] });
      void qc.invalidateQueries({
        queryKey: ["appointments-conv", appt.conversationId],
      });
      void qc.invalidateQueries({ queryKey: ["chat-conv-list"] });
      onCreated?.(appt);
      reset();
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : t("appointments.booking.errorGeneric");
      setError(msg);
    },
  });

  const parsedIso = useMemo(() => {
    // Strict YYYY-MM-DD + HH:MM. Returns null if invalid or in the past.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    if (!/^\d{2}:\d{2}$/.test(time)) return null;
    const d = new Date(`${date}T${time}:00`);
    if (Number.isNaN(d.getTime())) return null;
    if (d.getTime() < Date.now() - 60 * 1000) return null;
    return d.toISOString();
  }, [date, time]);

  const canSubmit = parsedIso != null && !mutation.isPending;

  const onSubmit = () => {
    if (!parsedIso) {
      setError(t("appointments.booking.errorInvalidDate"));
      return;
    }
    setError(null);
    mutation.mutate({
      shopId,
      serviceId: serviceId ?? null,
      scheduledAt: parsedIso,
      notes: notes.trim() || null,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!mutation.isPending) {
          reset();
          onClose();
        }
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
              {t("appointments.booking.title")}
            </Text>
            <Pressable
              hitSlop={12}
              onPress={() => {
                if (!mutation.isPending) {
                  reset();
                  onClose();
                }
              }}
            >
              <Feather name="x" size={22} color={colors.foreground} />
            </Pressable>
          </View>

          <Text style={[styles.shopName, { color: colors.mutedForeground }]}>
            {t("appointments.booking.withShop", { shop: shopName })}
          </Text>

          <ScrollView contentContainerStyle={styles.body}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              {t("appointments.booking.date")}
            </Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={10}
              keyboardType="numbers-and-punctuation"
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            />

            <Text style={[styles.label, { color: colors.foreground }]}>
              {t("appointments.booking.time")}
            </Text>
            <TextInput
              value={time}
              onChangeText={setTime}
              placeholder="HH:MM"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={5}
              keyboardType="numbers-and-punctuation"
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            />

            {services && services.length > 0 ? (
              <>
                <Text style={[styles.label, { color: colors.foreground }]}>
                  {t("appointments.booking.service")}
                </Text>
                <View style={styles.servicesWrap}>
                  <ServiceChip
                    label={t("appointments.booking.serviceNone")}
                    selected={serviceId == null}
                    onPress={() => setServiceId(null)}
                  />
                  {services.map((s) => (
                    <ServiceChip
                      key={s.id}
                      label={s.title}
                      selected={serviceId === s.id}
                      onPress={() => setServiceId(s.id)}
                    />
                  ))}
                </View>
              </>
            ) : null}

            <Text style={[styles.label, { color: colors.foreground }]}>
              {t("appointments.booking.notes")}
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={t("appointments.booking.notesPlaceholder")}
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={1000}
              style={[
                styles.input,
                styles.textarea,
                {
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            />

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={t("appointments.booking.submit")}
              onPress={onSubmit}
              disabled={!canSubmit}
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

function ServiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primary : colors.card,
        },
      ]}
    >
      <Text
        style={{
          color: selected ? colors.primaryForeground ?? "#fff" : colors.foreground,
          fontSize: 13,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
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
    maxHeight: "92%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: "800" },
  shopName: { fontSize: 13, marginBottom: 12 },
  body: { paddingBottom: 16, gap: 6 },
  label: { fontSize: 13, fontWeight: "700", marginTop: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textarea: { minHeight: 70, textAlignVertical: "top" },
  servicesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  errorText: { color: "#dc2626", fontSize: 13, marginTop: 8 },
  footer: { paddingTop: 8 },
});
