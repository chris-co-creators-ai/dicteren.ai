"use client";

// Deprecated — pre-better-auth wrapper around NeonAuthUIProvider.
// Niet meer nodig: Better Auth client heeft geen provider, useSession() en
// signIn/signUp/signOut werken stand-alone. Behouden als pass-through zodat
// oude imports geen build-breaks geven.

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
