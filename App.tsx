import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer, useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
  type NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import * as Sentry from "@sentry/react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import * as WebBrowser from "expo-web-browser";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Briefcase,
  Calendar,
  CalendarDays,
  ChevronRight,
  Clock3,
  Compass,
  CreditCard,
  Gem,
  Heart,
  HeartHandshake,
  LayoutDashboard,
  LocateFixed,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Smartphone,
  User,
  Users,
} from "lucide-react-native";
import {
  API_URL,
  businessLogin,
  createBooking,
  fetchAvailability,
  fetchBusiness,
  fetchBusinessAgenda,
  fetchBusinessDashboard,
  fetchDiscoveryBusinesses,
  searchBusinesses,
} from "./src/lib/api";
import { BookingConfirmationScreen } from "./src/screens/BookingConfirmationScreen";
import { BookingDetailScreen } from "./src/screens/BookingDetailScreen";
import { BookingScreen } from "./src/screens/BookingScreen";
import { BookingsScreen as CustomerBookingsScreen } from "./src/screens/BookingsScreen";
import { NotificationBanner } from "./src/components/NotificationBanner";
import { PaymentScreen } from "./src/screens/PaymentScreen";
import { PaymentSuccessScreen } from "./src/screens/PaymentSuccessScreen";
import { ToastProvider } from "./src/components/ui/Toast";
import { AppointmentDetailScreen } from "./src/screens/business/AppointmentDetailScreen";
import { BusinessAccountScreen as MobileBusinessAccountScreen } from "./src/screens/business/BusinessAccountScreen";
import { BusinessAgendaScreen as MobileBusinessAgendaScreen } from "./src/screens/business/BusinessAgendaScreen";
import { BusinessAvailabilityScreen } from "./src/screens/business/BusinessAvailabilityScreen";
import { BusinessOverviewScreen as MobileBusinessOverviewScreen } from "./src/screens/business/BusinessOverviewScreen";
import { BusinessServicesScreen } from "./src/screens/business/BusinessServicesScreen";
import { ForgotPasswordScreen } from "./src/screens/auth/ForgotPasswordScreen";
import { BusinessScreen } from "./src/screens/BusinessScreen";
import { LoginScreen } from "./src/screens/auth/LoginScreen";
import { ProfileScreen as CustomerProfileScreen } from "./src/screens/ProfileScreen";
import { RegisterScreen } from "./src/screens/auth/RegisterScreen";
import { RescheduleScreen } from "./src/screens/RescheduleScreen";
import {
  clearBusinessSession,
  loadFavorites,
  loadBusinessSession,
  loadCustomerSession,
  loadNotificationsPrompted,
  loadSavedBookings,
  loadSavedProfile,
  saveBooking,
  toggleFavorite,
  saveBusinessSession,
  saveProfile,
} from "./src/lib/storage";
import { navigationRef } from "./src/lib/navigation";
import { Analytics, clearAnalyticsUser, identifyAnalyticsUser, initAnalytics } from "./src/lib/analytics";
import { clearUserContext, setUserContext } from "./src/lib/crash";
import {
  markNotificationsPrompted,
  registerForPushNotificationsAsync,
  savePushTokenToBackend,
} from "./src/lib/notifications";
import { handleNotificationNavigation, usePushNotifications } from "./src/hooks/usePushNotifications";
import { useToast } from "./src/hooks/useToast";
import { healthCheck } from "./src/utils/healthCheck";
import { colors, radii, shadows, spacing } from "./src/theme";
import type {
  BusinessAgendaItem,
  BusinessDashboard,
  BusinessMobileSession,
  DiscoveryBusiness,
  PublicBusiness,
  SavedBooking,
  SavedProfile,
} from "./src/types";

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  CustomerTabs: undefined;
  BusinessLogin: undefined;
  BusinessTabs: undefined;
  Business: { slug: string };
  Booking: { slug: string; serviceId?: string };
  BookingConfirmation: { booking: SavedBooking; mode?: "confirmed" | "rescheduled" };
  BookingDetail: { appointmentId: string };
  AppointmentDetail: { appointmentId: string; date?: string };
  BusinessAvailability: undefined;
  BusinessServices: undefined;
  Payment: {
    appointmentId: string;
    priceCents: number;
    customerEmail: string;
    description: string;
    token: string;
    serviceName: string;
    professionalName: string;
    startsAtLabel: string;
    allowPayOnSite?: boolean;
  };
  PaymentSuccess: { appointmentId: string; paymentId?: string };
  Reschedule: { appointmentId: string };
};

export type CustomerTabParamList = {
  Explore: undefined;
  Bookings: undefined;
  Profile: undefined;
};

export type BusinessTabParamList = {
  Overview: undefined;
  Agenda: undefined;
  Account: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const CustomerTabs = createBottomTabNavigator<CustomerTabParamList>();
const BusinessTabs = createBottomTabNavigator<BusinessTabParamList>();

const categoryMeta = {
  HEALTH: { label: "Saude", icon: HeartHandshake },
  BEAUTY: { label: "Beleza", icon: Sparkles },
  EDUCATION: { label: "Educacao", icon: Gem },
  CONSULTING: { label: "Consultoria", icon: Briefcase },
  SPORTS: { label: "Esportes", icon: Clock3 },
  OTHER: { label: "Outros", icon: Store },
} as const;

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((cents ?? 0) / 100);
}

function formatDateLabel(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(iso));
}

function formatTimeLabel(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

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

function buildDateOptions() {
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return date;
  });
}

function WelcomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Welcome">) {
  return (
    <SafeAreaView style={styles.welcomeSafeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.welcomeScroll}>
        <LinearGradient
          colors={["#0F172A", "#162349", "#2563EB"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.welcomeHero}
        >
          <Text style={styles.welcomeEyebrow}>ZORBY APP</Text>
          <Text style={styles.welcomeTitle}>Duas jornadas, um app de verdade.</Text>
          <Text style={styles.welcomeSubtitle}>
            O cliente final descobre negocios, escolhe horarios e reserva. A empresa acompanha agenda, operacao e atendimento sem sair do celular.
          </Text>

          <View style={styles.welcomePrimaryActions}>
            <PrimaryButton label="Quero agendar" onPress={() => navigation.navigate("Login")} />
            <SecondaryButton label="Entrar como empresa" onPress={() => navigation.navigate("BusinessLogin")} />
          </View>

          <View style={styles.welcomeMiniStats}>
            <View style={styles.welcomeMiniStat}>
              <Compass size={16} color={colors.white} />
              <Text style={styles.welcomeMiniStatText}>Descoberta com busca e proximidade</Text>
            </View>
            <View style={styles.welcomeMiniStat}>
              <CalendarDays size={16} color={colors.white} />
              <Text style={styles.welcomeMiniStatText}>Horarios reais e reserva em tempo real</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.dualCards}>
          <RoleCard
            icon={<Compass size={22} color={colors.primaryStrong} />}
            title="Cliente final"
            description="Explore negocios reais, filtre por categoria, veja horarios livres e reserve em poucos toques."
            bullets={["Busca com proximidade", "Agendamentos salvos", "Perfil unico para futuras reservas"]}
            actionLabel="Explorar servicos"
            onPress={() => navigation.navigate("Login")}
          />
          <RoleCard
            icon={<Smartphone size={22} color={colors.primaryStrong} />}
            title="Empresa ou profissional"
            description="Entre no painel mobile para acompanhar agenda do dia, status dos atendimentos e operacao."
            bullets={["Visao de hoje", "Agenda mobile", "Conta e operacao no app"]}
            actionLabel="Entrar na area da empresa"
            onPress={() => navigation.navigate("BusinessLogin")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CustomerTabsNavigator() {
  return (
    <CustomerTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.customerTabBar,
        tabBarActiveTintColor: colors.primaryStrong,
        tabBarInactiveTintColor: "#8A94A6",
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <CustomerTabs.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarLabel: "Explorar",
          tabBarIcon: ({ color }) => <Compass size={20} color={color} />,
        }}
      />
      <CustomerTabs.Screen
        name="Bookings"
        component={CustomerBookingsScreen}
        options={{
          tabBarLabel: "Agendamentos",
          tabBarIcon: ({ color }) => <Calendar size={20} color={color} />,
        }}
      />
      <CustomerTabs.Screen
        name="Profile"
        component={CustomerProfileScreen}
        options={{
          tabBarLabel: "Perfil",
          tabBarIcon: ({ color }) => <User size={20} color={color} />,
        }}
      />
    </CustomerTabs.Navigator>
  );
}

function BusinessTabsNavigator({ agendaBadgeCount = 0 }: { agendaBadgeCount?: number }) {
  return (
    <BusinessTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.businessTabBar,
        tabBarActiveTintColor: colors.white,
        tabBarInactiveTintColor: "rgba(248,250,252,0.62)",
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <BusinessTabs.Screen
        name="Overview"
        component={MobileBusinessOverviewScreen}
        options={{
          tabBarLabel: "Painel",
          tabBarIcon: ({ color }) => <LayoutDashboard size={20} color={color} />,
        }}
      />
      <BusinessTabs.Screen
        name="Agenda"
        component={MobileBusinessAgendaScreen}
        options={{
          tabBarLabel: "Agenda",
          tabBarIcon: ({ color }) => <CalendarDays size={20} color={color} />,
          tabBarBadge: agendaBadgeCount > 0 ? agendaBadgeCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primaryStrong,
            color: colors.white,
          },
        }}
      />
      <BusinessTabs.Screen
        name="Account"
        component={MobileBusinessAccountScreen}
        options={{
          tabBarLabel: "Conta",
          tabBarIcon: ({ color }) => <Briefcase size={20} color={color} />,
        }}
      />
    </BusinessTabs.Navigator>
  );
}

function ExploreScreen() {
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

  const loadBusinesses = useCallback(async (nextPage = 1, append = false) => {
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
      showToast(error instanceof Error ? error.message : "Não foi possível carregar.", "error");
      if (!append) setBusinesses([]);
    } finally {
      setLoading(false);
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  }, [businesses.length, category, locationCoords, search, showToast]);

  useEffect(() => {
    Analytics.trackExploreOpened();
  }, [loadBusinesses]);

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
        Alert.alert("Localizacao nao autorizada", "Ative a localizacao para ordenar negocios mais proximos.");
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
      showToast("Não foi possível usar sua localização agora.", "warning");
    } finally {
      setRefreshingLocation(false);
    }
  }, [showToast]);

  const featuredBusinesses = businesses.slice(0, 3);

  const handleToggleFavorite = useCallback(async (slug: string) => {
    const result = await toggleFavorite(slug);
    setFavoriteSlugs(result.favorites);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (result.isFavorite) {
      Analytics.trackFavoriteAdded(slug);
    } else {
      Analytics.trackFavoriteRemoved(slug);
    }
  }, []);

  const handleOpenBusiness = useCallback((business: DiscoveryBusiness, position: number) => {
    Analytics.trackBusinessCardTapped(business.id, business.name, position);
    navigation.navigate("Business", { slug: business.slug });
  }, [navigation]);

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
            {refreshingLocation ? <ActivityIndicator color={colors.white} /> : <LocateFixed size={16} color={colors.white} />}
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

        {featuredBusinesses.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
            {featuredBusinesses.map((business) => (
              <FeaturedBusinessCard
                key={business.id}
                business={business}
                isFavorite={favoriteSlugs.includes(business.slug)}
                onToggleFavorite={() => void handleToggleFavorite(business.slug)}
                onPress={() => handleOpenBusiness(business, featuredBusinesses.findIndex((item) => item.id === business.id))}
              />
            ))}
          </ScrollView>
        ) : null}

        <SectionHeader title="Negocios para reservar" subtitle="Empresas e profissionais com horarios ativos." />

        {loading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={colors.primaryStrong} />
          </View>
        ) : businesses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Search size={24} color={colors.primaryStrong} />
            <Text style={styles.emptyTitle}>Nenhum negocio encontrado</Text>
            <Text style={styles.emptyBody}>Ajuste a busca, use outra categoria ou tente novamente mais tarde.</Text>
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
            {hasMore ? (
              <Pressable style={styles.loadMoreButton} onPress={handleLoadMore}>
                {isLoadingMore ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.loadMoreButtonText}>Carregar mais</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BookingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [bookings, setBookings] = useState<SavedBooking[]>([]);

  const loadBookings = useCallback(async () => {
    const saved = await loadSavedBookings();
    setBookings(saved);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadBookings();
    }, [loadBookings]),
  );

  return (
    <SafeAreaView style={styles.customerScreen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.customerScroll}>
        <Text style={styles.screenTitle}>Agendamentos</Text>
        <Text style={styles.screenSubtitle}>Seus horarios confirmados e reservas salvas aparecem aqui.</Text>

        {bookings.length === 0 ? (
          <View style={styles.emptyCardLarge}>
            <Calendar size={34} color={colors.primaryStrong} />
            <Text style={styles.emptyTitle}>Nenhuma reserva salva ainda</Text>
            <Text style={styles.emptyBody}>
              Assim que voce concluir um agendamento pelo app, ele fica salvo aqui com os detalhes principais.
            </Text>
          </View>
        ) : (
          <View style={styles.bookingCards}>
            {bookings.map((booking) => (
              <Pressable
                key={booking.appointmentId}
                style={styles.savedBookingCard}
                onPress={() => navigation.navigate("BookingDetail", { appointmentId: booking.appointmentId })}
              >
                <View style={styles.savedBookingTop}>
                  <View>
                    <Text style={styles.savedBookingBusiness}>{booking.businessName}</Text>
                    <Text style={styles.savedBookingService}>{booking.serviceName}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>
                      {booking.status === "CANCELLED" ? "Cancelada" : booking.status === "PENDING" ? "Pendente" : "Confirmada"}
                    </Text>
                  </View>
                </View>
                <View style={styles.bookingInfoRow}>
                  <Clock3 size={16} color={colors.textSoft} />
                  <Text style={styles.bookingInfoText}>
                    {formatDateLabel(booking.startsAt)} • {formatTimeLabel(booking.startsAt)}
                  </Text>
                </View>
                <View style={styles.bookingInfoRow}>
                  <Users size={16} color={colors.textSoft} />
                  <Text style={styles.bookingInfoText}>{booking.professionalName}</Text>
                </View>
                {booking.addressLabel ? (
                  <View style={styles.bookingInfoRow}>
                    <MapPin size={16} color={colors.textSoft} />
                    <Text style={styles.bookingInfoText}>{booking.addressLabel}</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [profile, setProfile] = useState<SavedProfile>({ name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadSavedProfile().then((saved) => {
        if (active) setProfile(saved);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      await saveProfile(profile);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Perfil salvo", "Seus dados ficaram prontos para acelerar os proximos agendamentos.");
    } finally {
      setSaving(false);
    }
  }, [profile]);

  return (
    <SafeAreaView style={styles.customerScreen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.customerScroll}>
        <Text style={styles.screenTitle}>Perfil</Text>
        <Text style={styles.screenSubtitle}>Preencha seus dados para agilizar as proximas reservas.</Text>

        <View style={styles.profileCard}>
          <LabeledInput label="Nome completo" value={profile.name} onChangeText={(value) => setProfile((current) => ({ ...current, name: value }))} />
          <LabeledInput
            label="E-mail"
            keyboardType="email-address"
            autoCapitalize="none"
            value={profile.email}
            onChangeText={(value) => setProfile((current) => ({ ...current, email: value }))}
          />
          <LabeledInput
            label="Telefone"
            keyboardType="phone-pad"
            value={profile.phone}
            onChangeText={(value) => setProfile((current) => ({ ...current, phone: value }))}
          />
          <PrimaryButton label={saving ? "Salvando..." : "Salvar perfil"} onPress={handleSave} disabled={saving} />
        </View>

        <View style={styles.profileCard}>
          <Text style={styles.profileSectionTitle}>Area profissional</Text>
          <Text style={styles.profileSectionBody}>
            Se voce e empresa ou profissional, use esta area para acompanhar agenda, atendimento e conta no mobile.
          </Text>
          <SecondaryButton label="Entrar no app da empresa" onPress={() => navigation.navigate("BusinessLogin")} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BusinessLoginScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, "BusinessLogin">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    try {
      setLoading(true);
      const session = await businessLogin({ email, password });
      await saveBusinessSession(session);
      Analytics.trackBusinessLoginSuccess();
      identifyAnalyticsUser(session.user.id, session.user.email, "business");
      setUserContext(session.user.id, session.user.email);
      navigation.reset({
        index: 0,
        routes: [{ name: "BusinessTabs" }],
      });
    } catch (error) {
      Alert.alert("Nao foi possivel entrar", error instanceof Error ? error.message : "Confira seu e-mail e senha.");
    } finally {
      setLoading(false);
    }
  }, [email, navigation, password]);

  return (
    <SafeAreaView style={styles.businessLoginSafeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.businessLoginScroll}>
        <LinearGradient colors={["#0B1020", "#131C35", "#1D4ED8"]} style={styles.businessLoginHero}>
          <Text style={styles.heroBadge}>ZORBY ADMIN</Text>
          <Text style={styles.businessLoginTitle}>Entre para gerir agenda, horarios e operacao em movimento.</Text>
          <Text style={styles.businessLoginSubtitle}>
            Esta area e exclusiva para empresa ou profissional responsavel pela operacao do negocio.
          </Text>
        </LinearGradient>

        <View style={styles.businessLoginCard}>
          <LabeledInput
            label="E-mail da empresa"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <LabeledInput label="Senha" secureTextEntry value={password} onChangeText={setPassword} />
          <PrimaryButton label={loading ? "Entrando..." : "Entrar no painel mobile"} onPress={handleLogin} disabled={loading} />

          <Pressable style={styles.textLink} onPress={() => navigation.replace("Login")}>
            <Text style={styles.textLinkLabel}>Sou cliente final e quero agendar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LegacyBusinessOverviewScreen() {
  const [session, setSession] = useState<BusinessMobileSession | null>(null);
  const [dashboard, setDashboard] = useState<BusinessDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    const current = await loadBusinessSession();
    setSession(current);
    if (!current) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await fetchBusinessDashboard(current.token);
      setDashboard(result);
    } catch (error) {
      Alert.alert("Nao foi possivel atualizar", error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOverview();
    }, [loadOverview]),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.businessScreen} edges={["top", "left", "right"]}>
        <View style={styles.centerCardLarge}>
          <ActivityIndicator color={colors.white} />
        </View>
      </SafeAreaView>
    );
  }

  if (!session || !dashboard) {
    return (
      <SafeAreaView style={styles.businessScreen} edges={["top", "left", "right"]}>
        <View style={styles.centerCardLarge}>
          <Text style={styles.businessCardTitle}>Sessao indisponivel</Text>
          <Text style={styles.businessCardBody}>Faca login novamente para ver o painel mobile da empresa.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.businessScreen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.businessScroll}>
        <LinearGradient colors={["#10172A", "#172554", "#1D4ED8"]} style={styles.adminHero}>
          <Text style={styles.heroBadge}>PAINEL MOBILE</Text>
          <Text style={styles.adminHeroTitle}>Sua operacao do dia, com clareza e ritmo.</Text>
          <Text style={styles.adminHeroSubtitle}>
            Acompanhe agenda, proximos atendimentos e receita do mes sem depender do desktop.
          </Text>
          <View style={styles.adminHeroMeta}>
            <DarkStatCard label="Hoje" value={`${dashboard.summary.appointmentsToday}`} icon={<Calendar size={18} color={colors.white} />} />
            <DarkStatCard label="Confirmados" value={`${dashboard.summary.confirmedToday}`} icon={<ShieldCheck size={18} color={colors.white} />} />
            <DarkStatCard label="Receita" value={formatCurrency(dashboard.summary.revenueMonthCents)} icon={<CreditCard size={18} color={colors.white} />} />
          </View>
        </LinearGradient>

        <SectionHeader title="Proximos agendamentos" subtitle="O que precisa de atencao nas proximas horas." dark />

        {dashboard.nextAppointments.length === 0 ? (
          <View style={styles.adminCard}>
            <Text style={styles.businessCardTitle}>Nenhum agendamento proximo</Text>
            <Text style={styles.businessCardBody}>Quando novos clientes reservarem horarios, eles aparecem aqui.</Text>
          </View>
        ) : (
          <View style={styles.agendaCards}>
            {dashboard.nextAppointments.map((item) => (
              <View key={item.id} style={styles.adminAppointmentCard}>
                <View style={styles.adminAppointmentTop}>
                  <View>
                    <Text style={styles.adminAppointmentName}>{item.customerNameSnapshot}</Text>
                    <Text style={styles.adminAppointmentMeta}>{item.serviceNameSnapshot}</Text>
                  </View>
                  <View style={styles.businessStatusBadge}>
                    <Text style={styles.businessStatusBadgeText}>{normalizeStatus(item.status)}</Text>
                  </View>
                </View>
                <Text style={styles.adminAppointmentMeta}>
                  {formatDateLabel(item.startsAtUtc)} • {formatTimeLabel(item.startsAtUtc)} • {item.professional.displayName}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LegacyBusinessAgendaScreen() {
  const [session, setSession] = useState<BusinessMobileSession | null>(null);
  const [agenda, setAgenda] = useState<BusinessAgendaItem[]>([]);
  const [date, setDate] = useState(toDateKey(new Date()));
  const [loading, setLoading] = useState(true);

  const loadAgenda = useCallback(async () => {
    const current = await loadBusinessSession();
    setSession(current);
    if (!current) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await fetchBusinessAgenda({ token: current.token, date });
      setAgenda(result.appointments);
    } catch (error) {
      Alert.alert("Nao foi possivel carregar a agenda", error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      void loadAgenda();
    }, [loadAgenda]),
  );

  const days = useMemo(() => buildDateOptions(), []);

  return (
    <SafeAreaView style={styles.businessScreen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.businessScroll}>
        <Text style={styles.businessPageTitle}>Agenda</Text>
        <Text style={styles.businessPageSubtitle}>Confirme quem vai chegar, quem ja foi atendido e o ritmo do dia.</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayPickerRow}>
          {days.map((item) => {
            const key = toDateKey(item);
            const active = key === date;
            return (
              <Pressable key={key} style={[styles.dayPill, active && styles.dayPillActive]} onPress={() => setDate(key)}>
                <Text style={[styles.dayPillWeekday, active && styles.dayPillWeekdayActive]}>
                  {new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(item)}
                </Text>
                <Text style={[styles.dayPillDay, active && styles.dayPillDayActive]}>
                  {new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(item)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {!session ? (
          <View style={styles.adminCard}>
            <Text style={styles.businessCardTitle}>Sessao indisponivel</Text>
            <Text style={styles.businessCardBody}>Entre novamente para acessar a agenda mobile da empresa.</Text>
          </View>
        ) : loading ? (
          <View style={styles.centerCardLarge}>
            <ActivityIndicator color={colors.white} />
          </View>
        ) : agenda.length === 0 ? (
          <View style={styles.adminCard}>
            <Text style={styles.businessCardTitle}>Nenhum horario reservado nesta data</Text>
            <Text style={styles.businessCardBody}>Quando novos clientes reservarem, os cards de atendimento aparecem aqui.</Text>
          </View>
        ) : (
          <View style={styles.agendaCards}>
            {agenda.map((item) => (
              <View key={item.id} style={styles.adminAppointmentCard}>
                <View style={styles.adminAppointmentTop}>
                  <View>
                    <Text style={styles.adminAppointmentName}>{item.customerNameSnapshot}</Text>
                    <Text style={styles.adminAppointmentMeta}>{item.serviceNameSnapshot}</Text>
                  </View>
                  <Text style={styles.adminAppointmentPrice}>{formatCurrency(item.priceCents)}</Text>
                </View>
                <Text style={styles.adminAppointmentMeta}>
                  {formatTimeLabel(item.startsAtUtc)} - {formatTimeLabel(item.endsAtUtc)}
                </Text>
                <Text style={styles.adminAppointmentMeta}>{item.professional.displayName}</Text>
                <Text style={styles.adminAppointmentMeta}>{item.customerPhoneSnapshot}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LegacyBusinessAccountScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [session, setSession] = useState<BusinessMobileSession | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      void loadBusinessSession().then((result) => {
        if (active) setSession(result);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const openWebDashboard = useCallback(async () => {
    const url = `${API_URL}/login`;
    await WebBrowser.openBrowserAsync(url);
  }, []);

  const logout = useCallback(async () => {
    await clearBusinessSession();
    navigation.reset({
      index: 0,
      routes: [{ name: "Welcome" }],
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.businessScreen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.businessScroll}>
        <Text style={styles.businessPageTitle}>Conta</Text>
        <Text style={styles.businessPageSubtitle}>Acesse os dados da empresa, acompanhe a conta no app e abra o painel completo so quando precisar.</Text>

        <View style={styles.adminCard}>
          <Text style={styles.businessCardTitle}>{session?.business.name ?? "Empresa"}</Text>
          <Text style={styles.businessCardBody}>{session?.user.email ?? "Sem sessao ativa"}</Text>
          <Text style={styles.businessCardBody}>Slug publico: {session?.business.slug ?? "-"}</Text>
        </View>

        <Pressable style={styles.actionRowCard} onPress={openWebDashboard}>
          <View style={styles.actionRowIcon}>
            <LayoutDashboard size={18} color={colors.primaryStrong} />
          </View>
          <View style={styles.actionRowContent}>
            <Text style={styles.actionRowTitle}>Abrir painel completo</Text>
            <Text style={styles.actionRowBody}>Use servicos, profissionais, relatorios e cobranca no navegador quando precisar.</Text>
          </View>
          <ChevronRight size={20} color={colors.textSoft} />
        </Pressable>

        <Pressable style={styles.actionRowCard} onPress={logout}>
          <View style={styles.actionRowIcon}>
            <LogOut size={18} color={colors.danger} />
          </View>
          <View style={styles.actionRowContent}>
            <Text style={styles.actionRowTitle}>Sair da conta</Text>
            <Text style={styles.actionRowBody}>Encerre a sessao desta empresa neste aparelho.</Text>
          </View>
          <ChevronRight size={20} color={colors.textSoft} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function BusinessDetailScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Business">) {
  const { slug } = route.params;
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [serviceSearch, setServiceSearch] = useState("");

  useEffect(() => {
    let active = true;
    void fetchBusiness(slug)
      .then((data) => {
        if (active) setBusiness(data.business);
      })
      .catch((error) => {
        Alert.alert("Nao foi possivel abrir o negocio", error instanceof Error ? error.message : "Tente novamente.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const filteredServices = useMemo(() => {
    if (!business) return [];
    const normalized = serviceSearch.trim().toLowerCase();
    if (!normalized) return business.services;
    return business.services.filter((service) =>
      `${service.name} ${service.description ?? ""}`.toLowerCase().includes(normalized),
    );
  }, [business, serviceSearch]);

  if (loading) {
    return (
      <SafeAreaView style={styles.customerScreen} edges={["top", "left", "right"]}>
        <View style={styles.centerCardLarge}>
          <ActivityIndicator color={colors.primaryStrong} />
        </View>
      </SafeAreaView>
    );
  }

  if (!business) {
    return (
      <SafeAreaView style={styles.customerScreen} edges={["top", "left", "right"]}>
        <View style={styles.emptyCardLarge}>
          <Store size={30} color={colors.primaryStrong} />
          <Text style={styles.emptyTitle}>Negocio indisponivel</Text>
          <Text style={styles.emptyBody}>Nao foi possivel carregar este perfil agora.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.customerScreen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.customerScroll}>
        <View style={styles.detailHero}>
          {business.coverImageUrl ? (
            <Image source={{ uri: business.coverImageUrl }} style={styles.detailCover} />
          ) : (
            <LinearGradient colors={["#111827", business.brandPrimaryColor ?? "#2563EB"]} style={styles.detailCoverFallback}>
              <Text style={styles.detailCoverFallbackText}>{business.name.slice(0, 1)}</Text>
            </LinearGradient>
          )}

          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={18} color={colors.textDark} />
          </Pressable>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailBusinessName}>{business.name}</Text>
          <Text style={styles.detailBusinessMeta}>
            {business.city ?? "Cidade nao informada"} • {business.phone ?? "Contato no perfil"}
          </Text>
          <View style={styles.ratingRow}>
            <Star size={16} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingText}>
              {business.reviews.length > 0
                ? `${(business.reviews.reduce((sum, review) => sum + review.rating, 0) / business.reviews.length).toFixed(1)} (${business.reviews.length} avaliacoes)`
                : "Novo no app"}
            </Text>
          </View>

          <View style={styles.searchShellLight}>
            <Search size={18} color={colors.textSoft} />
            <TextInput
              placeholder="Buscar servicos"
              placeholderTextColor={colors.textSoft}
              value={serviceSearch}
              onChangeText={setServiceSearch}
              style={styles.searchInputLight}
            />
          </View>

          <SectionHeader title="Servicos populares" subtitle="Reserve em poucos toques." />
          <View style={styles.serviceCards}>
            {filteredServices.map((service) => (
              <Pressable
                key={service.id}
                style={styles.serviceBookingCard}
                onPress={() => navigation.navigate("Booking", { slug: business.slug, serviceId: service.id })}
              >
                <View style={styles.serviceBookingHeader}>
                  <View>
                    <Text style={styles.serviceBookingName}>{service.name}</Text>
                    <Text style={styles.serviceBookingMeta}>{service.durationMinutes} min</Text>
                  </View>
                  <Text style={styles.serviceBookingPrice}>{formatCurrency(service.priceCents)}</Text>
                </View>
                <Text numberOfLines={2} style={styles.serviceBookingDescription}>
                  {service.description ?? "Servico pronto para reserva online."}
                </Text>
                <View style={styles.reserveButtonInline}>
                  <Text style={styles.reserveButtonInlineText}>Reservar</Text>
                </View>
              </Pressable>
            ))}
          </View>

          <SectionHeader title="Equipe" subtitle="Profissionais que atendem neste perfil." />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.professionalsRow}>
            {business.professionals.map((professional) => (
              <View key={professional.id} style={styles.professionalBubble}>
                {professional.photoUrl ? (
                  <Image source={{ uri: professional.photoUrl }} style={styles.professionalAvatar} />
                ) : (
                  <View style={styles.professionalAvatarFallback}>
                    <Text style={styles.professionalAvatarText}>{professional.displayName.slice(0, 1)}</Text>
                  </View>
                )}
                <Text numberOfLines={1} style={styles.professionalName}>
                  {professional.displayName}
                </Text>
                <Text numberOfLines={1} style={styles.professionalRole}>
                  {professional.roleLabel ?? "Profissional"}
                </Text>
              </View>
            ))}
          </ScrollView>

          <SectionHeader title="Avaliacoes" subtitle="Experiencias compartilhadas por clientes." />
          {business.reviews.length === 0 ? (
            <View style={styles.reviewEmptyCard}>
              <Text style={styles.reviewSummaryNumber}>5.0</Text>
              <Text style={styles.reviewSummaryCaption}>As primeiras avaliacoes vao aparecer aqui apos os atendimentos.</Text>
            </View>
          ) : (
            <View style={styles.reviewBlock}>
              {business.reviews.slice(0, 3).map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <Text style={styles.reviewCustomerName}>{review.customerNameSnapshot}</Text>
                  <Text style={styles.reviewStars}>{"★".repeat(review.rating)}</Text>
                  <Text style={styles.reviewBody}>{review.body ?? "Cliente confirmou uma experiencia positiva."}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LegacyBookingScreen({
  route,
  navigation,
}: NativeStackScreenProps<RootStackParamList, "Booking">) {
  const { slug, serviceId } = route.params;
  const [business, setBusiness] = useState<PublicBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(serviceId ?? null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(new Date()));
  const [slots, setSlots] = useState<Array<{ startsAt: string; endsAt: string; label: string }>>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [profile, setProfile] = useState<SavedProfile>({ name: "", email: "", phone: "" });
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [completed, setCompleted] = useState<SavedBooking | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([fetchBusiness(slug), loadSavedProfile()])
      .then(([data, savedProfile]) => {
        if (!active) return;
        setBusiness(data.business);
        setProfile(savedProfile);
        const initialServiceId = serviceId ?? data.business.services[0]?.id ?? null;
        setSelectedServiceId(initialServiceId);
        const initialProfessional = data.business.professionals.find((professional) =>
          initialServiceId ? professional.services.some((entry) => entry.serviceId === initialServiceId) : true,
        );
        setSelectedProfessionalId(initialProfessional?.id ?? null);
      })
      .catch((error) => {
        Alert.alert("Nao foi possivel abrir a reserva", error instanceof Error ? error.message : "Tente novamente.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [serviceId, slug]);

  const availableProfessionals = useMemo(() => {
    if (!business || !selectedServiceId) return [];
    return business.professionals.filter((professional) =>
      professional.services.some((entry) => entry.serviceId === selectedServiceId),
    );
  }, [business, selectedServiceId]);

  useEffect(() => {
    if (!availableProfessionals.some((professional) => professional.id === selectedProfessionalId)) {
      setSelectedProfessionalId(availableProfessionals[0]?.id ?? null);
      setSelectedSlot(null);
    }
  }, [availableProfessionals, selectedProfessionalId]);

  useEffect(() => {
    if (!business || !selectedServiceId || !selectedProfessionalId) {
      setSlots([]);
      return;
    }

    let active = true;
    setAvailabilityLoading(true);
    setSelectedSlot(null);

    void fetchAvailability({
      slug: business.slug,
      date: selectedDate,
      professionalId: selectedProfessionalId,
      serviceId: selectedServiceId,
      timezone: business.timezone,
    })
      .then((result) => {
        if (active) setSlots(result.slots);
      })
      .catch((error) => {
        if (active) {
          setSlots([]);
          Alert.alert("Nao foi possivel atualizar horarios", error instanceof Error ? error.message : "Tente novamente.");
        }
      })
      .finally(() => {
        if (active) setAvailabilityLoading(false);
      });

    return () => {
      active = false;
    };
  }, [business, selectedDate, selectedProfessionalId, selectedServiceId]);

  const selectedService = business?.services.find((service) => service.id === selectedServiceId) ?? null;
  const selectedProfessional =
    business?.professionals.find((professional) => professional.id === selectedProfessionalId) ?? null;
  const chosenSlot = slots.find((slot) => slot.startsAt === selectedSlot) ?? null;

  const dateOptions = useMemo(() => buildDateOptions(), []);

  const handleConfirm = useCallback(async () => {
    if (!business || !selectedService || !selectedProfessional || !chosenSlot) {
      Alert.alert("Falta completar a reserva", "Escolha servico, profissional e horario para continuar.");
      return;
    }

    if (!profile.name || !profile.phone) {
      Alert.alert("Complete seus dados", "Nome e telefone sao obrigatorios para confirmar a reserva.");
      return;
    }

    try {
      setConfirming(true);
      await saveProfile(profile);
      const result = await createBooking({
        slug: business.slug,
        serviceId: selectedService.id,
        professionalId: selectedProfessional.id,
        startsAt: chosenSlot.startsAt,
        customerName: profile.name,
        customerEmail: profile.email || undefined,
        customerPhone: profile.phone,
        customerTimezone: business.timezone,
      });

      const saved: SavedBooking = {
        appointmentId: result.appointmentId,
        businessSlug: business.slug,
        businessName: business.name,
        serviceName: selectedService.name,
        professionalName: selectedProfessional.displayName,
        startsAt: result.startsAt,
        addressLabel: [business.addressLine1, business.city, business.state].filter(Boolean).join(", "),
        cancelToken: result.cancelToken,
        rescheduleToken: result.rescheduleToken,
      };

      await saveBooking(saved);
      setCompleted(saved);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert("Nao foi possivel confirmar", error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setConfirming(false);
    }
  }, [business, chosenSlot, profile, selectedProfessional, selectedService]);

  if (loading) {
    return (
      <SafeAreaView style={styles.customerScreen} edges={["top", "left", "right"]}>
        <View style={styles.centerCardLarge}>
          <ActivityIndicator color={colors.primaryStrong} />
        </View>
      </SafeAreaView>
    );
  }

  if (!business) {
    return (
      <SafeAreaView style={styles.customerScreen} edges={["top", "left", "right"]}>
        <View style={styles.emptyCardLarge}>
          <Store size={30} color={colors.primaryStrong} />
          <Text style={styles.emptyTitle}>Perfil indisponivel</Text>
          <Text style={styles.emptyBody}>Nao foi possivel continuar a reserva agora.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (completed) {
    return (
      <SafeAreaView style={styles.customerScreen} edges={["top", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.customerScroll}>
          <View style={styles.successCard}>
            <ShieldCheck size={36} color={colors.success} />
            <Text style={styles.successTitle}>Reserva confirmada</Text>
            <Text style={styles.successBody}>
              Seu horario esta salvo no app e a empresa ja pode acompanhar esse atendimento no painel.
            </Text>

            <View style={styles.successDetailCard}>
              <Text style={styles.successDetailLine}>{completed.businessName}</Text>
              <Text style={styles.successDetailMuted}>{completed.serviceName}</Text>
              <Text style={styles.successDetailMuted}>{completed.professionalName}</Text>
              <Text style={styles.successDetailMuted}>
                {formatDateLabel(completed.startsAt)} • {formatTimeLabel(completed.startsAt)}
              </Text>
            </View>

            <PrimaryButton label="Ver meus agendamentos" onPress={() => navigation.navigate("CustomerTabs")} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.customerScreen} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.customerScroll}>
        <Text style={styles.screenTitle}>Selecione data e horario</Text>
        <Text style={styles.screenSubtitle}>Escolha servico, profissional e um horario realmente livre para reservar.</Text>

        <SectionHeader title="Servico" subtitle="O cliente final agenda so o que a empresa oferece." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.servicePillsRow}>
          {business.services.map((service) => (
            <Pressable
              key={service.id}
              style={[styles.choicePill, selectedServiceId === service.id && styles.choicePillActive]}
              onPress={() => setSelectedServiceId(service.id)}
            >
              <Text style={[styles.choicePillTitle, selectedServiceId === service.id && styles.choicePillTitleActive]}>
                {service.name}
              </Text>
              <Text style={[styles.choicePillMeta, selectedServiceId === service.id && styles.choicePillMetaActive]}>
                {formatCurrency(service.priceCents)} • {service.durationMinutes} min
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionHeader title="Profissional" subtitle="So aparecem profissionais habilitados para este servico." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.professionalsRow}>
          {availableProfessionals.map((professional) => (
            <Pressable
              key={professional.id}
              style={[
                styles.professionalChoice,
                selectedProfessionalId === professional.id && styles.professionalChoiceActive,
              ]}
              onPress={() => setSelectedProfessionalId(professional.id)}
            >
              {professional.photoUrl ? (
                <Image source={{ uri: professional.photoUrl }} style={styles.professionalChoiceAvatar} />
              ) : (
                <View style={styles.professionalChoiceAvatarFallback}>
                  <Text style={styles.professionalChoiceAvatarText}>{professional.displayName.slice(0, 1)}</Text>
                </View>
              )}
              <Text
                numberOfLines={1}
                style={[
                  styles.professionalChoiceName,
                  selectedProfessionalId === professional.id && styles.professionalChoiceNameActive,
                ]}
              >
                {professional.displayName}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionHeader title="Data" subtitle="Disponibilidade em tempo real, respeitando a agenda do profissional." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayPickerRow}>
          {dateOptions.map((item) => {
            const key = toDateKey(item);
            const active = key === selectedDate;
            return (
              <Pressable key={key} style={[styles.dayPill, active && styles.dayPillActive]} onPress={() => setSelectedDate(key)}>
                <Text style={[styles.dayPillWeekday, active && styles.dayPillWeekdayActive]}>
                  {new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(item)}
                </Text>
                <Text style={[styles.dayPillDay, active && styles.dayPillDayActive]}>
                  {new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(item)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <SectionHeader title="Horarios livres" subtitle="Assim que um horario e reservado, ele nao pode ser escolhido de novo." />
        {availabilityLoading ? (
          <View style={styles.centerCard}>
            <ActivityIndicator color={colors.primaryStrong} />
          </View>
        ) : slots.length === 0 ? (
          <View style={styles.emptyCard}>
            <Clock3 size={24} color={colors.primaryStrong} />
            <Text style={styles.emptyTitle}>Sem horarios nesta data</Text>
            <Text style={styles.emptyBody}>Escolha outro dia ou outro profissional para continuar.</Text>
          </View>
        ) : (
          <View style={styles.slotGrid}>
            {slots.map((slot) => (
              <Pressable
                key={slot.startsAt}
                style={[styles.slotPill, selectedSlot === slot.startsAt && styles.slotPillActive]}
                onPress={() => setSelectedSlot(slot.startsAt)}
              >
                <Text style={[styles.slotPillText, selectedSlot === slot.startsAt && styles.slotPillTextActive]}>
                  {slot.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <SectionHeader title="Seus dados" subtitle="Salvos para acelerar futuras reservas no app." />
        <View style={styles.profileCard}>
          <LabeledInput label="Nome completo" value={profile.name} onChangeText={(value) => setProfile((current) => ({ ...current, name: value }))} />
          <LabeledInput
            label="E-mail"
            keyboardType="email-address"
            autoCapitalize="none"
            value={profile.email}
            onChangeText={(value) => setProfile((current) => ({ ...current, email: value }))}
          />
          <LabeledInput
            label="Telefone"
            keyboardType="phone-pad"
            value={profile.phone}
            onChangeText={(value) => setProfile((current) => ({ ...current, phone: value }))}
          />
        </View>
      </ScrollView>

      <View style={styles.bookingFooter}>
        <View style={styles.bookingFooterSummary}>
          <Text style={styles.bookingFooterPrice}>{selectedService ? formatCurrency(selectedService.priceCents) : "-"}</Text>
          <Text style={styles.bookingFooterMeta}>
            {selectedService?.name ?? "Escolha um servico"}
            {chosenSlot ? ` • ${formatTimeLabel(chosenSlot.startsAt)}` : ""}
          </Text>
        </View>
        <PrimaryButton label={confirming ? "Confirmando..." : "Continuar"} onPress={handleConfirm} disabled={confirming || !chosenSlot} compact />
      </View>
    </SafeAreaView>
  );
}

function RoleCard({
  icon,
  title,
  description,
  bullets,
  actionLabel,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.roleCard}>
      <View style={styles.roleCardIcon}>{icon}</View>
      <Text style={styles.roleCardTitle}>{title}</Text>
      <Text style={styles.roleCardDescription}>{description}</Text>
      <View style={styles.roleBulletList}>
        {bullets.map((item) => (
          <View key={item} style={styles.roleBulletRow}>
            <View style={styles.roleBulletDot} />
            <Text style={styles.roleBulletText}>{item}</Text>
          </View>
        ))}
      </View>
      <SecondaryButton label={actionLabel} onPress={onPress} />
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  compact,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        compact && styles.primaryButtonCompact,
        pressed && !disabled && styles.primaryButtonPressed,
        disabled && styles.primaryButtonDisabled,
      ]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
      {!compact ? <ArrowRight size={16} color={colors.white} /> : null}
    </Pressable>
  );
}

function SecondaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.secondaryButton, pressed && styles.secondaryButtonPressed]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SectionHeader({
  title,
  subtitle,
  dark,
}: {
  title: string;
  subtitle: string;
  dark?: boolean;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, dark && styles.sectionTitleDark]}>{title}</Text>
      <Text style={[styles.sectionSubtitle, dark && styles.sectionSubtitleDark]}>{subtitle}</Text>
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
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.categoryChip, active && styles.categoryChipActive]} onPress={onPress}>
      {icon}
      <Text style={[styles.categoryChipLabel, active && styles.categoryChipLabelActive]}>{label}</Text>
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
  const scale = React.useRef(new Animated.Value(1)).current;

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
        <Heart size={18} color={active ? colors.danger : colors.white} fill={active ? colors.danger : "transparent"} />
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
        <LinearGradient colors={["#111827", business.brandPrimaryColor ?? "#2563EB"]} style={styles.featuredCardImageFallback}>
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
        <LinearGradient colors={["#111827", business.brandPrimaryColor ?? "#2563EB"]} style={styles.discoveryCardImageFallback}>
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
              <Text style={styles.discoveryTagText}>{distanceKm < 1 ? "< 1 km" : `${distanceKm.toFixed(1)} km`}</Text>
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

function DarkStatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.darkStatCard}>
      <View style={styles.darkStatIcon}>{icon}</View>
      <Text style={styles.darkStatLabel}>{label}</Text>
      <Text style={styles.darkStatValue}>{value}</Text>
    </View>
  );
}

function normalizeStatus(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "Confirmado";
    case "COMPLETED":
      return "Concluido";
    case "NO_SHOW":
      return "No-show";
    case "CANCELED":
      return "Cancelado";
    default:
      return "Pendente";
  }
}

function LabeledInput({
  label,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder={label}
        placeholderTextColor="#94A3B8"
        style={styles.input}
      />
    </View>
  );
}

function NotificationPromptModal({
  visible,
  onActivate,
  onSkip,
}: {
  visible: boolean;
  onActivate: () => void;
  onSkip: () => void;
}) {
  const scale = useRef(new Animated.Value(0.86)).current;

  useEffect(() => {
    if (!visible) {
      scale.setValue(0.86);
      return;
    }

    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      damping: 16,
      stiffness: 210,
    }).start();
  }, [scale, visible]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onSkip}>
      <View style={styles.notificationPromptOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onSkip} />
        <Animated.View style={[styles.notificationPromptCard, { transform: [{ scale }] }]}>
          <View style={styles.notificationPromptIcon}>
            <Bell size={28} color={colors.primaryStrong} />
          </View>
          <Text style={styles.notificationPromptTitle}>Ative as notificacoes</Text>
          <Text style={styles.notificationPromptBody}>
            Receba lembretes dos seus agendamentos e confirmacoes em tempo real.
          </Text>
          <Pressable style={styles.notificationPromptPrimaryButton} onPress={onActivate}>
            <Text style={styles.notificationPromptPrimaryLabel}>Ativar notificacoes</Text>
          </Pressable>
          <Pressable style={styles.notificationPromptSecondaryButton} onPress={onSkip}>
            <Text style={styles.notificationPromptSecondaryLabel}>Agora nao</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function App() {
  const [customerAuthToken, setCustomerAuthToken] = useState<string | undefined>();
  const [businessAuthToken, setBusinessAuthToken] = useState<string | undefined>();
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [initialRouteName, setInitialRouteName] = useState<keyof RootStackParamList>("Welcome");
  const [currentRouteName, setCurrentRouteName] = useState<string>("Welcome");
  const [notificationsPrompted, setNotificationsPrompted] = useState<boolean | null>(null);
  const [showNotificationsPrompt, setShowNotificationsPrompt] = useState(false);

  const customerPush = usePushNotifications(customerAuthToken);
  const businessPush = usePushNotifications(businessAuthToken);

  const syncSessionState = useCallback(async () => {
    const [customerSession, businessSession, prompted] = await Promise.all([
      loadCustomerSession(),
      loadBusinessSession(),
      loadNotificationsPrompted(),
    ]);
    setCustomerAuthToken(customerSession?.token);
    setBusinessAuthToken(businessSession?.token);
    setNotificationsPrompted(prompted);

    if (customerSession) {
      identifyAnalyticsUser(customerSession.user.id, customerSession.user.email);
      setUserContext(customerSession.user.id, customerSession.user.email);
    } else if (businessSession?.user) {
      identifyAnalyticsUser(businessSession.user.id, businessSession.user.email, "business");
      setUserContext(businessSession.user.id, businessSession.user.email);
    } else {
      clearAnalyticsUser();
      clearUserContext();
    }

    if (!isBootstrapped) {
      setInitialRouteName(
        customerSession ? "CustomerTabs" : businessSession ? "BusinessTabs" : "Welcome",
      );
      setCurrentRouteName(
        customerSession ? "CustomerTabs" : businessSession ? "BusinessTabs" : "Welcome",
      );
      setIsBootstrapped(true);
    }
  }, [isBootstrapped]);

  useEffect(() => {
    void syncSessionState();
  }, [syncSessionState]);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (__DEV__) {
      void healthCheck();
    }
  }, []);

  useEffect(() => {
    const isCustomerRoute = ["Explore", "Bookings", "Profile"].includes(currentRouteName);
    if (!isCustomerRoute || notificationsPrompted !== false || showNotificationsPrompt) return;

    const timer = setTimeout(() => {
      setShowNotificationsPrompt(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentRouteName, notificationsPrompted, showNotificationsPrompt]);

  const activeBanner = customerPush.banner.visible ? customerPush.banner : businessPush.banner;
  const businessAgendaBadgeCount = Math.max(customerPush.businessAlertCount, businessPush.businessAlertCount);

  const dismissPrompt = useCallback(async () => {
    await markNotificationsPrompted();
    setNotificationsPrompted(true);
    setShowNotificationsPrompt(false);
  }, []);

  const handleEnableNotifications = useCallback(async () => {
    const token = await registerForPushNotificationsAsync();
    await markNotificationsPrompted();
    setNotificationsPrompted(true);
    setShowNotificationsPrompt(false);

    if (token) {
      await savePushTokenToBackend(token, customerAuthToken ?? businessAuthToken);
    }
  }, [businessAuthToken, customerAuthToken]);

  const handleNavigationStateChange = useCallback(async () => {
    const route = navigationRef.getCurrentRoute();
    if (route?.name) {
      setCurrentRouteName(route.name);
      if (route.name === "Agenda") {
        businessPush.clearBusinessAlertCount();
      }
    }
    await syncSessionState();
  }, [businessPush, syncSessionState]);

  if (!isBootstrapped) {
    return (
      <SafeAreaProvider>
        <View style={[styles.appShell, styles.centerCardLarge]}>
          <ActivityIndicator color={colors.primaryStrong} />
          <Text style={styles.screenSubtitle}>Carregando sua experiencia...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ToastProvider>
        <View style={styles.appShell}>
          <Sentry.ErrorBoundary>
            <NavigationContainer ref={navigationRef} onReady={() => void handleNavigationStateChange()} onStateChange={() => void handleNavigationStateChange()}>
              <RootStack.Navigator
                initialRouteName={initialRouteName}
                screenOptions={{
                  headerShown: false,
                  animation: "slide_from_right",
                }}
              >
                <RootStack.Screen name="Welcome" component={WelcomeScreen} />
                <RootStack.Screen name="Login" component={LoginScreen} />
                <RootStack.Screen name="Register" component={RegisterScreen} />
                <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                <RootStack.Screen name="CustomerTabs" component={CustomerTabsNavigator} />
                <RootStack.Screen name="BusinessLogin" component={BusinessLoginScreen} />
                <RootStack.Screen name="BusinessTabs">
                  {() => <BusinessTabsNavigator agendaBadgeCount={businessAgendaBadgeCount} />}
                </RootStack.Screen>
                <RootStack.Screen name="Business" component={BusinessScreen} />
                <RootStack.Screen name="Booking" component={BookingScreen} />
                <RootStack.Screen name="Payment" component={PaymentScreen} />
                <RootStack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
                <RootStack.Screen name="BookingConfirmation" component={BookingConfirmationScreen} />
                <RootStack.Screen name="BookingDetail" component={BookingDetailScreen} />
                <RootStack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
                <RootStack.Screen name="BusinessAvailability" component={BusinessAvailabilityScreen} />
                <RootStack.Screen name="BusinessServices" component={BusinessServicesScreen} />
                <RootStack.Screen name="Reschedule" component={RescheduleScreen} />
              </RootStack.Navigator>
            </NavigationContainer>
          </Sentry.ErrorBoundary>

          <NotificationBanner
            visible={activeBanner.visible}
            title={activeBanner.title}
            body={activeBanner.body}
            onPress={() => {
              handleNotificationNavigation(activeBanner.payload);
              if (customerPush.banner.visible) {
                customerPush.dismissBanner();
              } else {
                businessPush.dismissBanner();
              }
            }}
          />

          <NotificationPromptModal
            visible={showNotificationsPrompt}
            onActivate={() => void handleEnableNotifications()}
            onSkip={() => void dismissPrompt()}
          />
        </View>
      </ToastProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appShell: {
    flex: 1,
  },
  welcomeSafeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  welcomeScroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  welcomeHero: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.hero,
  },
  welcomeEyebrow: {
    color: "rgba(248,250,252,0.78)",
    fontSize: 12,
    letterSpacing: 2.2,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  welcomeTitle: {
    color: colors.white,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    color: "rgba(248,250,252,0.8)",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  welcomePrimaryActions: {
    gap: spacing.sm,
  },
  welcomeMiniStats: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  welcomeMiniStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  welcomeMiniStatText: {
    flex: 1,
    color: "rgba(248,250,252,0.9)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  notificationPromptOverlay: {
    flex: 1,
    backgroundColor: "rgba(10,15,24,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  notificationPromptCard: {
    width: "100%",
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceCard,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    ...shadows.hero,
  },
  notificationPromptIcon: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  notificationPromptTitle: {
    color: colors.textDark,
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
  },
  notificationPromptBody: {
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  notificationPromptPrimaryButton: {
    width: "100%",
    minHeight: 54,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
  },
  notificationPromptPrimaryLabel: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  notificationPromptSecondaryButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  notificationPromptSecondaryLabel: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: "700",
  },
  dualCards: {
    gap: spacing.md,
  },
  roleCard: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(37,99,235,0.08)",
    ...shadows.card,
  },
  roleCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  roleCardTitle: {
    color: colors.textDark,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  roleCardDescription: {
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  roleBulletList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  roleBulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  roleBulletDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.primaryStrong,
  },
  roleBulletText: {
    flex: 1,
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryStrong,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    ...shadows.card,
  },
  primaryButtonCompact: {
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  primaryButtonPressed: {
    transform: [{ translateY: 1 }],
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.24)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
  },
  secondaryButtonPressed: {
    opacity: 0.82,
  },
  secondaryButtonText: {
    color: colors.textDark,
    fontSize: 15,
    fontWeight: "700",
  },
  customerTabBar: {
    height: 86,
    paddingBottom: 10,
    paddingTop: 10,
    borderTopWidth: 0,
    backgroundColor: "rgba(255,255,255,0.96)",
  },
  businessTabBar: {
    height: 88,
    paddingBottom: 10,
    paddingTop: 10,
    borderTopWidth: 0,
    backgroundColor: "#0C1221",
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  customerScreen: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  customerScroll: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  exploreHero: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.hero,
  },
  heroBadge: {
    alignSelf: "flex-start",
    color: "rgba(248,250,252,0.78)",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.8,
    marginBottom: spacing.md,
  },
  exploreTitle: {
    color: colors.white,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  exploreSubtitle: {
    color: "rgba(248,250,252,0.82)",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  searchShell: {
    minHeight: 54,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    color: colors.textDark,
    fontSize: 15,
    paddingVertical: 14,
  },
  locationButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  locationButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  categoryRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: colors.white,
  },
  categoryChipActive: {
    backgroundColor: colors.primaryStrong,
    borderColor: colors.primaryStrong,
  },
  categoryChipLabel: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "700",
  },
  categoryChipLabelActive: {
    color: colors.white,
  },
  featuredRow: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  featuredCard: {
    width: 280,
    height: 180,
    borderRadius: radii.xl,
    overflow: "hidden",
    backgroundColor: colors.surfaceRaised,
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
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.textDark,
    fontSize: 20,
    fontWeight: "800",
  },
  sectionTitleDark: {
    color: colors.white,
  },
  sectionSubtitle: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  sectionSubtitleDark: {
    color: "rgba(248,250,252,0.74)",
  },
  centerCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 88,
    ...shadows.card,
  },
  centerCardLarge: {
    flex: 1,
    margin: spacing.lg,
    borderRadius: radii.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.card,
  },
  emptyCardLarge: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
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
  screenTitle: {
    color: colors.textDark,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  screenSubtitle: {
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  bookingCards: {
    gap: spacing.md,
  },
  savedBookingCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.card,
  },
  savedBookingTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  savedBookingBusiness: {
    color: colors.textDark,
    fontSize: 20,
    fontWeight: "800",
  },
  savedBookingService: {
    color: colors.textSoft,
    fontSize: 14,
    marginTop: 3,
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusBadgeText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "800",
  },
  bookingInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  bookingInfoText: {
    flex: 1,
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  profileSectionTitle: {
    color: colors.textDark,
    fontSize: 20,
    fontWeight: "800",
  },
  profileSectionBody: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "700",
  },
  input: {
    minHeight: 54,
    borderRadius: radii.lg,
    backgroundColor: "#FAFBFC",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    paddingHorizontal: spacing.md,
    color: colors.textDark,
    fontSize: 15,
  },
  businessLoginSafeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  businessLoginScroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  businessLoginHero: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.hero,
  },
  businessLoginTitle: {
    color: colors.white,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  businessLoginSubtitle: {
    color: "rgba(248,250,252,0.8)",
    fontSize: 15,
    lineHeight: 22,
  },
  businessLoginCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textLink: {
    alignItems: "center",
    paddingVertical: 6,
  },
  textLinkLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  businessScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  businessScroll: {
    padding: spacing.lg,
    paddingBottom: 120,
    gap: spacing.md,
  },
  adminHero: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.28)",
    ...shadows.hero,
  },
  adminHeroTitle: {
    color: colors.white,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  adminHeroSubtitle: {
    color: "rgba(248,250,252,0.78)",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  adminHeroMeta: {
    gap: spacing.sm,
  },
  darkStatCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  darkStatIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  darkStatLabel: {
    color: "rgba(248,250,252,0.68)",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 4,
  },
  darkStatValue: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "800",
  },
  adminCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  businessCardTitle: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  businessCardBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  agendaCards: {
    gap: spacing.md,
  },
  adminAppointmentCard: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  adminAppointmentTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    alignItems: "flex-start",
  },
  adminAppointmentName: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
  },
  adminAppointmentMeta: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  businessStatusBadge: {
    borderRadius: radii.pill,
    backgroundColor: "rgba(59,130,246,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  businessStatusBadgeText: {
    color: "#BFDBFE",
    fontSize: 12,
    fontWeight: "800",
  },
  businessPageTitle: {
    color: colors.white,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  businessPageSubtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  dayPickerRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  dayPill: {
    width: 70,
    paddingVertical: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
  },
  dayPillActive: {
    backgroundColor: colors.primaryStrong,
    borderColor: colors.primaryStrong,
  },
  dayPillWeekday: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
    marginBottom: 2,
  },
  dayPillWeekdayActive: {
    color: colors.white,
  },
  dayPillDay: {
    color: colors.textDark,
    fontSize: 20,
    fontWeight: "800",
  },
  dayPillDayActive: {
    color: colors.white,
  },
  actionRowCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  actionRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  actionRowContent: {
    flex: 1,
  },
  actionRowTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  actionRowBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  detailHero: {
    borderRadius: radii.xl,
    overflow: "hidden",
    marginBottom: spacing.lg,
    position: "relative",
  },
  detailCover: {
    width: "100%",
    height: 240,
  },
  detailCoverFallback: {
    width: "100%",
    height: 240,
    alignItems: "center",
    justifyContent: "center",
  },
  detailCoverFallbackText: {
    color: colors.white,
    fontSize: 62,
    fontWeight: "900",
  },
  backButton: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.card,
  },
  detailBusinessName: {
    color: colors.textDark,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    marginBottom: spacing.xs,
  },
  detailBusinessMeta: {
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.lg,
  },
  ratingText: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "700",
  },
  searchShellLight: {
    minHeight: 52,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  searchInputLight: {
    flex: 1,
    color: colors.textDark,
    fontSize: 15,
    paddingVertical: 14,
  },
  serviceCards: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  serviceBookingCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    padding: spacing.lg,
    backgroundColor: "#FBFCFE",
  },
  serviceBookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  serviceBookingName: {
    color: colors.textDark,
    fontSize: 18,
    fontWeight: "800",
  },
  serviceBookingMeta: {
    color: colors.textSoft,
    fontSize: 13,
    marginTop: 4,
  },
  serviceBookingPrice: {
    color: colors.textDark,
    fontSize: 20,
    fontWeight: "800",
  },
  serviceBookingDescription: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  reserveButtonInline: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryStrong,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  reserveButtonInlineText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  professionalsRow: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
    marginBottom: spacing.lg,
  },
  professionalBubble: {
    width: 112,
    alignItems: "center",
    gap: 8,
  },
  professionalAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  professionalAvatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E9F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  professionalAvatarText: {
    color: colors.primaryStrong,
    fontSize: 24,
    fontWeight: "800",
  },
  professionalName: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  professionalRole: {
    color: colors.textSoft,
    fontSize: 12,
    textAlign: "center",
  },
  reviewEmptyCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  reviewSummaryNumber: {
    color: colors.textDark,
    fontSize: 44,
    fontWeight: "800",
  },
  reviewSummaryCaption: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  reviewBlock: {
    gap: spacing.md,
  },
  reviewCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  reviewCustomerName: {
    color: colors.textDark,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  reviewStars: {
    color: "#F59E0B",
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  reviewBody: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
  },
  servicePillsRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    marginBottom: spacing.md,
  },
  choicePill: {
    width: 190,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    ...shadows.card,
  },
  choicePillActive: {
    backgroundColor: "#EEF4FF",
    borderColor: "rgba(37,99,235,0.3)",
  },
  choicePillTitle: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  choicePillTitleActive: {
    color: colors.primaryStrong,
  },
  choicePillMeta: {
    color: colors.textSoft,
    fontSize: 13,
  },
  choicePillMetaActive: {
    color: colors.primaryStrong,
  },
  professionalChoice: {
    width: 116,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    alignItems: "center",
    gap: 8,
    ...shadows.card,
  },
  professionalChoiceActive: {
    borderColor: colors.primaryStrong,
    backgroundColor: "#EEF4FF",
  },
  professionalChoiceAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  professionalChoiceAvatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#DCE9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  professionalChoiceAvatarText: {
    color: colors.primaryStrong,
    fontSize: 18,
    fontWeight: "800",
  },
  professionalChoiceName: {
    color: colors.textDark,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  professionalChoiceNameActive: {
    color: colors.primaryStrong,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  slotPill: {
    minWidth: 96,
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  slotPillActive: {
    backgroundColor: colors.primaryStrong,
    borderColor: colors.primaryStrong,
  },
  slotPillText: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "800",
  },
  slotPillTextActive: {
    color: colors.white,
  },
  bookingFooter: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: "rgba(255,255,255,0.96)",
    padding: spacing.md,
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
    ...shadows.hero,
  },
  bookingFooterSummary: {
    flex: 1,
  },
  bookingFooterPrice: {
    color: colors.textDark,
    fontSize: 22,
    fontWeight: "800",
  },
  bookingFooterMeta: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  successCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    ...shadows.hero,
  },
  successTitle: {
    color: colors.textDark,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  successBody: {
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  successDetailCard: {
    width: "100%",
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.lg,
    gap: 6,
  },
  successDetailLine: {
    color: colors.textDark,
    fontSize: 18,
    fontWeight: "800",
  },
  successDetailMuted: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  adminAppointmentPrice: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "800",
  },
});
