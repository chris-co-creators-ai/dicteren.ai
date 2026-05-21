import { NextResponse, type NextRequest } from "next/server";

type SessionShape = {
  user?: { role?: string };
} | null;

async function getSession(request: NextRequest): Promise<SessionShape> {
  const cookie = request.headers.get("cookie") ?? "";
  if (!cookie) return null;
  try {
    const res = await fetch(new URL("/api/auth/get-session", request.url), {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as SessionShape;
  } catch {
    return null;
  }
}

export default async function proxy(request: NextRequest) {
  const session = await getSession(request);

  if (!session?.user) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  if (session.user.role !== "admin") {
    const url = new URL("/", request.url);
    url.searchParams.set("error", "admin_only");
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
