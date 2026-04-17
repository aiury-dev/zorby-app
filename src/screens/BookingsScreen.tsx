import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, type CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { CalendarDays, CalendarX, Check, CheckCircle2, Star, ThumbsUp } from "lucide-react-native";
import { BookingCard } from "../components/BookingCard";
import { EmptyState } from "../components/EmptyState";
import { TabBar } from "../components/TabBar";
import { submitReview } from "../lib/api";
import { getScheduledReminders, scheduleBookingReminder } from "../lib/notifications";
import { loadSavedBookings, updateSavedBooking } from "../lib/storage";
import { colors, radii, shadows, spacing } from "../theme";
import type { SavedBooking } from "../types";
import type { CustomerTabParamList, RootStackParamList } from "../../App";

type Props = CompositeScreenProps<
  BottomTabScreenProps<CustomerTabParamList, "Bookings">,
  NativeStackScreenProps<RootStackParamList>
>;

type BookingTabKey = "upcoming" | "completed" | "cancelled";

const badgeItems: Array<{ key: BookingTabKey; label: string }> = [
  { key: "upcoming", label: "Proximos" },
  { key: "completed", label: "Concluidos" },
  { key: "cancelled", label: "Cancelados" },
];

function startOfNow() {
  return new Date().toISOString();
}

function normalizeDate(iso: string) {
  return new Date(iso).getTime();
}

function useShimmerValue() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return opacity;
}

function BookingCardSkeleton({ opacity }: { opacity: Animated.Value }) {
  return (
    <Animated.View style={[styles.skeletonCard, { opacity }]}>
      <View style={styles.skeletonDate} />
      <View style={styles.skeletonBody}>
        <View style={[styles.skeletonLine, styles.skeletonLineLg]} />
        <View style={[styles.skeletonLine, styles.skeletonLineMd]} />
        <View style={[styles.skeletonLine, styles.skeletonLineSm]} />
      </View>
    </Animated.View>
  );
}

function ReviewModal({
  booking,
  visible,
  onClose,
  onSubmitted,
}: {
  booking: SavedBooking | null;
  visible: boolean;
  onClose: () => void;
  onSubmitted: (booking: SavedBooking) => void;
}) {
  const translateY = useRef(new Animated.Value(480)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const scales = useRef(Array.from({ length: 5 }, () => new Animated.Value(1))).current;

  useEffect(() => {
    if (visible) {
      setSent(false);
      setRating(0);
      setBody("");
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 180,
          mass: 0.85,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      translateY.setValue(480);
      overlayOpacity.setValue(0);
    }
  }, [overlayOpacity, translateY, visible]);

  const animateStar = (index: number) => {
    const target = scales[index];
    Animated.sequence([
      Animated.spring(target, {
        toValue: 1.18,
        useNativeDriver: true,
        damping: 10,
        stiffness: 220,
      }),
      Animated.spring(target, {
        toValue: 1,
        useNativeDriver: true,
        damping: 10,
        stiffness: 220,
      }),
    ]).start();
  };

  const handleRate = (value: number) => {
    setRating(value);
    void Haptics.selectionAsync();
    animateStar(value - 1);
  };

  const handleSubmit = async () => {
    if (!booking || rating === 0) {
      Alert.alert("Escolha uma nota", "Selecione de 1 a 5 estrelas para enviar sua avaliacao.");
      return;
    }

    try {
      setSubmitting(true);
      await submitReview({
        appointmentId: booking.appointmentId,
        rating,
        body: body.trim() || undefined,
        cancelToken: booking.cancelToken,
      });

      const nextBooking = {
        ...booking,
        customerRating: rating,
        customerReviewBody: body.trim() || undefined,
        reviewedAt: new Date().toISOString(),
      } satisfies SavedBooking;

      await updateSavedBooking(booking.appointmentId, () => nextBooking);
      setSent(true);
      onSubmitted(nextBooking);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert("Nao foi possivel enviar", error instanceof Error ? error.message : "Tente novamente em alguns instantes.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!booking) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Animated.View style={[styles.modalOverlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.modalCard, { transform: [{ translateY }] }]}>
          {sent ? (
            <View style={styles.reviewSuccess}>
              <View style={styles.reviewSuccessIcon}>
                <Check size={28} color={colors.white} />
              </View>
              <Text style={styles.reviewSuccessTitle}>Obrigado pela avaliacao!</Text>
              <Text style={styles.reviewSuccessBody}>Seu feedback ajuda outros clientes a escolher melhor.</Text>
              <Pressable style={styles.reviewPrimaryButton} onPress={onClose}>
                <Text style={styles.reviewPrimaryButtonLabel}>Fechar</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.modalTitle}>Avaliar atendimento</Text>
              <Text style={styles.modalSubtitle}>
                {booking.businessName} · {booking.serviceName}
              </Text>

              <View style={styles.starRow}>
                {scales.map((scale, index) => {
                  const filled = index < rating;
                  return (
                    <Pressable key={`${booking.appointmentId}-star-${index}`} onPress={() => handleRate(index + 1)}>
                      <Animated.View style={{ transform: [{ scale }] }}>
                        <Star
                          size={36}
                          color={filled ? colors.warning : colors.borderStrong}
                          fill={filled ? colors.warning : "transparent"}
                        />
                      </Animated.View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.reviewInputWrap}>
                <TextInput
                  multiline
                  maxLength={300}
                  value={body}
                  onChangeText={setBody}
                  placeholder="Conte sua experiencia (opcional)"
                  placeholderTextColor={colors.textMuted}
                  style={styles.reviewInput}
                  textAlignVertical="top"
                />
                <Text style={styles.reviewCounter}>{body.length}/300</Text>
              </View>

              <View style={styles.reviewActions}>
                <Pressable
                  style={[styles.reviewPrimaryButton, submitting && styles.reviewPrimaryButtonDisabled]}
                  onPress={() => void handleSubmit()}
                  disabled={submitting}
                >
                  {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.reviewPrimaryButtonLabel}>Enviar avaliacao</Text>}
                </Pressable>

                <Pressable style={styles.reviewSecondaryButton} onPress={onClose}>
                  <Text style={styles.reviewSecondaryButtonLabel}>Agora nao</Text>
                </Pressable>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

export function BookingsScreen({ navigation }: Props) {
  const [activeTab, setActiveTab] = useState<BookingTabKey>("upcoming");
  const [bookings, setBookings] = useState<SavedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<SavedBooking | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const shimmerOpacity = useShimmerValue();

  const loadBookings = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      const saved = await loadSavedBookings();
      setBookings(saved);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  const showToast = useCallback((messageVisible: boolean) => {
    setToastVisible(messageVisible);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.delay(1400),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setToastVisible(false));
  }, [toastOpacity]);

  useFocusEffect(
    useCallback(() => {
      void loadBookings();
    }, [loadBookings]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBookings(false);
    setRefreshing(false);
    showToast(true);
  }, [loadBookings, showToast]);

  const nowIso = startOfNow();

  const classified = useMemo(() => {
    const upcoming = bookings
      .filter((booking) => booking.startsAt > nowIso && booking.status !== "CANCELLED")
      .sort((left, right) => normalizeDate(left.startsAt) - normalizeDate(right.startsAt));

    const completed = bookings
      .filter((booking) => booking.startsAt <= nowIso && booking.status !== "CANCELLED")
      .sort((left, right) => normalizeDate(right.startsAt) - normalizeDate(left.startsAt));

    const cancelled = bookings
      .filter((booking) => booking.status === "CANCELLED")
      .sort((left, right) => normalizeDate(right.startsAt) - normalizeDate(left.startsAt));

    return { upcoming, completed, cancelled };
  }, [bookings, nowIso]);

  const activeData = classified[activeTab];

  useEffect(() => {
    void (async () => {
      const scheduled = await getScheduledReminders();
      const scheduledIds = new Set(
        scheduled
          .filter((entry) => entry.type === "booking_reminder" && entry.appointmentId)
          .map((entry) => entry.appointmentId as string),
      );

      await Promise.all(
        classified.upcoming
          .filter((booking) => !scheduledIds.has(booking.appointmentId))
          .map((booking) => scheduleBookingReminder(booking)),
      );
    })();
  }, [classified.upcoming]);

  const tabItems = useMemo(
    () =>
      badgeItems.map((item) => ({
        key: item.key,
        label: item.label,
        count: classified[item.key].length,
      })),
    [classified],
  );

  const handleChangeTab = (key: BookingTabKey) => {
    setActiveTab(key);
    void Haptics.selectionAsync();
  };

  const emptyState = useMemo(() => {
    if (activeTab === "completed") {
      return {
        icon: <CheckCircle2 size={30} color={colors.success} />,
        title: "Nenhum servico concluido ainda",
        subtitle: "Seus agendamentos finalizados aparecerao aqui",
      };
    }

    if (activeTab === "cancelled") {
      return {
        icon: <ThumbsUp size={30} color={colors.success} />,
        title: "Nenhum cancelamento",
        subtitle: "Otimo! Voce nao cancelou nenhuma reserva",
      };
    }

    return {
      icon: <CalendarX size={30} color={colors.primaryStrong} />,
      title: "Nenhum agendamento proximo",
      subtitle: "Que tal descobrir novos servicos?",
      buttonLabel: "Explorar negocios",
      onButtonPress: () => navigation.navigate("Explore"),
    };
  }, [activeTab, navigation]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Meus Agendamentos</Text>
          <Text style={styles.headerSubtitle}>Acompanhe reservas futuras, concluidas e canceladas.</Text>
        </View>
        <View style={styles.headerIcon}>
          <CalendarDays size={22} color={colors.primaryStrong} />
        </View>
      </View>

      <TabBar items={tabItems} value={activeTab} onChange={handleChangeTab} />

      {toastVisible ? (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>Agendamentos atualizados</Text>
        </Animated.View>
      ) : null}

      {loading ? (
        <View style={styles.listContent}>
          {Array.from({ length: 3 }).map((_, index) => (
            <BookingCardSkeleton key={`booking-skeleton-${index}`} opacity={shimmerOpacity} />
          ))}
        </View>
      ) : activeData.length === 0 ? (
        <View style={styles.listContent}>
          <EmptyState
            icon={emptyState.icon}
            title={emptyState.title}
            subtitle={emptyState.subtitle}
            buttonLabel={emptyState.buttonLabel}
            onButtonPress={emptyState.onButtonPress}
          />
        </View>
      ) : (
        <FlatList
          data={activeData}
          keyExtractor={(item) => `${activeTab}-${item.appointmentId}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              tintColor={colors.primaryStrong}
              colors={[colors.primaryStrong]}
            />
          }
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              variant={activeTab}
              onPress={() => navigation.navigate("BookingDetail", { appointmentId: item.appointmentId })}
              onPrimaryAction={
                activeTab === "completed"
                  ? item.customerRating
                    ? () => navigation.navigate("Business", { slug: item.businessSlug })
                    : () => setReviewTarget(item)
                  : activeTab === "cancelled"
                    ? () => navigation.navigate("Business", { slug: item.businessSlug })
                    : undefined
              }
            />
          )}
        />
      )}

      <ReviewModal
        booking={reviewTarget}
        visible={reviewTarget != null}
        onClose={() => setReviewTarget(null)}
        onSubmitted={(booking) => {
          setBookings((current) =>
            current.map((item) => (item.appointmentId === booking.appointmentId ? booking : item)),
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  header: {
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerTitle: {
    color: colors.textDark,
    fontSize: 28,
    fontWeight: "900",
  },
  headerSubtitle: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  toast: {
    position: "absolute",
    top: 148,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    ...shadows.card,
  },
  toastText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  skeletonCard: {
    flexDirection: "row",
    gap: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceCard,
    padding: spacing.md,
    ...shadows.card,
  },
  skeletonDate: {
    width: 68,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
  },
  skeletonBody: {
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
  },
  skeletonLine: {
    height: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  skeletonLineLg: {
    width: "78%",
  },
  skeletonLineMd: {
    width: "62%",
  },
  skeletonLineSm: {
    width: "46%",
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${colors.background}73`,
  },
  modalCard: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    backgroundColor: colors.surfaceCard,
    padding: spacing.lg,
    gap: spacing.md,
    minHeight: 360,
  },
  modalTitle: {
    color: colors.textDark,
    fontSize: 24,
    fontWeight: "900",
  },
  modalSubtitle: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  starRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginVertical: spacing.md,
  },
  reviewInputWrap: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    gap: spacing.sm,
  },
  reviewInput: {
    minHeight: 120,
    color: colors.textDark,
    fontSize: 15,
    lineHeight: 22,
  },
  reviewCounter: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  reviewActions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  reviewPrimaryButton: {
    minHeight: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewPrimaryButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  reviewPrimaryButtonLabel: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  reviewSecondaryButton: {
    minHeight: 52,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceCard,
  },
  reviewSecondaryButtonLabel: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "800",
  },
  reviewSuccess: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  reviewSuccessIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success,
  },
  reviewSuccessTitle: {
    color: colors.textDark,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  reviewSuccessBody: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
});
