import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ArrowLeft, MapPin, Phone } from "lucide-react-native";
import { AgendaCard } from "../../components/business/AgendaCard";
import { StatusBadge } from "../../components/business/StatusBadge";
import { fetchBusiness, fetchBusinessAgenda, updateBusinessAppointmentStatus } from "../../lib/api";
import { loadBusinessAppointmentNote, loadBusinessSession, saveBusinessAppointmentNote } from "../../lib/storage";
import { colors, radii, shadows, spacing } from "../../theme";
import type { BusinessAgendaItem, PublicBusiness } from "../../types";
import type { RootStackParamList } from "../../../App";

type Props = NativeStackScreenProps<RootStackParamList, "AppointmentDetail">;

function formatDateTime(start: string, end: string) {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  const startText = formatter.format(new Date(start));
  const endText = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(end));
  return `${startText} · até ${endText}`;
}

function formatDuration(start: string, end: string) {
  return `${Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)} min`;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function AppointmentDetailScreen({ route, navigation }: Props) {
  const { appointmentId, date } = route.params;
  const appointmentDate = date ?? new Date().toISOString().slice(0, 10);
  const [appointment, setAppointment] = useState<BusinessAgendaItem | null>(null);
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [busyStatus, setBusyStatus] = useState<BusinessAgendaItem["status"] | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [businessSlug, setBusinessSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const session = await loadBusinessSession();
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setSessionToken(session.token);
      setBusinessSlug(session.business.slug);
      const [agendaResult, businessResult, savedNote] = await Promise.all([
        fetchBusinessAgenda({ token: session.token, date: appointmentDate }),
        fetchBusiness(session.business.slug),
        loadBusinessAppointmentNote(appointmentId),
      ]);

      setAppointment(agendaResult.appointments.find((item) => item.id === appointmentId) ?? null);
      setBusiness(businessResult.business);
      setNote(savedNote);
    } finally {
      setLoading(false);
    }
  }, [appointmentDate, appointmentId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const mappedServiceId = useMemo(() => {
    if (!appointment || !business) return undefined;
    return business.services.find((service) => service.id === appointment.serviceId || service.name === appointment.serviceNameSnapshot)?.id;
  }, [appointment, business]);

  const previousVisits = 0;

  const handleStatusChange = useCallback(
    (status: BusinessAgendaItem["status"]) => {
      if (!appointment || !sessionToken) return;

      Alert.alert("Atualizar status", "Deseja aplicar essa mudanca agora?", [
        { text: "Voltar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              setBusyStatus(status);
              await updateBusinessAppointmentStatus({
                token: sessionToken,
                appointmentId: appointment.id,
                status,
              });
              setAppointment((current) => (current ? { ...current, status } : current));
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Nao foi possivel atualizar", error instanceof Error ? error.message : "Tente novamente.");
            } finally {
              setBusyStatus(null);
            }
          },
        },
      ]);
    },
    [appointment, sessionToken],
  );

  const saveNote = useCallback(async () => {
    if (!appointment) return;
    try {
      setSavingNote(true);
      await saveBusinessAppointmentNote(appointment.id, note);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setSavingNote(false);
    }
  }, [appointment, note]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.white} />
        </View>
      </SafeAreaView>
    );
  }

  if (!appointment) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.centerWrap}>
          <Text style={styles.emptyTitle}>Agendamento indisponivel</Text>
          <Text style={styles.emptyBody}>Nao encontramos esse atendimento na agenda atual.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const finished = appointment.status === "CANCELLED" || appointment.status === "CANCELED" || appointment.status === "NO_SHOW";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={18} color={colors.white} />
          </Pressable>
          <Text style={styles.title}>Detalhes do Agendamento</Text>
          <StatusBadge status={appointment.status} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.customerTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{appointment.customerNameSnapshot.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.customerCopy}>
              <Text style={styles.customerName}>{appointment.customerNameSnapshot}</Text>
              <Text style={styles.customerMeta}>{previousVisits} visitas anteriores</Text>
            </View>
          </View>

          <Pressable style={styles.callButton} onPress={() => void Linking.openURL(`tel:${appointment.customerPhoneSnapshot}`)}>
            <Phone size={16} color={colors.primaryStrong} />
            <Text style={styles.callButtonLabel}>Ligar agora</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Servico</Text>
          <Text style={styles.infoPrimary}>{appointment.serviceNameSnapshot}</Text>
          <Text style={styles.infoSecondary}>{formatDuration(appointment.startsAtUtc, appointment.endsAtUtc)}</Text>
          <Text style={styles.infoSecondary}>{appointment.professional.displayName}</Text>
          <Text style={styles.infoSecondary}>{formatDateTime(appointment.startsAtUtc, appointment.endsAtUtc)}</Text>
          <Text style={styles.infoPrice}>{formatCurrency(appointment.priceCents)}</Text>
          {business?.addressLine1 ? (
            <Pressable
              style={styles.linkRow}
              onPress={() =>
                void Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    [business.addressLine1, business.neighborhood, business.city, business.state].filter(Boolean).join(", "),
                  )}`,
                )
              }
            >
              <MapPin size={16} color={colors.primaryStrong} />
              <Text style={styles.linkRowText}>Como chegar</Text>
            </Pressable>
          ) : null}
        </View>

        {appointment.status === "PENDING" ? (
          <View style={styles.actionGroup}>
            <Pressable style={[styles.primaryButton, busyStatus && styles.buttonDisabled]} onPress={() => handleStatusChange("CONFIRMED")} disabled={busyStatus != null}>
              <Text style={styles.primaryButtonLabel}>{busyStatus === "CONFIRMED" ? "Atualizando..." : "Confirmar agendamento"}</Text>
            </Pressable>
            <Pressable style={styles.outlineDangerButton} onPress={() => handleStatusChange("CANCELLED")} disabled={busyStatus != null}>
              <Text style={styles.outlineDangerButtonLabel}>Cancelar agendamento</Text>
            </Pressable>
          </View>
        ) : null}

        {appointment.status === "CONFIRMED" ? (
          <View style={styles.actionGroup}>
            <Pressable style={[styles.primaryButton, busyStatus && styles.buttonDisabled]} onPress={() => handleStatusChange("COMPLETED")} disabled={busyStatus != null}>
              <Text style={styles.primaryButtonLabel}>{busyStatus === "COMPLETED" ? "Atualizando..." : "Marcar como concluido"}</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => handleStatusChange("NO_SHOW")} disabled={busyStatus != null}>
              <Text style={styles.secondaryButtonLabel}>Nao compareceu</Text>
            </Pressable>
            <Pressable style={styles.outlineDangerButton} onPress={() => handleStatusChange("CANCELLED")} disabled={busyStatus != null}>
              <Text style={styles.outlineDangerButtonLabel}>Cancelar agendamento</Text>
            </Pressable>
          </View>
        ) : null}

        {finished ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Agendamento encerrado</Text>
            <Text style={styles.infoSecondary}>Este agendamento foi encerrado e nao pode voltar para a agenda ativa.</Text>
            {businessSlug ? (
              <Pressable
                style={styles.primaryButton}
                onPress={() => navigation.navigate("Booking", { slug: businessSlug, serviceId: mappedServiceId })}
              >
                <Text style={styles.primaryButtonLabel}>Reagendar cliente</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Nota interna</Text>
          <TextInput
            multiline
            value={note}
            onChangeText={setNote}
            placeholder="Adicionar nota interna..."
            placeholderTextColor={colors.textMuted}
            style={styles.noteInput}
            textAlignVertical="top"
          />
          <Pressable style={[styles.secondaryButton, savingNote && styles.buttonDisabled]} onPress={() => void saveNote()} disabled={savingNote}>
            <Text style={styles.secondaryButtonLabel}>{savingNote ? "Salvando..." : "Salvar nota"}</Text>
          </Pressable>
        </View>

        <AgendaCard appointment={appointment} compact onPress={() => undefined} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerWrap: {
    flex: 1,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  header: {
    gap: spacing.md,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "900",
  },
  sectionCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    gap: spacing.md,
    ...shadows.card,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900",
  },
  customerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
  },
  avatarText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "900",
  },
  customerCopy: {
    flex: 1,
    gap: 4,
  },
  customerName: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900",
  },
  customerMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  callButton: {
    minHeight: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  callButtonLabel: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  infoPrimary: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "900",
  },
  infoSecondary: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  infoPrice: {
    color: colors.success,
    fontSize: 22,
    fontWeight: "900",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  linkRowText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  actionGroup: {
    gap: spacing.sm,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success,
  },
  primaryButtonLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
  },
  secondaryButtonLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  outlineDangerButton: {
    minHeight: 52,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.danger,
  },
  outlineDangerButtonLabel: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "800",
  },
  noteInput: {
    minHeight: 120,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
