import * as React from "react";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator, type NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock3,
  Compass,
  Home,
  MapPin,
  Search,
  Sparkles,
  Star,
  UserRound,
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
} from "./src/lib/api";
import {
  clearBusinessSession,
  loadBusinessSession,
  loadSavedBookings,
  loadSavedProfile,
  saveBooking,
  saveBusinessSession,
  saveProfile,
} from "./src/lib/storage";
import { colors, radii, shadows, spacing } from "./src/theme";
import type {
  AvailabilitySlot,
  BusinessAgendaItem,
  BusinessDashboard,
  BusinessMobileSession,
  DiscoveryBusiness,
  PublicBusiness,
  SavedBooking,
  SavedProfile,
} from "./src/types";

type RootStackParamList = {
  Welcome: undefined;
  CustomerTabs: undefined;
  BusinessLogin: undefined;
  BusinessTabs: undefined;
  Business: { slug: string };
  Booking: { slug: string; serviceId?: string };
};

type CustomerTabsParamList = {
  Explore: undefined;
  Bookings: undefined;
  Profile: undefined;
};

type BusinessTabsParamList = {
  Overview: undefined;
  Agenda: undefined;
  Account: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<CustomerTabsParamList>();
const BusinessTab = createBottomTabNavigator<BusinessTabsParamList>();

const CATEGORY_LABELS: Record<string, string> = {
  HEALTH: "Saúde",
  BEAUTY: "Beleza",
  EDUCATION: "Educação",
  CONSULTING: "Consultoria",
  SPORTS: "Esportes",
  OTHER: "Outros",
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.backgroundSoft } }}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="CustomerTabs" component={CustomerTabsScreen} />
          <Stack.Screen name="BusinessLogin" component={BusinessLoginScreen} />
          <Stack.Screen name="BusinessTabs" component={BusinessTabsScreen} />
          <Stack.Screen name="Business" component={BusinessScreen} />
          <Stack.Screen name="Booking" component={BookingScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function CustomerTabsScreen() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primaryStrong }}>
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: "Explorar", tabBarIcon: ({ color, size }) => <Compass color={color} size={size} /> }} />
      <Tab.Screen name="Bookings" component={BookingsScreen} options={{ title: "Agendamentos", tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Perfil", tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }} />
    </Tab.Navigator>
  );
}

function BusinessTabsScreen() {
  return (
    <BusinessTab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primaryStrong }}>
      <BusinessTab.Screen name="Overview" component={BusinessOverviewScreen} options={{ title: "Painel", tabBarIcon: ({ color, size }) => <Home color={color} size={size} /> }} />
      <BusinessTab.Screen name="Agenda" component={BusinessAgendaScreen} options={{ title: "Agenda", tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} /> }} />
      <BusinessTab.Screen name="Account" component={BusinessAccountScreen} options={{ title: "Conta", tabBarIcon: ({ color, size }) => <UserRound color={color} size={size} /> }} />
    </BusinessTab.Navigator>
  );
}

function WelcomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Welcome">) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={{ gap: spacing.md }}>
          <View style={styles.logoRow}>
            <Sparkles size={16} color={colors.primaryStrong} />
            <Text style={styles.logoText}>Zorby App</Text>
          </View>
          <Text style={styles.heroTitle}>Site e app, com uma jornada diferente para empresa e cliente final.</Text>
          <Text style={styles.heroBody}>
            O cliente explora negócios e horários pelo app. A empresa continua operando agenda, equipe e cobrança no painel do Zorby.
          </Text>
        </View>

        <Pressable
          onPress={async () => {
            await Haptics.selectionAsync();
            navigation.replace("CustomerTabs");
          }}
          style={[styles.heroCard, styles.heroCardLight]}
        >
          <Compass size={22} color={colors.primaryStrong} />
          <Text style={styles.cardEyebrow}>CLIENTE FINAL</Text>
          <Text style={styles.cardTitle}>Quero agendar um serviço</Text>
          <Text style={styles.cardBody}>Descubra negócios, veja avaliações, escolha o profissional e reserve horários livres.</Text>
          <View style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Entrar como cliente</Text>
            <ArrowRight size={16} color={colors.white} />
          </View>
        </Pressable>

        <Pressable
          onPress={() => navigation.replace("BusinessLogin")}
          style={[styles.heroCard, styles.heroCardDark]}
        >
          <Home size={22} color={colors.white} />
          <Text style={[styles.cardEyebrow, styles.cardEyebrowDark]}>EMPRESA OU PROFISSIONAL</Text>
          <Text style={[styles.cardTitle, styles.cardTitleDark]}>Abrir painel administrativo</Text>
          <Text style={[styles.cardBody, styles.cardBodyDark]}>Use o painel web para agenda, serviços, equipe, disponibilidade e assinatura.</Text>
          <View style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Abrir painel web</Text>
            <ArrowRight size={16} color={colors.textDark} />
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function BusinessLoginScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "BusinessLogin">) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    loadBusinessSession()
      .then((session) => {
        if (session?.token) {
          navigation.replace("BusinessTabs");
        }
      })
      .catch(() => undefined);
  }, [navigation]);

  const submit = React.useCallback(async () => {
    if (!email.trim() || !password) {
      Alert.alert("Informe seus dados", "Preencha e-mail e senha para entrar.");
      return;
    }

    setSubmitting(true);
    try {
      const session = await businessLogin({ email, password });
      await saveBusinessSession(session);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace("BusinessTabs");
    } catch (error) {
      Alert.alert("Não foi possível entrar", error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }, [email, navigation, password]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.textDark} />
        </Pressable>
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Entrar como empresa ou profissional</Text>
          <Text style={styles.meta}>Acesse sua agenda, equipe, serviços e operação do dia direto no app.</Text>
          <TextInput style={styles.input} placeholder="E-mail" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TextInput style={styles.input} placeholder="Senha" secureTextEntry value={password} onChangeText={setPassword} />
          <Pressable onPress={() => void submit()} style={styles.primaryButton} disabled={submitting}>
            {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Entrar no app da empresa</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ExploreScreen({ navigation }: any) {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<DiscoveryBusiness[]>([]);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("ALL");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDiscoveryBusinesses();
      setItems(data.businesses);
    } catch (error) {
      Alert.alert("Não foi possível carregar", error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const sortByLocation = React.useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") return;
    const current = await Location.getCurrentPositionAsync({});
    setItems((prev) =>
      [...prev].sort((a, b) => distance(current.coords.latitude, current.coords.longitude, a) - distance(current.coords.latitude, current.coords.longitude, b)),
    );
  }, []);

  const filtered = items.filter((item) => {
    const matchCategory = category === "ALL" || item.category === category;
    const term = query.toLowerCase();
    const matchQuery = !term || item.name.toLowerCase().includes(term) || item.services.some((service) => service.name.toLowerCase().includes(term));
    return matchCategory && matchQuery;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={() => void load()}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg }}>
            <LinearGradient colors={["#0F172A", "#1D4ED8"]} style={styles.discoveryHero}>
              <Text style={styles.discoveryEyebrow}>BOOKING APP</Text>
              <Text style={styles.discoveryTitle}>Encontre serviços e horários perto de você.</Text>
              <Text style={styles.discoveryBody}>Pesquise, filtre categorias e veja empresas reais disponíveis para agendar.</Text>
              <View style={styles.searchBox}>
                <Search size={18} color="#64748B" />
                <TextInput value={query} onChangeText={setQuery} placeholder="Pesquisar serviços ou negócios" style={styles.searchInput} />
              </View>
              <Pressable onPress={() => void sortByLocation()} style={styles.locationButton}>
                <MapPin size={15} color={colors.white} />
                <Text style={styles.locationButtonText}>Usar minha localização</Text>
              </Pressable>
            </LinearGradient>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              <FilterChip active={category === "ALL"} label="Tudo" onPress={() => setCategory("ALL")} />
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <FilterChip key={value} active={category === value} label={label} onPress={() => setCategory(value)} />
              ))}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate("Business", { slug: item.slug })} style={styles.businessCard}>
            {item.coverImageUrl ? <Image source={{ uri: item.coverImageUrl }} style={styles.businessCover} /> : <View style={styles.coverFallback}><Text style={styles.coverLetter}>{item.name[0]}</Text></View>}
            <View style={styles.businessBody}>
              <View style={styles.rowBetween}>
                <Text style={styles.businessName}>{item.name}</Text>
                <View style={styles.ratingBadge}>
                  <Star size={12} color="#F59E0B" fill="#F59E0B" />
                  <Text style={styles.ratingBadgeText}>{item.averageRating?.toFixed(1) ?? "Novo"}</Text>
                </View>
              </View>
              <Text style={styles.meta}>{item.addressLabel}</Text>
              <Text style={styles.meta}>{item.professionalsCount} profissionais • a partir de {formatPrice(item.services[0]?.priceCents ?? 0)}</Text>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            {loading ? <ActivityIndicator color={colors.primaryStrong} /> : <Text style={styles.meta}>Nenhum negócio encontrado.</Text>}
          </View>
        }
      />
    </SafeAreaView>
  );
}

function BusinessOverviewScreen() {
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<BusinessDashboard | null>(null);

  React.useEffect(() => {
    loadBusinessSession()
      .then(async (session) => {
        if (!session?.token) return;
        const dashboard = await fetchBusinessDashboard(session.token);
        setData(dashboard);
      })
      .catch((error) => Alert.alert("Erro", error instanceof Error ? error.message : "Não foi possível carregar o painel."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ScreenLoader text="Carregando painel da empresa..." />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.heroTitle}>{data?.business?.name ?? "Painel da empresa"}</Text>
        <Text style={styles.heroBody}>
          {data?.business?.city ? `${data.business.city}${data.business.state ? `, ${data.business.state}` : ""}` : "Seu negócio no app do Zorby"}
        </Text>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Resumo de hoje</Text>
          <Text style={styles.meta}>Agendamentos hoje: {data?.summary.appointmentsToday ?? 0}</Text>
          <Text style={styles.meta}>Confirmados: {data?.summary.confirmedToday ?? 0}</Text>
          <Text style={styles.meta}>Receita do mês: {formatPrice(data?.summary.revenueMonthCents ?? 0)}</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Próximos atendimentos</Text>
          {data?.nextAppointments.length ? (
            data.nextAppointments.map((appointment) => (
              <View key={appointment.id} style={styles.serviceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serviceName}>{appointment.customerNameSnapshot}</Text>
                  <Text style={styles.meta}>{appointment.serviceNameSnapshot} com {appointment.professional.displayName}</Text>
                </View>
                <Text style={styles.meta}>{formatDateTime(appointment.startsAtUtc)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.meta}>Ainda não há próximos agendamentos.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BusinessAgendaScreen() {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<BusinessAgendaItem[]>([]);
  const [selectedDate, setSelectedDate] = React.useState(toDateKey(new Date()));

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const session = await loadBusinessSession();
      if (!session?.token) {
        setItems([]);
        return;
      }
      const data = await fetchBusinessAgenda({ token: session.token, date: selectedDate });
      setItems(data.appointments);
    } catch (error) {
      Alert.alert("Erro", error instanceof Error ? error.message : "Não foi possível carregar a agenda.");
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.heroTitle}>Agenda</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {upcomingDates(7).map((date) => (
            <FilterChip key={date.key} active={selectedDate === date.key} label={`${date.weekday} ${date.day}`} onPress={() => setSelectedDate(date.key)} />
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator color={colors.primaryStrong} />
        ) : items.length ? (
          items.map((item) => (
            <View key={item.id} style={styles.panel}>
              <Text style={styles.sectionTitle}>{item.customerNameSnapshot}</Text>
              <Text style={styles.meta}>{item.serviceNameSnapshot}</Text>
              <Text style={styles.meta}>{item.professional.displayName}</Text>
              <Text style={styles.meta}>{formatDateTime(item.startsAtUtc)}</Text>
              <Text style={styles.meta}>{formatPrice(item.priceCents)}</Text>
            </View>
          ))
        ) : (
          <View style={styles.panel}>
            <Text style={styles.meta}>Nenhum agendamento encontrado nessa data.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BusinessAccountScreen({ navigation }: any) {
  const [session, setSession] = React.useState<BusinessMobileSession | null>(null);

  React.useEffect(() => {
    loadBusinessSession().then(setSession).catch(() => undefined);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.heroTitle}>Conta da empresa</Text>
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>{session?.business.name ?? "Negócio"}</Text>
          <Text style={styles.meta}>{session?.user.email ?? "Sem sessão"}</Text>
          <Text style={styles.meta}>Perfil: {session?.user.role ?? "-"}</Text>
          <Pressable onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/dashboard`)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Abrir painel web completo</Text>
          </Pressable>
          <Pressable
            onPress={async () => {
              await clearBusinessSession();
              navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
            }}
            style={[styles.secondaryButton, { backgroundColor: "#FEE2E2" }]}
          >
            <Text style={[styles.secondaryButtonText, { color: "#991B1B" }]}>Sair da conta</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BusinessScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "Business">) {
  const [loading, setLoading] = React.useState(true);
  const [business, setBusiness] = React.useState<PublicBusiness | null>(null);

  React.useEffect(() => {
    fetchBusiness(route.params.slug)
      .then((data) => setBusiness(data.business))
      .catch((error) => Alert.alert("Erro", error instanceof Error ? error.message : "Não foi possível abrir o negócio."))
      .finally(() => setLoading(false));
  }, [route.params.slug]);

  if (loading || !business) {
    return <ScreenLoader text="Abrindo o negócio..." />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.textDark} />
        </Pressable>

        {business.coverImageUrl ? <Image source={{ uri: business.coverImageUrl }} style={styles.headerImage} /> : <LinearGradient colors={["#1E293B", "#1D4ED8"]} style={styles.headerImage} />}

        <View style={styles.panel}>
          <Text style={styles.businessName}>{business.name}</Text>
          <Text style={styles.meta}>{[business.addressLine1, business.city].filter(Boolean).join(", ") || "Brasil"}</Text>
          <Text style={styles.meta}>{business.reviews.length} avaliações • {business.professionals.length} profissionais</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Serviços</Text>
          {business.services.map((service) => (
            <View key={service.id} style={styles.serviceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.meta}>{service.durationMinutes} min • {service.description || "Atendimento confirmado online"}</Text>
              </View>
              <Pressable onPress={() => navigation.navigate("Booking", { slug: business.slug, serviceId: service.id })} style={styles.smallPrimary}>
                <Text style={styles.smallPrimaryText}>Reservar</Text>
              </Pressable>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Equipe</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {business.professionals.map((professional) => (
              <View key={professional.id} style={styles.staffChip}>
                {professional.photoUrl ? <Image source={{ uri: professional.photoUrl }} style={styles.staffAvatar} /> : <View style={styles.staffFallback}><Text style={styles.staffFallbackText}>{professional.displayName[0]}</Text></View>}
                <Text style={styles.staffText}>{professional.displayName}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BookingScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, "Booking">) {
  const [loading, setLoading] = React.useState(true);
  const [business, setBusiness] = React.useState<PublicBusiness | null>(null);
  const [profile, setProfileState] = React.useState<SavedProfile>({ name: "", email: "", phone: "" });
  const [selectedServiceId, setSelectedServiceId] = React.useState(route.params.serviceId ?? "");
  const [selectedProfessionalId, setSelectedProfessionalId] = React.useState("");
  const [selectedDate, setSelectedDate] = React.useState(toDateKey(new Date()));
  const [slots, setSlots] = React.useState<AvailabilitySlot[]>([]);
  const [slot, setSlot] = React.useState<AvailabilitySlot | null>(null);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState<SavedBooking | null>(null);

  React.useEffect(() => {
    Promise.all([fetchBusiness(route.params.slug), loadSavedProfile()])
      .then(([businessData, savedProfile]) => {
        setBusiness(businessData.business);
        setProfileState(savedProfile);
        const firstService = route.params.serviceId ?? businessData.business.services[0]?.id ?? "";
        setSelectedServiceId(firstService);
        const firstProfessional = businessData.business.professionals.find((professional) =>
          professional.services.some((service) => service.serviceId === firstService),
        );
        setSelectedProfessionalId(firstProfessional?.id ?? businessData.business.professionals[0]?.id ?? "");
      })
      .catch((error) => Alert.alert("Erro", error instanceof Error ? error.message : "Não foi possível preparar o agendamento."))
      .finally(() => setLoading(false));
  }, [route.params.serviceId, route.params.slug]);

  const service = business?.services.find((item) => item.id === selectedServiceId);
  const professionals =
    business?.professionals.filter((professional) =>
      selectedServiceId ? professional.services.some((item) => item.serviceId === selectedServiceId) : true,
    ) ?? [];

  React.useEffect(() => {
    if (!business || !selectedServiceId || !selectedProfessionalId) return;
    setLoadingSlots(true);
    setSlot(null);
    fetchAvailability({
      slug: business.slug,
      date: selectedDate,
      serviceId: selectedServiceId,
      professionalId: selectedProfessionalId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
      .then((data) => setSlots(data.slots))
      .catch((error) => {
        setSlots([]);
        Alert.alert("Horários indisponíveis", error instanceof Error ? error.message : "Tente novamente.");
      })
      .finally(() => setLoadingSlots(false));
  }, [business, selectedDate, selectedProfessionalId, selectedServiceId]);

  const confirmBooking = React.useCallback(async () => {
    if (!business || !service || !selectedProfessionalId || !slot) {
      Alert.alert("Escolha um horário", "Selecione serviço, profissional, dia e horário.");
      return;
    }
    if (!profile.name.trim() || !profile.phone.trim()) {
      Alert.alert("Preencha seus dados", "Seu nome e telefone são obrigatórios para confirmar.");
      return;
    }

    setSaving(true);
    try {
      const professional = business.professionals.find((item) => item.id === selectedProfessionalId);
      await saveProfile(profile);
      const created = await createBooking({
        slug: business.slug,
        serviceId: service.id,
        professionalId: selectedProfessionalId,
        startsAt: slot.startsAt,
        customerName: profile.name,
        customerEmail: profile.email || undefined,
        customerPhone: profile.phone,
        customerTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      const saved: SavedBooking = {
        appointmentId: created.appointmentId,
        businessSlug: business.slug,
        businessName: business.name,
        serviceName: service.name,
        professionalName: professional?.displayName ?? "Profissional",
        startsAt: created.startsAt,
        addressLabel: [business.addressLine1, business.city].filter(Boolean).join(", "),
        cancelToken: created.cancelToken,
        rescheduleToken: created.rescheduleToken,
      };
      await saveBooking(saved);
      setSuccess(saved);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert("Não foi possível confirmar", error instanceof Error ? error.message : "Tente novamente.");
    } finally {
      setSaving(false);
    }
  }, [business, profile, selectedProfessionalId, service, slot]);

  if (loading || !business) return <ScreenLoader text="Carregando reserva..." />;
  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.page}>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Agendamento confirmado</Text>
            <Text style={styles.meta}>{success.businessName}</Text>
            <Text style={styles.meta}>{success.serviceName}</Text>
            <Text style={styles.meta}>{formatDateTime(success.startsAt)}</Text>
            <Pressable onPress={() => navigation.replace("CustomerTabs")} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Ver meus agendamentos</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: 140 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={18} color={colors.textDark} />
        </Pressable>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Selecione data e hora</Text>
          <Text style={styles.meta}>{business.name}</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionLabel}>Serviço</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {business.services.map((item) => (
              <FilterChip key={item.id} active={selectedServiceId === item.id} label={item.name} onPress={() => setSelectedServiceId(item.id)} />
            ))}
          </ScrollView>
          <Text style={styles.sectionLabel}>Profissional</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {professionals.map((professional) => (
              <FilterChip key={professional.id} active={selectedProfessionalId === professional.id} label={professional.displayName} onPress={() => setSelectedProfessionalId(professional.id)} />
            ))}
          </ScrollView>
          <Text style={styles.sectionLabel}>Data</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {upcomingDates(14).map((date) => (
              <FilterChip key={date.key} active={selectedDate === date.key} label={`${date.weekday} ${date.day}`} onPress={() => setSelectedDate(date.key)} />
            ))}
          </ScrollView>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionLabel}>Horários</Text>
          {loadingSlots ? (
            <ActivityIndicator color={colors.primaryStrong} />
          ) : slots.length ? (
            <View style={styles.slotWrap}>
              {slots.map((item) => (
                <Pressable key={item.startsAt} onPress={() => setSlot(item)} style={[styles.slotButton, slot?.startsAt === item.startsAt && styles.slotButtonActive]}>
                  <Text style={[styles.slotText, slot?.startsAt === item.startsAt && styles.slotTextActive]}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.meta}>Nenhum horário livre nesta data.</Text>
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionLabel}>Seus dados</Text>
          <TextInput style={styles.input} placeholder="Nome completo" value={profile.name} onChangeText={(value) => setProfileState((current) => ({ ...current, name: value }))} />
          <TextInput style={styles.input} placeholder="E-mail" value={profile.email} onChangeText={(value) => setProfileState((current) => ({ ...current, email: value }))} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Telefone" value={profile.phone} onChangeText={(value) => setProfileState((current) => ({ ...current, phone: value }))} keyboardType="phone-pad" />
        </View>
      </ScrollView>

      <View style={styles.footerBar}>
        <View>
          <Text style={styles.footerPrice}>{formatPrice(service?.priceCents ?? 0)}</Text>
          <Text style={styles.meta}>{service?.name ?? "Selecione um serviço"}</Text>
        </View>
        <Pressable onPress={() => void confirmBooking()} style={styles.primaryButton} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Continuar</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function BookingsScreen() {
  const [items, setItems] = React.useState<SavedBooking[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadSavedBookings().then(setItems).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.heroTitle}>Agendamentos</Text>
        <Text style={styles.heroBody}>Seus horários confirmados aparecem aqui.</Text>
        {loading ? (
          <ActivityIndicator color={colors.primaryStrong} />
        ) : items.length ? (
          items.map((item) => (
            <View key={item.appointmentId} style={styles.panel}>
              <Text style={styles.sectionTitle}>{item.businessName}</Text>
              <Text style={styles.meta}>{item.serviceName}</Text>
              <Text style={styles.meta}>{item.professionalName}</Text>
              <Text style={styles.meta}>{formatDateTime(item.startsAt)}</Text>
            </View>
          ))
        ) : (
          <View style={styles.panel}>
            <Text style={styles.meta}>Você ainda não tem reservas salvas no app.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileScreen() {
  const [profile, setProfileState] = React.useState<SavedProfile>({ name: "", email: "", phone: "" });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    loadSavedProfile().then(setProfileState).catch(() => undefined);
  }, []);

  const save = async () => {
    setSaving(true);
    await saveProfile(profile);
    setSaving(false);
    Alert.alert("Perfil salvo", "Seus dados ficam prontos para os próximos agendamentos.");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.heroTitle}>Perfil</Text>
        <Text style={styles.heroBody}>Preencha seus dados para agilizar as próximas reservas.</Text>
        <View style={styles.panel}>
          <TextInput style={styles.input} placeholder="Nome completo" value={profile.name} onChangeText={(value) => setProfileState((current) => ({ ...current, name: value }))} />
          <TextInput style={styles.input} placeholder="E-mail" value={profile.email} onChangeText={(value) => setProfileState((current) => ({ ...current, email: value }))} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Telefone" value={profile.phone} onChangeText={(value) => setProfileState((current) => ({ ...current, phone: value }))} keyboardType="phone-pad" />
          <Pressable onPress={() => void save()} style={styles.primaryButton}>
            {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonText}>Salvar perfil</Text>}
          </Pressable>
        </View>
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Área da empresa</Text>
          <Text style={styles.meta}>O painel administrativo continua no web. Abra o login da empresa abaixo.</Text>
          <Pressable onPress={() => void WebBrowser.openBrowserAsync(`${API_URL}/login`)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Abrir painel da empresa</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ScreenLoader({ text }: { text: string }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.loaderWrap}>
        <ActivityIndicator color={colors.primaryStrong} size="large" />
        <Text style={styles.meta}>{text}</Text>
      </View>
    </SafeAreaView>
  );
}

function distance(originLat: number, originLng: number, business: DiscoveryBusiness) {
  if (business.latitude == null || business.longitude == null) return Number.MAX_SAFE_INTEGER;
  const dLat = ((business.latitude - originLat) * Math.PI) / 180;
  const dLng = ((business.longitude - originLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((originLat * Math.PI) / 180) * Math.cos((business.latitude * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 6371 * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(priceCents / 100);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "short" }).format(new Date(value));
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function upcomingDates(total: number) {
  return Array.from({ length: total }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      key: toDateKey(date),
      day: String(date.getDate()).padStart(2, "0"),
      weekday: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
    };
  });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundSoft },
  page: { padding: spacing.xl, gap: spacing.lg, paddingBottom: 120 },
  list: { paddingBottom: 120, gap: spacing.lg },
  logoRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logoText: { fontSize: 16, fontWeight: "700", color: colors.textDark },
  heroTitle: { fontSize: 34, lineHeight: 38, fontWeight: "800", color: colors.textDark },
  heroBody: { fontSize: 15, lineHeight: 24, color: colors.textSoft },
  heroCard: { borderRadius: radii.xl, padding: spacing.xl, gap: spacing.md, ...shadows.card },
  heroCardLight: { backgroundColor: colors.white },
  heroCardDark: { backgroundColor: colors.surface },
  cardEyebrow: { fontSize: 12, fontWeight: "700", letterSpacing: 2, color: colors.textSoft },
  cardEyebrowDark: { color: "rgba(255,255,255,0.7)" },
  cardTitle: { fontSize: 28, lineHeight: 32, fontWeight: "800", color: colors.textDark },
  cardTitleDark: { color: colors.white },
  cardBody: { fontSize: 15, lineHeight: 24, color: colors.textSoft },
  cardBodyDark: { color: "rgba(255,255,255,0.8)" },
  primaryButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryStrong,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radii.pill,
  },
  primaryButtonText: { color: colors.white, fontWeight: "700", fontSize: 15 },
  secondaryButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radii.pill,
  },
  secondaryButtonText: { color: colors.textDark, fontWeight: "700", fontSize: 15 },
  discoveryHero: { margin: spacing.xl, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.md },
  discoveryEyebrow: { fontSize: 12, fontWeight: "700", letterSpacing: 2, color: "rgba(255,255,255,0.7)" },
  discoveryTitle: { fontSize: 30, lineHeight: 34, fontWeight: "800", color: colors.white },
  discoveryBody: { fontSize: 15, lineHeight: 24, color: "rgba(255,255,255,0.82)" },
  searchBox: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radii.md, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: 12 },
  searchInput: { flex: 1, fontSize: 15, color: colors.textDark },
  locationButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  locationButtonText: { color: colors.white, fontWeight: "700" },
  chipsRow: { gap: spacing.sm, paddingHorizontal: spacing.xl },
  chip: { borderRadius: radii.pill, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  chipActive: { backgroundColor: "#DBEAFE", borderColor: colors.primaryStrong },
  chipText: { color: colors.textDark, fontWeight: "600" },
  chipTextActive: { color: colors.primaryStrong },
  businessCard: { marginHorizontal: spacing.xl, borderRadius: radii.xl, backgroundColor: colors.white, overflow: "hidden", ...shadows.card },
  businessCover: { width: "100%", height: 190 },
  coverFallback: { width: "100%", height: 190, alignItems: "center", justifyContent: "center", backgroundColor: "#CBD5E1" },
  coverLetter: { fontSize: 44, fontWeight: "800", color: colors.textDark },
  businessBody: { padding: spacing.lg, gap: spacing.sm },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  businessName: { flex: 1, fontSize: 22, lineHeight: 28, fontWeight: "800", color: colors.textDark },
  ratingBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radii.pill, backgroundColor: "#FFF7ED", paddingHorizontal: 10, paddingVertical: 8 },
  ratingBadgeText: { fontWeight: "700", color: colors.textDark },
  meta: { fontSize: 14, lineHeight: 22, color: colors.textSoft },
  emptyCard: { marginHorizontal: spacing.xl, borderRadius: radii.xl, backgroundColor: colors.white, padding: spacing.xxl, alignItems: "center", justifyContent: "center", ...shadows.card },
  backButton: { width: 42, height: 42, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.white, ...shadows.card },
  headerImage: { width: "100%", height: 240, borderRadius: radii.xl, overflow: "hidden" },
  panel: { borderRadius: radii.xl, backgroundColor: colors.white, padding: spacing.lg, gap: spacing.md, ...shadows.card },
  sectionTitle: { fontSize: 24, lineHeight: 28, fontWeight: "800", color: colors.textDark },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: colors.textSoft, textTransform: "uppercase", letterSpacing: 1 },
  serviceRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  serviceName: { fontSize: 16, fontWeight: "700", color: colors.textDark },
  smallPrimary: { borderRadius: radii.pill, backgroundColor: colors.primaryStrong, paddingHorizontal: spacing.md, paddingVertical: 10 },
  smallPrimaryText: { color: colors.white, fontWeight: "700" },
  staffChip: { alignItems: "center", gap: spacing.sm, width: 100 },
  staffAvatar: { width: 64, height: 64, borderRadius: radii.pill },
  staffFallback: { width: 64, height: 64, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", backgroundColor: "#DBEAFE" },
  staffFallbackText: { color: colors.primaryStrong, fontWeight: "800", fontSize: 20 },
  staffText: { textAlign: "center", color: colors.textDark, fontWeight: "600" },
  slotWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  slotButton: { borderRadius: radii.pill, borderWidth: 1, borderColor: "#D9E1EA", backgroundColor: colors.backgroundSoft, paddingHorizontal: spacing.md, paddingVertical: 12 },
  slotButtonActive: { backgroundColor: colors.primaryStrong, borderColor: colors.primaryStrong },
  slotText: { color: colors.textDark, fontWeight: "700" },
  slotTextActive: { color: colors.white },
  input: { borderWidth: 1, borderColor: "#D9E1EA", borderRadius: radii.md, backgroundColor: colors.white, paddingHorizontal: spacing.md, paddingVertical: 14, fontSize: 15, color: colors.textDark },
  footerBar: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: "rgba(255,255,255,0.98)",
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    ...shadows.card,
  },
  footerPrice: { fontSize: 24, fontWeight: "800", color: colors.textDark },
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
});
