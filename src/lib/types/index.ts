// Dicteren.ai — Shared Types

// ============================================================
// License
// ============================================================

// License-type matches the `licenses.type` Drizzle enum (`beta | consumer | team`).
// Note: a license is "team" when it's bought BY an organization. The buyer's
// customerType is "organization" — these are two related but distinct concepts.
export type LicenseType = "beta" | "consumer" | "team";
// Mirrors the `license_status` Drizzle pgEnum in db/schema.ts. Keep in sync.
export type LicenseStatus =
  | "trial"
  | "active"
  | "past_due"
  | "canceled"
  | "expired"
  | "refunded"
  | "revoked";
export type LicensePeriod = "monthly" | "quarterly" | "yearly" | "lifetime";

export interface License {
  id: string;
  licenseCode: string;
  licenseCodeHash: string;
  type: LicenseType;
  status: LicenseStatus;
  period: LicensePeriod | null;
  email: string | null;
  organizationId: string | null;
  planId: string | null;
  maxActivations: number;
  maxUsers: number;
  paymentRequired: boolean;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// License Activation
// ============================================================

export interface LicenseActivation {
  id: string;
  licenseId: string;
  deviceFingerprint: string;
  platform: string;
  appVersion: string;
  email: string | null;
  activatedAt: Date;
  lastSeenAt: Date;
  deactivatedAt: Date | null;
}

export interface ActivationRequest {
  licenseCode: string;
  email?: string;
  appVersion: string;
  platform: string;
  deviceFingerprint: string;
}

export interface ActivationResponse {
  success: boolean;
  error?: string;
  token?: string;
  license?: {
    status: LicenseStatus;
    type: LicenseType;
    expiresAt: string | null;
  };
  activation?: {
    deviceFingerprint: string;
    activatedAt: string;
  };
}

// ============================================================
// Orders & Payments
// ============================================================

export type OrderStatus = "pending" | "paid" | "failed" | "canceled" | "refunded";

export interface Order {
  id: string;
  userId: string | null;
  organizationId: string | null;
  planId: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  molliePaymentId: string | null;
  discountCodeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  orderId: string;
  molliePaymentId: string;
  amount: number;
  currency: string;
  status: string;
  method: string | null;
  paidAt: Date | null;
  createdAt: Date;
}

// ============================================================
// Plans
// ============================================================

export interface Plan {
  id: string;
  name: string;
  slug: string;
  type: "consumer" | "organization";
  period: LicensePeriod;
  priceEur: number;
  maxActivations: number;
  maxUsers: number;
  isActive: boolean;
}

// ============================================================
// Organizations
// ============================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  seatCount: number;
  billingEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  joinedAt: Date;
}

// ============================================================
// Users
// ============================================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Discount Codes
// ============================================================

export type DiscountType = "percentage" | "fixed" | "free_months";

export interface DiscountCode {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  appliesTo: "consumer" | "organization" | "all";
  maxRedemptions: number | null;
  redemptionCount: number;
  validFrom: Date;
  validUntil: Date | null;
  minimumSeats: number | null;
  affiliateId: string | null;
  status: "active" | "paused" | "expired";
}

// ============================================================
// Events & Audit
// ============================================================

export interface AuditEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// ============================================================
// Service Result Pattern
// ============================================================

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };
