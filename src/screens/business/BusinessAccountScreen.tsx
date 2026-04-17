import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, type CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { ChevronRight, ExternalLink, LifeBuoy, LogOut, Share2 } from "lucide-react-native";
import { API_URL, fetchBusinessDashboard } from "../../lib/api";
import { clearBusinessSession, loadBusinessSession } from "../../lib/storage";
import { colors, radii, shadows, spacing } from "../../theme";
import type { BusinessDashboard, BusinessMobileSession } from "../../types";
import type { BusinessTabParamList, RootStackParamList } from "../../../App";

type Props = CompositeScreenProps<
  BottomTabScreenProps<BusinessTabParamList, "Account">,
  NativeStackScreenProps<RootStackParamList>
>;

function statusLabel(step?: string) {
  switch (step) {
    case "COMPLETED":
      return "Configuracao concluida";
    case "LINK":
      return "Falta publicar o link";
    case "AVAILABILITY":
      return "Falta disponibilidade";
    case "SERVICES":
      return "Falta cadastrar servicos";
    default:
      return "Primeiros passos em andamento";
  }
}

function businessStatusMeta(status?: string) {
  switch (status) {
    case "ACTIVE":
      return { label: "Ativo", backgroundColor: `${colors.success}16`, textColor: colors.success };
    case "PAUSED":
      return { label: "Pausado", backgroundColor: `${colors.warning}16`, textColor: colors.warning };
    default:
      return { label: "Em configuracao", backgroundColor: colors.surfaceMuted, textColor: colors.textSoft };
  }
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Z";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function BusinessAccountScreen() {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [session, setSession] = useState<BusinessMobileSession | null>(null);
  const [dashboard, setDashboard] = useState<BusinessDashboard | null>(null);

  const loadData = useCallback(async () => {
    const current = await loadBusinessSession();
    setSession(current);
    if (!current) return;
    const result = await fetchBusinessDashboard(current.token).catch(() => null);
    setDashboard(result);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const business = dashboard?.business ?? null;
  const publicLink = session ? `${API_URL}/${session.business.slug}` : null;
  const currentBusinessStatus = businessStatusMeta(session?.business.status);

  const handleLogout = useCallback(() => {
    Alert.alert("Sair da conta empresa", "Deseja encerrar a sessao desta empresa neste aparelho?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await clearBusinessSession();
          rootNavigation.replace("Welcome");
        },
      },
    ]);
  }, [rootNavigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(session?.business.name || "Empresa")}</Text>
          </View>
          <Text style={styles.businessName}>{session?.business.name || "Conta empresa"}</Text>
          <Text style={styles.slugText}>/{session?.business.slug || "slug-indisponivel"}</Text>
          <Text style={styles.roleText}>{session?.user.role || "BUSINESS_OWNER"}</Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Status da conta</Text>
          <Text style={styles.infoLabel}>Etapa atual</Text>
          <Text style={styles.infoValue}>{statusLabel(session?.business.onboardingStep)}</Text>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Agendamento publico</Text>
            <View style={[styles.readOnlyToggle, { backgroundColor: business?.publicBookingEnabled ? `${colors.success}18` : colors.surfaceMuted }]}>
              <Text style={[styles.readOnlyToggleText, { color: business?.publicBookingEnabled ? colors.success : colors.textSoft }]}>
                {business?.publicBookingEnabled ? "Ativo" : "Desativado"}
              </Text>
            </View>
          </View>

          {business?.publicBookingPaused ? (
            <View style={styles.pauseNotice}>
              <Text style={styles.pauseNoticeText}>Seu link publico esta pausado no momento.</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Informacoes</Text>
          <Text style={styles.infoLabel}>Email do usuario</Text>
          <Text style={styles.infoValue}>{session?.user.email || "-"}</Text>
          <Text style={styles.infoLabel}>Nome do usuario</Text>
          <Text style={styles.infoValue}>{session?.user.name || "Sem nome definido"}</Text>
          {session?.business.status ? (
            <View style={[styles.businessStatusBadge, { backgroundColor: currentBusinessStatus.backgroundColor }]}>
              <Text style={[styles.businessStatusBadgeText, { color: currentBusinessStatus.textColor }]}>
                {currentBusinessStatus.label}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Links rapidos</Text>

          <Pressable style={styles.linkRow} onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/dashboard`)}>
            <ExternalLink size={18} color={colors.primaryStrong} />
            <Text style={styles.linkText}>Acessar painel web completo</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>

          <Pressable
            style={styles.linkRow}
            onPress={async () => {
              if (!publicLink) return;
              await WebBrowser.openBrowserAsync(publicLink);
            }}
          >
            <ExternalLink size={18} color={colors.primaryStrong} />
            <Text style={styles.linkText}>Pagina publica de agendamento</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>

          <Pressable
            style={styles.linkRow}
            onPress={async () => {
              if (!publicLink) return;
              await Share.share({
                title: "Link publico de agendamento",
                message: publicLink,
              });
            }}
          >
            <Share2 size={18} color={colors.primaryStrong} />
            <Text style={styles.linkText}>Compartilhar link publico</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>

          <Pressable style={styles.linkRow} onPress={() => void WebBrowser.openBrowserAsync("mailto:suporte@zorby.app")}>
            <LifeBuoy size={18} color={colors.primaryStrong} />
            <Text style={styles.linkText}>Suporte</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        <Pressable style={styles.signOutButton} onPress={handleLogout}>
          <LogOut size={18} color={colors.danger} />
          <Text style={styles.signOutLabel}>Sair da conta empresa</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  heroCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.card,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
  },
  avatarText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "900",
  },
  businessName: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  slugText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  roleText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
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
    fontSize: 20,
    fontWeight: "900",
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  infoValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  businessStatusBadge: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  businessStatusBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  toggleLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  readOnlyToggle: {
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  readOnlyToggleText: {
    fontSize: 12,
    fontWeight: "800",
  },
  pauseNotice: {
    borderRadius: radii.lg,
    backgroundColor: `${colors.warning}16`,
    padding: spacing.md,
  },
  pauseNoticeText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: "700",
  },
  linkRow: {
    minHeight: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  linkText: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  signOutButton: {
    minHeight: 54,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: `${colors.danger}12`,
    borderWidth: 1,
    borderColor: `${colors.danger}22`,
  },
  signOutLabel: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "800",
  },
});
