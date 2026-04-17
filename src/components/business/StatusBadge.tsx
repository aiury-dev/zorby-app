import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AlertCircle, CheckCircle2, Clock3, XCircle } from "lucide-react-native";
import { colors, radii, spacing, typography } from "../../theme";
import type { BusinessAppointmentStatus } from "../../types";

function normalizeStatus(status: BusinessAppointmentStatus | string) {
  switch (status) {
    case "CONFIRMED":
      return {
        label: "Confirmado",
        backgroundColor: `${colors.success}16`,
        textColor: colors.success,
        icon: <CheckCircle2 size={14} color={colors.success} />,
      };
    case "CANCELLED":
    case "CANCELED":
      return {
        label: "Cancelado",
        backgroundColor: `${colors.danger}16`,
        textColor: colors.danger,
        icon: <XCircle size={14} color={colors.danger} />,
      };
    case "NO_SHOW":
      return {
        label: "Nao compareceu",
        backgroundColor: colors.surfaceMuted,
        textColor: colors.textSoft,
        icon: <AlertCircle size={14} color={colors.textSoft} />,
      };
    case "COMPLETED":
      return {
        label: "Concluido",
        backgroundColor: colors.surfaceMuted,
        textColor: colors.textSoft,
        icon: <CheckCircle2 size={14} color={colors.textSoft} />,
      };
    default:
      return {
        label: "Aguardando",
        backgroundColor: `${colors.warning}16`,
        textColor: colors.warning,
        icon: <Clock3 size={14} color={colors.warning} />,
      };
  }
}

export function getBusinessStatusMeta(status: BusinessAppointmentStatus | string) {
  return normalizeStatus(status);
}

export function StatusBadge({ status }: { status: BusinessAppointmentStatus | string }) {
  const meta = normalizeStatus(status);

  return (
    <View style={[styles.badge, { backgroundColor: meta.backgroundColor }]}>
      {meta.icon}
      <Text style={[styles.label, { color: meta.textColor }]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  label: {
    ...typography.caption,
    fontWeight: "700",
  },
});
