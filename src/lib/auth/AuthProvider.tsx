"use client";

import { NeonAuthUIProvider } from "@neondatabase/auth-ui";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "./client";

// Volledige NL-localization voor @neondatabase/auth-ui.
// Keys MOETEN matchen met `authLocalization` in node_modules/@neondatabase/auth-ui/dist/chunk-*.mjs.
// Bij upgrade: verifieer of er nieuwe keys zijn bijgekomen.
const NL = {
  // Algemeen
  CANCEL: "Annuleren",
  CONTINUE: "Doorgaan",
  DONE: "Klaar",
  SAVE: "Opslaan",
  UPDATE: "Bijwerken",
  DELETE: "Verwijderen",
  GO_BACK: "Terug",
  COPIED_TO_CLIPBOARD: "Gekopieerd",
  COPY_TO_CLIPBOARD: "Kopieer",

  // Sign in
  SIGN_IN: "Inloggen",
  SIGN_IN_ACTION: "Inloggen",
  SIGN_IN_DESCRIPTION: "Vul je e-mailadres in om in te loggen.",
  SIGN_IN_USERNAME_DESCRIPTION:
    "Vul je gebruikersnaam of e-mailadres in om in te loggen.",
  SIGN_IN_USERNAME_PLACEHOLDER: "Gebruikersnaam of e-mailadres",
  SIGN_IN_WITH: "Inloggen met",

  // Sign up
  SIGN_UP: "Account aanmaken",
  SIGN_UP_ACTION: "Account aanmaken",
  SIGN_UP_DESCRIPTION: "Vul je gegevens in om een account aan te maken.",
  SIGN_UP_EMAIL:
    "Bekijk je e-mail voor de verificatielink.",

  // Sign out / switch
  SIGN_OUT: "Uitloggen",
  SWITCH_ACCOUNT: "Wissel account",

  // Account-links onder de form
  DONT_HAVE_AN_ACCOUNT: "Nog geen account?",
  ALREADY_HAVE_AN_ACCOUNT: "Al een account?",

  // Email
  EMAIL: "E-mailadres",
  EMAIL_PLACEHOLDER: "naam@bedrijf.nl",
  EMAIL_REQUIRED: "E-mailadres is verplicht",
  EMAIL_DESCRIPTION: "Vul het e-mailadres in dat je wil gebruiken.",
  EMAIL_INSTRUCTIONS: "Vul een geldig e-mailadres in.",
  EMAIL_IS_THE_SAME: "Dit is hetzelfde e-mailadres",
  EMAIL_VERIFY_CHANGE: "Bekijk je e-mail om de wijziging te bevestigen.",
  EMAIL_VERIFICATION: "Bekijk je e-mail voor de verificatielink.",

  // Naam
  NAME: "Naam",
  NAME_PLACEHOLDER: "Voor- en achternaam",
  NAME_DESCRIPTION: "Vul je volledige naam in, of een weergavenaam.",
  NAME_INSTRUCTIONS: "Maximaal 32 tekens.",

  // Username (voor het geval we het later aanzetten)
  USERNAME: "Gebruikersnaam",
  USERNAME_PLACEHOLDER: "Gebruikersnaam",
  USERNAME_DESCRIPTION: "Vul de gebruikersnaam in om in te loggen.",
  USERNAME_INSTRUCTIONS: "Maximaal 32 tekens.",

  // Wachtwoord
  PASSWORD: "Wachtwoord",
  PASSWORD_PLACEHOLDER: "Wachtwoord",
  PASSWORD_REQUIRED: "Wachtwoord is verplicht",
  PASSWORDS_DO_NOT_MATCH: "Wachtwoorden komen niet overeen",
  CONFIRM_PASSWORD: "Herhaal wachtwoord",
  CONFIRM_PASSWORD_PLACEHOLDER: "Herhaal wachtwoord",
  CONFIRM_PASSWORD_REQUIRED: "Wachtwoord-bevestiging is verplicht",
  CURRENT_PASSWORD: "Huidig wachtwoord",
  CURRENT_PASSWORD_PLACEHOLDER: "Huidig wachtwoord",
  NEW_PASSWORD: "Nieuw wachtwoord",
  NEW_PASSWORD_PLACEHOLDER: "Nieuw wachtwoord",
  NEW_PASSWORD_REQUIRED: "Nieuw wachtwoord is verplicht",

  // Forgot password
  FORGOT_PASSWORD: "Wachtwoord vergeten",
  FORGOT_PASSWORD_LINK: "Wachtwoord vergeten?",
  FORGOT_PASSWORD_ACTION: "Verstuur herstel-link",
  FORGOT_PASSWORD_DESCRIPTION:
    "Vul je e-mailadres in en we sturen je een herstel-link.",
  FORGOT_PASSWORD_EMAIL: "Bekijk je e-mail voor de wachtwoord-herstel-link.",

  // Reset password
  RESET_PASSWORD: "Wachtwoord herstellen",
  RESET_PASSWORD_ACTION: "Sla nieuw wachtwoord op",
  RESET_PASSWORD_DESCRIPTION: "Stel hieronder je nieuwe wachtwoord in.",
  RESET_PASSWORD_SUCCESS: "Wachtwoord opnieuw ingesteld.",

  // Change password (settings)
  CHANGE_PASSWORD: "Wachtwoord wijzigen",
  CHANGE_PASSWORD_DESCRIPTION:
    "Vul je huidige wachtwoord in en kies een nieuw wachtwoord.",
  CHANGE_PASSWORD_INSTRUCTIONS: "Gebruik minimaal 8 tekens.",
  CHANGE_PASSWORD_SUCCESS: "Je wachtwoord is gewijzigd.",

  // Set password (voor accounts zonder wachtwoord — bv OAuth-only)
  SET_PASSWORD: "Wachtwoord instellen",
  SET_PASSWORD_DESCRIPTION:
    "Klik op de knop hieronder om een e-mail te ontvangen om een wachtwoord in te stellen.",

  // Verify your email
  VERIFY_YOUR_EMAIL: "Bevestig je e-mailadres",
  VERIFY_YOUR_EMAIL_DESCRIPTION:
    "Bevestig je e-mailadres. Bekijk je inbox voor de verificatie-mail. Geen mail ontvangen? Klik op de knop hieronder om hem opnieuw te sturen.",
  RESEND_VERIFICATION_EMAIL: "Verzend verificatie-mail opnieuw",
  RESEND_CODE: "Verzend code opnieuw",

  // Email OTP / magic link
  EMAIL_OTP: "E-mailcode",
  EMAIL_OTP_SEND_ACTION: "Verzend code",
  EMAIL_OTP_VERIFY_ACTION: "Controleer code",
  EMAIL_OTP_DESCRIPTION: "Vul je e-mailadres in om een code te ontvangen.",
  EMAIL_OTP_VERIFICATION_SENT:
    "Bekijk je e-mail voor de verificatiecode.",
  MAGIC_LINK: "Magic link",
  MAGIC_LINK_ACTION: "Verstuur magic link",
  MAGIC_LINK_DESCRIPTION:
    "Vul je e-mailadres in om een magic link te ontvangen.",
  MAGIC_LINK_EMAIL: "Bekijk je e-mail voor de magic link.",
  SEND_VERIFICATION_CODE: "Verstuur verificatiecode",
  ONE_TIME_PASSWORD: "Eenmalig wachtwoord",
  OR_CONTINUE_WITH: "Of ga verder met",
  REMEMBER_ME: "Onthoud mij",
  TRUST_DEVICE: "Vertrouw dit apparaat",

  // Disabled credentials hint
  DISABLED_CREDENTIALS_DESCRIPTION: "Kies een provider om in te loggen.",

  // Errors / status
  IS_INVALID: "is ongeldig",
  IS_REQUIRED: "is verplicht",
  IS_THE_SAME: "is hetzelfde",
  REQUEST_FAILED: "Verzoek mislukt",
  UPDATED_SUCCESSFULLY: "succesvol bijgewerkt",
  SESSION_NOT_FRESH: "Je sessie is verlopen. Log opnieuw in.",

  // Account
  ACCOUNT: "Account",
  ACCOUNTS: "Accounts",
  ACCOUNTS_DESCRIPTION: "Schakel tussen je ingelogde accounts.",
  ACCOUNTS_INSTRUCTIONS: "Log in op een ander account.",
  ADD_ACCOUNT: "Account toevoegen",
  APP: "App",
  USER: "Gebruiker",
  PERSONAL_ACCOUNT: "Persoonlijk account",
  SETTINGS: "Instellingen",
  SECURITY: "Beveiliging",

  // Avatar / logo
  AVATAR: "Avatar",
  AVATAR_DESCRIPTION: "Klik op de avatar om een eigen foto te uploaden.",
  AVATAR_INSTRUCTIONS:
    "Een avatar is optioneel maar wordt sterk aanbevolen.",
  UPLOAD_AVATAR: "Avatar uploaden",
  DELETE_AVATAR: "Avatar verwijderen",
  LOGO: "Logo",
  LOGO_DESCRIPTION: "Klik op het logo om een eigen logo te uploaden.",
  LOGO_INSTRUCTIONS: "Een logo is optioneel maar wordt sterk aanbevolen.",
  UPLOAD_LOGO: "Logo uploaden",
  DELETE_LOGO: "Logo verwijderen",
  UPLOAD: "Uploaden",

  // Delete account
  DELETE_ACCOUNT: "Account verwijderen",
  DELETE_ACCOUNT_DESCRIPTION:
    "Verwijder je account permanent met al je gegevens. Dit kan niet ongedaan worden gemaakt.",
  DELETE_ACCOUNT_INSTRUCTIONS:
    "Bevestig dat je je account wil verwijderen. Dit kan niet ongedaan worden gemaakt.",
  DELETE_ACCOUNT_VERIFY:
    "Bekijk je e-mail om de verwijdering te bevestigen.",
  DELETE_ACCOUNT_SUCCESS: "Je account is verwijderd.",

  // Sessions
  SESSIONS: "Sessies",
  SESSIONS_DESCRIPTION:
    "Beheer je actieve sessies en trek toegang in.",
  CURRENT_SESSION: "Huidige sessie",
  REVOKE: "Intrekken",

  // Providers
  PROVIDERS: "Providers",
  PROVIDERS_DESCRIPTION:
    "Koppel je account aan een externe dienst.",
  UNLINK: "Ontkoppelen",
  CONTINUE_WITH_AUTHENTICATOR: "Doorgaan met Authenticator",

  // Passkeys
  PASSKEY: "Passkey",
  PASSKEYS: "Passkeys",
  ADD_PASSKEY: "Passkey toevoegen",
  PASSKEYS_DESCRIPTION: "Beheer je passkeys voor veilige toegang.",
  PASSKEYS_INSTRUCTIONS:
    "Log veilig in op je account zonder wachtwoord.",

  // Two-factor
  TWO_FACTOR: "Tweestapsverificatie",
  TWO_FACTOR_ACTION: "Controleer code",
  TWO_FACTOR_PROMPT: "Tweestapsverificatie",
  TWO_FACTOR_DESCRIPTION:
    "Vul je eenmalige wachtwoord in om door te gaan.",
  TWO_FACTOR_CARD_DESCRIPTION:
    "Voeg een extra beveiligingslaag toe aan je account.",
  TWO_FACTOR_ENABLE_INSTRUCTIONS:
    "Vul je wachtwoord in om tweestapsverificatie aan te zetten.",
  TWO_FACTOR_DISABLE_INSTRUCTIONS:
    "Vul je wachtwoord in om tweestapsverificatie uit te zetten.",
  TWO_FACTOR_ENABLED: "Tweestapsverificatie staat aan.",
  TWO_FACTOR_DISABLED: "Tweestapsverificatie staat uit.",
  TWO_FACTOR_TOTP_LABEL: "Scan de QR-code met je Authenticator.",
  ENABLE_TWO_FACTOR: "Tweestapsverificatie inschakelen",
  DISABLE_TWO_FACTOR: "Tweestapsverificatie uitschakelen",
  FORGOT_AUTHENTICATOR: "Authenticator vergeten?",

  // Backup codes
  BACKUP_CODE: "Back-upcode",
  BACKUP_CODES: "Back-upcodes",
  BACKUP_CODE_PLACEHOLDER: "Back-upcode",
  BACKUP_CODE_REQUIRED: "Back-upcode is verplicht",
  BACKUP_CODES_DESCRIPTION:
    "Bewaar deze back-upcodes op een veilige plek. Je gebruikt ze om in te loggen als je je tweestapsverificatie kwijt bent.",
  COPY_ALL_CODES: "Alle codes kopiëren",
  RECOVER_ACCOUNT: "Account herstellen",
  RECOVER_ACCOUNT_ACTION: "Herstel account",
  RECOVER_ACCOUNT_DESCRIPTION:
    "Vul een back-upcode in om in te loggen.",

  // Organizations
  ORGANIZATION: "Organisatie",
  ORGANIZATIONS: "Organisaties",
  ORGANIZATIONS_DESCRIPTION:
    "Beheer je organisaties en lidmaatschappen.",
  ORGANIZATIONS_INSTRUCTIONS:
    "Maak een organisatie aan om samen te werken.",
  CREATE_ORGANIZATION: "Organisatie aanmaken",
  CREATE_ORGANIZATION_SUCCESS: "Organisatie aangemaakt.",
  MANAGE_ORGANIZATION: "Organisatie beheren",
  LEAVE_ORGANIZATION: "Organisatie verlaten",
  LEAVE_ORGANIZATION_CONFIRM:
    "Weet je zeker dat je deze organisatie wil verlaten?",
  LEAVE_ORGANIZATION_SUCCESS: "Je hebt de organisatie verlaten.",
  ORGANIZATION_NAME: "Naam",
  ORGANIZATION_NAME_PLACEHOLDER: "Voorbeeld B.V.",
  ORGANIZATION_NAME_DESCRIPTION: "De zichtbare naam van je organisatie.",
  ORGANIZATION_NAME_INSTRUCTIONS: "Maximaal 32 tekens.",
  ORGANIZATION_SLUG: "URL-deel",
  ORGANIZATION_SLUG_PLACEHOLDER: "voorbeeld-bv",
  ORGANIZATION_SLUG_DESCRIPTION:
    "Het URL-deel van je organisatie.",
  ORGANIZATION_SLUG_INSTRUCTIONS: "Maximaal 48 tekens.",
  ROLE: "Rol",
  MEMBERS: "Leden",
  MEMBERS_DESCRIPTION:
    "Voeg leden toe of verwijder ze en beheer hun rol.",
  MEMBERS_INSTRUCTIONS: "Nodig nieuwe leden uit voor je organisatie.",
  INVITE_MEMBER: "Lid uitnodigen",
  INVITE_MEMBER_DESCRIPTION:
    "Stuur een uitnodiging om iemand aan je organisatie toe te voegen.",
  REMOVE_MEMBER: "Lid verwijderen",
  REMOVE_MEMBER_CONFIRM:
    "Weet je zeker dat je dit lid wil verwijderen?",
  REMOVE_MEMBER_SUCCESS: "Lid verwijderd.",

  // API keys
  API_KEY: "API-sleutel",
  API_KEYS: "API-sleutels",
  API_KEYS_DESCRIPTION: "Beheer je API-sleutels voor veilige toegang.",
  API_KEYS_INSTRUCTIONS:
    "Genereer API-sleutels om je account programmatisch te benaderen.",
  CREATE_API_KEY: "API-sleutel aanmaken",
  CREATE_API_KEY_DESCRIPTION:
    "Geef je API-sleutel een unieke naam.",
  API_KEY_NAME_PLACEHOLDER: "Nieuwe API-sleutel",
  API_KEY_CREATED: "API-sleutel aangemaakt",
  CREATE_API_KEY_SUCCESS:
    "Kopieer je API-sleutel en bewaar hem veilig. We tonen hem om veiligheidsredenen niet nogmaals.",
  DELETE_API_KEY: "API-sleutel verwijderen",
  DELETE_API_KEY_CONFIRM:
    "Weet je zeker dat je deze API-sleutel wil verwijderen?",
  NEVER_EXPIRES: "Verloopt nooit",
  EXPIRES: "Verloopt",
  NO_EXPIRATION: "Geen vervaldatum",

  // Footer / juridisch
  PRIVACY_POLICY: "Privacybeleid",
  TERMS_OF_SERVICE: "Voorwaarden",
  PROTECTED_BY_RECAPTCHA: "Deze site is beveiligd door reCAPTCHA.",
  BY_CONTINUING_YOU_AGREE: "Door door te gaan ga je akkoord met de",
  OPTIONAL_BRACKETS: "(Optioneel)",
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
