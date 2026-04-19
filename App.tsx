import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackScreenProps } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import * as Sentry from "@sentry/react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowRight,
  Bell,
  Briefcase,
  Calendar,
  CalendarDays,
  Compass,
  LayoutDashboard,
  Sparkles,
  Smartphone,
  User,
} from "lucide-react-native";
import { BookingConfirmationScreen } from "./src/screens/BookingConfirmationScreen";
import { BookingDetailScreen } from "./src/screens/BookingDetailScreen";
import { BookingScreen } from "./src/screens/BookingScreen";
import { BookingsScreen as CustomerBookingsScreen } from "./src/screens/BookingsScreen";
import { BusinessScreen } from "./src/screens/BusinessScreen";
import { ExploreScreen } from "./src/screens/ExploreScreen";
import { NotificationBanner } from "./src/components/NotificationBanner";
import { PaymentScreen } from "./src/screens/PaymentScreen";
import { PaymentSuccessScreen } from "./src/screens/PaymentSuccessScreen";
import { ToastProvider } from "./src/components/ui/Toast";
import { ProfileScreen as CustomerProfileScreen } from "./src/screens/ProfileScreen";
import { AppointmentDetailScreen } from "./src/screens/business/AppointmentDetailScreen";
import { BusinessAccountScreen as MobileBusinessAccountScreen } from "./src/screens/business/BusinessAccountScreen";
import { BusinessAgendaScreen as MobileBusinessAgendaScreen } from "./src/screens/business/BusinessAgendaScreen";
import { BusinessAvailabilityScreen } from "./src/screens/business/BusinessAvailabilityScreen";
import { BusinessOverviewScreen as MobileBusinessOverviewScreen } from "./src/screens/business/BusinessOverviewScreen";
import { BusinessServicesScreen } from "./src/screens/business/BusinessServicesScreen";
import { BusinessLoginScreen } from "./src/screens/auth/BusinessLoginScreen";
import { ForgotPasswordScreen } from "./src/screens/auth/ForgotPasswordScreen";
import { LoginScreen } from "./src/screens/auth/LoginScreen";
import { RegisterScreen } from "./src/screens/auth/RegisterScreen";
import { RescheduleScreen } from "./src/screens/RescheduleScreen";
import {
  loadBusinessSession,
  loadCustomerSession,
  loadNotificationsPrompted,
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
import { healthCheck } from "./src/utils/healthCheck";
import { colors, radii, shadows, spacing } from "./src/theme";
import type { SavedBooking } from "./src/types";

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
          <View style={styles.welcomeLogoShell}>
            <Sparkles size={28} color="#fff" />
          </View>
          <Text style={styles.welcomeEyebrow}>ZORBY APP</Text>
          <Text style={styles.welcomeTitle}>Duas jornadas,{"\n"}um app de verdade.</Text>
          <Text style={styles.welcomeSubtitle}>
            O cliente final descobre negocios, escolhe horarios e reserva. A empresa acompanha agenda, operacao e atendimento sem sair do celular.
          </Text>
          <View style={styles.welcomeDivider} />

          <View style={styles.welcomePrimaryActions}>
            <PrimaryButton label="Quero agendar" onPress={() => navigation.navigate("Login")} />
            <SecondaryButton label="Entrar como empresa" onPress={() => navigation.navigate("BusinessLogin")} />
          </View>

          <View style={styles.welcomeMiniStats}>
            <View style={styles.welcomeMiniStat}>
              <Compass size={16} color={colors.white} />
              <Text style={styles.welcomeMiniStatText}>Busca e proximidade</Text>
            </View>
            <View style={styles.welcomeMiniStat}>
              <CalendarDays size={16} color={colors.white} />
              <Text style={styles.welcomeMiniStatText}>Reserva em tempo real</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.dualCards}>
          <RoleCard
            badgeLabel="PARA VOCE"
            icon={<Compass size={22} color={colors.primaryStrong} />}
            title="Cliente final"
            description="Explore negocios reais, filtre por categoria, veja horarios livres e reserve em poucos toques."
            bullets={["Busca com proximidade", "Agendamentos salvos", "Perfil unico para futuras reservas"]}
            actionLabel="Explorar servicos"
            onPress={() => navigation.navigate("Login")}
          />
          <RoleCard
            badgeLabel="PARA NEGOCIOS"
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

function RoleCard({
  badgeLabel,
  icon,
  title,
  description,
  bullets,
  actionLabel,
  onPress,
}: {
  badgeLabel: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  bullets: string[];
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.roleCard}>
      <View style={styles.roleBadge}>
        <Text style={styles.roleBadgeText}>{badgeLabel}</Text>
      </View>
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
      <CardActionButton label={actionLabel} onPress={onPress} />
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
      <LinearGradient
        colors={["#3B82F6", "#2563EB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryButtonGradient}
      >
        <Text style={styles.primaryButtonText}>{label}</Text>
        {!compact ? <ArrowRight size={16} color={colors.white} /> : null}
      </LinearGradient>
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

function CardActionButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cardActionButton, pressed && styles.cardActionButtonPressed]}
    >
      <Text style={styles.cardActionButtonText}>{label}</Text>
    </Pressable>
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
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onSkip}
      accessibilityViewIsModal
    >
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
          <Pressable
            style={styles.notificationPromptPrimaryButton}
            onPress={onActivate}
            accessibilityRole="button"
            accessibilityLabel="Ativar notificacoes"
            accessibilityHint="Ativa as notificacoes para receber lembretes e confirmacoes em tempo real"
          >
            <Text style={styles.notificationPromptPrimaryLabel}>Ativar notificacoes</Text>
          </Pressable>
          <Pressable
            style={styles.notificationPromptSecondaryButton}
            onPress={onSkip}
            accessibilityRole="button"
            accessibilityLabel="Agora nao"
            accessibilityHint="Fecha este aviso e continua sem ativar as notificacoes agora"
          >
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
    backgroundColor: "#F0F4FF",
  },
  welcomeScroll: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: 48,
    marginTop: 8,
  },
  welcomeHero: {
    borderRadius: 28,
    padding: spacing.xl,
    ...shadows.hero,
  },
  welcomeLogoShell: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    marginBottom: 16,
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
    fontSize: 38,
    lineHeight: 46,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  welcomeSubtitle: {
    color: "rgba(248,250,252,0.8)",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  welcomeDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 20,
  },
  welcomePrimaryActions: {
    gap: spacing.sm,
  },
  welcomeMiniStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: spacing.lg,
  },
  welcomeMiniStat: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
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
    fontSize: 12,
    lineHeight: 16,
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
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#EEF4FF",
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: spacing.md,
  },
  roleBadgeText: {
    color: colors.primaryStrong,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  roleCardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#EEF4FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  roleCardTitle: {
    color: colors.textDark,
    fontSize: 24,
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
    minHeight: 58,
    borderRadius: radii.pill,
    overflow: "hidden",
    shadowColor: "#1D4ED8",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  primaryButtonCompact: {
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  primaryButtonGradient: {
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  primaryButtonPressed: {
    transform: [{ translateY: 1 }],
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: "900",
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  secondaryButtonPressed: {
    opacity: 0.82,
  },
  secondaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  cardActionButton: {
    minHeight: 50,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  cardActionButtonPressed: {
    opacity: 0.9,
  },
  cardActionButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
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

