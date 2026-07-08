export type StaffRole = "super_admin" | "manager" | "staff";
export type StaffStatus = "pending" | "active" | "suspended";

export type StaffProfile = {
  id: string;
  full_name: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  created_at: string;
};

export type BookingStatus = "pending_payment" | "confirmed" | "cancelled" | "completed";
export type PaymentProvider = "mpesa" | "stripe" | "paypal";

export type Booking = {
  id: string;
  check_in: string;
  check_out: string;
  guests: number;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  nightly_rate: number;
  total_amount: number;
  currency: string;
  deposit_amount: number;
  status: BookingStatus;
  payment_method: PaymentProvider | null;
  notes: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  booking_id: string;
  provider: PaymentProvider;
  provider_ref: string | null;
  amount: number;
  currency: string;
  status: "initiated" | "succeeded" | "failed";
  raw_payload: Record<string, unknown> | null;
  created_at: string;
};

export type BlockedDate = {
  id: string;
  date: string;
  reason: string | null;
};

export type PropertyContent = {
  id: string;
  name: string;
  tagline: string | null;
  location: string | null;
  description: string | null;
  support_email: string | null;
  support_phone: string | null;
  base_price_per_night: number;
  currency: string;
  gallery: { url: string; alt: string }[];
  amenities: { icon: string; label: string }[];
  policies: string[];
  updated_by: string | null;
  updated_at: string;
};

export type HousekeepingStatus = "suggested" | "assigned" | "done";

export type HousekeepingTask = {
  id: string;
  booking_id: string | null;
  title: string;
  due_date: string | null;
  status: HousekeepingStatus;
  assigned_to: string | null;
  source: "auto" | "manual";
  created_at: string;
};

export type ReviewStatus = "pending" | "approved" | "hidden";

export type Review = {
  id: string;
  booking_id: string | null;
  guest_name: string;
  stay_label: string | null;
  quote: string;
  rating: number | null;
  status: ReviewStatus;
  reply: string | null;
  replied_by: string | null;
  created_at: string;
};

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
};

export type AuditLogEntry = {
  id: string;
  actor_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};
