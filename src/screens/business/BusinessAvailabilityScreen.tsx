import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { CalendarDays, ChevronRight } from "lucide-react-native";
import { API_URL, fetchBusiness } from "../../lib/api";
import { loadBusinessSession } from "../../lib/storage";
import { colors, radii, shadows, spacing } from "../../theme";
import type { PublicBusiness } from "../../types";
import type { RootStackParamList } from "../../../App";

type Props = NativeStackScreenProps<RootStackParamList, "BusinessAvailability">;

const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${minutes}`;
}

function groupAvailabilities(availabilities: PublicBusiness["professionals"][number]["availabilities"]) {
  const perDay = new Map<number, string>();
  availabilities.forEach((availability) => {
    perDay.set(
      availability.dayOfWeek,
      `${minutesToTime(availability.startMinutes)} – ${minutesToTime(availability.endMinutes)}`,
    );
  });

  const groups: string[] = [];
  let index = 0;

  while (index < 7) {
    const current = perDay.get(index);
    let end = index;

    while (end + 1 < 7 && perDay.get(end + 1) === current) {
      end += 1;
    }

    const label =
      index === end
        ? `${weekdayLabels[index]}  ${current ?? "Folga"}`
        : `${weekdayLabels[index]} – ${weekdayLabels[end]}  ${current ?? "Folga"}`;

    groups.push(label);
    index = end + 1;
  }

  return groups;
}

export function BusinessAvailabilityScreen({}: Props) {
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const session = await loadBusinessSession();
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await fetchBusiness(session.business.slug);
      setBusiness(result.business);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const professionals = useMemo(() => business?.professionals ?? [], [business?.professionals]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Disponibilidade</Text>
            <Text style={styles.subtitle}>Consulte a agenda configurada de cada profissional.</Text>
          </View>
          <Pressable style={styles.headerButton} onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/dashboard/disponibilidade`)}>
            <Text style={styles.headerButtonLabel}>Editar no painel web</Text>
          </Pressable>
        </View>

        <View style={styles.banner}>
          <CalendarDays size={18} color={colors.primaryStrong} />
          <View style={styles.bannerCopy}>
            <Text style={styles.bannerTitle}>Edite no painel web quando precisar mudar horarios</Text>
            <Text style={styles.bannerBody}>O app mostra a disponibilidade consolidada da equipe, mas a edicao continua no painel completo.</Text>
          </View>
          <Pressable onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/dashboard/disponibilidade`)}>
            <ChevronRight size={18} color={colors.textSoft} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={colors.white} />
          </View>
        ) : professionals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhum profissional disponivel</Text>
            <Text style={styles.emptyBody}>Cadastre a equipe no painel web para visualizar a disponibilidade no app.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {professionals.map((professional) => (
              <View key={professional.id} style={styles.professionalCard}>
                <View style={styles.professionalTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{professional.displayName.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={styles.professionalCopy}>
                    <Text style={styles.professionalName}>{professional.displayName}</Text>
                    <Text style={styles.professionalRole}>{professional.roleLabel || "Profissional"}</Text>
                  </View>
                  <View style={styles.slotChip}>
                    <Text style={styles.slotChipText}>
                      Slots de {professional.availabilities[0]?.slotIntervalMinutes ?? 30} min
                    </Text>
                  </View>
                </View>

                <View style={styles.availabilityList}>
                  {groupAvailabilities(professional.availabilities).map((line) => (
                    <Text key={`${professional.id}-${line}`} style={styles.availabilityLine}>
                      {line}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  headerRow: {
    gap: spacing.md,
  },
  title: {
    color: colors.white,
    fontSize: 30,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.xs,
  },
  headerButton: {
    alignSelf: "flex-start",
    minHeight: 42,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
  },
  headerButtonLabel: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
  banner: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  bannerCopy: {
    flex: 1,
    gap: 4,
  },
  bannerTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  bannerBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  centerCard: {
    minHeight: 220,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  emptyCard: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "900",
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  list: {
    gap: spacing.md,
  },
  professionalCard: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  professionalTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  avatarText: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: "900",
  },
  professionalCopy: {
    flex: 1,
    gap: 4,
  },
  professionalName: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "900",
  },
  professionalRole: {
    color: colors.textMuted,
    fontSize: 13,
  },
  slotChip: {
    borderRadius: radii.pill,
    backgroundColor: `${colors.primaryStrong}14`,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  slotChipText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  availabilityList: {
    gap: spacing.sm,
  },
  availabilityLine: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
