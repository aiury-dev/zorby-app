import type {
  AvailabilitySlot,
  BookingStatus,
  BusinessAppointmentStatus,
  BusinessAgendaItem,
  BusinessDashboard,
  BusinessMobileSession,
  DiscoveryBusiness,
  PublicBusiness,
} from "../types";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://zorby-web.onrender.com";

export type SearchParams = {
  query?: string;
  category?: string;
  city?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: "relevance" | "rating" | "distance" | "price";
  page?: number;
  limit?: number;
  signal?: AbortSignal;
};

export type SearchResult = {
  businesses: DiscoveryBusiness[];
  total: number;
  page: number;
  hasMore: boolean;
};

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
    throw new Error(data.error ?? "Nao foi possivel concluir a operacao.");
  }

  return data as T;
}

export async function fetchDiscoveryBusinesses() {
  return request<{ businesses: DiscoveryBusiness[] }>("/api/mobile/discovery");
}

function filterLocalBusinesses(
  businesses: DiscoveryBusiness[],
  params: SearchParams,
) {
  const normalizedQuery = params.query?.trim().toLowerCase() ?? "";
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;

  const filtered = businesses.filter((business) => {
    const matchesQuery =
      normalizedQuery.length === 0
        ? true
        : [business.name, business.city ?? "", business.neighborhood ?? "", business.category]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);

    const matchesCategory = params.category ? business.category === params.category : true;
    const minPrice =
      business.services.length > 0
        ? Math.min(...business.services.map((service) => service.priceCents)) / 100
        : null;
    const matchesMinPrice = params.minPrice != null && minPrice != null ? minPrice >= params.minPrice : true;
    const matchesMaxPrice = params.maxPrice != null && minPrice != null ? minPrice <= params.maxPrice : true;
    const matchesRating =
      params.minRating != null ? (business.averageRating ?? 0) >= params.minRating : true;

    return matchesQuery && matchesCategory && matchesMinPrice && matchesMaxPrice && matchesRating;
  });

  const sorted = [...filtered];
  switch (params.sortBy) {
    case "rating":
      sorted.sort((left, right) => (right.averageRating ?? 0) - (left.averageRating ?? 0));
      break;
    case "price":
      sorted.sort((left, right) => {
        const leftPrice = left.services.length > 0 ? Math.min(...left.services.map((service) => service.priceCents)) : Number.MAX_SAFE_INTEGER;
        const rightPrice = right.services.length > 0 ? Math.min(...right.services.map((service) => service.priceCents)) : Number.MAX_SAFE_INTEGER;
        return leftPrice - rightPrice;
      });
      break;
    default:
      sorted.sort((left, right) => (right.reviewCount ?? 0) - (left.reviewCount ?? 0));
      break;
  }

  const start = (page - 1) * limit;
  const end = start + limit;
  const slice = sorted.slice(start, end);

  return {
    businesses: slice,
    total: sorted.length,
    page,
    hasMore: end < sorted.length,
  } satisfies SearchResult;
}

export async function searchBusinesses(params: SearchParams): Promise<SearchResult> {
  const query = new URLSearchParams();

  if (params.query) query.set("query", params.query);
  if (params.category) query.set("category", params.category);
  if (params.city) query.set("city", params.city);
  if (params.lat != null) query.set("lat", String(params.lat));
  if (params.lng != null) query.set("lng", String(params.lng));
  if (params.radiusKm != null) query.set("radiusKm", String(params.radiusKm));
  if (params.minPrice != null) query.set("minPrice", String(params.minPrice));
  if (params.maxPrice != null) query.set("maxPrice", String(params.maxPrice));
  if (params.minRating != null) query.set("minRating", String(params.minRating));
  if (params.sortBy) query.set("sortBy", params.sortBy);
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 20));

  try {
    return await request<SearchResult>(`/businesses/search?${query.toString()}`, {
      signal: params.signal,
    });
  } catch {
    const fallback = await fetchDiscoveryBusinesses();
    return filterLocalBusinesses(fallback.businesses, params);
  }
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

export async function submitReview(input: {
  appointmentId: string;
  rating: number;
  body?: string;
  cancelToken: string;
}) {
  return request<{ ok: true }>("/reviews", {
    method: "POST",
    body: JSON.stringify({
      appointmentId: input.appointmentId,
      rating: input.rating,
      body: input.body,
      cancelToken: input.cancelToken,
    }),
  });
}

export async function cancelBooking(input: { cancelToken: string; reason?: string }) {
  return request<{ appointmentId: string; status: BookingStatus }>(
    `/api/public/actions/${input.cancelToken}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ reason: input.reason ?? "Cancelado pelo cliente no app." }),
    },
  );
}

export async function rescheduleBooking(input: {
  rescheduleToken: string;
  newStartsAt: string;
  customerTimezone: string;
}) {
  return request<{
    appointmentId: string;
    status: BookingStatus;
    cancelToken: string;
    rescheduleToken: string;
  }>(`/api/public/actions/${input.rescheduleToken}/reschedule`, {
    method: "POST",
    body: JSON.stringify({
      startsAt: input.newStartsAt,
      customerTimezone: input.customerTimezone,
    }),
  });
}

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
  return request<{ timezone: string; appointments: BusinessAgendaItem[] }>(
    `/api/mobile/business/agenda?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${input.token}`,
      },
    },
  );
}

export async function updateBusinessAppointmentStatus(input: {
  token: string;
  appointmentId: string;
  status: BusinessAppointmentStatus;
}) {
  return request<{ appointmentId: string; status: BusinessAppointmentStatus }>(
    `/api/mobile/business/appointments/${input.appointmentId}/status`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${input.token}`,
      },
      body: JSON.stringify({ status: input.status }),
    },
  );
}
