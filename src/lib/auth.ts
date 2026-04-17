import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { API_URL } from "./api";
import {
  clearCustomerSession,
  loadCustomerSession,
  loadSavedBookings,
  saveBooking,
  saveCustomerSession,
} from "./storage";
import type { CustomerSession, SavedBooking } from "../types";

WebBrowser.maybeCompleteAuthSession();

type AuthSessionResponse = CustomerSession;

type RemoteBooking = {
  appointmentId: string;
  businessSlug: string;
  businessName: string;
  serviceId?: string;
  serviceName: string;
  professionalName: string;
  startsAt: string;
  durationMinutes?: number;
  addressLabel?: string;
  businessPhone?: string;
  businessLogoUrl?: string;
  serviceVariantName?: string;
  priceCents?: number;
  status?: SavedBooking["status"];
  cancelToken: string;
  rescheduleToken: string;
};

async function authRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? "Não foi possível concluir a autenticação.");
  }

  return data as T;
}

async function persistSession(session: CustomerSession) {
  await saveCustomerSession(session);
  return session;
}

function normalizeRemoteBooking(booking: RemoteBooking): SavedBooking {
  return {
    appointmentId: booking.appointmentId,
    businessSlug: booking.businessSlug,
    businessName: booking.businessName,
    serviceId: booking.serviceId,
    serviceName: booking.serviceName,
    professionalName: booking.professionalName,
    startsAt: booking.startsAt,
    durationMinutes: booking.durationMinutes,
    addressLabel: booking.addressLabel,
    businessPhone: booking.businessPhone,
    businessLogoUrl: booking.businessLogoUrl,
    serviceVariantName: booking.serviceVariantName,
    priceCents: booking.priceCents,
    status: booking.status,
    cancelToken: booking.cancelToken,
    rescheduleToken: booking.rescheduleToken,
  };
}

export async function syncCustomerBookings(session: CustomerSession) {
  const localBookings = await loadSavedBookings();

  await authRequest("/customer/migrate-bookings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({
      bookings: localBookings,
    }),
  }).catch(() => null);

  const remote = await authRequest<{ bookings: RemoteBooking[] }>("/customer/bookings", {
    headers: {
      Authorization: `Bearer ${session.token}`,
    },
  }).catch(() => ({ bookings: [] as RemoteBooking[] }));

  const merged = new Map<string, SavedBooking>();
  localBookings.forEach((booking) => merged.set(booking.appointmentId, booking));
  remote.bookings.map(normalizeRemoteBooking).forEach((booking) => merged.set(booking.appointmentId, booking));

  for (const booking of merged.values()) {
    await saveBooking(booking);
  }

  return Array.from(merged.values());
}

export async function registerCustomer(name: string, email: string, password: string, phone: string) {
  const session = await authRequest<AuthSessionResponse>("/auth/customer/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password, phone }),
  });

  await persistSession(session);
  await syncCustomerBookings(session).catch(() => null);
  return session;
}

export async function loginCustomer(email: string, password: string) {
  const session = await authRequest<AuthSessionResponse>("/auth/customer/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  await persistSession(session);
  await syncCustomerBookings(session).catch(() => null);
  return session;
}

export async function loginWithGoogle() {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;

  if (!clientId) {
    throw new Error("Google OAuth ainda não está configurado neste app.");
  }

  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "zorby",
    path: "auth/google",
  });

  const discovery = await AuthSession.fetchDiscoveryAsync("https://accounts.google.com");
  const request = new AuthSession.AuthRequest({
    clientId,
    scopes: ["openid", "profile", "email"],
    redirectUri,
    responseType: AuthSession.ResponseType.IdToken,
  });

  const result = await request.promptAsync(discovery);

  if (result.type !== "success") {
    throw new Error("O login com Google foi cancelado.");
  }

  const idToken = typeof result.params.id_token === "string" ? result.params.id_token : null;
  if (!idToken) {
    throw new Error("Não foi possível obter o token do Google.");
  }

  const session = await authRequest<AuthSessionResponse>("/auth/customer/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });

  await persistSession(session);
  await syncCustomerBookings(session).catch(() => null);
  return session;
}

export async function refreshCustomerToken() {
  const session = await loadCustomerSession();
  if (!session) return null;

  try {
    const refreshed = await authRequest<AuthSessionResponse>("/auth/customer/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    await persistSession(refreshed);
    return refreshed;
  } catch {
    await clearCustomerSession();
    return null;
  }
}

export async function logoutCustomer() {
  const session = await loadCustomerSession();
  if (session) {
    await authRequest("/auth/customer/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
    }).catch(() => null);
  }

  await clearCustomerSession();
}

export async function forgotPassword(email: string) {
  return authRequest<{ ok: true }>("/auth/customer/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}
