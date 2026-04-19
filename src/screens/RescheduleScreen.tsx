import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { fetchAvailability, fetchBusiness, rescheduleBooking } from "../lib/api";
import { loadSavedBookings, updateSavedBooking } from "../lib/storage";
import { colors, radii, shadows, spacing } from "../theme";
import type { AvailabilitySlot, PublicBusiness, SavedBooking } from "../types";
import { ErrorState } from "../components/ErrorState";
import type { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Reschedule">;
type ResolvedSlot = AvailabilitySlot & { professionalId: string; professionalName: string };

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildDateOptions() {
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  });
}

const RESCHEDULE_DATE_OPTIONS = buildDateOptions();

async function resolveSlotsForDate(input: {
  business: PublicBusiness;
  serviceId: string;
  professionalId: string;
  date: string;
}) {
  const result = await fetchAvailability({
    slug: input.business.slug,
    date: input.date,
    serviceId: input.serviceId,
    professionalId: input.professionalId,
    timezone: input.business.timezone,
  });

  const professionalName =
    input.business.professionals.find((professional) => professional.id === input.professionalId)?.displayName || "Profissional";

  return result.slots.map((slot) => ({
    ...slot,
    professionalId: input.professionalId,
    professionalName,
  }));
}

export function RescheduleScreen({ route, navigation }: Props) {
  const { appointmentId } = route.params;
  const [booking, setBooking] = useState<SavedBooking | null>(null);
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [slotsByDate, setSlotsByDate] = useState<Record<string, ResolvedSlot[]>>({});
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dateOptions = RESCHEDULE_DATE_OPTIONS;

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const saved = await loadSavedBookings();
        const found = saved.find((item) => item.appointmentId === appointmentId) ?? null;
        if (!found) {
          throw new Error("Nao encontramos essa reserva salva neste aparelho.");
        }

        const businessData = await fetchBusiness(found.businessSlug);
        const matchedService = businessData.business.services.find((service) => service.name === found.serviceName);

        if (!matchedService) {
          throw new Error("Nao foi possivel localizar o servico desta reserva para reagendar.");
        }

        if (!active) return;
        setBooking(found);
        setBusiness(businessData.business);
        setServiceId(matchedService.id);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Nao foi possivel preparar o reagendamento.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [appointmentId]);

  useEffect(() => {
    let active = true;

    async function loadAvailability() {
      if (!business || !booking || !serviceId) return;

      const professional = business.professionals.find((item) => item.displayName === booking.professionalName);
      if (!professional) return;

      try {
        setAvailabilityLoading(true);
        const entries = await Promise.all(
          dateOptions.map(async (date) => {
            const key = toDateKey(date);
            const slots = await resolveSlotsForDate({
              business,
              serviceId,
              professionalId: professional.id,
              date: key,
            });
            return [key, slots] as const;
          }),
        );

        if (!active) return;
        const nextMap = Object.fromEntries(entries);
        setSlotsByDate(nextMap);
        if (!nextMap[selectedDate]?.length) {
          const nextDate = dateOptions.find((date) => nextMap[toDateKey(date)]?.length);
          if (nextDate) setSelectedDate(toDateKey(nextDate));
        }
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Nao foi possivel atualizar horarios.");
      } finally {
        if (active) setAvailabilityLoading(false);
      }
    }

    void loadAvailability();
    return () => {
      active = false;
    };
  }, [booking, business, dateOptions, selectedDate, serviceId]);

  const currentSlots = slotsByDate[selectedDate] ?? [];

  const handleConfirm = async () => {
    if (!booking || !business || !selectedSlot) return;

    try {
      setBusy(true);
      const result = await rescheduleBooking({
        rescheduleToken: booking.rescheduleToken,
        newStartsAt: selectedSlot,
        customerTimezone: business.timezone,
      });

      const updatedBooking: SavedBooking = {
        ...booking,
        startsAt: selectedSlot,
        status: result.status,
        cancelToken: result.cancelToken,
        rescheduleToken: result.rescheduleToken,
      };

      await updateSavedBooking(booking.appointmentId, () => updatedBooking);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace("BookingConfirmation", { booking: updatedBooking, mode: "rescheduled" });
    } catch (rescheduleError) {
      Alert.alert(
        "Nao foi possivel reagendar",
        rescheduleError instanceof Error ? rescheduleError.message : "Tente novamente em alguns instantes.",
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.primaryStrong} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !booking || !business) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.centerWrap}>
          <ErrorState
            title="Nao foi possivel abrir o reagendamento"
            body={error || "Tente novamente em alguns instantes."}
            onRetry={() => navigation.replace("Reschedule", { appointmentId })}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Escolha um novo horario</Text>
        <Text style={styles.subtitle}>Mantemos o mesmo profissional e servico. Basta trocar a data e o horario.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
          {dateOptions.map((date) => {
            const key = toDateKey(date);
            const disabled = availabilityLoading ? true : (slotsByDate[key]?.length ?? 0) === 0;
            const selected = key === selectedDate;
            return (
              <Pressable
                key={key}
                disabled={disabled}
                onPress={() => {
                  setSelectedDate(key);
                  setSelectedSlot(null);
                }}
                style={[
                  styles.dateChip,
                  selected && styles.dateChipActive,
                  disabled && styles.dateChipDisabled,
                ]}
              >
                <Text style={[styles.dateChipWeekday, selected && styles.dateChipTextActive]}>
                  {new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date)}
                </Text>
                <Text style={[styles.dateChipDay, selected && styles.dateChipTextActive]}>
                  {new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {availabilityLoading ? (
          <View style={styles.inlineCenter}>
            <ActivityIndicator color={colors.primaryStrong} />
          </View>
        ) : (
          <View style={styles.slotGrid}>
            {currentSlots.map((slot) => (
              <Pressable
                key={slot.startsAt}
                onPress={() => setSelectedSlot(slot.startsAt)}
                style={[styles.slotChip, selectedSlot === slot.startsAt && styles.slotChipActive]}
              >
                <Text style={[styles.slotChipText, selectedSlot === slot.startsAt && styles.slotChipTextActive]}>{slot.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Pressable
            style={[styles.primaryButton, (!selectedSlot || busy) && styles.primaryButtonDisabled]}
            disabled={!selectedSlot || busy}
            onPress={() => void handleConfirm()}
          >
            <Text style={styles.primaryButtonLabel}>{busy ? "Confirmando..." : "Confirmar novo horario"}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  title: {
    color: colors.textDark,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  dateRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  dateChip: {
    width: 72,
    minHeight: 84,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  dateChipActive: {
    backgroundColor: colors.primaryStrong,
    borderColor: colors.primaryStrong,
  },
  dateChipDisabled: {
    backgroundColor: colors.surfaceMuted,
  },
  dateChipWeekday: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  dateChipDay: {
    color: colors.textDark,
    fontSize: 18,
    fontWeight: "900",
    marginTop: spacing.xs,
  },
  dateChipTextActive: {
    color: colors.white,
  },
  inlineCenter: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  slotChip: {
    width: "31%",
    minHeight: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceCard,
    ...shadows.card,
  },
  slotChipActive: {
    backgroundColor: colors.primaryStrong,
    borderColor: colors.primaryStrong,
  },
  slotChipText: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "800",
  },
  slotChipTextActive: {
    color: colors.white,
  },
  footer: {
    marginTop: "auto",
    paddingTop: spacing.lg,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  primaryButtonLabel: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
});
