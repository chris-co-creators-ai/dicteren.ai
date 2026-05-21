// Dicteren.ai — License Status Action
// Check license status and refresh token

import { NextResponse } from "next/server";
import { verifyLicenseToken } from "@/lib/services";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Token ontbreekt" },
      { status: 401 },
    );
  }

  // Verify token (service: reusable mechanics)
  const result = verifyLicenseToken(token);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 401 },
    );
  }

  // TODO: Check current license status in database
  // Domain logic: is it still active? Has it been revoked? Expired?

  return NextResponse.json({
    success: true,
    license: {
      type: result.data.type,
      status: result.data.status,
      expiresAt: result.data.expiresAt,
    },
  });
}
