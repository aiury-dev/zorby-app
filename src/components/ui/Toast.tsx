import React, {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react-native";
import { colors, radii, shadows, spacing, typography } from "../../theme";

export type ToastType = "success" | "error" | "info" | "warning";

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type: ToastType) => void;
  hideToast: () => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

function toastMeta(type: ToastType) {
  switch (type) {
    case "success":
      return { backgroundColor: "#166534", icon: <CheckCircle2 size={18} color={colors.white} /> };
    case "error":
      return { backgroundColor: "#991B1B", icon: <XCircle size={18} color={colors.white} /> };
    case "warning":
      return { backgroundColor: "#A16207", icon: <AlertTriangle size={18} color={colors.white} /> };
    default:
      return { backgroundColor: colors.surfaceToast, icon: <Info size={18} color={colors.white} /> };
  }
}

function ToastView({
  item,
  visible,
  onDismiss,
}: {
  item: ToastItem | null;
  visible: boolean;
  onDismiss: () => void;
}) {
  const translateY = useRef(new Animated.Value(60)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!visible || !item) return;

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 16,
        stiffness: 210,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 60,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(onDismiss);
    }, 3000);

    return () => clearTimeout(timer);
  }, [item, onDismiss, opacity, translateY, visible]);

  if (!item) return null;

  const meta = toastMeta(item.type);

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      style={[
        styles.toastShell,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <Pressable style={[styles.toastCard, { backgroundColor: meta.backgroundColor }]} onPress={onDismiss}>
        <View style={styles.toastIcon}>{meta.icon}</View>
        <Text style={styles.toastText}>{item.message}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }: PropsWithChildren) {
  const queue = useRef<ToastItem[]>([]);
  const idRef = useRef(0);
  const [activeToast, setActiveToast] = useState<ToastItem | null>(null);
  const [visible, setVisible] = useState(false);

  const flushQueue = useCallback(() => {
    const next = queue.current.shift() ?? null;
    setActiveToast(next);
    setVisible(Boolean(next));
  }, []);

  const hideToast = useCallback(() => {
    setVisible(false);
    setActiveToast(null);
    if (queue.current.length > 0) {
      requestAnimationFrame(() => flushQueue());
    }
  }, [flushQueue]);

  const showToast = useCallback(
    (message: string, type: ToastType) => {
      const next: ToastItem = { id: idRef.current++, message, type };

      if (!activeToast && !visible) {
        setActiveToast(next);
        setVisible(true);
        return;
      }

      queue.current.push(next);
    },
    [activeToast, visible],
  );

  const value = useMemo(() => ({ showToast, hideToast }), [hideToast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastView item={activeToast} visible={visible} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toastShell: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: 90,
    zIndex: 1200,
  },
  toastCard: {
    minHeight: 56,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.card,
  },
  toastIcon: {
    width: 28,
    alignItems: "center",
  },
  toastText: {
    flex: 1,
    color: colors.white,
    ...typography.body,
    fontWeight: "600",
  },
});
