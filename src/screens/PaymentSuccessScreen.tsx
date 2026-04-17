import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CheckCircle2 } from "lucide-react-native";
import { PressableScale } from "../components/ui/PressableScale";
import { colors, radii, shadows, spacing, typography } from "../theme";
import type { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "PaymentSuccess">;

export function PaymentSuccessScreen({ navigation, route }: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View style={styles.card}>
          <CheckCircle2 size={56} color={colors.success} />
          <Text style={styles.title}>Pagamento aprovado</Text>
          <Text style={styles.subtitle}>Seu pagamento foi confirmado e o agendamento já pode seguir normalmente.</Text>
          {route.params.paymentId ? <Text style={styles.paymentId}>Pagamento #{route.params.paymentId}</Text> : null}
          <PressableScale style={styles.primaryButton} onPress={() => navigation.navigate("CustomerTabs")}>
            <Text style={styles.primaryButtonText}>Ver meus agendamentos</Text>
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
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceCard,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
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
  paymentId: {
    color: colors.textMuted,
    ...typography.caption,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
  },
  primaryButtonText: {
    color: colors.white,
    ...typography.body,
    fontWeight: "700",
  },
});
