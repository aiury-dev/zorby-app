export const colors = {
  background: "#0A0F18",
  backgroundSoft: "#F5F1EB",
  surface: "#121826",
  surfaceRaised: "#171F32",
  surfaceCard: "#FFFFFF",
  surfaceMuted: "#EEF2F7",
  surfaceToast: "#0F172A",
  border: "rgba(148, 163, 184, 0.18)",
  borderStrong: "rgba(148, 163, 184, 0.32)",
  primary: "#3B82F6",
  primaryStrong: "#2563EB",
  secondary: "#14B8A6",
  success: "#16A34A",
  warning: "#F59E0B",
  danger: "#EF4444",
  text: "#F8FAFC",
  textMuted: "#94A3B8",
  textDark: "#111827",
  textSoft: "#475569",
  white: "#FFFFFF",
  chip: "#1E293B",
  beige: "#F7F2EA",
  heart: "#EF476F",
  skeletonLight: "#F5F5F5",
  skeletonBase: "#E8E8E8",
  skeletonDarkBase: "#1E293B",
  skeletonDarkHighlight: "#334155",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const radii = {
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
};

export const shadows = {
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  hero: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
};

export const typography = {
  h1: { fontSize: 28, fontWeight: "700", lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: "700", lineHeight: 28 },
  h3: { fontSize: 18, fontWeight: "600", lineHeight: 24 },
  h4: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
  body: { fontSize: 15, fontWeight: "400", lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: "400", lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: "400", lineHeight: 16 },
  label: { fontSize: 11, fontWeight: "600", lineHeight: 14, letterSpacing: 0.5 },
  price: { fontSize: 20, fontWeight: "700", lineHeight: 26 },
  priceLarge: { fontSize: 28, fontWeight: "800", lineHeight: 34 },
} as const;
