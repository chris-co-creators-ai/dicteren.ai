"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "./client";

const NL = {
  SIGN_IN: "Inloggen",
  SIGN_UP: "Account aanmaken",
  FORGOT_PASSWORD: "Wachtwoord vergeten?",
  EMAIL: "E-mail",
  EMAIL_PLACEHOLDER: "naam@bedrijf.nl",
  PASSWORD: "Wachtwoord",
  PASSWORD_PLACEHOLDER: "Minimaal 8 tekens",
  CONFIRM_PASSWORD: "Herhaal wachtwoord",
  NAME: "Naam",
  NAME_PLACEHOLDER: "Voor- en achternaam",
  SIGN_IN_ACTION: "Inloggen",
  SIGN_UP_ACTION: "Account aanmaken",
  CONTINUE_WITH_EMAIL: "Doorgaan met e-mail",
  CONTINUE_WITH_PROVIDER: "Doorgaan met {{provider}}",
  DONT_HAVE_ACCOUNT: "Nog geen account?",
  ALREADY_HAVE_ACCOUNT: "Al een account?",
  RESET_PASSWORD: "Wachtwoord herstellen",
  SEND_RESET_LINK: "Verstuur herstel-link",
  RESET_LINK_SENT: "We hebben je een herstel-link gemaild.",
  BACK_TO_SIGN_IN: "Terug naar inloggen",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <NeonAuthUIProvider
      authClient={authClient}
      navigate={router.push}
      replace={router.replace}
      Link={Link}
      localization={NL}
      credentials={{ forgotPassword: true }}
    >
      {children}
    </NeonAuthUIProvider>
  );
}
