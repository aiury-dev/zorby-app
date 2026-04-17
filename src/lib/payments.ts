import { API_URL } from "./api";

type PaymentStatus = "pending" | "approved" | "rejected" | "cancelled";

async function paymentRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? "Não foi possível concluir o pagamento.");
  }

  return data as T;
}

export async function createPaymentIntent(params: {
  appointmentId: string;
  priceCents: number;
  customerEmail: string;
  description: string;
  token: string;
}) {
  return paymentRequest<{
    preferenceId: string;
    initPoint: string;
    pixQrCode?: string;
    pixQrCodeBase64?: string;
  }>("/payments/create-intent", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify(params),
  });
}

export async function getPaymentStatus(appointmentId: string, token: string) {
  return paymentRequest<{
    status: PaymentStatus;
    paymentId?: string;
  }>(`/payments/${appointmentId}/status`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function processRefund(params: {
  appointmentId: string;
  reason: string;
  token: string;
}) {
  return paymentRequest<{ success: boolean }>(`/payments/${params.appointmentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.token}`,
    },
    body: JSON.stringify({ reason: params.reason }),
  });
}

export async function fetchCustomerPayments(token: string) {
  return paymentRequest<{
    payments: Array<{
      id: string;
      businessName: string;
      amountCents: number;
      status: "paid" | "refunded" | "pending";
      paidAt: string;
    }>;
  }>("/customer/payments", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
