"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "./client";

export function RedirectAfterAuth({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data, isPending } = authClient.useSession();
  useEffect(() => {
    if (!isPending && data?.user) router.replace(to);
  }, [isPending, data, router, to]);
  return <>{children}</>;
}
