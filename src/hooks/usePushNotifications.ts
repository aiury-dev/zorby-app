import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import {
  loadStoredPushToken,
  registerForPushNotificationsAsync,
  savePushTokenToBackend,
} from "../lib/notifications";
import { loadAppPreferences } from "../lib/storage";
import { navigationRef } from "../lib/navigation";

type NotificationPayload = {
  type?: string;
  appointmentId?: string;
  slug?: string;
};

type BannerState = {
  visible: boolean;
  title: string;
  body: string;
  payload: NotificationPayload | null;
};

type StoreState = {
  pushToken: string | null;
  notificationPermission: Notifications.PermissionStatus | null;
  banner: BannerState;
  businessAlertCount: number;
};

type Subscriber = (state: StoreState) => void;

const subscribers = new Set<Subscriber>();
let storeState: StoreState = {
  pushToken: null,
  notificationPermission: null,
  banner: {
    visible: false,
    title: "",
    body: "",
    payload: null,
  },
  businessAlertCount: 0,
};
let listenersSetup = false;
let handledInitialResponse = false;
let bannerTimeout: ReturnType<typeof setTimeout> | null = null;

function emit(next: Partial<StoreState>) {
  storeState = { ...storeState, ...next };
  subscribers.forEach((subscriber) => subscriber(storeState));
}

function setBanner(title: string, body: string, payload: NotificationPayload) {
  if (bannerTimeout) clearTimeout(bannerTimeout);

  emit({
    banner: {
      visible: true,
      title,
      body,
      payload,
    },
  });

  bannerTimeout = setTimeout(() => {
    emit({
      banner: {
        visible: false,
        title: "",
        body: "",
        payload: null,
      },
    });
  }, 4000);
}

function readPayload(contentData: Notifications.Notification["request"]["content"]["data"] | undefined) {
  const data = (contentData ?? {}) as NotificationPayload;
  return {
    type: typeof data.type === "string" ? data.type : undefined,
    appointmentId: typeof data.appointmentId === "string" ? data.appointmentId : undefined,
    slug: typeof data.slug === "string" ? data.slug : undefined,
  } satisfies NotificationPayload;
}

export function handleNotificationNavigation(payload: NotificationPayload | null) {
  if (!payload || !navigationRef.isReady()) return;

  if (payload.type === "booking_reminder" && payload.appointmentId) {
    navigationRef.navigate("BookingDetail", { appointmentId: payload.appointmentId });
    return;
  }

  if (payload.type === "booking_confirmed") {
    navigationRef.navigate("CustomerTabs", { screen: "Bookings" });
    return;
  }

  if (payload.type === "business_alert" && payload.appointmentId) {
    navigationRef.navigate("AppointmentDetail", {
      appointmentId: payload.appointmentId,
      date: new Date().toISOString().slice(0, 10),
    });
  }
}

function ensureListeners() {
  if (listenersSetup) return;
  listenersSetup = true;

  Notifications.addNotificationReceivedListener((notification) => {
    const payload = readPayload(notification.request.content.data);

    if (payload.type === "booking_reminder") {
      setBanner(notification.request.content.title ?? "Lembrete", notification.request.content.body ?? "", payload);
      return;
    }

    if (payload.type === "business_alert") {
      emit({ businessAlertCount: storeState.businessAlertCount + 1 });
      setBanner(notification.request.content.title ?? "Zorby Empresa", notification.request.content.body ?? "", payload);
    }
  });

  Notifications.addNotificationResponseReceivedListener((response) => {
    const payload = readPayload(response.notification.request.content.data);
    handleNotificationNavigation(payload);
  });

  void (async () => {
    if (handledInitialResponse) return;
    handledInitialResponse = true;
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response) return;
    const payload = readPayload(response.notification.request.content.data);
    handleNotificationNavigation(payload);
  })();
}

async function syncPushRegistration(authToken?: string) {
  const preferences = await loadAppPreferences();
  if (!preferences.notificationsEnabled) {
    const permission = await Notifications.getPermissionsAsync();
    emit({ notificationPermission: permission.status });
    return;
  }

  const permission = await Notifications.getPermissionsAsync();
  emit({ notificationPermission: permission.status });

  const token = (await loadStoredPushToken()) ?? (await registerForPushNotificationsAsync());
  const finalPermission = await Notifications.getPermissionsAsync();

  emit({
    pushToken: token,
    notificationPermission: finalPermission.status,
  });

  if (token) {
    await savePushTokenToBackend(token, authToken);
  }
}

export function usePushNotifications(authToken?: string) {
  const [state, setState] = useState(storeState);

  useEffect(() => {
    const subscriber: Subscriber = (nextState) => setState(nextState);
    subscribers.add(subscriber);
    ensureListeners();
    void syncPushRegistration(authToken);

    return () => {
      subscribers.delete(subscriber);
    };
  }, [authToken]);

  return {
    pushToken: state.pushToken,
    notificationPermission: state.notificationPermission,
    banner: state.banner,
    businessAlertCount: state.businessAlertCount,
    clearBusinessAlertCount: () => emit({ businessAlertCount: 0 }),
    dismissBanner: () =>
      emit({
        banner: {
          visible: false,
          title: "",
          body: "",
          payload: null,
        },
      }),
  };
}
