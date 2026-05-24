// Dicteren.ai — License Service
// Shared mechanics: code generation, validation, hashing
// Domain logic (activation limits, expiry checks) stays in API route actions

import { createHash, randomBytes } from "crypto";
import {
  BETA_DEFAULTS,
  LICENSE_CODE_PREFIXES,
  TRIAL_DEFAULTS,
} from "@/lib/config/plans";
import type { LicenseType, ServiceResult } from "@/lib/types";

/**
 * Generate a license code in format: DIC-{TYPE}-{YEAR}-{XXXX}-{XXXX}
 */
export function generateLicenseCode(type: LicenseType): string {
  const prefix = LICENSE_CODE_PREFIXES[type];
  const year = new Date().getFullYear();
  const segment1 = randomBytes(2).toString("hex").toUpperCase().slice(0, 4);
  const segment2 = randomBytes(2).toString("hex").toUpperCase().slice(0, 4);
  return `${prefix}-${year}-${segment1}-${segment2}`;
}

/**
 * Generate multiple license codes at once
 */
export function generateLicenseCodes(type: LicenseType, count: number): string[] {
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(generateLicenseCode(type));
  }
  return Array.from(codes);
}

/**
 * Hash a license code for secure storage
 * Uses SHA-256 — the plain code is also stored for beta/admin support
 */
export function hashLicenseCode(code: string): string {
  const normalized = normalizeLicenseCode(code);
  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * Normalize a license code: uppercase, strip spaces/dashes for comparison
 */
export function normalizeLicenseCode(code: string): string {
  return code.toUpperCase().replace(/[\s-]/g, "");
}

/**
 * Validate license code format
 */
export function validateLicenseCodeFormat(code: string): ServiceResult<{ normalized: string }> {
  const normalized = normalizeLicenseCode(code);

  // Expected after normalization: DICBETA / DICPRO / DICTEAM / DICTRIAL / DICNPO + year + 8 chars.
  const pattern = /^DIC(BETA|TRIAL|PRO|TEAM|NPO)\d{4}[A-Z0-9]{8}$/;

  if (!pattern.test(normalized)) {
    return {
      success: false,
      error: "Ongeldige licentiecode. Controleer de code en probeer opnieuw.",
      code: "INVALID_FORMAT",
    };
  }

  return { success: true, data: { normalized } };
}

/** Generate a self-service trial code (stored with DB-type "beta"). */
export function generateTrialCode(): string {
  const prefix = LICENSE_CODE_PREFIXES.trial;
  const year = new Date().getFullYear();
  const segment1 = randomBytes(2).toString("hex").toUpperCase().slice(0, 4);
  const segment2 = randomBytes(2).toString("hex").toUpperCase().slice(0, 4);
  return `${prefix}-${year}-${segment1}-${segment2}`;
}

/** Generate a partner-org code voor maatschappelijke samenwerking. */
export function generatePartnerCode(): string {
  const prefix = LICENSE_CODE_PREFIXES.partner;
  const year = new Date().getFullYear();
  const segment1 = randomBytes(2).toString("hex").toUpperCase().slice(0, 4);
  const segment2 = randomBytes(2).toString("hex").toUpperCase().slice(0, 4);
  return `${prefix}-${year}-${segment1}-${segment2}`;
}

export function calculateBetaExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + BETA_DEFAULTS.validityDays);
  return expiry;
}

export function calculateTrialExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + TRIAL_DEFAULTS.validityDays);
  return expiry;
}

/**
 * Check if a license has expired
 */
export function isExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return false;
  return new Date() > expiresAt;
}
