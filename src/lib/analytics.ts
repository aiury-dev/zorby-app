import { Identify, identify, init, reset, setUserId, track } from "@amplitude/analytics-react-native";
import { Platform } from "react-native";

let initialized = false;

function safeTrack(eventName: string, eventProperties?: Record<string, unknown>) {
  if (__DEV__) {
    console.log(`[analytics] ${eventName}`, eventProperties ?? {});
    return;
  }

  track(eventName, eventProperties);
}

export function initAnalytics() {
  if (initialized) return;
  initialized = true;

  const apiKey = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY ?? "";

  if (!apiKey) {
    if (__DEV__) {
      console.log("[analytics] EXPO_PUBLIC_AMPLITUDE_API_KEY nao configurado.");
    }
    return;
  }

  init(apiKey);
}

export function identifyAnalyticsUser(userId: string, email: string, plan = "free") {
  setUserId(userId);
  identify(
    new Identify()
      .set("email", email)
      .set("plan", plan)
      .set("platform", Platform.OS),
  );
}

export function clearAnalyticsUser() {
  reset();
}

export const Analytics = {
  trackSignUp: (method: "email" | "google") => safeTrack("sign_up", { method }),
  trackLogin: (method: "email" | "google") => safeTrack("login", { method }),
  trackLogout: () => safeTrack("logout"),
  trackExploreOpened: () => safeTrack("explore_opened"),
  trackSearchPerformed: (query: string, resultsCount: number) =>
    safeTrack("search_performed", { query, resultsCount }),
  trackFilterApplied: (filters: Record<string, unknown>) =>
    safeTrack("filter_applied", { filters }),
  trackBusinessCardTapped: (businessId: string, businessName: string, position: number) =>
    safeTrack("business_card_tapped", { businessId, businessName, position }),
  trackBusinessPageViewed: (businessId: string, businessName: string, category: string) =>
    safeTrack("business_page_viewed", { businessId, businessName, category }),
  trackServiceSelected: (serviceId: string, serviceName: string, priceCents: number) =>
    safeTrack("service_selected", { serviceId, serviceName, priceCents }),
  trackBookingStarted: (businessId: string, serviceId: string) =>
    safeTrack("booking_started", { businessId, serviceId }),
  trackBookingStep: (step: 1 | 2 | 3 | 4, businessId: string) =>
    safeTrack("booking_step", { step, businessId }),
  trackBookingCompleted: (businessId: string, serviceId: string, priceCents: number) =>
    safeTrack("booking_completed", { businessId, serviceId, priceCents }),
  trackBookingAbandoned: (step: number, businessId: string) =>
    safeTrack("booking_abandoned", { step, businessId }),
  trackBookingCancelled: (appointmentId: string, reason?: string) =>
    safeTrack("booking_cancelled", { appointmentId, reason }),
  trackBookingRescheduled: (appointmentId: string) =>
    safeTrack("booking_rescheduled", { appointmentId }),
  trackReviewSubmitted: (rating: number, businessId: string) =>
    safeTrack("review_submitted", { rating, businessId }),
  trackFavoriteAdded: (businessId: string) =>
    safeTrack("favorite_added", { businessId }),
  trackFavoriteRemoved: (businessId: string) =>
    safeTrack("favorite_removed", { businessId }),
  trackPushPermissionGranted: () => safeTrack("push_permission_granted"),
  trackPushPermissionDenied: () => safeTrack("push_permission_denied"),
  trackNotificationTapped: (type: string) => safeTrack("notification_tapped", { type }),
  trackBusinessLoginSuccess: () => safeTrack("business_login_success"),
  trackAppointmentStatusChanged: (appointmentId: string, newStatus: string) =>
    safeTrack("appointment_status_changed", { appointmentId, newStatus }),
};
