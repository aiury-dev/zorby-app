import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, type CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { CalendarCheck } from "lucide-react-native";
import { TabBar } from "../../components/TabBar";
import { AgendaCard } from "../../components/business/AgendaCard";
import { fetchBusinessAgenda, updateBusinessAppointmentStatus } from "../../lib/api";
import { scheduleBusinessAlert } from "../../lib/notifications";
import { loadBusinessSession } from "../../lib/storage";
import { colors, radii, shadows, spacing } from "../../theme";
import type { BusinessAgendaItem, BusinessMobileSession } from "../../types";
import type { BusinessTabParamList, RootStackParamList } from "../../../App";

type Props = CompositeScreenProps<
  BottomTabScreenProps<BusinessTabParamList, "Agenda">,
  NativeStackScreenProps<RootStackParamList>
>;

type AgendaTabKey = "all" | "pending" | "confirmed";

const filterItems: Array<{ key: AgendaTabKey; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "pending", label: "Pendentes" },
  { key: "confirmed", label: "Confirmados" },
];

function buildDateOptions() {
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  });
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isSameDay(iso: string, key: string) {
  return iso.slice(0, 10) === key;
}

export function BusinessAgendaScreen({ navigation }: Props) {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [session, setSession] = useState<BusinessMobileSession | null>(null);
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [agendaByDate, setAgendaByDate] = useState<Record<string, BusinessAgendaItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<AgendaTabKey>("all");
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const lastNotificationSignature = useRef<string | null>(null);
  const dates = useMemo(() => buildDateOptions(), []);

  const loadAgenda = useCallback(async (showLoader = true) => {
    const current = await loadBusinessSession();
    setSession(current);
    if (!current) {
      if (showLoader) setLoading(false);
      return;
    }

    try {
      if (showLoader) setLoading(true);
      const entries = await Promise.all(
        dates.map(async (date) => {
          const key = toDateKey(date);
          const result = await fetchBusinessAgenda({ token: current.token, date: key }).catch(() => ({ appointments: [] as BusinessAgendaItem[] }));
          return [key, result.appointments] as const;
        }),
      );

      setAgendaByDate(Object.fromEntries(entries));
    } catch (error) {
      Alert.alert("Nao foi possivel carregar a agenda", error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [dates]);

  useFocusEffect(
    useCallback(() => {
      void loadAgenda();
    }, [loadAgenda]),
  );

  const currentAgenda = agendaByDate[selectedDate] ?? [];

  const filteredAgenda = useMemo(() => {
    if (activeTab === "pending") {
      return currentAgenda.filter((item) => item.status === "PENDING");
    }

    if (activeTab === "confirmed") {
      return currentAgenda.filter((item) => item.status === "CONFIRMED");
    }

    return currentAgenda;
  }, [activeTab, currentAgenda]);

  const tabItems = useMemo(
    () =>
      filterItems.map((item) => ({
        key: item.key,
        label: item.label,
        count:
          item.key === "all"
            ? currentAgenda.length
            : currentAgenda.filter((entry) => (item.key === "pending" ? entry.status === "PENDING" : entry.status === "CONFIRMED")).length,
      })),
    [currentAgenda],
  );

  useEffect(() => {
    const todayKey = toDateKey(new Date());
    if (selectedDate !== todayKey) return;

    const pendingSoon = currentAgenda.filter((item) => {
      if (item.status !== "PENDING") return false;
      const startsAt = new Date(item.startsAtUtc).getTime();
      const now = Date.now();
      return startsAt > now && startsAt - now <= 2 * 60 * 60 * 1000;
    });

    if (pendingSoon.length === 0 || !session) return;

    const signature = `${todayKey}:${pendingSoon.length}`;
    if (lastNotificationSignature.current === signature) return;
    lastNotificationSignature.current = signature;

    void (async () => {
      const permission = await Notifications.getPermissionsAsync();
      if (permission.status !== "granted") {
        const requested = await Notifications.requestPermissionsAsync();
        if (requested.status !== "granted") return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Pendencias para confirmar",
          body: `Voce tem ${pendingSoon.length} agendamento(s) pendente(s) nas proximas 2 horas.`,
        },
        trigger: null,
      });
    })();
  }, [currentAgenda, selectedDate, session]);

  const handleStatusUpdate = useCallback(
    (appointmentId: string, status: BusinessAgendaItem["status"]) => {
      if (!session) return;

      Alert.alert("Confirmar acao", "Deseja atualizar o status deste agendamento agora?", [
        { text: "Voltar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              setBusyActionId(appointmentId);
              await updateBusinessAppointmentStatus({
                token: session.token,
                appointmentId,
                status,
              });

              setAgendaByDate((current) => ({
                ...current,
                [selectedDate]: (current[selectedDate] ?? []).map((entry) =>
                  entry.id === appointmentId ? { ...entry, status } : entry,
                ),
              }));
              if (status === "CONFIRMED") {
                const appointment = (agendaByDate[selectedDate] ?? []).find((entry) => entry.id === appointmentId);
                if (appointment) {
                  await scheduleBusinessAlert(
                    `Agendamento confirmado para ${appointment.customerNameSnapshot}`,
                    appointmentId,
                  );
                }
              }
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Nao foi possivel atualizar", error instanceof Error ? error.message : "Tente novamente.");
            } finally {
              setBusyActionId(null);
            }
          },
        },
      ]);
    },
    [agendaByDate, selectedDate, session],
  );

  const nextDateWithAgenda = dates.find((date) => {
    const key = toDateKey(date);
    return key !== selectedDate && (agendaByDate[key]?.length ?? 0) > 0;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.white} />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.centerWrap}>
          <Text style={styles.emptyTitle}>Sessao indisponivel</Text>
          <Text style={styles.emptyBody}>Entre novamente para acessar a agenda mobile da empresa.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await loadAgenda(false);
              setRefreshing(false);
            }}
            tintColor={colors.white}
            colors={[colors.primaryStrong]}
          />
        }
      >
        <Text style={styles.title}>Agenda</Text>
        <Text style={styles.subtitle}>Confirme quem vai chegar, acompanhe o ritmo do dia e ajuste o status de cada atendimento.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
          {dates.map((date) => {
            const key = toDateKey(date);
            const count = agendaByDate[key]?.length ?? 0;
            const active = key === selectedDate;
            return (
              <Pressable key={key} onPress={() => setSelectedDate(key)} style={[styles.dateChip, active && styles.dateChipActive]}>
                <Text style={[styles.dateWeekday, active && styles.dateTextActive]}>
                  {key === toDateKey(new Date()) ? "Hoje" : new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date)}
                </Text>
                <Text style={[styles.dateDay, active && styles.dateTextActive]}>
                  {new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date)}
                </Text>
                <Text style={[styles.dateCount, active && styles.dateCountActive]}>{count}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <TabBar items={tabItems} value={activeTab} onChange={(key) => {
          setActiveTab(key);
          void Haptics.selectionAsync();
        }} />

        {filteredAgenda.length === 0 ? (
          <View style={styles.emptyCard}>
            <CalendarCheck size={34} color={colors.primaryStrong} />
            <Text style={styles.emptyTitle}>Nenhum agendamento para este dia</Text>
            <Text style={styles.emptyBody}>Quando houver reservas nesta data, elas aparecerao aqui com acoes rapidas.</Text>
            {nextDateWithAgenda ? (
              <Pressable style={styles.emptyButton} onPress={() => setSelectedDate(toDateKey(nextDateWithAgenda))}>
                <Text style={styles.emptyButtonLabel}>Ver proximo dia com agenda</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.list}>
            {filteredAgenda.map((appointment) => (
              <AgendaCard
                key={appointment.id}
                appointment={appointment}
                onPress={() => rootNavigation.navigate("AppointmentDetail", { appointmentId: appointment.id, date: selectedDate })}
                onConfirm={appointment.status === "PENDING" && busyActionId !== appointment.id ? () => handleStatusUpdate(appointment.id, "CONFIRMED") : undefined}
                onCancel={
                  appointment.status !== "CANCELLED" && appointment.status !== "CANCELED" && busyActionId !== appointment.id
                    ? () => handleStatusUpdate(appointment.id, "CANCELLED")
                    : undefined
                }
              />
            ))}
          </View>
        )}
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
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  title: {
    color: colors.white,
    fontSize: 30,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  dateRow: {
    gap: spacing.sm,
    paddingBottom: spacing.xs,
  },
  dateChip: {
    width: 86,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    gap: 2,
  },
  dateChipActive: {
    backgroundColor: colors.primaryStrong,
    borderColor: colors.primaryStrong,
  },
  dateWeekday: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  dateDay: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "900",
  },
  dateCount: {
    minWidth: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    textAlign: "center",
    textAlignVertical: "center",
    color: colors.textDark,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
  },
  dateTextActive: {
    color: colors.white,
  },
  dateCountActive: {
    backgroundColor: colors.white,
    color: colors.primaryStrong,
  },
  emptyCard: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
  emptyButton: {
    minHeight: 48,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
    marginTop: spacing.md,
  },
  emptyButtonLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  list: {
    gap: spacing.md,
  },
});
