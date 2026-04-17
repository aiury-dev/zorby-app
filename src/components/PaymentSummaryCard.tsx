import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { CreditCard, Lock } from "lucide-react-native";
import { colors, radii, shadows, spacing, typography } from "../theme";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function PaymentSummaryCard({
  serviceName,
  professionalName,
  startsAtLabel,
  subtotalCents,
  feeCents,
}: {
  serviceName: string;
  professionalName: string;
  startsAtLabel: string;
  subtotalCents: number;
  feeCents: number;
}) {
  const total = subtotalCents + feeCents;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Resumo do pagamento</Text>
      <Text style={styles.meta}>{serviceName}</Text>
      <Text style={styles.meta}>{professionalName}</Text>
      <Text style={styles.meta}>{startsAtLabel}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Serviço</Text>
        <Text style={styles.value}>{formatCurrency(subtotalCents)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Taxa Zorby</Text>
        <Text style={styles.value}>{formatCurrency(feeCents)}</Text>
      </View>
      <View style={[styles.row, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
      </View>

      <View style={styles.footer}>
        <Lock size={14} color={colors.success} />
        <Text style={styles.footerText}>Pagamento seguro</Text>
        <CreditCard size={14} color={colors.textMuted} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceCard,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  title: {
    color: colors.textDark,
    ...typography.h4,
  },
  meta: {
    color: colors.textSoft,
    ...typography.bodySmall,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalRow: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.xs,
  },
  label: {
    color: colors.textSoft,
    ...typography.bodySmall,
  },
  value: {
    color: colors.textDark,
    ...typography.body,
  },
  totalLabel: {
    color: colors.textDark,
    ...typography.h4,
  },
  totalValue: {
    color: colors.success,
    ...typography.price,
  },
  footer: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  footerText: {
    flex: 1,
    color: colors.textSoft,
    ...typography.caption,
  },
});
