import React, { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Mail, MailCheck } from "lucide-react-native";
import { forgotPassword } from "../../lib/auth";
import { useToast } from "../../hooks/useToast";
import { colors, radii, shadows, spacing, typography } from "../../theme";
import { PressableScale } from "../../components/ui/PressableScale";
import type { RootStackParamList } from "../../../App";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!/\S+@\S+\.\S+/.test(email)) {
      showToast("Digite um e-mail válido.", "warning");
      return;
    }

    try {
      setBusy(true);
      await forgotPassword(email.trim());
      setSent(true);
      showToast("Link de recuperação enviado.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Não foi possível enviar o link.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.content}>
        {sent ? (
          <View style={styles.successCard}>
            <MailCheck size={34} color={colors.primaryStrong} />
            <Text style={styles.title}>Verifique seu e-mail</Text>
            <Text style={styles.subtitle}>Enviamos um link para você redefinir sua senha.</Text>
            <PressableScale style={styles.primaryButton} onPress={() => navigation.replace("Login")}>
              <Text style={styles.primaryButtonLabel}>Voltar para o login</Text>
            </PressableScale>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Recuperar senha</Text>
              <Text style={styles.subtitle}>Digite seu e-mail e nós enviaremos o link de recuperação.</Text>
            </View>

            <View style={styles.inputWrap}>
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

            <PressableScale style={styles.primaryButton} onPress={() => void handleSubmit()}>
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryButtonLabel}>Enviar link de recuperação</Text>}
            </PressableScale>
          </>
        )}
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
  header: {
    gap: spacing.sm,
  },
  successCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceCard,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: "center",
    ...shadows.hero,
  },
  title: {
    color: colors.textDark,
    textAlign: "center",
    ...typography.h1,
  },
  subtitle: {
    color: colors.textSoft,
    textAlign: "center",
    ...typography.body,
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
  primaryButton: {
    minHeight: 54,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
  },
  primaryButtonLabel: {
    color: colors.white,
    ...typography.body,
    fontWeight: "700",
  },
});
