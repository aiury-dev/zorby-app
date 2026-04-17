import React from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors, radii, shadows, spacing, typography } from "../theme";
import { PressableScale } from "./ui/PressableScale";

type Props = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  buttonLabel?: string;
  onButtonPress?: () => void;
};

export function EmptyState({ icon, title, subtitle, buttonLabel, onButtonPress }: Props) {
  const scale = React.useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      delay: 200,
      useNativeDriver: true,
      damping: 14,
      stiffness: 180,
    }).start();
  }, [scale]);

  return (
    <View style={styles.card}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={styles.iconShell}>{icon}</View>
        <View style={styles.illustrationWrap}>
          <SearchIllustration />
        </View>
      </Animated.View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {buttonLabel && onButtonPress ? (
        <PressableScale style={styles.button} onPress={onButtonPress}>
          <Text style={styles.buttonLabel}>{buttonLabel}</Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

function SearchIllustration() {
  return (
    <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
      <Circle cx={17} cy={17} r={9} stroke={colors.primaryStrong} strokeWidth={2.4} />
      <Path d="M23.5 23.5L31 31" stroke={colors.primaryStrong} strokeWidth={2.4} strokeLinecap="round" />
      <Rect x={28.5} y={7} width={3} height={3} rx={1.5} fill={colors.primaryStrong} />
      <Rect x={7} y={6} width={2.5} height={2.5} rx={1.25} fill={colors.primaryStrong} opacity={0.7} />
      <Rect x={9} y={29} width={2.5} height={2.5} rx={1.25} fill={colors.primaryStrong} opacity={0.7} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.surfaceCard,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.card,
  },
  iconShell: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.xs,
  },
  illustrationWrap: {
    position: "absolute",
    right: -spacing.sm,
    bottom: -spacing.sm,
  },
  title: {
    color: colors.textDark,
    textAlign: "center",
    ...typography.h2,
  },
  subtitle: {
    color: colors.textSoft,
    textAlign: "center",
    ...typography.body,
  },
  button: {
    minHeight: 52,
    minWidth: 176,
    marginTop: spacing.md,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryStrong,
    paddingHorizontal: spacing.lg,
  },
  buttonLabel: {
    color: colors.white,
    ...typography.body,
    fontWeight: "700",
  },
});
