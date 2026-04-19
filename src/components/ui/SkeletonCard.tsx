import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";
import { colors, radii, shadows, spacing } from "../../theme";

type SkeletonCardProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function SkeletonCard({ children, style, contentStyle }: SkeletonCardProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, { opacity }, style]}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceCard,
    borderRadius: radii.xl,
    overflow: "hidden",
    ...shadows.card,
  },
  content: {
    padding: spacing.lg,
  },
});
