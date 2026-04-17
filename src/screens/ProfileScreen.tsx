import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useNavigation, type CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { Bell, ChevronRight, Heart, LogOut, Mail, Phone, ShieldCheck, User } from "lucide-react-native";
import { fetchDiscoveryBusinesses } from "../lib/api";
import { fetchCustomerPayments } from "../lib/payments";
import {
  cancelAllBookingReminders,
  deletePushTokenFromBackend,
  loadStoredPushToken,
  markNotificationsPrompted,
  registerForPushNotificationsAsync,
  savePushTokenToBackend,
} from "../lib/notifications";
import {
  clearSavedProfile,
  loadAppPreferences,
  loadCustomerSession,
  loadFavorites,
  loadSavedBookings,
  loadSavedProfile,
  saveAppPreferences,
  saveProfile,
} from "../lib/storage";
import { colors, radii, shadows, spacing } from "../theme";
import type { CustomerPayment, DiscoveryBusiness, SavedBooking, SavedProfile } from "../types";
import { EmptyState } from "../components/EmptyState";
import type { CustomerTabParamList, RootStackParamList } from "../../App";

type Props = CompositeScreenProps<
  BottomTabScreenProps<CustomerTabParamList, "Profile">,
  NativeStackScreenProps<RootStackParamList>
>;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Z";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function ProfileMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function FavoriteBusinessRow({
  business,
  onPress,
}: {
  business: DiscoveryBusiness;
  onPress: () => void;
}) {
  const minPrice = business.services.length > 0 ? Math.min(...business.services.map((service) => service.priceCents)) : null;

  return (
    <Pressable style={styles.favoriteRow} onPress={onPress}>
      <View style={styles.favoriteLogo}>
        <Text style={styles.favoriteLogoText}>{business.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.favoriteContent}>
        <Text style={styles.favoriteName}>{business.name}</Text>
        <Text style={styles.favoriteMeta}>{business.addressLabel}</Text>
        <Text style={styles.favoriteMeta}>
          {business.averageRating ? `${business.averageRating.toFixed(1)} ★` : "Novo"} ·{" "}
          {minPrice != null
            ? new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(minPrice / 100)
            : "Valor sob consulta"}
        </Text>
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export function ProfileScreen({ navigation }: Props) {
  const rootNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profile, setProfile] = useState<SavedProfile>({ name: "", email: "", phone: "" });
  const [draftProfile, setDraftProfile] = useState<SavedProfile>({ name: "", email: "", phone: "" });
  const [bookings, setBookings] = useState<SavedBooking[]>([]);
  const [favorites, setFavorites] = useState<DiscoveryBusiness[]>([]);
  const [payments, setPayments] = useState<CustomerPayment[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProfileData = useCallback(async () => {
    const [savedProfile, savedBookings, favoriteSlugs, preferences, discovery] = await Promise.all([
      loadSavedProfile(),
      loadSavedBookings(),
      loadFavorites(),
      loadAppPreferences(),
      fetchDiscoveryBusinesses().catch(() => ({ businesses: [] as DiscoveryBusiness[] })),
    ]);
    const customerSession = await loadCustomerSession();
    const remotePayments = customerSession
      ? await fetchCustomerPayments(customerSession.token).catch(() => ({ payments: [] as CustomerPayment[] }))
      : { payments: [] as CustomerPayment[] };

    setProfile(savedProfile);
    setDraftProfile(savedProfile);
    setBookings(savedBookings);
    setNotificationsEnabled(preferences.notificationsEnabled);
    setFavorites(discovery.businesses.filter((business) => favoriteSlugs.includes(business.slug)));
    setPayments(remotePayments.payments);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfileData();
    }, [loadProfileData]),
  );

  const metrics = useMemo(() => {
    const total = bookings.length;
    const completed = bookings.filter(
      (booking) => booking.status !== "CANCELLED" && new Date(booking.startsAt).getTime() < Date.now(),
    ).length;

    return {
      total,
      completed,
      favorites: favorites.length,
    };
  }, [bookings, favorites.length]);

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      await saveProfile(draftProfile);
      setProfile(draftProfile);
      setEditing(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationsToggle = async (value: boolean) => {
    if (value) {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        setNotificationsEnabled(false);
        await saveAppPreferences({ notificationsEnabled: false });
        Alert.alert(
          "Ative as notificacoes",
          "Para receber lembretes e confirmacoes, habilite as notificacoes nas configuracoes do aparelho.",
          [
            { text: "Agora nao", style: "cancel" },
            {
              text: "Ativar",
              onPress: () => {
                void Linking.openURL("app-settings:");
              },
            },
          ],
        );
        return;
      }

      setNotificationsEnabled(true);
      await saveAppPreferences({ notificationsEnabled: true });
      await markNotificationsPrompted();
      await savePushTokenToBackend(token);
      void Haptics.selectionAsync();
      return;
    }

    const token = await loadStoredPushToken();
    setNotificationsEnabled(false);
    await saveAppPreferences({ notificationsEnabled: false });
    await cancelAllBookingReminders();
    if (token) {
      await deletePushTokenFromBackend(token);
    }
    void Haptics.selectionAsync();
  };

  const handleSignOut = () => {
    Alert.alert("Sair do app", "Seus dados locais de perfil serao removidos deste aparelho.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await clearSavedProfile();
          rootNavigation.reset({
            index: 0,
            routes: [{ name: "Welcome" }],
          });
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(profile.name || "Cliente Zorby")}</Text>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{profile.name || "Seu perfil Zorby"}</Text>
            <Text style={styles.heroSubtitle}>{profile.email || "Adicione seu e-mail para acelerar futuras reservas"}</Text>
          </View>
          <Pressable style={styles.editButton} onPress={() => setEditing(true)}>
            <Text style={styles.editButtonText}>Editar perfil</Text>
          </Pressable>
        </View>

        <View style={styles.metricsRow}>
          <ProfileMetric label="Reservas" value={String(metrics.total)} />
          <ProfileMetric label="Concluidos" value={String(metrics.completed)} />
          <ProfileMetric label="Favoritos" value={String(metrics.favorites)} />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Favoritos</Text>
            <Heart size={18} color={colors.primaryStrong} />
          </View>
          {favorites.length === 0 ? (
            <EmptyState
              icon={<Heart size={28} color={colors.primaryStrong} />}
              title="Nenhum favorito salvo"
              subtitle="Quando voce favoritar um negocio em Explorar, ele aparece aqui."
            />
          ) : (
            <View style={styles.favoriteList}>
              {favorites.map((business) => (
                <FavoriteBusinessRow
                  key={business.id}
                  business={business}
                  onPress={() => navigation.navigate("Business", { slug: business.slug })}
                />
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Preferencias</Text>
            <Bell size={18} color={colors.primaryStrong} />
          </View>

          <View style={styles.preferenceRow}>
            <View style={styles.preferenceCopy}>
              <Text style={styles.preferenceTitle}>Receber notificacoes</Text>
              <Text style={styles.preferenceBody}>Preparado para avisos de lembrete e atualizacoes do agendamento.</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={(value) => void handleNotificationsToggle(value)}
              trackColor={{ false: colors.borderStrong, true: `${colors.primaryStrong}66` }}
              thumbColor={notificationsEnabled ? colors.primaryStrong : colors.white}
            />
          </View>

          <Pressable style={styles.linkRow} onPress={() => void WebBrowser.openBrowserAsync("https://zorby-web.onrender.com/privacy")}>
            <ShieldCheck size={18} color={colors.primaryStrong} />
            <Text style={styles.linkRowText}>Politica de privacidade</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>

          <Pressable style={styles.linkRow} onPress={() => void WebBrowser.openBrowserAsync("https://zorby-web.onrender.com/terms")}>
            <ShieldCheck size={18} color={colors.primaryStrong} />
            <Text style={styles.linkRowText}>Termos de uso</Text>
            <ChevronRight size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pagamentos</Text>
            <Mail size={18} color={colors.primaryStrong} />
          </View>
          {payments.length === 0 ? (
            <Text style={styles.preferenceBody}>Seus pagamentos confirmados e reembolsos vão aparecer aqui.</Text>
          ) : (
            <View style={styles.favoriteList}>
              {payments.map((payment) => (
                <View key={payment.id} style={styles.linkRow}>
                  <View style={styles.preferenceCopy}>
                    <Text style={styles.preferenceTitle}>{payment.businessName}</Text>
                    <Text style={styles.preferenceBody}>
                      {new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(payment.paidAt))}
                    </Text>
                  </View>
                  <View style={styles.paymentMeta}>
                    <Text style={styles.preferenceTitle}>
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(payment.amountCents / 100)}
                    </Text>
                    <Text style={styles.paymentStatus}>{payment.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Area profissional</Text>
            <User size={18} color={colors.primaryStrong} />
          </View>
          <Text style={styles.preferenceBody}>
            Empresa ou profissional tambem entram por aqui para acompanhar agenda do dia, operacao e conta.
          </Text>
          <Pressable style={styles.professionalButton} onPress={() => navigation.navigate("BusinessLogin")}>
            <Text style={styles.professionalButtonText}>Entrar como empresa</Text>
          </Pressable>
        </View>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={18} color={colors.danger} />
          <Text style={styles.signOutLabel}>Sair</Text>
        </Pressable>
      </ScrollView>

      <Modal transparent visible={editing} animationType="fade" onRequestClose={() => setEditing(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditing(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Editar perfil</Text>

            <View style={styles.inputGroup}>
              <View style={styles.inputWrap}>
                <User size={16} color={colors.textMuted} />
                <TextInput
                  value={draftProfile.name}
                  onChangeText={(value) => setDraftProfile((current) => ({ ...current, name: value }))}
                  placeholder="Nome completo"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>

              <View style={styles.inputWrap}>
                <Mail size={16} color={colors.textMuted} />
                <TextInput
                  value={draftProfile.email}
                  onChangeText={(value) => setDraftProfile((current) => ({ ...current, email: value }))}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="E-mail"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>

              <View style={styles.inputWrap}>
                <Phone size={16} color={colors.textMuted} />
                <TextInput
                  value={draftProfile.phone}
                  onChangeText={(value) => setDraftProfile((current) => ({ ...current, phone: value }))}
                  keyboardType="phone-pad"
                  placeholder="Telefone"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <Pressable style={styles.modalSecondaryButton} onPress={() => setEditing(false)}>
                <Text style={styles.modalSecondaryButtonLabel}>Cancelar</Text>
              </Pressable>
              <Pressable style={[styles.modalPrimaryButton, saving && styles.modalPrimaryButtonDisabled]} onPress={() => void handleSaveProfile()} disabled={saving}>
                <Text style={styles.modalPrimaryButtonLabel}>{saving ? "Salvando..." : "Salvar perfil"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  heroCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceCard,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.hero,
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
    fontSize: 26,
    fontWeight: "900",
  },
  heroCopy: {
    gap: 4,
  },
  heroTitle: {
    color: colors.textDark,
    fontSize: 28,
    fontWeight: "900",
  },
  heroSubtitle: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  editButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonText: {
    color: colors.textDark,
    fontSize: 13,
    fontWeight: "800",
  },
  metricsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCard,
    padding: spacing.md,
    ...shadows.card,
  },
  metricValue: {
    color: colors.textDark,
    fontSize: 24,
    fontWeight: "900",
  },
  metricLabel: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  sectionCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceCard,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.textDark,
    fontSize: 20,
    fontWeight: "900",
  },
  favoriteList: {
    gap: spacing.sm,
  },
  favoriteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  favoriteLogo: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
  },
  favoriteLogoText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900",
  },
  favoriteContent: {
    flex: 1,
    gap: 4,
  },
  favoriteName: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: "800",
  },
  favoriteMeta: {
    color: colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
  },
  preferenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  preferenceCopy: {
    flex: 1,
    gap: 4,
  },
  preferenceTitle: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: "800",
  },
  preferenceBody: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  linkRow: {
    minHeight: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  linkRowText: {
    flex: 1,
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "700",
  },
  paymentMeta: {
    alignItems: "flex-end",
    gap: 4,
  },
  paymentStatus: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  professionalButton: {
    minHeight: 52,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
  },
  professionalButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  signOutButton: {
    minHeight: 52,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    flexDirection: "row",
    backgroundColor: `${colors.danger}10`,
    borderWidth: 1,
    borderColor: `${colors.danger}20`,
  },
  signOutLabel: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: `${colors.background}73`,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceCard,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.hero,
  },
  modalTitle: {
    color: colors.textDark,
    fontSize: 24,
    fontWeight: "900",
  },
  inputGroup: {
    gap: spacing.sm,
  },
  inputWrap: {
    minHeight: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    color: colors.textDark,
    fontSize: 15,
    paddingVertical: spacing.md,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  modalSecondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  modalSecondaryButtonLabel: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "800",
  },
  modalPrimaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
  },
  modalPrimaryButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  modalPrimaryButtonLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
});
