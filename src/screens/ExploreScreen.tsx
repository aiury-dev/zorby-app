import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Activity,
  Briefcase,
  Compass,
  Gem,
  Heart,
  HeartHandshake,
  LocateFixed,
  Search,
  Sparkles,
  Star,
  Store,
} from "lucide-react-native";
import { searchBusinesses } from "../lib/api";
import { Analytics } from "../lib/analytics";
import { loadFavorites, toggleFavorite } from "../lib/storage";
import { useToast } from "../hooks/useToast";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { colors, radii, shadows, spacing } from "../theme";
import type { DiscoveryBusiness } from "../types";
import type { RootStackParamList } from "../../App";

const categoryMeta = {
  HEALTH: { label: "Saude", icon: HeartHandshake },
  BEAUTY: { label: "Beleza", icon: Sparkles },
  EDUCATION: { label: "Educacao", icon: Gem },
  CONSULTING: { label: "Consultoria", icon: Briefcase },
  SPORTS: { label: "Esportes", icon: Activity },
  OTHER: { label: "Outros", icon: Store },
} as const;

function friendlyCategoryLabel(category: DiscoveryBusiness["category"]) {
  return categoryMeta[category]?.label ?? "Outros";
}

function getDistanceKm(
  fromLat: number,
  fromLon: number,
  toLat: number | null,
  toLon: number | null,
) {
  if (toLat == null || toLon == null) return null;

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLon = toRadians(toLon - fromLon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function CategoryChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon?: React.ReactNode;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.categoryChip, active && styles.categoryChipActive]} onPress={onPress}>
      {icon}
      <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function FavoriteToggle({
  active,
  onPress,
}: {
  active: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1.14,
        useNativeDriver: true,
        damping: 10,
        stiffness: 220,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 10,
        stiffness: 220,
      }),
    ]).start();

    onPress();
  };

  return (
    <Pressable
      style={styles.favoriteToggle}
      onPress={(event) => {
        event.stopPropagation();
        handlePress();
      }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Heart
          size={18}
          color={active ? colors.danger : colors.white}
          fill={active ? colors.danger : "transparent"}
        />
      </Animated.View>
    </Pressable>
  );
}

function FeaturedBusinessCard({
  business,
  isFavorite,
  onToggleFavorite,
  onPress,
}: {
  business: DiscoveryBusiness;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.featuredCard} onPress={onPress}>
      <FavoriteToggle active={isFavorite} onPress={onToggleFavorite} />
      {business.coverImageUrl ? (
        <Image source={{ uri: business.coverImageUrl }} style={styles.featuredCardImage} />
      ) : (
        <LinearGradient
          colors={["#111827", business.brandPrimaryColor ?? "#2563EB"]}
          style={styles.featuredCardImageFallback}
        >
          <Text style={styles.featuredCardImageFallbackText}>{business.name.slice(0, 1)}</Text>
        </LinearGradient>
      )}
      <BlurView intensity={22} tint="dark" style={styles.featuredCardOverlay}>
        <Text style={styles.featuredCardName}>{business.name}</Text>
        <Text style={styles.featuredCardMeta}>{friendlyCategoryLabel(business.category)}</Text>
      </BlurView>
    </Pressable>
  );
}

function BusinessDiscoveryCard({
  business,
  currentLocation,
  isFavorite,
  onToggleFavorite,
  onPress,
}: {
  business: DiscoveryBusiness;
  currentLocation: { latitude: number; longitude: number } | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onPress: () => void;
}) {
  const distanceKm =
    currentLocation == null
      ? null
      : getDistanceKm(currentLocation.latitude, currentLocation.longitude, business.latitude, business.longitude);

  return (
    <Pressable style={styles.discoveryCard} onPress={onPress}>
      <View style={styles.discoveryFavoriteShell}>
        <FavoriteToggle active={isFavorite} onPress={onToggleFavorite} />
      </View>
      {business.coverImageUrl ? (
        <Image source={{ uri: business.coverImageUrl }} style={styles.discoveryCardImage} />
      ) : (
        <LinearGradient
          colors={["#111827", business.brandPrimaryColor ?? "#2563EB"]}
          style={styles.discoveryCardImageFallback}
        >
          <Text style={styles.discoveryCardImageFallbackText}>{business.name.slice(0, 1)}</Text>
        </LinearGradient>
      )}
      <View style={styles.discoveryCardBody}>
        <View style={styles.discoveryCardTop}>
          <View style={styles.discoveryCardTitleBlock}>
            <Text style={styles.discoveryCardName}>{business.name}</Text>
            <Text style={styles.discoveryCardAddress}>{business.addressLabel}</Text>
          </View>
          <View style={styles.discoveryRatingPill}>
            <Star size={14} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.discoveryRatingPillText}>
              {business.averageRating ? business.averageRating.toFixed(1) : "Novo"}
            </Text>
          </View>
        </View>

        <Text numberOfLines={2} style={styles.discoveryCardDescription}>
          {business.description ?? "Negocio com agendamento online pronto para atender clientes finais."}
        </Text>

        <View style={styles.discoveryMetaRow}>
          <View style={styles.discoveryTag}>
            <Text style={styles.discoveryTagText}>{friendlyCategoryLabel(business.category)}</Text>
          </View>
          {distanceKm != null ? (
            <View style={styles.discoveryTag}>
              <Text style={styles.discoveryTagText}>
                {distanceKm < 1 ? "< 1 km" : `${distanceKm.toFixed(1)} km`}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.discoveryServicesPreview}>
          {business.services.slice(0, 3).map((service) => (
            <Text key={service.id} style={styles.discoveryServiceText}>
              {service.name}
            </Text>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

export function ExploreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { showToast } = useToast();
  const cacheRef = useRef<Map<string, { timestamp: number; businesses: DiscoveryBusiness[]; hasMore: boolean }>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const [businesses, setBusinesses] = useState<DiscoveryBusiness[]>([]);
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<DiscoveryBusiness["category"] | "ALL">("ALL");
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [refreshingLocation, setRefreshingLocation] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const loadBusinesses = useCallback(
    async (nextPage = 1, append = false) => {
      const cacheKey = JSON.stringify({
        query: search.trim().toLowerCase(),
        category,
        page: nextPage,
        lat: locationCoords?.latitude ?? null,
        lng: locationCoords?.longitude ?? null,
      });
      const cached = cacheRef.current.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        setBusinesses((current) => (append ? [...current, ...cached.businesses] : cached.businesses));
        setHasMore(cached.hasMore);
        setPage(nextPage);
        setLoading(false);
        setIsSearching(false);
        setIsLoadingMore(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setLoading(nextPage === 1 && businesses.length === 0);
          setIsSearching(search.trim().length > 0);
        }

        const result = await searchBusinesses({
          query: search.trim() || undefined,
          category: category === "ALL" ? undefined : category,
          lat: locationCoords?.latitude,
          lng: locationCoords?.longitude,
          radiusKm: locationCoords ? 20 : undefined,
          sortBy: locationCoords ? "distance" : "relevance",
          page: nextPage,
          limit: 20,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;

        setBusinesses((current) => (append ? [...current, ...result.businesses] : result.businesses));
        setHasMore(result.hasMore);
        setPage(result.page);

        const nextEntries = Array.from(cacheRef.current.entries()).slice(-4);
        cacheRef.current = new Map([
          ...nextEntries,
          [
            cacheKey,
            {
              timestamp: Date.now(),
              businesses: result.businesses,
              hasMore: result.hasMore,
            },
          ],
        ]);
      } catch (error) {
        if (controller.signal.aborted) return;
        showToast(error instanceof Error ? error.message : "Nao foi possivel carregar.", "error");
        if (!append) setBusinesses([]);
      } finally {
        setLoading(false);
        setIsSearching(false);
        setIsLoadingMore(false);
      }
    },
    [businesses.length, category, locationCoords, search, showToast],
  );

  useEffect(() => {
    Analytics.trackExploreOpened();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadBusinesses(1, false);
    }, 600);

    return () => clearTimeout(timer);
  }, [category, loadBusinesses, locationCoords, search]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadFavorites().then((saved) => {
        if (active) setFavoriteSlugs(saved);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const requestLocation = useCallback(async () => {
    try {
      setRefreshingLocation(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Localizacao nao autorizada",
          "Ative a localizacao para ordenar negocios mais proximos.",
        );
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocationCoords({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      void Haptics.selectionAsync();
      Analytics.trackFilterApplied({ sortBy: "distance", radiusKm: 20 });
    } catch {
      showToast("Nao foi possivel usar sua localizacao agora.", "warning");
    } finally {
      setRefreshingLocation(false);
    }
  }, [showToast]);

  const featuredBusinesses = businesses.slice(0, 3);

  const handleToggleFavorite = useCallback(async (slug: string) => {
    // TODO: sincronizar favoritos com o backend para persistência cross-device
    const result = await toggleFavorite(slug);
    setFavoriteSlugs(result.favorites);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (result.isFavorite) {
      Analytics.trackFavoriteAdded(slug);
    } else {
      Analytics.trackFavoriteRemoved(slug);
    }
  }, []);

  const handleOpenBusiness = useCallback(
    (business: DiscoveryBusiness, position: number) => {
      Analytics.trackBusinessCardTapped(business.id, business.name, position);
      navigation.navigate("Business", { slug: business.slug });
    },
    [navigation],
  );

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    void loadBusinesses(page + 1, true);
  }, [hasMore, isLoadingMore, loadBusinesses, page]);

  return (
    <SafeAreaView style={styles.customerScreen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.customerScroll}>
        <LinearGradient colors={["#121E42", "#1E3A8A", "#2563EB"]} style={styles.exploreHero}>
          <Text style={styles.heroBadge}>BOOKING APP</Text>
          <Text style={styles.exploreTitle}>Encontre servicos e horarios perto de voce.</Text>
          <Text style={styles.exploreSubtitle}>
            Pesquise, filtre categorias e veja empresas reais disponiveis para reservar.
          </Text>

          <View style={styles.searchShell}>
            <Search size={18} color="#94A3B8" />
            <TextInput
              placeholder="Pesquisar servicos ou negocios"
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              style={styles.searchInput}
            />
            {isSearching ? <ActivityIndicator color={colors.primaryStrong} size="small" /> : null}
          </View>

          <Pressable style={styles.locationButton} onPress={requestLocation}>
            {refreshingLocation ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <LocateFixed size={16} color={colors.white} />
            )}
            <Text style={styles.locationButtonText}>Usar minha localizacao</Text>
          </Pressable>
        </LinearGradient>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          <CategoryChip label="Tudo" active={category === "ALL"} onPress={() => setCategory("ALL")} />
          {(Object.keys(categoryMeta) as Array<keyof typeof categoryMeta>).map((key) => {
            const Icon = categoryMeta[key].icon;
            return (
              <CategoryChip
                key={key}
                label={categoryMeta[key].label}
                icon={<Icon size={14} color={category === key ? colors.white : colors.textSoft} />}
                active={category === key}
                onPress={() => setCategory(key)}
              />
            );
          })}
        </ScrollView>

        {loading ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
            {Array.from({ length: 2 }, (_, index) => (
              <SkeletonCard
                key={`featured-skeleton-${index}`}
                style={styles.featuredCard}
                contentStyle={styles.featuredSkeletonContent}
              >
                <View style={styles.featuredSkeletonMedia} />
                <View style={styles.featuredSkeletonOverlay}>
                  <View style={styles.featuredSkeletonTitle} />
                  <View style={styles.featuredSkeletonMeta} />
                </View>
              </SkeletonCard>
            ))}
          </ScrollView>
        ) : featuredBusinesses.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
            {featuredBusinesses.map((business) => (
              <FeaturedBusinessCard
                key={business.id}
                business={business}
                isFavorite={favoriteSlugs.includes(business.slug)}
                onToggleFavorite={() => void handleToggleFavorite(business.slug)}
                onPress={() =>
                  handleOpenBusiness(
                    business,
                    featuredBusinesses.findIndex((item) => item.id === business.id),
                  )
                }
              />
            ))}
          </ScrollView>
        ) : null}

        <SectionHeader
          title="Negocios para reservar"
          subtitle="Empresas e profissionais com horarios ativos."
        />

        {loading ? (
          <View style={styles.businessList}>
            {Array.from({ length: 4 }, (_, index) => (
              <SkeletonCard
                key={`business-skeleton-${index}`}
                style={styles.discoveryCard}
                contentStyle={styles.discoverySkeletonContent}
              >
                <View style={styles.discoverySkeletonMedia} />
                <View style={styles.discoverySkeletonTitleRow}>
                  <View style={styles.discoverySkeletonTitleBlock}>
                    <View style={styles.discoverySkeletonTitle} />
                    <View style={styles.discoverySkeletonAddress} />
                  </View>
                  <View style={styles.discoverySkeletonRating} />
                </View>
                <View style={styles.discoverySkeletonDescription} />
                <View style={styles.discoverySkeletonDescriptionShort} />
                <View style={styles.discoverySkeletonTagsRow}>
                  <View style={styles.discoverySkeletonTag} />
                  <View style={styles.discoverySkeletonTagShort} />
                </View>
                <View style={styles.discoverySkeletonServicesRow}>
                  <View style={styles.discoverySkeletonService} />
                  <View style={styles.discoverySkeletonServiceWide} />
                  <View style={styles.discoverySkeletonService} />
                </View>
              </SkeletonCard>
            ))}
          </View>
        ) : businesses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Search size={24} color={colors.primaryStrong} />
            <Text style={styles.emptyTitle}>Nenhum negocio encontrado</Text>
            <Text style={styles.emptyBody}>
              Ajuste a busca, use outra categoria ou tente novamente mais tarde.
            </Text>
          </View>
        ) : (
          <View style={styles.businessList}>
            {businesses.map((business, index) => (
              <BusinessDiscoveryCard
                key={business.id}
                business={business}
                currentLocation={locationCoords}
                isFavorite={favoriteSlugs.includes(business.slug)}
                onToggleFavorite={() => void handleToggleFavorite(business.slug)}
                onPress={() => handleOpenBusiness(business, index)}
              />
            ))}
            {isLoadingMore ? (
              Array.from({ length: 2 }, (_, index) => (
                <SkeletonCard
                  key={`business-load-more-skeleton-${index}`}
                  style={styles.discoveryCard}
                  contentStyle={styles.discoverySkeletonContent}
                >
                  <View style={styles.discoverySkeletonMedia} />
                  <View style={styles.discoverySkeletonTitleRow}>
                    <View style={styles.discoverySkeletonTitleBlock}>
                      <View style={styles.discoverySkeletonTitle} />
                      <View style={styles.discoverySkeletonAddress} />
                    </View>
                    <View style={styles.discoverySkeletonRating} />
                  </View>
                  <View style={styles.discoverySkeletonDescription} />
                  <View style={styles.discoverySkeletonDescriptionShort} />
                  <View style={styles.discoverySkeletonTagsRow}>
                    <View style={styles.discoverySkeletonTag} />
                    <View style={styles.discoverySkeletonTagShort} />
                  </View>
                  <View style={styles.discoverySkeletonServicesRow}>
                    <View style={styles.discoverySkeletonService} />
                    <View style={styles.discoverySkeletonServiceWide} />
                    <View style={styles.discoverySkeletonService} />
                  </View>
                </SkeletonCard>
              ))
            ) : hasMore ? (
              <Pressable style={styles.loadMoreButton} onPress={handleLoadMore}>
                <Text style={styles.loadMoreButtonText}>Carregar mais</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  customerScreen: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  customerScroll: {
    paddingBottom: spacing.xxl,
  },
  heroBadge: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginBottom: spacing.sm,
  },
  exploreHero: {
    margin: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.hero,
  },
  exploreTitle: {
    color: colors.white,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    marginBottom: spacing.sm,
  },
  exploreSubtitle: {
    color: "rgba(248,250,252,0.82)",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  searchShell: {
    minHeight: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.textDark,
    fontSize: 15,
    paddingVertical: spacing.md,
  },
  locationButton: {
    alignSelf: "flex-start",
    marginTop: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  locationButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
  categoryRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  categoryChip: {
    minHeight: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: colors.primaryStrong,
    borderColor: colors.primaryStrong,
  },
  categoryChipText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  categoryChipTextActive: {
    color: colors.white,
  },
  featuredRow: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  featuredCard: {
    width: 280,
    height: 180,
    borderRadius: radii.xl,
    overflow: "hidden",
    backgroundColor: colors.surfaceRaised,
  },
  featuredSkeletonContent: {
    flex: 1,
    padding: 0,
    justifyContent: "space-between",
  },
  featuredSkeletonMedia: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
  },
  featuredSkeletonTitle: {
    width: "68%",
    height: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  featuredSkeletonMeta: {
    width: "34%",
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    marginTop: spacing.xs,
  },
  featuredSkeletonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  featuredCardImage: {
    width: "100%",
    height: "100%",
  },
  favoriteToggle: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    zIndex: 3,
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.42)",
  },
  featuredCardImageFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  featuredCardImageFallbackText: {
    color: colors.white,
    fontSize: 48,
    fontWeight: "800",
  },
  featuredCardOverlay: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    borderRadius: radii.lg,
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  featuredCardName: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
  },
  featuredCardMeta: {
    color: "rgba(248,250,252,0.78)",
    fontSize: 13,
    marginTop: 2,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.textDark,
    fontSize: 20,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    ...shadows.card,
  },
  emptyTitle: {
    color: colors.textDark,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyBody: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  businessList: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  loadMoreButton: {
    minHeight: 52,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
    ...shadows.card,
  },
  loadMoreButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  discoveryCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: "hidden",
    ...shadows.card,
  },
  discoverySkeletonContent: {
    padding: 0,
  },
  discoverySkeletonMedia: {
    width: "100%",
    height: 190,
    backgroundColor: colors.surfaceMuted,
  },
  discoverySkeletonTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  discoverySkeletonTitleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  discoverySkeletonTitle: {
    width: "72%",
    height: 18,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  discoverySkeletonAddress: {
    width: "56%",
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  discoverySkeletonRating: {
    width: 58,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  discoverySkeletonDescription: {
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  discoverySkeletonDescriptionShort: {
    width: "74%",
    height: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  discoverySkeletonTagsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  discoverySkeletonTag: {
    width: 88,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  discoverySkeletonTagShort: {
    width: 66,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  discoverySkeletonServicesRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  discoverySkeletonService: {
    flex: 1,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  discoverySkeletonServiceWide: {
    flex: 1.3,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  discoveryFavoriteShell: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    zIndex: 3,
  },
  discoveryCardImage: {
    width: "100%",
    height: 190,
  },
  discoveryCardImageFallback: {
    width: "100%",
    height: 190,
    alignItems: "center",
    justifyContent: "center",
  },
  discoveryCardImageFallbackText: {
    color: colors.white,
    fontSize: 54,
    fontWeight: "900",
  },
  discoveryCardBody: {
    padding: spacing.lg,
  },
  discoveryCardTop: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  discoveryCardTitleBlock: {
    flex: 1,
  },
  discoveryCardName: {
    color: colors.textDark,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  discoveryCardAddress: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  discoveryRatingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF7E6",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.pill,
  },
  discoveryRatingPillText: {
    color: "#7C4A03",
    fontSize: 13,
    fontWeight: "800",
  },
  discoveryCardDescription: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  discoveryMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  discoveryTag: {
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  discoveryTagText: {
    color: colors.textDark,
    fontSize: 13,
    fontWeight: "700",
  },
  discoveryServicesPreview: {
    gap: 6,
  },
  discoveryServiceText: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "600",
  },
});
