import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as WebBrowser from "expo-web-browser";
import { Clock3, Tag } from "lucide-react-native";
import { API_URL, fetchBusiness } from "../../lib/api";
import { loadBusinessSession } from "../../lib/storage";
import { colors, radii, shadows, spacing } from "../../theme";
import type { PublicBusiness } from "../../types";
import type { RootStackParamList } from "../../../App";

type Props = NativeStackScreenProps<RootStackParamList, "BusinessServices">;

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function ServiceVariants({
  expanded,
  variants,
}: {
  expanded: boolean;
  variants: PublicBusiness["services"][number]["variants"];
}) {
  const animated = useRef(new Animated.Value(expanded ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.timing(animated, {
      toValue: expanded ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [animated, expanded]);

  const height = animated.interpolate({
    inputRange: [0, 1],
    outputRange: [0, variants.length * 58 + 8],
  });

  return (
    <Animated.View style={{ height, overflow: "hidden" }}>
      <View style={styles.variantList}>
        {variants.map((variant) => (
          <View key={variant.id} style={styles.variantItem}>
            <View>
              <Text style={styles.variantName}>{variant.name}</Text>
              <Text style={styles.variantMeta}>{variant.durationMinutes} min</Text>
            </View>
            <Text style={styles.variantPrice}>{formatCurrency(variant.priceCents)}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

export function BusinessServicesScreen() {
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

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

  const services = useMemo(() => business?.services ?? [], [business?.services]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Servicos</Text>
            <Text style={styles.subtitle}>Consulte o catalogo ativo do negocio e as variantes de cada atendimento.</Text>
          </View>
          <Pressable style={styles.headerButton} onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/dashboard/servicos`)}>
            <Text style={styles.headerButtonLabel}>Gerenciar no painel web</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={colors.white} />
          </View>
        ) : services.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhum servico cadastrado</Text>
            <Text style={styles.emptyBody}>Adicione servicos no painel web para eles aparecerem aqui.</Text>
            <Pressable style={styles.emptyButton} onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/dashboard/servicos`)}>
              <Text style={styles.emptyButtonLabel}>Adicionar no painel web</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.list}>
            {services.map((service) => {
              const expanded = expandedServiceId === service.id;
              return (
                <Pressable
                  key={service.id}
                  style={styles.serviceCard}
                  onPress={() => setExpandedServiceId((current) => (current === service.id ? null : service.id))}
                >
                  <View style={[styles.serviceAccent, { backgroundColor: service.colorHex || business?.brandPrimaryColor || colors.primaryStrong }]} />
                  <View style={styles.serviceBody}>
                    <View style={styles.serviceTop}>
                      <View style={styles.serviceCopy}>
                        <Text style={styles.serviceName}>{service.name}</Text>
                        <Text numberOfLines={2} style={styles.serviceDescription}>
                          {service.description || "Servico disponivel para agendamento."}
                        </Text>
                      </View>
                      {service.variants.length > 0 ? (
                        <View style={styles.variantBadge}>
                          <Text style={styles.variantBadgeText}>{service.variants.length} variantes</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.serviceMetaRow}>
                      <View style={styles.metaInline}>
                        <Clock3 size={14} color={colors.textMuted} />
                        <Text style={styles.metaText}>{service.durationMinutes} min</Text>
                      </View>
                      <View style={styles.metaInline}>
                        <Tag size={14} color={colors.textMuted} />
                        <Text style={styles.metaText}>{formatCurrency(service.priceCents)}</Text>
                      </View>
                    </View>

                    {service.variants.length > 0 ? <ServiceVariants expanded={expanded} variants={service.variants} /> : null}
                  </View>
                </Pressable>
              );
            })}
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
  centerCard: {
    minHeight: 220,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  emptyCard: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.surface,
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
  emptyButton: {
    alignSelf: "flex-start",
    minHeight: 48,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
    marginTop: spacing.md,
  },
  emptyButtonLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  list: {
    gap: spacing.md,
  },
  serviceCard: {
    flexDirection: "row",
    borderRadius: radii.xl,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  serviceAccent: {
    width: 6,
  },
  serviceBody: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  serviceTop: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  serviceCopy: {
    flex: 1,
    gap: 4,
  },
  serviceName: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "900",
  },
  serviceDescription: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  variantBadge: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    backgroundColor: `${colors.primaryStrong}16`,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  variantBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  serviceMetaRow: {
    flexDirection: "row",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  metaInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  variantList: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  variantItem: {
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceRaised,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  variantName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  variantMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  variantPrice: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "800",
  },
});
