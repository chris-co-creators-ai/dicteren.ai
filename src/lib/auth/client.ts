"use client";

import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  inferAdditionalFields,
  organizationClient,
} from "better-auth/client/plugins";
// Type-only import (geërased in de bundle, geen server-code in de client): laat de
// client de user.additionalFields uit de server-config type-veilig kennen, zodat
// signUp.email de naam-split + business-velden accepteert.
import type { auth } from "./server";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  plugins: [
    inferAdditionalFields<typeof auth>(),
    adminClient(),
    organizationClient(),
  ],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  requestPasswordReset,
  resetPassword,
  changePassword,
  changeEmail,
  sendVerificationEmail,
  organization,
  admin: adminApi,
} = authClient;
