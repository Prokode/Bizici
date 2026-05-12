/**
 * Typed wrapper around /api/me/appointments. Mirrors lib/api/conversations.ts
 * in shape so screens can use the same useQuery / useMutation patterns.
 */
import { customFetch } from "@workspace/api-client-react";

export type AppointmentStatus =
  | "proposed"
  | "confirmed"
  | "declined"
  | "completed"
  | "cancelled";

export type AppointmentReviewDirection =
  | "client_to_provider"
  | "provider_to_client";

export type Appointment = {
  id: string;
  shopId: string;
  customerUserId: string;
  sellerUserId: string;
  serviceId: string | null;
  conversationId: string;
  scheduledAt: string;
  durationMinutes: number | null;
  notes: string | null;
  status: AppointmentStatus;
  serviceLocation: "at_shop" | "at_customer";
  customerAddress: string | null;
  acceptedAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: "customer" | "seller" | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentReview = {
  id: string;
  appointmentId: string;
  fromUserId: string;
  toUserId: string;
  shopId: string;
  direction: AppointmentReviewDirection;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentDetail = {
  appointment: Appointment;
  role: "customer" | "seller";
  shop: { id: string; name: string } | null;
  customer: {
    id: string;
    name: string | null;
    trustRating: number;
    trustReviewsCount: number;
  } | null;
};

export async function listAppointments(opts?: {
  status?: AppointmentStatus;
  conversationId?: string;
}): Promise<Appointment[]> {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.conversationId) params.set("conversationId", opts.conversationId);
  const qs = params.toString();
  const data = await customFetch<{ appointments: Appointment[] }>(
    `/api/me/appointments${qs ? `?${qs}` : ""}`,
    { method: "GET" },
  );
  return data.appointments;
}

export async function getAppointment(id: string): Promise<AppointmentDetail> {
  return customFetch<AppointmentDetail>(
    `/api/me/appointments/${encodeURIComponent(id)}`,
    { method: "GET" },
  );
}

export async function createAppointment(input: {
  shopId: string;
  serviceId?: string | null;
  scheduledAt: string;
  durationMinutes?: number | null;
  notes?: string | null;
  serviceLocation?: "at_shop" | "at_customer";
  customerAddress?: string | null;
}): Promise<Appointment> {
  return customFetch<Appointment>("/api/me/appointments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

export async function acceptAppointment(id: string): Promise<Appointment> {
  return customFetch<Appointment>(
    `/api/me/appointments/${encodeURIComponent(id)}/accept`,
    { method: "POST" },
  );
}

export async function declineAppointment(
  id: string,
  reason?: string | null,
): Promise<Appointment> {
  return customFetch<Appointment>(
    `/api/me/appointments/${encodeURIComponent(id)}/decline`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: reason ?? null }),
    },
  );
}

export async function completeAppointment(id: string): Promise<Appointment> {
  return customFetch<Appointment>(
    `/api/me/appointments/${encodeURIComponent(id)}/complete`,
    { method: "POST" },
  );
}

export async function cancelAppointment(
  id: string,
  reason?: string | null,
): Promise<Appointment> {
  return customFetch<Appointment>(
    `/api/me/appointments/${encodeURIComponent(id)}/cancel`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: reason ?? null }),
    },
  );
}

export async function listAppointmentReviews(
  id: string,
): Promise<AppointmentReview[]> {
  const data = await customFetch<{ reviews: AppointmentReview[] }>(
    `/api/me/appointments/${encodeURIComponent(id)}/reviews`,
    { method: "GET" },
  );
  return data.reviews;
}

export async function submitAppointmentReview(
  id: string,
  input: { rating: number; comment?: string | null },
): Promise<AppointmentReview> {
  return customFetch<AppointmentReview>(
    `/api/me/appointments/${encodeURIComponent(id)}/reviews`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rating: input.rating,
        comment: input.comment ?? null,
      }),
    },
  );
}
