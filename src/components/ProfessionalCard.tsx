import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors, radii, shadows, spacing, typography } from "../theme";
import { PressableScale } from "./ui/PressableScale";

type ProfessionalCardProps = {
  displayName: string;
  roleLabel: string | null;
  photoUrl: string | null;
  selected: boolean;
  accentColor: string;
  availabilityLabel?: string;
  compact?: boolean;
  onPress: () => void;
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function ProfessionalCard({
  displayName,
  roleLabel,
  photoUrl,
  selected,
  accentColor,
  availabilityLabel,
  compact,
  onPress,
}: ProfessionalCardProps) {
  const avatarSize = compact ? 56 : 72;
  const avatarRadius = avatarSize / 2;

  return (
    <PressableScale
      onPress={onPress}
      scaleValue={0.98}
      style={[
        styles.card,
        selected && { borderColor: accentColor, backgroundColor: `${accentColor}12` },
      ]}
    >
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarRadius }]} />
      ) : (
        <View
          style={[
            styles.avatarFallback,
            { width: avatarSize, height: avatarSize, borderRadius: avatarRadius },
            selected && { backgroundColor: `${accentColor}20` },
          ]}
        >
          <Text style={[styles.avatarFallbackText, selected && { color: accentColor }]}>{getInitials(displayName)}</Text>
        </View>
      )}
      <Text numberOfLines={2} style={[styles.name, selected && { color: accentColor }]}>
        {displayName}
      </Text>
      <Text numberOfLines={2} style={styles.role}>
        {roleLabel || "Profissional"}
      </Text>
      {availabilityLabel ? (
        <View style={[styles.helperChip, selected && { backgroundColor: `${accentColor}16` }]}>
          <Text style={[styles.helperChipText, selected && { color: accentColor }]}>{availabilityLabel}</Text>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 112,
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: spacing.sm,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9F0FF",
    marginBottom: spacing.sm,
  },
  avatarFallbackText: {
    color: colors.primaryStrong,
    fontSize: 22,
    fontWeight: "800",
  },
  name: {
    color: colors.textDark,
    ...typography.bodySmall,
    fontWeight: "700",
    textAlign: "center",
  },
  role: {
    marginTop: 4,
    color: colors.textSoft,
    ...typography.caption,
    textAlign: "center",
  },
  helperChip: {
    marginTop: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  helperChipText: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
});
