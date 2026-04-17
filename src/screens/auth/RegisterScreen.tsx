import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { CheckSquare, Mail, Lock, Phone, Sparkles, Square, User } from "lucide-react-native";
import { Analytics, identifyAnalyticsUser } from "../../lib/analytics";
import { setUserContext } from "../../lib/crash";
import { registerCustomer } from "../../lib/auth";
import { loadStoredPushToken, registerForPushNotificationsAsync, savePushTokenToBackend } from "../../lib/notifications";
import { useToast } from "../../hooks/useToast";
import { colors, radii, shadows, spacing, typography } from "../../theme";
import { PressableScale } from "../../components/ui/PressableScale";
import type { RootStackParamList } from "../../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

function isValidEmail(email: string) {
  return /\S+@\S+\.\S+/.test(email);
}

function passwordStrength(password: string) {
  if (password.length < 8) return { label: "Fraca", color: colors.danger, progress: 0.33 };
  if (/[A-Z]/.test(password) && /\d/.test(password)) return { label: "Forte", color: colors.success, progress: 1 };
  return { label: "Média", color: colors.warning, progress: 0.66 };
}

export function RegisterScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);

  const handleRegister = async () => {
    if (!name.trim()) return showToast("Digite seu nome completo.", "warning");
    if (!isValidEmail(email)) return showToast("Digite um e-mail válido.", "warning");
    if (password.length < 8) return showToast("A senha precisa ter pelo menos 8 caracteres.", "warning");
    if (password !== confirmPassword) return showToast("As senhas precisam ser iguais.", "warning");
    if (!acceptedTerms) return showToast("Aceite os termos para continuar.", "warning");

    try {
      setBusy(true);
      const session = await registerCustomer(name.trim(), email.trim(), password, phone.trim());
      Analytics.trackSignUp("email");
      identifyAnalyticsUser(session.user.id, session.user.email);
      setUserContext(session.user.id, session.user.email);
      const pushToken = (await loadStoredPushToken()) ?? (await registerForPushNotificationsAsync());
      if (pushToken) {
        await savePushTokenToBackend(pushToken, session.token);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace("CustomerTabs");
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast(error instanceof Error ? error.message : "Não foi possível criar sua conta.", "error");
    } finally {
      setBusy(false);
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
          <Text style={styles.title}>Criar sua conta</Text>
          <Text style={styles.subtitle}>Salve seus dados e agende com mais rapidez sempre que voltar.</Text>
        </View>

        <View style={styles.form}>
          <InputRow icon={<User size={18} color={colors.textMuted} />} value={name} onChangeText={setName} placeholder="Nome completo" />
          <InputRow icon={<Mail size={18} color={colors.textMuted} />} value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" autoCapitalize="none" />
          <InputRow icon={<Phone size={18} color={colors.textMuted} />} value={phone} onChangeText={setPhone} placeholder="Telefone" keyboardType="phone-pad" />
          <InputRow icon={<Lock size={18} color={colors.textMuted} />} value={password} onChangeText={setPassword} placeholder="Senha" secureTextEntry />
          <View style={styles.strengthWrap}>
            <View style={styles.strengthTrack}>
              <View style={[styles.strengthFill, { width: `${strength.progress * 100}%`, backgroundColor: strength.color }]} />
            </View>
            <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
          </View>
          <InputRow icon={<Lock size={18} color={colors.textMuted} />} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Confirmar senha" secureTextEntry />

          <PressableScale style={styles.termsRow} onPress={() => setAcceptedTerms((current) => !current)}>
            {acceptedTerms ? <CheckSquare size={18} color={colors.primaryStrong} /> : <Square size={18} color={colors.textMuted} />}
            <Text style={styles.termsText}>Aceito os Termos de Uso e a Política de Privacidade</Text>
          </PressableScale>

          <View style={styles.linksRow}>
            <PressableScale style={styles.inlineLink} onPress={() => void WebBrowser.openBrowserAsync("https://zorby-web.onrender.com/terms")}>
              <Text style={styles.inlineLinkLabel}>Termos</Text>
            </PressableScale>
            <PressableScale style={styles.inlineLink} onPress={() => void WebBrowser.openBrowserAsync("https://zorby-web.onrender.com/privacy")}>
              <Text style={styles.inlineLinkLabel}>Privacidade</Text>
            </PressableScale>
          </View>

          <PressableScale style={[styles.primaryButton, busy && styles.primaryButtonDisabled]} onPress={() => void handleRegister()}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonLabel}>Criar conta</Text>}
          </PressableScale>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Já tem conta?</Text>
          <PressableScale style={styles.footerAction} onPress={() => navigation.navigate("Login")}>
            <Text style={styles.footerActionLabel}>Entrar</Text>
          </PressableScale>
        </View>
      </View>
    </SafeAreaView>
  );
}

function InputRow(props: {
  icon: React.ReactNode;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.inputWrap}>
      {props.icon}
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        keyboardType={props.keyboardType}
        autoCapitalize={props.autoCapitalize}
        secureTextEntry={props.secureTextEntry}
        placeholder={props.placeholder}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
    </View>
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
  input: {
    flex: 1,
    color: colors.textDark,
    ...typography.body,
    paddingVertical: spacing.md,
  },
  strengthWrap: {
    gap: spacing.xs,
  },
  strengthTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    borderRadius: radii.pill,
  },
  strengthLabel: {
    ...typography.caption,
    fontWeight: "700",
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  termsText: {
    flex: 1,
    color: colors.textDark,
    ...typography.bodySmall,
  },
  linksRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  inlineLink: {
    paddingVertical: spacing.xs,
  },
  inlineLinkLabel: {
    color: colors.primaryStrong,
    ...typography.bodySmall,
    fontWeight: "700",
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
