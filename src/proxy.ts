import { NextResponse, type NextRequest } from "next/server";

// Goedkope edge-gate: checkt alleen of er een better-auth sessie-cookie is.
// GEEN DB-lookup en GEEN self-fetch naar /api/auth/get-session — dat haalde een
// volledige sessie-roundtrip + functie-hop van ELKE /admin/* request af. De
// autoritatieve sessie- én role-check doet de admin-layout (requireAdminOrManager)
// en de page/route-guards in lib/auth/session.ts. Een uitgelogde gebruiker
// (geen cookie) krijgt hier een snelle redirect; een ingelogde niet-admin valt
// door en wordt door de layout naar home gestuurd.
export default function proxy(request: NextRequest) {
  const cookie = request.headers.get("cookie") ?? "";
  if (!cookie.includes("session_token")) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
