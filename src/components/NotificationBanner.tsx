import React, { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Bell } from "lucide-react-native";
import { colors, radii, shadows, spacing } from "../theme";

type Props = {
  title: string;
  body: string;
  onPress?: () => void;
  visible: boolean;
};

export function NotificationBanner({ title, body, onPress, visible }: Props) {
  const translateY = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 18,
        stiffness: 220,
      }).start();
      return;
    }

    Animated.timing(translateY, {
      toValue: -80,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [translateY, visible]);

  return (
    <Animated.View pointerEvents={visible ? "auto" : "none"} style={[styles.shell, { transform: [{ translateY }] }]}>
      <Pressable style={styles.card} onPress={onPress}>
        <View style={styles.iconShell}>
          <Bell size={18} color={colors.primaryStrong} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body} numberOfLines={2}>
            {body}
          </Text>
        </View>
      </Pressable>
      <View style={styles.bottomBorder} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.card,
  },
  iconShell: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "800",
  },
  body: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
  },
  bottomBorder: {
    height: 3,
    borderBottomLeftRadius: radii.lg,
    borderBottomRightRadius: radii.lg,
    backgroundColor: colors.primaryStrong,
    marginHorizontal: spacing.xs,
  },
});
