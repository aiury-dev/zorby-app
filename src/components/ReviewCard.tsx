import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Star } from "lucide-react-native";
import { colors, radii, shadows, spacing, typography } from "../theme";
import { PressableScale } from "./ui/PressableScale";

type ReviewCardProps = {
  customerName: string;
  rating: number;
  body: string | null;
  subtitle?: string;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "CL";
}

export function ReviewCard({ customerName, rating, body, subtitle }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const text = body || "Cliente confirmou uma experiencia positiva com este negocio.";

  return (
    <PressableScale onPress={() => setExpanded((value) => !value)} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(customerName)}</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.name}>{customerName}</Text>
          <View style={styles.ratingRow}>
            {Array.from({ length: 5 }, (_, index) => (
              <Star
                key={`${customerName}-${index}`}
                size={14}
                color="#F59E0B"
                fill={index < rating ? "#F59E0B" : "transparent"}
              />
            ))}
            <Text style={styles.subtitle}>{subtitle || "Avaliacao recente"}</Text>
          </View>
        </View>
      </View>

      <Text numberOfLines={expanded ? undefined : 3} style={styles.body}>
        {text}
      </Text>
      <Text style={styles.expandLabel}>{expanded ? "Mostrar menos" : "Mostrar mais"}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  header: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  avatarText: {
    color: colors.textDark,
    fontSize: 13,
    fontWeight: "800",
  },
  copy: {
    flex: 1,
  },
  name: {
    color: colors.textDark,
    ...typography.body,
    fontWeight: "700",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  subtitle: {
    marginLeft: 4,
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "600",
  },
  body: {
    color: colors.textSoft,
    ...typography.body,
  },
  expandLabel: {
    marginTop: spacing.sm,
    color: colors.primaryStrong,
    fontSize: 13,
    fontWeight: "800",
  },
});
