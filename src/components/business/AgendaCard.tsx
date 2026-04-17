import React, { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight, MoreHorizontal, Phone } from "lucide-react-native";
import { colors, radii, shadows, spacing, typography } from "../../theme";
import type { BusinessAgendaItem } from "../../types";
import { StatusBadge, getBusinessStatusMeta } from "./StatusBadge";
import { PressableScale } from "../ui/PressableScale";

type Props = {
  appointment: BusinessAgendaItem;
  compact?: boolean;
  hidePrice?: boolean;
  onPress: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
};

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDuration(start: string, end: string) {
  const diff = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
  return `${Math.round(diff / 60000)} min`;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function AgendaCard({ appointment, compact = false, hidePrice = false, onPress, onConfirm, onCancel }: Props) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const statusMeta = getBusinessStatusMeta(appointment.status);

  return (
    <PressableScale style={styles.card} onPress={onPress} scaleValue={0.985}>
      <View style={styles.timelineColumn}>
        <Text style={styles.startTime}>{formatTime(appointment.startsAtUtc)}</Text>
        <View style={styles.timelineLine} />
        <Text style={styles.duration}>{formatDuration(appointment.startsAtUtc, appointment.endsAtUtc)}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.customerName}>{appointment.customerNameSnapshot}</Text>
            <Text style={styles.serviceName}>{appointment.serviceNameSnapshot}</Text>
          </View>
          {!hidePrice ? <Text style={styles.price}>{formatCurrency(appointment.priceCents)}</Text> : null}
        </View>

        {appointment.customerPhoneSnapshot ? (
          <View style={styles.metaRow}>
            <View style={styles.phoneShell}>
              <Phone size={14} color={colors.primaryStrong} />
            </View>
            <Pressable onPress={() => void Linking.openURL(`tel:${appointment.customerPhoneSnapshot}`)}>
              <Text style={styles.phoneText}>{appointment.customerPhoneSnapshot}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.professionalAvatar}>
            <Text style={styles.professionalAvatarText}>{initials(appointment.professional.displayName)}</Text>
          </View>
          <Text style={styles.professionalName}>{appointment.professional.displayName}</Text>
          <StatusBadge status={appointment.status} />
        </View>

        {!compact ? (
          <View style={styles.actionsRow}>
            <Pressable style={styles.actionsToggle} onPress={() => setActionsOpen((current) => !current)}>
              <MoreHorizontal size={16} color={colors.textSoft} />
              <Text style={styles.actionsToggleText}>Acoes</Text>
            </Pressable>
            <ChevronRight size={18} color={colors.textMuted} />
          </View>
        ) : (
          <View style={styles.compactFooter}>
            <Text style={[styles.compactStatus, { color: statusMeta.textColor }]}>{statusMeta.label}</Text>
            <ChevronRight size={18} color={colors.textMuted} />
          </View>
        )}

        {!compact && actionsOpen ? (
          <View style={styles.quickActions}>
            {onConfirm ? (
              <Pressable style={[styles.quickActionButton, styles.quickActionSuccess]} onPress={onConfirm}>
                <Text style={styles.quickActionLabel}>Confirmar</Text>
              </Pressable>
            ) : null}
            {onCancel ? (
              <Pressable style={[styles.quickActionButton, styles.quickActionDanger]} onPress={onCancel}>
                <Text style={styles.quickActionLabel}>Cancelar</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
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
    ...shadows.card,
  },
  timelineColumn: {
    width: 64,
    alignItems: "center",
    paddingTop: spacing.xs,
  },
  startTime: {
    color: colors.textDark,
    ...typography.h4,
    fontWeight: "700",
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 44,
    marginVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.borderStrong,
  },
  duration: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    flex: 1,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
  customerName: {
    color: colors.textDark,
    ...typography.h4,
    fontWeight: "700",
  },
  serviceName: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  price: {
    color: colors.success,
    fontSize: 16,
    fontWeight: "900",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  phoneShell: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.primaryStrong}12`,
  },
  phoneText: {
    color: colors.primaryStrong,
    fontSize: 13,
    fontWeight: "800",
  },
  professionalAvatar: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  professionalAvatarText: {
    color: colors.textDark,
    fontSize: 11,
    fontWeight: "900",
  },
  professionalName: {
    flex: 1,
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  actionsRow: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionsToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionsToggleText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  compactFooter: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  compactStatus: {
    fontSize: 13,
    fontWeight: "800",
  },
  quickActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  quickActionButton: {
    minHeight: 38,
    minWidth: 96,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  quickActionSuccess: {
    backgroundColor: `${colors.success}18`,
  },
  quickActionDanger: {
    backgroundColor: `${colors.danger}16`,
  },
  quickActionLabel: {
    color: colors.textDark,
    fontSize: 12,
    fontWeight: "800",
  },
});
