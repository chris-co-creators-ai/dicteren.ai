// Dicteren.ai — License Token Service
// Shared mechanics: sign and verify license tokens for desktop app
// The desktop app stores this token locally to prove activation

import { createHmac } from "crypto";
import type { LicenseStatus, LicenseType, ServiceResult } from "@/lib/types";

interface TokenPayload {
  licenseId: string;
  licenseCode: string;
  type: LicenseType;
  status: LicenseStatus;
  expiresAt: string | null;
  deviceFingerprint: string;
  issuedAt: string;
}

/**
 * Sign a license token for the desktop app
 * Uses HMAC-SHA256 with LICENSE_TOKEN_SECRET
 */
export function signLicenseToken(payload: TokenPayload): ServiceResult<string> {
  const secret = process.env.LICENSE_TOKEN_SECRET;
  if (!secret) {
    return { success: false, error: "Token signing not configured", code: "NO_SECRET" };
  }

  const data = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(data).digest("hex");
  const token = Buffer.from(`${data}.${signature}`).toString("base64url");

  return { success: true, data: token };
}

/**
 * Verify a license token from the desktop app
 */
export function verifyLicenseToken(token: string): ServiceResult<TokenPayload> {
  const secret = process.env.LICENSE_TOKEN_SECRET;
  if (!secret) {
    return { success: false, error: "Token verification not configured", code: "NO_SECRET" };
  }

  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) {
      return { success: false, error: "Ongeldig token formaat", code: "INVALID_TOKEN" };
    }

    const data = decoded.slice(0, lastDot);
    const signature = decoded.slice(lastDot + 1);

    const expectedSignature = createHmac("sha256", secret).update(data).digest("hex");
    if (signature !== expectedSignature) {
      return { success: false, error: "Token verificatie mislukt", code: "INVALID_SIGNATURE" };
    }

    const payload = JSON.parse(data) as TokenPayload;
    return { success: true, data: payload };
  } catch {
    return { success: false, error: "Token kan niet worden gelezen", code: "PARSE_ERROR" };
  }
}
