import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Linking } from "react-native";
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Phone,
  Star,
  WifiOff,
  X,
} from "lucide-react-native";
import { fetchBusiness } from "../lib/api";
import { colors, radii, shadows, spacing } from "../theme";
import type { PublicBusiness } from "../types";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { ProfessionalCard } from "../components/ProfessionalCard";
import { ReviewCard } from "../components/ReviewCard";
import { ServiceCard } from "../components/ServiceCard";
import type { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Business">;

type RatingBucket = 1 | 2 | 3 | 4 | 5;

const COVER_HEIGHT = 260;
const LOGO_SIZE = 60;
const GALLERY_SIZE = 120;
const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"] as const;

function hexToRgba(hex: string, alpha: number) {
  const safe = hex.replace("#", "");
  const expanded =
    safe.length === 3
      ? safe
          .split("")
          .map((value) => `${value}${value}`)
          .join("")
      : safe.padEnd(6, "0").slice(0, 6);

  const integer = Number.parseInt(expanded, 16);
  const r = (integer >> 16) & 255;
  const g = (integer >> 8) & 255;
  const b = integer & 255;

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

function formatMinutes(value: number) {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${minutes}`;
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "ZO";
}

function getAverageRating(reviews: PublicBusiness["reviews"]) {
  if (reviews.length === 0) return null;
  return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
}

function getRatingDistribution(reviews: PublicBusiness["reviews"]) {
  const totals = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } satisfies Record<RatingBucket, number>;

  for (const review of reviews) {
    const safeRating = Math.max(1, Math.min(5, Math.round(review.rating))) as RatingBucket;
    totals[safeRating] += 1;
  }

  return totals;
}

function groupBusinessHours(availabilities: PublicBusiness["professionals"][number]["availabilities"]) {
  const perDay = new Map<number, string>();

  for (let day = 0; day < dayLabels.length; day += 1) {
    const daySlots = availabilities
      .filter((item) => item.dayOfWeek === day)
      .sort((left, right) => left.startMinutes - right.startMinutes)
      .map((item) => `${formatMinutes(item.startMinutes)} - ${formatMinutes(item.endMinutes)}`);

    perDay.set(day, daySlots.join(" / "));
  }

  const groups: Array<{ days: number[]; label: string }> = [];

  for (let day = 0; day < dayLabels.length; day += 1) {
    const label = perDay.get(day) || "";
    const previous = groups[groups.length - 1];

    if (previous && previous.label === label && previous.days[previous.days.length - 1] === day - 1) {
      previous.days.push(day);
    } else {
      groups.push({ days: [day], label });
    }
  }

  return groups.filter((group) => group.label);
}

function getAddressLabel(business: PublicBusiness) {
  return [business.addressLine1, business.neighborhood, business.city, business.state].filter(Boolean).join(", ");
}

function getMinPrice(services: PublicBusiness["services"]) {
  if (services.length === 0) return null;
  return Math.min(...services.map((service) => service.priceCents));
}

export function BusinessScreen({ route, navigation }: Props) {
  const { slug } = route.params;
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;

  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);
  const [reviewsOpen, setReviewsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchBusiness(slug);
        if (!active) return;
        setBusiness(data.business);
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Nao foi possivel carregar.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [slug]);

  const accentColor = business?.brandPrimaryColor || colors.primaryStrong;
  const overlayColor = useMemo(() => hexToRgba(colors.textDark, 0.72), []);

  const services = useMemo(() => {
    if (!business) return [];
    if (!selectedProfessionalId) return business.services;
    const selectedProfessional = business.professionals.find((item) => item.id === selectedProfessionalId);
    if (!selectedProfessional) return business.services;
    const allowedIds = new Set(selectedProfessional.services.map((item) => item.serviceId));
    return business.services.filter((service) => allowedIds.has(service.id));
  }, [business, selectedProfessionalId]);

  const averageRating = useMemo(() => getAverageRating(business?.reviews ?? []), [business?.reviews]);
  const distribution = useMemo(() => getRatingDistribution(business?.reviews ?? []), [business?.reviews]);
  const addressLabel = useMemo(() => (business ? getAddressLabel(business) : ""), [business]);
  const groupedHours = useMemo(
    () => groupBusinessHours(business?.professionals[0]?.availabilities ?? []),
    [business?.professionals],
  );
  const minPriceCents = useMemo(() => getMinPrice(services), [services]);
  const galleryImages = useMemo(
    () => (business?.coverImageUrl ? Array.from({ length: 6 }, () => business.coverImageUrl as string) : []),
    [business?.coverImageUrl],
  );

  const stickyHeaderOpacity = scrollY.interpolate({
    inputRange: [COVER_HEIGHT - 88, COVER_HEIGHT - 30],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const coverScale = scrollY.interpolate({
    inputRange: [-160, 0],
    outputRange: [1.12, 1],
    extrapolateRight: "clamp",
  });

  const coverTranslateY = scrollY.interpolate({
    inputRange: [-160, 0, COVER_HEIGHT],
    outputRange: [-18, 0, COVER_HEIGHT * 0.18],
    extrapolate: "clamp",
  });

  const handleRetry = () => {
    setBusiness(null);
    setError(null);
    setIsLoading(true);
    setSelectedProfessionalId(null);
  };

  const openPhone = async () => {
    if (!business?.phone) return;
    try {
      await Linking.openURL(`tel:${business.phone}`);
    } catch {
      Alert.alert("Nao foi possivel abrir o telefone", "Tente ligar manualmente para o numero informado.");
    }
  };

  const openMaps = async () => {
    if (!business) return;

    const query = business.addressLine1
      ? encodeURIComponent(getAddressLabel(business))
      : encodeURIComponent(business.name);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Nao foi possivel abrir o mapa", "Tente novamente em alguns instantes.");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <ScrollView
          scrollEnabled={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: spacing.xxxl }]}
        >
          <SkeletonCard style={styles.loadingCoverCard} contentStyle={styles.loadingCoverContent}>
            <View style={styles.loadingCover} />
          </SkeletonCard>
          <SkeletonCard style={styles.loadingCard} contentStyle={styles.loadingCardContent}>
            <View style={[styles.skeletonLine, styles.loadingTitleLine]} />
            <View style={[styles.skeletonLine, styles.loadingBadgeLine]} />
            <View style={[styles.skeletonLine, styles.loadingWideLine]} />
            <View style={[styles.skeletonLine, styles.loadingFullLine]} />
            <View style={[styles.skeletonLine, styles.loadingMediumLine]} />
          </SkeletonCard>
          <SkeletonCard style={styles.loadingCard} contentStyle={styles.loadingCardContent}>
            <View style={[styles.skeletonLine, styles.loadingSectionLine]} />
            <View style={[styles.skeletonLine, styles.loadingFullLine]} />
            <View style={[styles.skeletonLine, styles.loadingWideLine]} />
            <View style={[styles.skeletonLine, styles.loadingMediumLine]} />
          </SkeletonCard>
          <SkeletonCard style={styles.loadingCard} contentStyle={styles.loadingCardContent}>
            <View style={[styles.skeletonLine, styles.loadingServiceHeaderLine]} />
            <View style={styles.loadingServiceList}>
              {Array.from({ length: 3 }, (_, index) => (
                <View key={`service-skeleton-${index}`} style={styles.loadingServiceCard} />
              ))}
            </View>
          </SkeletonCard>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error || !business) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <View style={styles.errorWrapper}>
          <View style={styles.errorIconShell}>
            <WifiOff size={34} color={colors.primaryStrong} />
          </View>
          <Text style={styles.errorTitle}>Nao foi possivel carregar</Text>
          <Text style={styles.errorBody}>{error || "Tente novamente em alguns instantes."}</Text>
          <Pressable style={[styles.primaryButton, { backgroundColor: colors.primaryStrong }]} onPress={handleRetry}>
            <Text style={styles.primaryButtonLabel}>Tentar novamente</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.screen}>
      <Animated.View
        style={[
          styles.stickyHeader,
          {
            paddingTop: insets.top + spacing.sm,
            opacity: stickyHeaderOpacity,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable style={styles.headerBackButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={18} color={colors.white} />
        </Pressable>
        <Text numberOfLines={1} style={styles.stickyHeaderTitle}>
          {business.name}
        </Text>
        <View style={styles.headerBackButtonSpacer} />
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 112 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: false,
        })}
        scrollEventThrottle={16}
      >
        <View style={styles.coverShell}>
          <Animated.View
            style={[
              styles.coverMotion,
              {
                transform: [{ translateY: coverTranslateY }, { scale: coverScale }],
              },
            ]}
          >
            {business.coverImageUrl ? (
              <Image source={{ uri: business.coverImageUrl }} style={styles.coverImage} />
            ) : (
              <LinearGradient colors={[accentColor, colors.surface]} style={styles.coverFallback}>
                <Text style={styles.coverFallbackText}>{getInitials(business.name)}</Text>
              </LinearGradient>
            )}
          </Animated.View>

          <LinearGradient
            colors={[hexToRgba(colors.textDark, 0), overlayColor]}
            style={styles.coverGradient}
          />

          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.floatingBackButton, { top: insets.top + spacing.sm }]}
          >
            <ArrowLeft size={18} color={colors.white} />
          </Pressable>

          <View style={styles.coverMeta}>
            <View style={[styles.logoShell, { borderColor: hexToRgba(colors.white, 0.82) }]}>
              {business.logoUrl ? (
                <Image source={{ uri: business.logoUrl }} style={styles.logoImage} />
              ) : (
                <LinearGradient colors={[accentColor, colors.primary]} style={styles.logoFallback}>
                  <Text style={styles.logoFallbackText}>{getInitials(business.name)}</Text>
                </LinearGradient>
              )}
            </View>
            <View style={styles.coverTextBlock}>
              <Text style={styles.coverName}>{business.name}</Text>
              <View style={[styles.categoryBadge, { backgroundColor: hexToRgba(accentColor, 0.24) }]}>
                <Text style={styles.categoryBadgeText}>Reservas online</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.ratingSummaryCard}>
          <View style={styles.ratingSummaryLeft}>
            <Text style={styles.ratingSummaryValue}>{averageRating ? averageRating.toFixed(1) : "Novo"}</Text>
            <View style={styles.ratingStarsRow}>
              {Array.from({ length: 5 }, (_, index) => (
                <Star
                  key={`summary-star-${index}`}
                  size={18}
                  color={colors.warning}
                  fill={averageRating && index < Math.round(averageRating) ? colors.warning : "transparent"}
                />
              ))}
            </View>
            <Text style={styles.ratingSummaryCount}>({business.reviews.length} avaliacoes)</Text>
          </View>

          <View style={styles.ratingProgressColumn}>
            {[5, 4, 3, 2, 1].map((rating) => {
              const total = business.reviews.length || 1;
              const percent = distribution[rating as RatingBucket] / total;
              return (
                <View key={`distribution-${rating}`} style={styles.ratingProgressRow}>
                  <Text style={styles.ratingProgressLabel}>{rating}★</Text>
                  <View style={styles.ratingTrack}>
                    <View
                      style={[
                        styles.ratingFill,
                        {
                          width: `${Math.max(percent * 100, distribution[rating as RatingBucket] > 0 ? 8 : 0)}%`,
                          backgroundColor: accentColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Informacoes do negocio</Text>
          {business.description ? <Text style={styles.sectionBody}>{business.description}</Text> : null}

          <View style={styles.infoList}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconShell}>
                <MapPin size={18} color={accentColor} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoLabel}>Endereco</Text>
                <Text style={styles.infoValue}>{addressLabel || "Endereco nao informado"}</Text>
              </View>
            </View>

            <Pressable style={styles.infoRow} onPress={openPhone} disabled={!business.phone}>
              <View style={styles.infoIconShell}>
                <Phone size={18} color={accentColor} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoLabel}>Telefone</Text>
                <Text style={[styles.infoValue, !business.phone && styles.infoValueMuted]}>
                  {business.phone || "Contato disponivel na confirmacao"}
                </Text>
              </View>
            </Pressable>

            <View style={styles.infoRow}>
              <View style={styles.infoIconShell}>
                <Clock3 size={18} color={accentColor} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoLabel}>Horario de funcionamento</Text>
                {groupedHours.length > 0 ? (
                  groupedHours.map((group) => {
                    const firstDay = group.days[0];
                    const lastDay = group.days[group.days.length - 1];
                    const label =
                      firstDay === lastDay
                        ? dayLabels[firstDay]
                        : `${dayLabels[firstDay]} - ${dayLabels[lastDay]}`;
                    const isToday = group.days.includes(new Date().getDay());

                    return (
                      <View key={`${label}-${group.label}`} style={styles.hoursRow}>
                        <Text style={[styles.hoursDayLabel, isToday && { color: accentColor }]}>{label}</Text>
                        <Text style={[styles.hoursValue, isToday && { color: accentColor }]}>{group.label}</Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.infoValueMuted}>Consulte a equipe para horarios disponiveis.</Text>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIconShell}>
                <AlertCircle size={18} color={accentColor} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoLabel}>Politica de cancelamento</Text>
                <Text style={styles.infoValue}>{business.cancellationPolicyText || "Consulte o estabelecimento"}</Text>
              </View>
            </View>
          </View>

          <Pressable style={[styles.secondaryButton, { borderColor: hexToRgba(accentColor, 0.22) }]} onPress={openMaps}>
            <MapPin size={16} color={accentColor} />
            <Text style={[styles.secondaryButtonLabel, { color: accentColor }]}>Como chegar</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Servicos</Text>
            <Text style={styles.sectionCounter}>({services.length})</Text>
          </View>
          <View style={styles.servicesList}>
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                name={service.name}
                description={service.description}
                durationMinutes={service.durationMinutes}
                priceLabel={formatCurrency(service.priceCents)}
                hasVariants={service.variants.length > 0}
                accentColor={service.colorHex || accentColor}
                onPress={() => navigation.navigate("Booking", { slug: business.slug, serviceId: service.id })}
              />
            ))}
            {services.length === 0 ? (
              <View style={styles.inlineEmptyCard}>
                <Text style={styles.inlineEmptyTitle}>Nenhum servico para este profissional</Text>
                <Text style={styles.inlineEmptyBody}>Selecione outro profissional ou agende diretamente pelo negocio.</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Profissionais</Text>
            <Text style={styles.sectionCounter}>({business.professionals.length})</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.professionalsScroll}>
            {business.professionals.map((professional) => (
              <ProfessionalCard
                key={professional.id}
                displayName={professional.displayName}
                roleLabel={professional.roleLabel}
                photoUrl={professional.photoUrl}
                selected={selectedProfessionalId === professional.id}
                accentColor={accentColor}
                onPress={() =>
                  setSelectedProfessionalId((current) => (current === professional.id ? null : professional.id))
                }
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>O que dizem os clientes</Text>
            <Text style={styles.sectionCounter}>({business.reviews.length})</Text>
          </View>

          <View style={styles.reviewsList}>
            {business.reviews.slice(0, 3).map((review) => (
              <ReviewCard
                key={review.id}
                customerName={review.customerNameSnapshot}
                rating={review.rating}
                body={review.body}
                subtitle="Cliente verificado"
              />
            ))}
            {business.reviews.length === 0 ? (
              <View style={styles.inlineEmptyCard}>
                <Text style={styles.inlineEmptyTitle}>As primeiras avaliacoes chegam logo</Text>
                <Text style={styles.inlineEmptyBody}>Assim que os atendimentos forem concluidos, as experiencias aparecem aqui.</Text>
              </View>
            ) : null}
          </View>

          {business.reviews.length > 3 ? (
            <Pressable style={styles.fullWidthLink} onPress={() => setReviewsOpen(true)}>
              <Text style={[styles.fullWidthLinkText, { color: accentColor }]}>
                Ver todas as {business.reviews.length} avaliacoes
              </Text>
              <ChevronRight size={16} color={accentColor} />
            </Pressable>
          ) : null}
        </View>

        {galleryImages.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Fotos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
              {galleryImages.map((imageUrl, index) => (
                <Pressable
                  key={`gallery-${index}`}
                  onPress={() => {
                    setGalleryIndex(index);
                    setGalleryOpen(true);
                  }}
                >
                  <Image source={{ uri: imageUrl }} style={styles.galleryImage} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </Animated.ScrollView>

      <View style={[styles.bottomCta, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={styles.bottomPriceBlock}>
          <Text style={styles.bottomPriceLabel}>a partir de</Text>
          <Text style={styles.bottomPriceValue}>
            {minPriceCents != null ? formatCurrency(minPriceCents) : "Indisponivel"}
          </Text>
        </View>
        <Pressable
          style={[
            styles.ctaButton,
            { backgroundColor: services.length > 0 ? accentColor : colors.textMuted },
          ]}
          disabled={services.length === 0}
          onPress={() => navigation.navigate("Booking", { slug: business.slug })}
        >
          <Text style={styles.ctaButtonText}>{services.length > 0 ? "Agendar agora" : "Indisponivel"}</Text>
        </Pressable>
      </View>

      <Modal visible={reviewsOpen} transparent animationType="slide" onRequestClose={() => setReviewsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Avaliacoes</Text>
              <Pressable style={styles.modalCloseButton} onPress={() => setReviewsOpen(false)}>
                <X size={18} color={colors.textDark} />
              </Pressable>
            </View>
            <FlatList
              data={business.reviews}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => (
                <ReviewCard
                  customerName={item.customerNameSnapshot}
                  rating={item.rating}
                  body={item.body}
                  subtitle="Cliente verificado"
                />
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={galleryOpen} transparent animationType="fade" onRequestClose={() => setGalleryOpen(false)}>
        <View style={styles.galleryModalBackdrop}>
          <Pressable style={[styles.modalCloseButton, styles.galleryCloseButton]} onPress={() => setGalleryOpen(false)}>
            <X size={20} color={colors.white} />
          </Pressable>
          {galleryImages[galleryIndex] ? (
            <Image source={{ uri: galleryImages[galleryIndex] }} style={styles.galleryFullscreenImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  stickyHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: hexToRgba(colors.textDark, 0.92),
    borderBottomWidth: 1,
  },
  stickyHeaderTitle: {
    flex: 1,
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginHorizontal: spacing.md,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: hexToRgba(colors.white, 0.12),
  },
  headerBackButtonSpacer: {
    width: 40,
    height: 40,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  coverShell: {
    height: COVER_HEIGHT,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  coverMotion: {
    ...StyleSheet.absoluteFillObject,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  coverFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  coverFallbackText: {
    color: colors.white,
    fontSize: 56,
    fontWeight: "900",
  },
  coverGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingBackButton: {
    position: "absolute",
    left: spacing.md,
    width: 46,
    height: 46,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: hexToRgba(colors.textDark, 0.32),
  },
  coverMeta: {
    position: "absolute",
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.md,
  },
  logoShell: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 2,
    backgroundColor: colors.white,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  logoFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logoFallbackText: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "800",
  },
  coverTextBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  coverName: {
    color: colors.white,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: "900",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  categoryBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  ratingSummaryCard: {
    flexDirection: "row",
    gap: spacing.lg,
    backgroundColor: colors.surfaceCard,
    borderRadius: radii.xl,
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  ratingSummaryLeft: {
    width: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  ratingSummaryValue: {
    color: colors.textDark,
    fontSize: 38,
    fontWeight: "900",
  },
  ratingStarsRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: spacing.xs,
  },
  ratingSummaryCount: {
    marginTop: spacing.xs,
    color: colors.textSoft,
    fontSize: 13,
    textAlign: "center",
  },
  ratingProgressColumn: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.sm,
  },
  ratingProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  ratingProgressLabel: {
    width: 26,
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  ratingTrack: {
    flex: 1,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },
  ratingFill: {
    height: "100%",
    borderRadius: radii.pill,
  },
  sectionCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radii.xl,
    marginHorizontal: spacing.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.textDark,
    fontSize: 24,
    fontWeight: "900",
  },
  sectionCounter: {
    color: colors.textSoft,
    fontSize: 16,
    fontWeight: "700",
  },
  sectionBody: {
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  infoList: {
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  infoIconShell: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  infoCopy: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    color: colors.textDark,
    fontSize: 15,
    fontWeight: "800",
  },
  infoValue: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  infoValueMuted: {
    color: colors.textMuted,
  },
  hoursRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  hoursDayLabel: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: "700",
  },
  hoursValue: {
    flex: 1,
    textAlign: "right",
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    alignSelf: "flex-start",
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  secondaryButtonLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
  servicesList: {
    gap: spacing.md,
  },
  professionalsScroll: {
    gap: spacing.md,
    paddingRight: spacing.md,
  },
  reviewsList: {
    gap: spacing.md,
  },
  inlineEmptyCard: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    backgroundColor: colors.surfaceMuted,
    gap: spacing.xs,
  },
  inlineEmptyTitle: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: "800",
  },
  inlineEmptyBody: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  fullWidthLink: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fullWidthLinkText: {
    fontSize: 14,
    fontWeight: "800",
  },
  galleryScroll: {
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  galleryImage: {
    width: GALLERY_SIZE,
    height: GALLERY_SIZE,
    borderRadius: radii.lg,
  },
  bottomCta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    ...shadows.card,
  },
  bottomPriceBlock: {
    flex: 1,
  },
  bottomPriceLabel: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  bottomPriceValue: {
    color: colors.textDark,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 2,
  },
  ctaButton: {
    minWidth: 172,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
    borderRadius: radii.pill,
  },
  ctaButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: hexToRgba(colors.textDark, 0.48),
  },
  modalCard: {
    maxHeight: "84%",
    backgroundColor: colors.backgroundSoft,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  modalTitle: {
    color: colors.textDark,
    fontSize: 22,
    fontWeight: "900",
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  modalList: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  galleryModalBackdrop: {
    flex: 1,
    backgroundColor: hexToRgba(colors.textDark, 0.96),
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  galleryCloseButton: {
    position: "absolute",
    top: spacing.xxxl,
    right: spacing.md,
    backgroundColor: hexToRgba(colors.white, 0.12),
  },
  galleryFullscreenImage: {
    width: "100%",
    height: "80%",
  },
  loadingCoverCard: {
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
  },
  loadingCoverContent: {
    padding: 0,
  },
  loadingCover: {
    height: COVER_HEIGHT,
    backgroundColor: colors.surfaceMuted,
  },
  loadingCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  loadingCardContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  skeletonLine: {
    height: 14,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  loadingTitleLine: {
    width: "55%",
  },
  loadingBadgeLine: {
    width: "24%",
  },
  loadingWideLine: {
    width: "70%",
  },
  loadingFullLine: {
    width: "100%",
  },
  loadingMediumLine: {
    width: "62%",
  },
  loadingSectionLine: {
    width: "35%",
  },
  loadingServiceHeaderLine: {
    width: "28%",
  },
  loadingServiceList: {
    gap: spacing.md,
  },
  loadingServiceCard: {
    height: 108,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
  },
  errorWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  errorIconShell: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceCard,
    ...shadows.card,
  },
  errorTitle: {
    color: colors.textDark,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  errorBody: {
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  primaryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 16,
    borderRadius: radii.pill,
  },
  primaryButtonLabel: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
});
