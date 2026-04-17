export type DiscoveryBusiness = {
  id: string;
  name: string;
  slug: string;
  category: "HEALTH" | "BEAUTY" | "EDUCATION" | "CONSULTING" | "SPORTS" | "OTHER";
  description: string | null;
  addressLine1: string | null;
  city: string | null;
  neighborhood: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  brandPrimaryColor: string | null;
  phone: string | null;
  reviewCount: number;
  averageRating: number | null;
  professionalsCount: number;
  addressLabel: string;
  services: Array<{
    id: string;
    name: string;
    priceCents: number;
    durationMinutes: number;
  }>;
};

export type PublicBusiness = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  phone: string | null;
  city: string | null;
  neighborhood: string | null;
  state: string | null;
  addressLine1: string | null;
  coverImageUrl: string | null;
  logoUrl: string | null;
  brandPrimaryColor: string | null;
  brandSecondaryColor: string | null;
  cancellationPolicyText: string | null;
  requiresUpfrontPayment?: boolean;
  allowPayOnSite?: boolean;
  upfrontPaymentPercentage?: number | null;
  timezone: string;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    durationMinutes: number;
    priceCents: number;
    colorHex: string | null;
    variants: Array<{
      id: string;
      name: string;
      durationMinutes: number;
      priceCents: number;
    }>;
  }>;
  professionals: Array<{
    id: string;
    displayName: string;
    roleLabel: string | null;
    photoUrl: string | null;
    services: Array<{ serviceId: string }>;
    availabilities: Array<{
      id: string;
      dayOfWeek: number;
      startMinutes: number;
      endMinutes: number;
      slotIntervalMinutes: number;
    }>;
  }>;
  reviews: Array<{
    id: string;
    rating: number;
    body: string | null;
    customerNameSnapshot: string;
  }>;
};

export type AvailabilitySlot = {
  startsAt: string;
  endsAt: string;
  label: string;
};

export type BookingStatus = "CONFIRMED" | "PENDING" | "CANCELLED";
export type BusinessAppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "CANCELED"
  | "NO_SHOW"
  | "COMPLETED";

export type SavedBooking = {
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
  paymentId?: string;
  paymentStatus?: "pending" | "approved" | "rejected" | "cancelled" | "refunded";
  status?: BookingStatus;
  customerRating?: number;
  customerReviewBody?: string;
  reviewedAt?: string;
  cancelToken: string;
  rescheduleToken: string;
};

export type CustomerPayment = {
  id: string;
  businessName: string;
  amountCents: number;
  status: "paid" | "refunded" | "pending";
  paidAt: string;
};

export type SavedProfile = {
  name: string;
  email: string;
  phone: string;
};

export type CustomerSession = {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
  };
};

export type AppPreferences = {
  notificationsEnabled: boolean;
};

export type BusinessMobileSession = {
  token: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  business: {
    id: string;
    name: string;
    slug: string;
    onboardingStep: string;
    status: string;
  };
};

export type BusinessDashboard = {
  business: {
    id: string;
    name: string;
    slug: string;
    onboardingStep: string;
    publicBookingEnabled: boolean;
    publicBookingPaused: boolean;
    logoUrl: string | null;
    coverImageUrl: string | null;
    brandPrimaryColor: string | null;
    city: string | null;
    state: string | null;
  } | null;
  summary: {
    appointmentsToday: number;
    confirmedToday: number;
    revenueMonthCents: number;
  };
  nextAppointments: Array<{
    id: string;
    customerNameSnapshot: string;
    serviceNameSnapshot: string;
    startsAtUtc: string;
    status: string;
    professional: {
      displayName: string;
    };
  }>;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
};

export type BusinessAgendaItem = {
  id: string;
  serviceId?: string;
  customerNameSnapshot: string;
  customerPhoneSnapshot: string;
  serviceNameSnapshot: string;
  startsAtUtc: string;
  endsAtUtc: string;
  status: BusinessAppointmentStatus;
  priceCents: number;
  professional: {
    id?: string;
    displayName: string;
    roleLabel: string | null;
    photoUrl?: string | null;
  };
};
