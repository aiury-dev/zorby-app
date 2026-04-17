import type {
  AvailabilitySlot,
  BusinessAgendaItem,
  BusinessDashboard,
  BusinessMobileSession,
  DiscoveryBusiness,
  PublicBusiness,
} from "../types";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://zorby-web.onrender.com";

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? "Não foi possível concluir a operação.");
  }

  return data as T;
}

export async function fetchDiscoveryBusinesses() {
  return request<{ businesses: DiscoveryBusiness[] }>("/api/mobile/discovery");
}

export async function fetchBusiness(slug: string) {
  return request<{ business: PublicBusiness }>(`/api/mobile/business/${slug}`);
}

export async function fetchAvailability(input: {
  slug: string;
  date: string;
  serviceId: string;
  professionalId: string;
  timezone: string;
}) {
  const params = new URLSearchParams({
    date: input.date,
    serviceId: input.serviceId,
    professionalId: input.professionalId,
    timezone: input.timezone,
  });

  return request<{ slots: AvailabilitySlot[] }>(`/api/public/${input.slug}/availability?${params.toString()}`);
}

export async function createBooking(input: {
  slug: string;
  serviceId: string;
  serviceVariantId?: string;
  professionalId: string;
  startsAt: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  customerTimezone: string;
}) {
  return request<{
    appointmentId: string;
    cancelToken: string;
    rescheduleToken: string;
    startsAt: string;
  }>(`/api/public/${input.slug}/book`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export { API_URL };

export async function businessLogin(input: { email: string; password: string }) {
  return request<BusinessMobileSession>("/api/mobile/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchBusinessDashboard(token: string) {
  return request<BusinessDashboard>("/api/mobile/business/dashboard", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function fetchBusinessAgenda(input: { token: string; date: string }) {
  const params = new URLSearchParams({ date: input.date });
  return request<{ timezone: string; appointments: BusinessAgendaItem[] }>(`/api/mobile/business/agenda?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${input.token}`,
    },
  });
}
