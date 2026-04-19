import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react-native";
import { Analytics, identifyAnalyticsUser } from "../../lib/analytics";
import { setUserContext } from "../../lib/crash";
import { loginCustomer, loginWithGoogle } from "../../lib/auth";
import {
  loadStoredPushToken,
  registerForPushNotificationsAsync,
  savePushTokenToBackend,
} from "../../lib/notifications";
import { useToast } from "../../hooks/useToast";
import { PressableScale } from "../../components/ui/PressableScale";
import { colors, radii, shadows, spacing, typography } from "../../theme";
import type { RootStackParamList } from "../../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

export function LoginScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const googleEnabled = Boolean(process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);

  const emailError = useMemo(() => {
    if (!email) return null;
    return isValidEmail(email) ? null : "Digite um e-mail valido.";
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return null;
    return password.trim().length === 0 ? "Digite sua senha." : null;
  }, [password]);

  const handleSuccess = async (token: string) => {
    const pushToken = (await loadStoredPushToken()) ?? (await registerForPushNotificationsAsync());
    if (pushToken) {
      await savePushTokenToBackend(pushToken, token);
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.replace("CustomerTabs");
  };

  const handleLogin = async () => {
    if (!email || !isValidEmail(email)) {
      showToast("Digite um e-mail valido.", "warning");
      return;
    }

    if (!password.trim()) {
      showToast("Digite sua senha para continuar.", "warning");
      return;
    }

    try {
      setBusy("email");
      const session = await loginCustomer(email.trim(), password);
      Analytics.trackLogin("email");
      identifyAnalyticsUser(session.user.id, session.user.email);
      setUserContext(session.user.id, session.user.email);
      await handleSuccess(session.token);
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(error instanceof Error ? error.message : "Nao foi possivel entrar.", "error");
    } finally {
      setBusy(null);
    }
  };

  const handleGoogle = async () => {
    try {
      setBusy("google");
      const session = await loginWithGoogle();
      Analytics.trackLogin("google");
      identifyAnalyticsUser(session.user.id, session.user.email);
      setUserContext(session.user.id, session.user.email);
      await handleSuccess(session.token);
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(error instanceof Error ? error.message : "Falha no login com Google.", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.content}>
        <View style={styles.logoShell}>
          <Sparkles size={20} color={colors.primaryStrong} />
          <Text style={styles.logoText}>Zorby</Text>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Bem-vindo de volta</Text>
          <Text style={styles.subtitle}>Entre para agendar seus servicos favoritos</Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputWrap, emailError && styles.inputWrapError]}>
            <Mail size={18} color={colors.textMuted} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Seu e-mail"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}

          <View style={[styles.inputWrap, passwordError && styles.inputWrapError]}>
            <Lock size={18} color={colors.textMuted} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="Sua senha"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <PressableScale
              style={styles.iconButton}
              onPress={() => setShowPassword((current) => !current)}
            >
              {showPassword ? (
                <EyeOff size={18} color={colors.textMuted} />
              ) : (
                <Eye size={18} color={colors.textMuted} />
              )}
            </PressableScale>
          </View>
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}

          <PressableScale
            style={styles.forgotButton}
            onPress={() => navigation.navigate("ForgotPassword")}
          >
            <Text style={styles.forgotLabel}>Esqueci minha senha</Text>
          </PressableScale>

          <PressableScale
            style={[styles.primaryButton, busy === "email" && styles.primaryButtonDisabled]}
            onPress={() => void handleLogin()}
          >
            {busy === "email" ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonLabel}>Entrar</Text>
            )}
          </PressableScale>
        </View>

        {googleEnabled ? (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>ou continue com</Text>
              <View style={styles.divider} />
            </View>

            <PressableScale style={styles.googleButton} onPress={() => void handleGoogle()}>
              {busy === "google" ? (
                <ActivityIndicator color={colors.textDark} />
              ) : (
                <Text style={styles.googleButtonLabel}>Entrar com Google</Text>
              )}
            </PressableScale>
          </>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Nao tem conta?</Text>
          <PressableScale style={styles.footerAction} onPress={() => navigation.navigate("Register")}>
            <Text style={styles.footerActionLabel}>Criar conta</Text>
          </PressableScale>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundSoft,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "center",
    gap: spacing.lg,
  },
  logoShell: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logoText: {
    color: colors.textDark,
    ...typography.h3,
  },
  header: {
    gap: spacing.sm,
  },
  title: {
    color: colors.textDark,
    ...typography.h1,
  },
  subtitle: {
    color: colors.textSoft,
    ...typography.body,
  },
  form: {
    gap: spacing.sm,
  },
  inputWrap: {
    minHeight: 56,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.card,
  },
  inputWrapError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    color: colors.textDark,
    ...typography.body,
    paddingVertical: spacing.md,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: colors.danger,
    ...typography.caption,
  },
  forgotButton: {
    alignSelf: "flex-end",
    paddingVertical: spacing.xs,
  },
  forgotLabel: {
    color: colors.primaryStrong,
    ...typography.bodySmall,
    fontWeight: "600",
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonLabel: {
    color: colors.white,
    ...typography.body,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderStrong,
  },
  dividerText: {
    color: colors.textSoft,
    ...typography.caption,
  },
  googleButton: {
    minHeight: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  googleButtonLabel: {
    color: colors.textDark,
    ...typography.body,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
  },
  footerText: {
    color: colors.textSoft,
    ...typography.bodySmall,
  },
  footerAction: {
    paddingVertical: spacing.xs,
  },
  footerActionLabel: {
    color: colors.primaryStrong,
    ...typography.bodySmall,
    fontWeight: "700",
  },
});

