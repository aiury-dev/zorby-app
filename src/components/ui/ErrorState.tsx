import React, { useEffect, useRef, type ReactElement } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { AlertCircle, Inbox, SearchX, WifiOff } from "lucide-react-native";
import { colors, radii, shadows, spacing, typography } from "../../theme";
import { PressableScale } from "./PressableScale";

type ErrorType = "network" | "empty" | "notfound" | "generic";

type Props = {
  type: ErrorType;
  title?: string;
  subtitle?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

const defaults: Record<ErrorType, { title: string; subtitle: string; icon: ReactElement }> = {
  network: {
    icon: <WifiOff size={48} color={colors.textMuted} />,
    title: "Sem conexão",
    subtitle: "Verifique sua internet e tente novamente",
  },
  empty: {
    icon: <Inbox size={48} color={colors.textMuted} />,
    title: "Nada por aqui",
    subtitle: "Ainda não há conteúdo nesta seção",
  },
  notfound: {
    icon: <SearchX size={48} color={colors.textMuted} />,
    title: "Não encontrado",
    subtitle: "O item que você procura não existe",
  },
  generic: {
    icon: <AlertCircle size={48} color={colors.textMuted} />,
    title: "Algo deu errado",
    subtitle: "Tente novamente em instantes",
  },
};

export function ErrorState({
  type,
  title,
  subtitle,
  onRetry,
  retryLabel = "Tentar novamente",
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  const meta = defaults[type];

  return (
    <Animated.View style={[styles.wrapper, { opacity }]}>
      <View style={styles.iconShell}>{meta.icon}</View>
      <Text style={styles.title}>{title ?? meta.title}</Text>
      <Text style={styles.subtitle}>{subtitle ?? meta.subtitle}</Text>
      {onRetry ? (
        <PressableScale containerStyle={styles.buttonWrap} style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonLabel}>{retryLabel}</Text>
        </PressableScale>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  iconShell: {
    width: 84,
    height: 84,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceCard,
    ...shadows.card,
  },
  title: {
    color: colors.textDark,
    textAlign: "center",
    ...typography.h3,
  },
  subtitle: {
    color: colors.textSoft,
    textAlign: "center",
    ...typography.body,
  },
  buttonWrap: {
    marginTop: spacing.sm,
  },
  button: {
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
  },
  buttonLabel: {
    color: colors.white,
    ...typography.body,
    fontWeight: "700",
  },
});
