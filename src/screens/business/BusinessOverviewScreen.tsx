import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, type CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { CalendarDays, CreditCard, LayoutDashboard, LocateFixed, Share2, Wallet } from "lucide-react-native";
import { AgendaCard } from "../../components/business/AgendaCard";
import { API_URL, fetchBusinessAgenda, fetchBusinessDashboard } from "../../lib/api";
import { loadBusinessSession } from "../../lib/storage";
import { colors, radii, shadows, spacing } from "../../theme";
import type { BusinessAgendaItem, BusinessDashboard, BusinessMobileSession } from "../../types";
import type { BusinessTabParamList, RootStackParamList } from "../../../App";

type Props = CompositeScreenProps<
  BottomTabScreenProps<BusinessTabParamList, "Overview">,
  NativeStackScreenProps<RootStackParamList>
>;

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Z";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function statusMeta(status?: string) {
  switch (status) {
    case "ACTIVE":
      return { label: "Ativo", backgroundColor: `${colors.success}16`, textColor: colors.success };
    case "PAUSED":
      return { label: "Pausado", backgroundColor: `${colors.warning}16`, textColor: colors.warning };
    default:
      return { label: "Em configuracao", backgroundColor: colors.surfaceMuted, textColor: colors.textSoft };
  }
}

function DashboardMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export function BusinessOverviewScreen({ navigation }: Props) {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [session, setSession] = useState<BusinessMobileSession | null>(null);
  const [dashboard, setDashboard] = useState<BusinessDashboard | null>(null);
  const [todayAgenda, setTodayAgenda] = useState<BusinessAgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOverview = useCallback(async (showLoader = true) => {
    const current = await loadBusinessSession();
    setSession(current);
    if (!current) {
      if (showLoader) setLoading(false);
      return;
    }

    try {
      if (showLoader) setLoading(true);
      const today = new Date().toISOString().slice(0, 10);
      const [dashboardResult, agendaResult] = await Promise.all([
        fetchBusinessDashboard(current.token),
        fetchBusinessAgenda({ token: current.token, date: today }),
      ]);
      setDashboard(dashboardResult);
      setTodayAgenda(agendaResult.appointments);
    } catch (error) {
      Alert.alert("Nao foi possivel atualizar", error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOverview();
    }, [loadOverview]),
  );

  const receivableToday = useMemo(
    () => todayAgenda.reduce((sum, appointment) => sum + appointment.priceCents, 0),
    [todayAgenda],
  );

  const accountStatus = statusMeta(session?.business.status);

  const openPanel = useCallback(async () => {
    await WebBrowser.openBrowserAsync(`${API_URL}/dashboard`);
  }, []);

  const shareBookingLink = useCallback(async () => {
    if (!session) return;
    await Share.share({
      title: "Meu link de agendamento",
      message: `${API_URL}/${session.business.slug}`,
    });
  }, [session]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.centerWrap}>
          <ActivityIndicator color={colors.white} />
        </View>
      </SafeAreaView>
    );
  }

  if (!session || !dashboard || !dashboard.business) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.centerWrap}>
          <Text style={styles.emptyTitle}>Sessao indisponivel</Text>
          <Text style={styles.emptyBody}>Faca login novamente para carregar a operacao mobile da empresa.</Text>
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
              await loadOverview(false);
              setRefreshing(false);
            }}
            tintColor={colors.white}
            colors={[colors.primaryStrong]}
          />
        }
      >
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            {dashboard.business.logoUrl ? (
              <View style={styles.logoWrap}>
                <Text style={styles.logoText}>{dashboard.business.name.slice(0, 1).toUpperCase()}</Text>
              </View>
            ) : (
              <View style={styles.logoWrap}>
                <Text style={styles.logoText}>{initials(dashboard.business.name)}</Text>
              </View>
            )}
            <View style={styles.headerCopy}>
              <Text style={styles.businessName}>{dashboard.business.name}</Text>
              <Text style={styles.locationText}>
                {[dashboard.business.city, dashboard.business.state].filter(Boolean).join(" · ") || "Endereco em configuracao"}
              </Text>
            </View>
          </View>
          <View style={[styles.accountStatusBadge, { backgroundColor: accountStatus.backgroundColor }]}>
            <Text style={[styles.accountStatusLabel, { color: accountStatus.textColor }]}>{accountStatus.label}</Text>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <DashboardMetric label="Agendamentos hoje" value={`${dashboard.summary.appointmentsToday}`} icon={<CalendarDays size={18} color={colors.primaryStrong} />} />
          <DashboardMetric label="Confirmados" value={`${dashboard.summary.confirmedToday}`} icon={<LocateFixed size={18} color={colors.success} />} />
          <DashboardMetric label="Faturamento do mes" value={formatCurrency(dashboard.summary.revenueMonthCents)} icon={<CreditCard size={18} color={colors.warning} />} />
          <DashboardMetric label="A receber hoje" value={formatCurrency(receivableToday)} icon={<Wallet size={18} color={colors.secondary} />} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Proximos agendamentos</Text>
          <Pressable onPress={() => navigation.navigate("Agenda")}>
            <Text style={styles.sectionLink}>Ver agenda completa</Text>
          </Pressable>
        </View>

        {dashboard.nextAppointments.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhum agendamento proximo</Text>
            <Text style={styles.emptyBody}>Assim que novos clientes reservarem horarios, eles aparecem aqui.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {dashboard.nextAppointments.slice(0, 5).map((item) => (
              <AgendaCard
                key={item.id}
                compact
                hidePrice
                appointment={{
                  id: item.id,
                  customerNameSnapshot: item.customerNameSnapshot,
                  customerPhoneSnapshot: "",
                  serviceNameSnapshot: item.serviceNameSnapshot,
                  startsAtUtc: item.startsAtUtc,
                  endsAtUtc: item.startsAtUtc,
                  status: item.status as BusinessAgendaItem["status"],
                  priceCents: 0,
                  professional: {
                    displayName: item.professional.displayName,
                    roleLabel: null,
                  },
                }}
                onPress={() =>
                  rootNavigation.navigate("AppointmentDetail", {
                    appointmentId: item.id,
                    date: item.startsAtUtc.slice(0, 10),
                  })
                }
              />
            ))}
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Acesso rapido</Text>
        </View>

        <View style={styles.quickGrid}>
          <Pressable style={styles.quickCard} onPress={() => rootNavigation.navigate("BusinessAvailability")}>
            <CalendarDays size={18} color={colors.primaryStrong} />
            <Text style={styles.quickTitle}>Disponibilidade</Text>
            <Text style={styles.quickBody}>Veja horarios da equipe.</Text>
          </Pressable>

          <Pressable style={styles.quickCard} onPress={() => rootNavigation.navigate("BusinessServices")}>
            <Wallet size={18} color={colors.primaryStrong} />
            <Text style={styles.quickTitle}>Servicos</Text>
            <Text style={styles.quickBody}>Consulte o catalogo ativo.</Text>
          </Pressable>

          <Pressable style={styles.quickCard} onPress={() => void openPanel()}>
            <LayoutDashboard size={18} color={colors.primaryStrong} />
            <Text style={styles.quickTitle}>Painel web</Text>
            <Text style={styles.quickBody}>Abra o painel completo.</Text>
          </Pressable>

          <Pressable style={styles.quickCard} onPress={() => void shareBookingLink()}>
            <Share2 size={18} color={colors.primaryStrong} />
            <Text style={styles.quickTitle}>Compartilhar link</Text>
            <Text style={styles.quickBody}>Envie sua pagina publica.</Text>
          </Pressable>
        </View>
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
  headerCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  logoWrap: {
    width: 60,
    height: 60,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
  },
  logoText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "900",
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  businessName: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "900",
  },
  locationText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  accountStatusBadge: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  accountStatusLabel: {
    fontSize: 12,
    fontWeight: "800",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  metricCard: {
    width: "47%",
    borderRadius: radii.xl,
    padding: spacing.md,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.sm,
  },
  metricLabel: {
    color: colors.textSoft,
    fontSize: 13,
    marginBottom: 4,
  },
  metricValue: {
    color: colors.textDark,
    fontSize: 24,
    fontWeight: "900",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "900",
  },
  sectionLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  emptyCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900",
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.xs,
  },
  list: {
    gap: spacing.md,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  quickCard: {
    width: "47%",
    borderRadius: radii.xl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  quickTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
  },
  quickBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
