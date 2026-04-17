import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppPreferences, BusinessMobileSession, CustomerSession, SavedBooking, SavedProfile } from "../types";

const BOOKINGS_KEY = "zorby.mobile.savedBookings";
const PROFILE_KEY = "zorby.mobile.savedProfile";
const CUSTOMER_SESSION_KEY = "zorby.mobile.customerSession";
const BUSINESS_SESSION_KEY = "zorby.mobile.businessSession";
const FAVORITES_KEY = "zorby.mobile.favoriteBusinesses";
const PREFERENCES_KEY = "zorby.mobile.appPreferences";
const BUSINESS_NOTES_KEY = "zorby.mobile.businessAppointmentNotes";
const NOTIFICATIONS_ENABLED_KEY = "notifications_enabled";
const NOTIFICATIONS_PROMPTED_KEY = "notifications_prompted";

export async function loadSavedBookings() {
  const raw = await AsyncStorage.getItem(BOOKINGS_KEY);
  if (!raw) return [] as SavedBooking[];

  try {
    return JSON.parse(raw) as SavedBooking[];
  } catch {
    return [];
  }
}

export async function saveBooking(booking: SavedBooking) {
  const current = await loadSavedBookings();
  const next = [booking, ...current.filter((item) => item.appointmentId !== booking.appointmentId)];
  await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(next));
}

export async function updateSavedBooking(
  appointmentId: string,
  updater: (booking: SavedBooking) => SavedBooking,
) {
  const current = await loadSavedBookings();
  const next = current.map((booking) => (booking.appointmentId === appointmentId ? updater(booking) : booking));
  await AsyncStorage.setItem(BOOKINGS_KEY, JSON.stringify(next));
  return next;
}

export async function loadSavedProfile() {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) {
    return { name: "", email: "", phone: "" } satisfies SavedProfile;
  }

  try {
    return JSON.parse(raw) as SavedProfile;
  } catch {
    return { name: "", email: "", phone: "" } satisfies SavedProfile;
  }
}

export async function saveProfile(profile: SavedProfile) {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function clearSavedProfile() {
  await AsyncStorage.removeItem(PROFILE_KEY);
}

export async function saveCustomerSession(session: CustomerSession) {
  await AsyncStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
}

export async function loadCustomerSession() {
  const raw = await AsyncStorage.getItem(CUSTOMER_SESSION_KEY);
  if (!raw) return null as CustomerSession | null;

  try {
    return JSON.parse(raw) as CustomerSession;
  } catch {
    return null;
  }
}

export async function clearCustomerSession() {
  await AsyncStorage.removeItem(CUSTOMER_SESSION_KEY);
}

export async function loadFavorites() {
  const raw = await AsyncStorage.getItem(FAVORITES_KEY);
  if (!raw) return [] as string[];

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

export async function saveFavorite(slug: string) {
  const current = await loadFavorites();
  if (current.includes(slug)) return current;
  const next = [slug, ...current];
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}

export async function removeFavorite(slug: string) {
  const current = await loadFavorites();
  const next = current.filter((entry) => entry !== slug);
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}

export async function toggleFavorite(slug: string) {
  const current = await loadFavorites();
  if (current.includes(slug)) {
    const next = current.filter((entry) => entry !== slug);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    return { favorites: next, isFavorite: false };
  }

  const next = [slug, ...current];
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return { favorites: next, isFavorite: true };
}

export async function loadAppPreferences() {
  const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
  const legacyNotifications = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
  if (!raw) {
    return {
      notificationsEnabled: legacyNotifications == null ? true : legacyNotifications === "true",
    } satisfies AppPreferences;
  }

  try {
    const parsed = JSON.parse(raw) as AppPreferences;
    return {
      notificationsEnabled:
        typeof parsed.notificationsEnabled === "boolean"
          ? parsed.notificationsEnabled
          : legacyNotifications == null
            ? true
            : legacyNotifications === "true",
    } satisfies AppPreferences;
  } catch {
    return {
      notificationsEnabled: legacyNotifications == null ? true : legacyNotifications === "true",
    } satisfies AppPreferences;
  }
}

export async function saveAppPreferences(preferences: AppPreferences) {
  await AsyncStorage.multiSet([
    [PREFERENCES_KEY, JSON.stringify(preferences)],
    [NOTIFICATIONS_ENABLED_KEY, String(preferences.notificationsEnabled)],
  ]);
}

export async function loadBusinessSession() {
  const raw = await AsyncStorage.getItem(BUSINESS_SESSION_KEY);
  if (!raw) return null as BusinessMobileSession | null;

  try {
    return JSON.parse(raw) as BusinessMobileSession;
  } catch {
    return null;
  }
}

export async function saveBusinessSession(session: BusinessMobileSession) {
  await AsyncStorage.setItem(BUSINESS_SESSION_KEY, JSON.stringify(session));
}

export async function clearBusinessSession() {
  await AsyncStorage.removeItem(BUSINESS_SESSION_KEY);
}

export async function loadNotificationsPrompted() {
  const raw = await AsyncStorage.getItem(NOTIFICATIONS_PROMPTED_KEY);
  return raw === "true";
}

export async function saveNotificationsPrompted(prompted = true) {
  await AsyncStorage.setItem(NOTIFICATIONS_PROMPTED_KEY, String(prompted));
}

export async function loadBusinessAppointmentNotes() {
  const raw = await AsyncStorage.getItem(BUSINESS_NOTES_KEY);
  if (!raw) return {} as Record<string, string>;

  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function loadBusinessAppointmentNote(appointmentId: string) {
  const notes = await loadBusinessAppointmentNotes();
  return notes[appointmentId] ?? "";
}

export async function saveBusinessAppointmentNote(appointmentId: string, note: string) {
  const notes = await loadBusinessAppointmentNotes();
  const next = {
    ...notes,
    [appointmentId]: note,
  };
  await AsyncStorage.setItem(BUSINESS_NOTES_KEY, JSON.stringify(next));
  return next;
}
