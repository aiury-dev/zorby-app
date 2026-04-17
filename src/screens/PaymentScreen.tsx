import React, { useMemo, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import * as WebBrowser from "expo-web-browser";
import { Copy, CreditCard, QrCode, Wallet } from "lucide-react-native";
import { PaymentSummaryCard } from "../components/PaymentSummaryCard";
import { PressableScale } from "../components/ui/PressableScale";
import { useToast } from "../hooks/useToast";
import { createPaymentIntent, getPaymentStatus } from "../lib/payments";
import { colors, radii, shadows, spacing, typography } from "../theme";
import type { RootStackParamList } from "../../App";

type Props = NativeStackScreenProps<RootStackParamList, "Payment">;

export function PaymentScreen({ route, navigation }: Props) {
  const { showToast } = useToast();
  const [busyMethod, setBusyMethod] = useState<"card" | "pix" | "local" | null>(null);
  const [pixData, setPixData] = useState<{ code?: string; image?: string } | null>(null);

  const feeCents = useMemo(() => Math.round(route.params.priceCents * 0.05), [route.params.priceCents]);

  const handleCard = async () => {
    try {
      setBusyMethod("card");
      const payment = await createPaymentIntent({
        appointmentId: route.params.appointmentId,
        priceCents: route.params.priceCents,
        customerEmail: route.params.customerEmail,
        description: route.params.description,
        token: route.params.token,
      });
      await WebBrowser.openAuthSessionAsync(payment.initPoint, "zorby://payment-return");
      const status = await getPaymentStatus(route.params.appointmentId, route.params.token);
      if (status.status === "approved") {
        navigation.replace("PaymentSuccess", {
          appointmentId: route.params.appointmentId,
          paymentId: status.paymentId,
        });
        return;
      }
      showToast("O pagamento ainda não foi aprovado.", "warning");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Falha no pagamento com cartão.", "error");
    } finally {
      setBusyMethod(null);
    }
  };

  const handlePix = async () => {
    try {
      setBusyMethod("pix");
      const payment = await createPaymentIntent({
        appointmentId: route.params.appointmentId,
        priceCents: route.params.priceCents,
        customerEmail: route.params.customerEmail,
        description: route.params.description,
        token: route.params.token,
      });
      setPixData({
        code: payment.pixQrCode,
        image: payment.pixQrCodeBase64,
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Falha ao gerar o Pix.", "error");
    } finally {
      setBusyMethod(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.title}>Escolha como pagar</Text>
        <Text style={styles.subtitle}>Conclua seu agendamento com a opção que fizer mais sentido agora.</Text>

        <PaymentSummaryCard
          serviceName={route.params.serviceName}
          professionalName={route.params.professionalName}
          startsAtLabel={route.params.startsAtLabel}
          subtotalCents={route.params.priceCents}
          feeCents={feeCents}
        />

        <PressableScale style={styles.optionCard} onPress={() => void handleCard()}>
          <CreditCard size={20} color={colors.primaryStrong} />
          <View style={styles.optionCopy}>
            <Text style={styles.optionTitle}>Cartão de crédito ou débito</Text>
            <Text style={styles.optionBody}>Abrimos o checkout seguro do Mercado Pago.</Text>
          </View>
          {busyMethod === "card" ? <ActivityIndicator color={colors.primaryStrong} /> : null}
        </PressableScale>

        <PressableScale style={styles.optionCard} onPress={() => void handlePix()}>
          <QrCode size={20} color={colors.primaryStrong} />
          <View style={styles.optionCopy}>
            <Text style={styles.optionTitle}>Pix</Text>
            <Text style={styles.optionBody}>Gere o QR Code e pague em poucos segundos.</Text>
          </View>
          {busyMethod === "pix" ? <ActivityIndicator color={colors.primaryStrong} /> : null}
        </PressableScale>

        {route.params.allowPayOnSite ? (
          <PressableScale style={styles.optionCard} onPress={() => navigation.goBack()}>
            <Wallet size={20} color={colors.primaryStrong} />
            <View style={styles.optionCopy}>
              <Text style={styles.optionTitle}>Pagar no local</Text>
              <Text style={styles.optionBody}>Finalize a reserva e pague diretamente no estabelecimento.</Text>
            </View>
          </PressableScale>
        ) : null}

        {pixData?.image ? (
          <View style={styles.pixCard}>
            <Image source={{ uri: `data:image/png;base64,${pixData.image}` }} style={styles.pixImage} />
            <Text style={styles.pixHint}>Escaneie o QR Code ou copie o código Pix.</Text>
            {pixData.code ? (
              <PressableScale
                style={styles.copyButton}
                onPress={() => {
                  void Clipboard.setStringAsync(pixData.code ?? "");
                  showToast("Código Pix copiado.", "success");
                }}
              >
                <Copy size={16} color={colors.white} />
                <Text style={styles.copyButtonText}>Copiar código Pix</Text>
              </PressableScale>
            ) : null}
          </View>
        ) : null}
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
    gap: spacing.md,
  },
  title: {
    color: colors.textDark,
    ...typography.h1,
  },
  subtitle: {
    color: colors.textSoft,
    ...typography.body,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceCard,
    padding: spacing.lg,
    ...shadows.card,
  },
  optionCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  optionTitle: {
    color: colors.textDark,
    ...typography.h4,
  },
  optionBody: {
    color: colors.textSoft,
    ...typography.bodySmall,
  },
  pixCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceCard,
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: "center",
    ...shadows.card,
  },
  pixImage: {
    width: 220,
    height: 220,
    borderRadius: radii.lg,
  },
  pixHint: {
    color: colors.textSoft,
    textAlign: "center",
    ...typography.bodySmall,
  },
  copyButton: {
    minHeight: 48,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
  },
  copyButtonText: {
    color: colors.white,
    ...typography.body,
    fontWeight: "700",
  },
});
