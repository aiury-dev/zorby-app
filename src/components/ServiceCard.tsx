import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { colors, radii, shadows, spacing, typography } from "../theme";
import { PressableScale } from "./ui/PressableScale";

type ServiceCardProps = {
  name: string;
  description: string | null;
  durationMinutes: number;
  priceLabel: string;
  hasVariants: boolean;
  accentColor: string;
  onPress: () => void;
};

export function ServiceCard({
  name,
  description,
  durationMinutes,
  priceLabel,
  hasVariants,
  accentColor,
  onPress,
}: ServiceCardProps) {
  return (
    <PressableScale onPress={onPress} style={styles.card}>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.content}>
        <View style={styles.copyColumn}>
          <Text style={styles.name}>{name}</Text>
          <Text numberOfLines={2} style={styles.description}>
            {description || "Servico disponivel para reserva online."}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{durationMinutes} min</Text>
            {hasVariants ? (
              <View style={[styles.variantChip, { borderColor: `${accentColor}33`, backgroundColor: `${accentColor}14` }]}>
                <Text style={[styles.variantChipText, { color: accentColor }]}>Variantes disponiveis</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.actionColumn}>
          <Text style={styles.price}>{priceLabel}</Text>
          <View style={[styles.button, { backgroundColor: accentColor }]}>
            <Text style={styles.buttonText}>Agendar</Text>
            <ArrowRight size={14} color={colors.white} />
          </View>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: colors.surfaceCard,
    borderRadius: radii.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  accentBar: {
    width: 6,
  },
  content: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    padding: spacing.md,
  },
  copyColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    color: colors.textDark,
    ...typography.h4,
    fontWeight: "700",
  },
  description: {
    color: colors.textSoft,
    ...typography.bodySmall,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  metaText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  variantChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  variantChipText: {
    fontSize: 12,
    fontWeight: "800",
  },
  actionColumn: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    minWidth: 112,
  },
  price: {
    color: colors.textDark,
    ...typography.price,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  buttonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
});
