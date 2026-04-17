import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BusinessMobileSession, SavedBooking, SavedProfile } from "../types";

const BOOKINGS_KEY = "zorby.mobile.savedBookings";
const PROFILE_KEY = "zorby.mobile.savedProfile";
const BUSINESS_SESSION_KEY = "zorby.mobile.businessSession";

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
