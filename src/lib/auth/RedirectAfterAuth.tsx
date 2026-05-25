"use client";

// Deprecated — pre-better-auth client-side redirect helper. AuthForms doet
// nu de redirect zelf via router.replace na signIn/signUp success. Behouden
// als pass-through zodat oude imports geen build-breaks geven.

export function RedirectAfterAuth({
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
