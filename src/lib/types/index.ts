// Dicteren.ai — Shared Types
//
// Holds:
//  - String-union mirrors of pgEnums (LicenseType, LicenseStatus, LicensePeriod).
//    These mirror `db/schema.ts` enums and are the typed values that cross
//    the API boundary (web ↔ Tauri).
//  - API request/response contracts (ActivationRequest/Response).
//  - ServiceResult discriminated union used by services that wrap external
//    SDKs (Mollie, Resend) to surface success/error without throwing.
//
// Entity row types (License, Order, Plan, ...) komen uit Drizzle:
//   import type { License } from "@/lib/db/schema";
// Dat is de canonical source — niet hier handmatig gespiegeld.

// ============================================================
// License — value types (string-unions mirroring pgEnums)
// ============================================================

export type LicenseType = "beta" | "consumer" | "team" | "partner";
export type LicenseStatus =
  | "trial"
  | "active"
  | "past_due"
  | "canceled"
  | "expired"
  | "refunded"
  | "revoked"
  | "unassigned"
  | "pending_payment";
export type LicensePeriod = "monthly" | "quarterly" | "yearly" | "lifetime";

// ============================================================
// API contract — POST /api/license/activate
// ============================================================

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
// Service Result Pattern
// ============================================================

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };
