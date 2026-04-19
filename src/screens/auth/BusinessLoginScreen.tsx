import React, { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Analytics, identifyAnalyticsUser } from "../../lib/analytics";
import { setUserContext } from "../../lib/crash";
import { businessLogin } from "../../lib/api";
import { saveBusinessSession } from "../../lib/storage";
import { colors, radii, shadows, spacing } from "../../theme";
import type { RootStackParamList } from "../../../App";

type Props = NativeStackScreenProps<RootStackParamList, "BusinessLogin">;

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.primaryButtonLabel}>{label}</Text>
    </Pressable>
  );
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

export function BusinessLoginScreen({ navigation }: Props) {
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
      Alert.alert(
        "Nao foi possivel entrar",
        error instanceof Error ? error.message : "Confira seu e-mail e senha.",
      );
    } finally {
      setLoading(false);
    }
  }, [email, navigation, password]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient colors={["#0B1020", "#131C35", "#1D4ED8"]} style={styles.hero}>
          <Text style={styles.heroBadge}>ZORBY ADMIN</Text>
          <Text style={styles.title}>Entre para gerir agenda, horarios e operacao em movimento.</Text>
          <Text style={styles.subtitle}>
            Esta area e exclusiva para empresa ou profissional responsavel pela operacao do negocio.
          </Text>
        </LinearGradient>

        <View style={styles.card}>
          <LabeledInput
            label="E-mail da empresa"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
          <LabeledInput label="Senha" secureTextEntry value={password} onChangeText={setPassword} />
          <PrimaryButton
            label={loading ? "Entrando..." : "Entrar no painel mobile"}
            onPress={handleLogin}
            disabled={loading}
          />
          <Pressable style={styles.textLink} onPress={() => navigation.navigate("ForgotPassword")}>
            <Text style={styles.textLinkLabel}>Esqueci minha senha</Text>
          </Pressable>

          <Pressable style={styles.textLink} onPress={() => navigation.replace("Login")}>
            <Text style={styles.textLinkLabel}>Sou cliente final e quero agendar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  hero: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadows.hero,
  },
  heroBadge: {
    color: "rgba(248,250,252,0.72)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.6,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.white,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: "rgba(248,250,252,0.8)",
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontSize: 15,
    fontWeight: "800",
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
});
