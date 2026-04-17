import * as Sentry from "@sentry/react-native";

export function initCrashReporting() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN ?? "";

  Sentry.init({
    dsn,
    environment: __DEV__ ? "development" : "production",
    tracesSampleRate: __DEV__ ? 0 : 0.2,
    enableAutoSessionTracking: true,
    attachScreenshot: true,
  });
}

export function setUserContext(userId: string, email: string) {
  Sentry.setUser({ id: userId, email });
}

export function clearUserContext() {
  Sentry.setUser(null);
}

export function logError(error: Error, context?: Record<string, unknown>) {
  if (__DEV__) {
    console.error(error, context);
    return;
  }

  Sentry.captureException(error, { extra: context });
}

export function logMessage(message: string, level: Sentry.SeverityLevel = "info") {
  if (__DEV__) {
    console.log(`[crash:${level}] ${message}`);
    return;
  }

  Sentry.captureMessage(message, level);
}
