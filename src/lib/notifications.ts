import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { API_URL } from "./api";
import type { SavedBooking } from "../types";

const PUSH_TOKEN_KEY = "push_token";
const BOOKING_REMINDERS_KEY = "zorby.notifications.bookingReminders";
const NOTIFICATIONS_PROMPTED_KEY = "notifications_prompted";

type ReminderMap = Record<string, string>;

type NotificationPayload = {
  type?: string;
  appointmentId?: string;
  slug?: string;
};

function debugLog(message: string, payload?: unknown) {
  if (__DEV__) {
    console.log(`[notifications] ${message}`, payload ?? "");
  }
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

async function loadReminderMap() {
  const raw = await AsyncStorage.getItem(BOOKING_REMINDERS_KEY);
  if (!raw) return {} as ReminderMap;

  try {
    return JSON.parse(raw) as ReminderMap;
  } catch {
    return {} as ReminderMap;
  }
}

async function saveReminderMap(map: ReminderMap) {
  await AsyncStorage.setItem(BOOKING_REMINDERS_KEY, JSON.stringify(map));
}

export async function loadStoredPushToken() {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

export async function hasNotificationsPrompted() {
  return (await AsyncStorage.getItem(NOTIFICATIONS_PROMPTED_KEY)) === "true";
}

export async function markNotificationsPrompted() {
  await AsyncStorage.setItem(NOTIFICATIONS_PROMPTED_KEY, "true");
}

export async function registerForPushNotificationsAsync() {
  try {
    if (!Device.isDevice) {
      debugLog("Push notifications require a physical device.");
      return null;
    }

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;

    if (finalStatus !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== "granted") {
      debugLog("Notification permission denied.");
      return null;
    }

    if (Device.osName === "Android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Zorby",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        sound: "default",
      });
      await Notifications.setNotificationChannelAsync("reminders", {
        name: "Lembretes de agendamento",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      });
      await Notifications.setNotificationChannelAsync("business", {
        name: "Alertas da empresa",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      });
    }

    const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
    const projectId = extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    debugLog("Registered expo push token", token);
    return token;
  } catch (error) {
    debugLog("Failed to register for push notifications", error);
    return null;
  }
}

export async function savePushTokenToBackend(token: string, authToken?: string) {
  try {
    await fetch(`${API_URL}/users/push-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ expoPushToken: token }),
    });
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
  } catch (error) {
    debugLog("Failed to save push token to backend", error);
  }
}

export async function deletePushTokenFromBackend(token: string, authToken?: string) {
  try {
    await fetch(`${API_URL}/users/push-token`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ expoPushToken: token }),
    });
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
  } catch (error) {
    debugLog("Failed to delete push token from backend", error);
  }
}

export async function scheduleBookingReminder(booking: SavedBooking) {
  try {
    const startsAt = new Date(booking.startsAt);
    const reminderDate = new Date(startsAt.getTime() - 60 * 60 * 1000);
    if (reminderDate.getTime() <= Date.now()) return null;

    await cancelBookingReminder(booking.appointmentId);

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Lembrete: ${booking.businessName}`,
        body: `${booking.serviceName} as ${formatDateTime(booking.startsAt)}`,
        data: {
          type: "booking_reminder",
          appointmentId: booking.appointmentId,
          slug: booking.businessSlug,
        } satisfies NotificationPayload,
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
        channelId: "reminders",
      },
    });

    const reminders = await loadReminderMap();
    reminders[booking.appointmentId] = identifier;
    await saveReminderMap(reminders);
    return identifier;
  } catch (error) {
    debugLog("Failed to schedule booking reminder", error);
    return null;
  }
}

export async function cancelBookingReminder(appointmentId: string) {
  try {
    const reminders = await loadReminderMap();
    const identifier = reminders[appointmentId];
    if (identifier) {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      delete reminders[appointmentId];
      await saveReminderMap(reminders);
    }
  } catch (error) {
    debugLog("Failed to cancel booking reminder", error);
  }
}

export async function scheduleBookingConfirmation(booking: SavedBooking) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Reserva confirmada! ✓",
        body: `${booking.businessName} · ${formatDateTime(booking.startsAt)}`,
        data: {
          type: "booking_confirmed",
          appointmentId: booking.appointmentId,
          slug: booking.businessSlug,
        } satisfies NotificationPayload,
        sound: "default",
      },
      trigger: null,
    });
  } catch (error) {
    debugLog("Failed to schedule booking confirmation notification", error);
  }
}

export async function scheduleBusinessAlert(message: string, appointmentId: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Zorby Empresa",
        body: message,
        data: {
          type: "business_alert",
          appointmentId,
        } satisfies NotificationPayload,
        sound: "default",
      },
      trigger: null,
    });
  } catch (error) {
    debugLog("Failed to schedule business alert", error);
  }
}

export async function cancelAllBookingReminders() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(BOOKING_REMINDERS_KEY);
  } catch (error) {
    debugLog("Failed to cancel all reminders", error);
  }
}

export async function getScheduledReminders() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled.map((entry) => {
      const data = (entry.content.data ?? {}) as NotificationPayload;
      const dateTrigger =
        typeof entry.trigger === "object" && entry.trigger != null && "date" in entry.trigger
          ? entry.trigger.date
          : null;

      return {
        identifier: entry.identifier,
        appointmentId: data.appointmentId ?? null,
        type: data.type ?? null,
        scheduledFor: dateTrigger ? new Date(dateTrigger).toISOString() : null,
      };
    });
  } catch (error) {
    debugLog("Failed to list scheduled reminders", error);
    return [];
  }
}
