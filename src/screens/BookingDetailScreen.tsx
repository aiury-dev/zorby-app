import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CheckCircle2, Clock3, MapPin, Phone, RefreshCcw, XCircle } from "lucide-react-native";
import { cancelBooking } from "../lib/api";
import { cancelBookingReminder } from "../lib/notifications";
import { loadSavedBookings, updateSavedBooking } from "../lib/storage";
import { colors, radii, shadows, spacing } from "../theme";
import type { SavedBooking } from "../types";
import { ErrorState } from "../components/ErrorState";
import type { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "BookingDetail">;

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatCurrency(cents?: number) {
  if (cents == null) return "A confirmar";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function getStatusMeta(status?: SavedBooking["status"]) {
  switch (status) {
    case "CANCELLED":
      return {
        label: "Cancelada",
        icon: <XCircle size={18} color={colors.white} />,
        backgroundColor: colors.danger,
      };
    case "PENDING":
      return {
        label: "Pendente",
        icon: <Clock3 size={18} color={colors.white} />,
        backgroundColor: colors.warning,
      };
    default:
      return {
        label: "Confirmada",
        icon: <CheckCircle2 size={18} color={colors.white} />,
        backgroundColor: colors.success,
      };
  }
}

export function BookingDetailScreen({ route, navigation }: Props) {
  const { appointmentId } = route.params;
  const [booking, setBooking] = useState<SavedBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"cancel" | null>(null);

  const loadBooking = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const allBookings = await loadSavedBookings();
      const current = allBookings.find((item) => item.appointmentId === appointmentId) ?? null;
      setBooking(current);
      if (!current) setError("Nao encontramos esse agendamento salvo neste aparelho.");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Nao foi possivel carregar o agendamento.");
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    void loadBooking();
  }, [loadBooking]);

  const statusMeta = useMemo(() => getStatusMeta(booking?.status), [booking?.status]);

  const handleOpenMaps = async () => {
    if (!booking?.addressLabel) return;
    await Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.addressLabel)}`,
    );
  };

  const handleCall = async () => {
    if (!booking?.businessPhone) return;
    await Linking.openURL(`tel:${booking.businessPhone}`);
  };

  const handleCancel = () => {
    if (!booking || booking.status === "CANCELLED") return;

    Alert.alert("Cancelar reserva", "Tem certeza? Esta acao nao pode ser desfeita.", [
      { text: "Voltar", style: "cancel" },
      {
        text: "Cancelar reserva",
        style: "destructive",
        onPress: async () => {
          try {
            setBusyAction("cancel");
            const result = await cancelBooking({ cancelToken: booking.cancelToken });
            const updatedBooking: SavedBooking = {
              ...booking,
              status: result.status,
            };
            await updateSavedBooking(booking.appointmentId, () => updatedBooking);
            await cancelBookingReminder(booking.appointmentId);
            setBooking(updatedBooking);
            Alert.alert("Reserva cancelada", "O horario foi liberado e o estabelecimento foi avisado.");
          } catch (cancelError) {
            Alert.alert(
              "Nao foi possivel cancelar",
              cancelError instanceof Error ? cancelError.message : "Tente novamente em alguns instantes.",
            );
          } finally {
            setBusyAction(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.centerWrap}>
          <Text style={styles.loadingText}>Carregando reserva...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !booking) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.centerWrap}>
          <ErrorState
            title="Nao foi possivel carregar"
            body={error || "Tente novamente em alguns instantes."}
            onRetry={() => void loadBooking()}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.statusBadge, { backgroundColor: statusMeta.backgroundColor }]}>
          {statusMeta.icon}
          <Text style={styles.statusBadgeText}>{statusMeta.label}</Text>
        </View>

        <Text style={styles.title}>{booking.businessName}</Text>

        <View style={styles.card}>
          <Text style={styles.cardPrimary}>{booking.serviceName}</Text>
          <Text style={styles.cardSecondary}>{booking.professionalName}</Text>
          {booking.serviceVariantName ? <Text style={styles.cardSecondary}>{booking.serviceVariantName}</Text> : null}
          <Text style={styles.cardSecondary}>{formatDateTime(booking.startsAt)}</Text>
          {booking.addressLabel ? <Text style={styles.cardSecondary}>{booking.addressLabel}</Text> : null}
          <Text style={styles.price}>{formatCurrency(booking.priceCents)}</Text>
        </View>

        <View style={styles.actions}>
          {booking.addressLabel ? (
            <Pressable style={styles.actionButton} onPress={() => void handleOpenMaps()}>
              <MapPin size={18} color={colors.primaryStrong} />
              <Text style={styles.actionButtonLabel}>Como chegar</Text>
            </Pressable>
          ) : null}

          {booking.businessPhone ? (
            <Pressable style={styles.actionButton} onPress={() => void handleCall()}>
              <Phone size={18} color={colors.primaryStrong} />
              <Text style={styles.actionButtonLabel}>Ligar para o negocio</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={styles.actionButton}
            onPress={() => navigation.navigate("Reschedule", { appointmentId: booking.appointmentId })}
          >
            <RefreshCcw size={18} color={colors.primaryStrong} />
            <Text style={styles.actionButtonLabel}>Reagendar</Text>
          </Pressable>

          {booking.status !== "CANCELLED" ? (
            <Pressable
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleCancel}
              disabled={busyAction === "cancel"}
            >
              <XCircle size={18} color={colors.white} />
              <Text style={styles.dangerButtonLabel}>
                {busyAction === "cancel" ? "Cancelando..." : "Cancelar reserva"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  loadingText: {
    color: colors.textSoft,
    fontSize: 15,
    fontWeight: "700",
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  statusBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
    ...shadows.card,
  },
  statusBadgeText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  title: {
    color: colors.textDark,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
  },
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardPrimary: {
    color: colors.textDark,
    fontSize: 18,
    fontWeight: "800",
  },
  cardSecondary: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  price: {
    color: colors.textDark,
    fontSize: 24,
    fontWeight: "900",
    marginTop: spacing.sm,
  },
  actions: {
    gap: spacing.md,
  },
  actionButton: {
    minHeight: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.card,
  },
  actionButtonLabel: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "800",
  },
  dangerButton: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  dangerButtonLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
});
