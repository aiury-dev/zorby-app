import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "../theme";

export type TabBarItem<T extends string> = {
  key: T;
  label: string;
  count?: number;
};

type Measurements<T extends string> = Record<T, { x: number; width: number } | undefined>;

type Props<T extends string> = {
  items: Array<TabBarItem<T>>;
  value: T;
  onChange: (value: T) => void;
};

export function TabBar<T extends string>({ items, value, onChange }: Props<T>) {
  const translateX = useRef(new Animated.Value(0)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const [measurements, setMeasurements] = useState<Measurements<T>>({} as Measurements<T>);

  const activeMeasurement = useMemo(() => measurements[value], [measurements, value]);

  useEffect(() => {
    if (!activeMeasurement) return;

    Animated.parallel([
      Animated.spring(translateX, {
        toValue: activeMeasurement.x,
        useNativeDriver: true,
        damping: 18,
        stiffness: 220,
        mass: 0.8,
      }),
      Animated.spring(lineWidth, {
        toValue: activeMeasurement.width,
        useNativeDriver: false,
        damping: 18,
        stiffness: 220,
        mass: 0.8,
      }),
    ]).start();
  }, [activeMeasurement, lineWidth, translateX]);

  const handleLayout = (key: T, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setMeasurements((current) => ({ ...current, [key]: { x, width } }));
  };

  return (
    <View style={styles.shell}>
      <View style={styles.row}>
        {items.map((item) => {
          const active = item.key === value;
          return (
            <Pressable key={item.key} onLayout={(event) => handleLayout(item.key, event)} style={styles.tab} onPress={() => onChange(item.key)}>
              <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
              {(item.count ?? 0) > 0 ? (
                <View style={[styles.badge, active && styles.badgeActive]}>
                  <Text style={styles.badgeText}>{item.count}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <Animated.View style={[styles.indicator, { transform: [{ translateX }], width: lineWidth }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "700",
  },
  labelActive: {
    color: colors.primaryStrong,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.textMuted,
    paddingHorizontal: 6,
  },
  badgeActive: {
    backgroundColor: colors.primaryStrong,
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "800",
  },
  indicator: {
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryStrong,
    marginLeft: spacing.lg,
  },
});
