import React, { useEffect, useRef } from "react";
import {
  Animated,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check } from "lucide-react-native";
import type { SavedBooking } from "../types";
import { colors, radii, shadows, spacing } from "../theme";
import {
  loadStoredPushToken,
  savePushTokenToBackend,
  scheduleBookingConfirmation,
  scheduleBookingReminder,
} from "../lib/notifications";
import type { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "BookingConfirmation">;

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

async function openCalendar(booking: SavedBooking) {
  const startsAt = new Date(booking.startsAt);

  try {
    if (Platform.OS === "ios") {
      await Linking.openURL(`calshow:${Math.floor(startsAt.getTime() / 1000)}`);
      return;
    }

    if (Platform.OS === "android") {
      await Linking.openURL(`content://com.android.calendar/time/${startsAt.getTime()}`);
      return;
    }
  } catch {
    const endAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      `${booking.serviceName} - ${booking.businessName}`,
    )}&dates=${startsAt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}/${endAt
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z")}&details=${encodeURIComponent(
      `${booking.professionalName}${booking.addressLabel ? ` - ${booking.addressLabel}` : ""}`,
    )}`;
    await Linking.openURL(url);
  }
}

export function BookingConfirmationScreen({ route, navigation }: Props) {
  const { booking, mode = "confirmed" } = route.params;
  const checkScale = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(checkScale, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start(() => {
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 350,
        delay: 400,
        useNativeDriver: true,
      }).start();
    });
  }, [checkScale, contentOpacity]);

  useEffect(() => {
    void (async () => {
      await scheduleBookingConfirmation(booking);
      await scheduleBookingReminder(booking);
      const token = await loadStoredPushToken();
      if (token) {
        await savePushTokenToBackend(token);
      }
    })();
  }, [booking]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.checkShell,
            {
              transform: [
                {
                  scale: checkScale.interpolate({
                    inputRange: [0, 0.85, 1],
                    outputRange: [0, 1.2, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Check size={32} color={colors.white} />
        </Animated.View>

        <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
          <Text style={styles.title}>{mode === "rescheduled" ? "Reserva reagendada!" : "Reserva confirmada!"}</Text>
          <Text style={styles.subtitle}>
            {mode === "rescheduled"
              ? "Seu novo horario ja esta salvo no app"
              : "Voce recebera uma confirmacao em breve"}
          </Text>

          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.logoFallback}>
                <Text style={styles.logoText}>{booking.businessName.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.cardTopCopy}>
                <Text style={styles.businessName}>{booking.businessName}</Text>
                <Text style={styles.serviceText}>{booking.serviceName}</Text>
              </View>
            </View>

            <View style={styles.metaGroup}>
              <Text style={styles.metaLine}>{booking.professionalName}</Text>
              {booking.serviceVariantName ? <Text style={styles.metaLine}>{booking.serviceVariantName}</Text> : null}
              <Text style={styles.metaLine}>{formatDateTime(booking.startsAt)}</Text>
              {booking.addressLabel ? <Text style={styles.metaLine}>{booking.addressLabel}</Text> : null}
            </View>

            <View style={styles.divider} />
            <Text style={styles.price}>{formatCurrency(booking.priceCents)}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={styles.primaryButton}
              onPress={() =>
                navigation.reset({
                  index: 0,
                  routes: [{ name: "CustomerTabs", params: { screen: "Bookings" } as never }],
                })
              }
            >
              <Text style={styles.primaryButtonLabel}>Ver meus agendamentos</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryButton}
              onPress={() =>
                navigation.reset({
                  index: 0,
                  routes: [{ name: "CustomerTabs", params: { screen: "Explore" } as never }],
                })
              }
            >
              <Text style={styles.secondaryButtonLabel}>Voltar para o inicio</Text>
            </Pressable>

            <Pressable style={styles.tertiaryButton} onPress={() => void openCalendar(booking)}>
              <Text style={styles.tertiaryButtonLabel}>Adicionar ao calendario</Text>
            </Pressable>
          </View>
        </Animated.View>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  checkShell: {
    width: 88,
    height: 88,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success,
    marginBottom: spacing.xl,
    ...shadows.hero,
  },
  content: {
    width: "100%",
    alignItems: "center",
  },
  title: {
    color: colors.textDark,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  card: {
    width: "100%",
    borderRadius: radii.xl,
    padding: spacing.lg,
    backgroundColor: colors.surfaceCard,
    ...shadows.hero,
  },
  cardTop: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  logoFallback: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
  },
  logoText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "800",
  },
  cardTopCopy: {
    flex: 1,
  },
  businessName: {
    color: colors.textDark,
    fontSize: 18,
    fontWeight: "800",
  },
  serviceText: {
    color: colors.textSoft,
    fontSize: 14,
    marginTop: 4,
  },
  metaGroup: {
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  metaLine: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  price: {
    color: colors.textDark,
    fontSize: 24,
    fontWeight: "900",
  },
  actions: {
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
  },
  primaryButtonLabel: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 56,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceCard,
  },
  secondaryButtonLabel: {
    color: colors.textDark,
    fontSize: 15,
    fontWeight: "800",
  },
  tertiaryButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  tertiaryButtonLabel: {
    color: colors.primaryStrong,
    fontSize: 14,
    fontWeight: "700",
  },
});
