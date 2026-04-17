import React, { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  useColorScheme,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, radii, spacing } from "../../theme";

type SkeletonProps = {
  width: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

type SkeletonGroupProps = {
  count: number;
  width: DimensionValue;
  height: number;
  borderRadius?: number;
  gap?: number;
  containerStyle?: StyleProp<ViewStyle>;
  itemStyle?: StyleProp<ViewStyle>;
};

export function Skeleton({
  width,
  height,
  borderRadius = radii.md,
  style,
}: SkeletonProps) {
  const scheme = useColorScheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const backgroundColor = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange:
      scheme === "dark"
        ? [colors.skeletonDarkBase, colors.skeletonDarkHighlight]
        : [colors.skeletonBase, colors.skeletonLight],
  });

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
}

export function SkeletonGroup({
  count,
  width,
  height,
  borderRadius,
  gap = spacing.sm,
  containerStyle,
  itemStyle,
}: SkeletonGroupProps) {
  const items = useMemo(() => Array.from({ length: count }, (_, index) => index), [count]);

  return (
    <View style={[styles.group, { gap }, containerStyle]}>
      {items.map((item) => (
        <Skeleton
          key={`skeleton-${item}`}
          width={width}
          height={height}
          borderRadius={borderRadius}
          style={itemStyle}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: "hidden",
  },
  group: {},
});
