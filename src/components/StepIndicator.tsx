import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { colors, radii, spacing, typography } from "../theme";

type StepIndicatorProps = {
  currentStep: number;
  labels: string[];
  accentColor: string;
};

export function StepIndicator({ currentStep, labels, accentColor }: StepIndicatorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {labels.map((_, index) => {
          const step = index + 1;
          const isCurrent = step === currentStep;
          const isCompleted = step < currentStep;

          return (
            <React.Fragment key={`step-${step}`}>
              <View
                style={[
                  styles.circle,
                  isCurrent && { backgroundColor: accentColor, borderColor: accentColor },
                  isCompleted && { backgroundColor: accentColor, borderColor: accentColor },
                ]}
              >
                {isCompleted ? (
                  <Check size={14} color={colors.white} />
                ) : (
                  <Text style={[styles.number, (isCurrent || isCompleted) && styles.numberActive]}>{step}</Text>
                )}
              </View>
              {index < labels.length - 1 ? (
                <View style={styles.lineShell}>
                  <View
                    style={[
                      styles.line,
                      step < currentStep && { backgroundColor: accentColor },
                    ]}
                  />
                </View>
              ) : null}
            </React.Fragment>
          );
        })}
      </View>

      <Text style={styles.label}>{labels[Math.max(0, currentStep - 1)]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  circle: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  number: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: "800",
  },
  numberActive: {
    color: colors.white,
  },
  lineShell: {
    flex: 1,
    paddingHorizontal: spacing.xs,
  },
  line: {
    height: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.borderStrong,
  },
  label: {
    color: colors.textDark,
    ...typography.bodySmall,
    fontWeight: "700",
  },
});
