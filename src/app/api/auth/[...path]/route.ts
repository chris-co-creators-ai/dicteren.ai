import { auth } from "@/lib/auth/server";
import { toNextJsHandler } from "better-auth/next-js";
import { enforceRateLimit } from "@/lib/services";

const handlers = toNextJsHandler(auth.handler);

export const GET = handlers.GET;

// DB-based rate-limit op de gevoelige auth-paden. Better Auth's eigen limiter
// is in-memory en lekt op Vercel multi-instance; dit remt brute-force op login
// en reset-spam af per IP, ongeacht welke server-instance het verzoek krijgt.
export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  const bucket: "auth:sign-in" | "auth:reset" | null = path.includes(
    "/sign-in",
  )
    ? "auth:sign-in"
    : path.includes("/forget-password") || path.includes("/reset-password")
      ? "auth:reset"
      : null;
  if (bucket) {
    const blocked = await enforceRateLimit(request, bucket, {
      message: "Te veel pogingen. Probeer het over enkele minuten opnieuw.",
    });
    if (blocked) return blocked;
  }
  return handlers.POST(request);
}
