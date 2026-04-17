import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CheckCircle2, ChevronRight, Clock3, MapPin, User, XCircle } from "lucide-react-native";
import { colors, radii, shadows, spacing, typography } from "../theme";
import type { SavedBooking } from "../types";
import { PressableScale } from "./ui/PressableScale";

type Variant = "upcoming" | "completed" | "cancelled";

type Props = {
  booking: SavedBooking;
  variant: Variant;
  onPress: () => void;
  onPrimaryAction?: () => void;
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function addMinutes(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60 * 1000);
}

function formatDayBits(iso: string) {
  const date = new Date(iso);
  return {
    weekday: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(date).replace(".", "").toUpperCase(),
    day: new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", "").toUpperCase(),
  };
}

function formatCurrency(cents?: number) {
  if (cents == null) return "Valor a confirmar";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function getShortAddress(booking: SavedBooking) {
  if (!booking.addressLabel) return "Endereco indisponivel";
  const parts = booking.addressLabel.split(",").map((part) => part.trim());
  if (parts.length >= 3) {
    return `${parts[1]} · ${parts[2]}`;
  }
  return booking.addressLabel;
}

function getStatusBadge(booking: SavedBooking, variant: Variant) {
  if (variant === "cancelled") {
    return {
      text: "Cancelado",
      backgroundColor: `${colors.danger}14`,
      textColor: colors.danger,
      barColor: colors.danger,
    };
  }

  if (variant === "completed") {
    return {
      text: "Concluido",
      backgroundColor: colors.surfaceMuted,
      textColor: colors.textSoft,
      barColor: colors.borderStrong,
    };
  }

  if (booking.status === "PENDING") {
    return {
      text: "Pendente",
      backgroundColor: `${colors.warning}14`,
      textColor: colors.textDark,
      barColor: colors.warning,
    };
  }

  return {
    text: "Confirmado",
    backgroundColor: `${colors.success}14`,
    textColor: colors.success,
    barColor: colors.success,
  };
}

function BookingCardAction({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  if (!onPress) return null;

  return (
    <Pressable style={styles.actionButton} onPress={onPress}>
      <Text style={styles.actionButtonText}>{label}</Text>
    </Pressable>
  );
}

export function BookingCard({ booking, variant, onPress, onPrimaryAction }: Props) {
  const dayBits = formatDayBits(booking.startsAt);
  const statusBadge = getStatusBadge(booking, variant);
  const endLabel =
    booking.durationMinutes != null
      ? formatTime(addMinutes(booking.startsAt, booking.durationMinutes).toISOString())
      : null;
  const ratingStars =
    booking.customerRating != null
      ? Array.from({ length: 5 }, (_, index) => (index < booking.customerRating! ? "★" : "☆")).join("")
      : null;

  return (
    <PressableScale
      onPress={onPress}
      scaleValue={0.985}
      style={[
        styles.card,
        variant === "upcoming" && { borderLeftColor: statusBadge.barColor, borderLeftWidth: 4 },
        variant === "cancelled" && styles.cardCancelled,
      ]}
    >
      {variant === "cancelled" ? (
        <View style={styles.cancelledColumn}>
          <XCircle size={28} color={colors.danger} />
        </View>
      ) : (
        <View style={[styles.dateColumn, { backgroundColor: variant === "upcoming" ? `${colors.primaryStrong}14` : colors.surfaceMuted }]}>
          <Text style={[styles.dateWeekday, variant === "upcoming" && { color: colors.primaryStrong }]}>{dayBits.weekday}</Text>
          <Text style={styles.dateDay}>{dayBits.day}</Text>
          <Text style={styles.dateMonth}>{dayBits.month}</Text>
        </View>
      )}

      <View style={styles.body}>
        <Text style={styles.businessName}>{booking.businessName}</Text>
        <Text style={styles.serviceName}>{booking.serviceName}</Text>

        <View style={styles.metaRow}>
          <User size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>{booking.professionalName}</Text>
        </View>

        <View style={styles.metaRow}>
          <Clock3 size={14} color={colors.textMuted} />
          <Text style={styles.metaText}>
            {formatTime(booking.startsAt)}
            {endLabel ? ` – ${endLabel}` : ""}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <MapPin size={14} color={colors.textMuted} />
          <Text numberOfLines={1} style={styles.metaText}>
            {getShortAddress(booking)}
          </Text>
        </View>

        <View style={styles.footerRow}>
          <View>
            <Text style={styles.price}>{formatCurrency(booking.priceCents)}</Text>
            {variant === "completed" && ratingStars ? <Text style={styles.ratingText}>{ratingStars}</Text> : null}
          </View>

          {variant === "completed" ? (
            <BookingCardAction label={booking.customerRating ? "Agendar novamente" : "Avaliar"} onPress={onPrimaryAction} />
          ) : variant === "cancelled" ? (
            <BookingCardAction label="Agendar novamente" onPress={onPrimaryAction} />
          ) : null}
        </View>
      </View>

      <View style={styles.side}>
        <View style={[styles.badge, { backgroundColor: statusBadge.backgroundColor }]}>
          {variant === "upcoming" && booking.status === "CONFIRMED" ? <CheckCircle2 size={14} color={statusBadge.textColor} /> : null}
          <Text style={[styles.badgeText, { color: statusBadge.textColor }]}>{statusBadge.text}</Text>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceCard,
    padding: spacing.md,
    alignItems: "stretch",
    ...shadows.card,
  },
  cardCancelled: {
    opacity: 0.92,
  },
  dateColumn: {
    width: 68,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    gap: 2,
  },
  cancelledColumn: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dateWeekday: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "800",
  },
  dateDay: {
    color: colors.textDark,
    fontSize: 24,
    fontWeight: "900",
  },
  dateMonth: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "800",
  },
  body: {
    flex: 1,
    gap: 6,
  },
  businessName: {
    color: colors.textDark,
    ...typography.h4,
    fontWeight: "700",
  },
  serviceName: {
    color: colors.textSoft,
    ...typography.bodySmall,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    flex: 1,
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  price: {
    color: colors.textDark,
    ...typography.body,
    fontWeight: "700",
  },
  ratingText: {
    marginTop: 4,
    color: colors.warning,
    fontSize: 12,
    letterSpacing: 0.8,
  },
  actionButton: {
    minHeight: 38,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  actionButtonText: {
    color: colors.textDark,
    fontSize: 12,
    fontWeight: "800",
  },
  side: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  badge: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
