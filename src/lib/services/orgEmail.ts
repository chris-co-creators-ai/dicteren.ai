// Dicteren.ai — Organization email-templates
//
// Zelfde shellHtml + BRAND-tokens als services/email.ts. Aparte file om die
// niet te laten ontploffen (was al 1.2k regels).
//
// 10 nieuwe templates voor de zakelijke seat-flow:
//   1. welcomeMember         — bevestiging na accept, met de code voorgevuld
//   2. ownerMemberJoined     — naar owner als iemand accepteert
//   3. memberRemoved         — naar ex-member als owner seat intrekt
//   4. ownerMemberLeft       — naar owner als member self-removed
//   5. inviteReminder        — 24u nudge naar uitgenodigde
//   6. seatsExpanded         — naar owner na seat-upgrade
//   7. seatsReduced          — naar owner na seat-downgrade
//   8. tierChanged           — naar owner bij staffel-overgang
//   9. deviceRevoked         — naar member als owner/admin device kicks
//  10. subscriptionCanceled  — naar owner + members bij volledige opzegging
//
// Plus: refactor van organizationInvite-mail in email.ts om de code mee
// te sturen (zit nog in email.ts, dit bestand exporteert NIET die).

import "server-only";
import { sendEmail } from "./email";
import { emailBase } from "@/lib/url";
import type { ServiceResult } from "@/lib/types";

const BRAND = {
  navy: "#042660",
  navyLink: "#0b3478",
  orange: "#FF8441",
  text: "#1a1f33",
  textMuted: "#5a6478",
  textSoft: "#8d97a8",
  border: "#e5e7ec",
  borderSoft: "#eef0f4",
  bg: "#f7f7f4",
  white: "#ffffff",
  codeBg: "#f4f6fb",
  aquaWash: "#e8f8f9",
  aquaSoft: "#c4eef0",
} as const;

const EMAIL_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

function logoUrl(): string {
  return `${emailBase()}/email/logo.png`;
}

function shellHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:${EMAIL_FONT};color:${BRAND.text};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:40px 16px 24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${BRAND.white};border-radius:20px;overflow:hidden;box-shadow:0 6px 24px rgba(4,38,96,0.07);">
          <tr>
            <td style="background:${BRAND.aquaWash};padding:36px 40px 28px 40px;text-align:center;">
              <a href="${emailBase()}" style="text-decoration:none;">
                <img src="${logoUrl()}" alt="Dicteren.ai" width="180" style="display:block;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 8px 40px;">
              <h1 style="margin:0 0 8px 0;font-size:26px;line-height:1.2;font-weight:700;color:${BRAND.navy};letter-spacing:-0.015em;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 32px 40px;">
              <div style="font-size:16px;line-height:1.65;color:${BRAND.text};">
                ${body}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 40px 28px 40px;border-top:1px solid ${BRAND.borderSoft};background:${BRAND.white};">
              <p style="margin:0 0 8px 0;font-size:14px;color:${BRAND.textMuted};">
                Vragen of feedback? Mail <a href="mailto:info@dicteren.ai" style="color:${BRAND.navyLink};text-decoration:underline;">info@dicteren.ai</a>.
              </p>
              <p style="margin:0;font-size:12px;color:${BRAND.textSoft};">
                Dicteren.ai, lokaal dicteren in het Nederlands. <a href="${emailBase()}" style="color:${BRAND.textSoft};text-decoration:underline;">dicteren.ai</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function cta(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
    <tr>
      <td style="background:${BRAND.orange};border-radius:12px;">
        <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:${BRAND.white};text-decoration:none;letter-spacing:0.005em;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function brandLink(href: string, label: string): string {
  return `<a href="${href}" style="color:${BRAND.navyLink};text-decoration:underline;">${label}</a>`;
}

function codeBlock(code: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:22px 0;">
    <tr>
      <td style="background:${BRAND.codeBg};border:1px solid ${BRAND.border};border-radius:14px;padding:24px;text-align:center;">
        <div style="font-family:'SF Mono','JetBrains Mono',Menlo,Consolas,monospace;font-size:22px;font-weight:700;letter-spacing:0.06em;color:${BRAND.navy};">${code}</div>
      </td>
    </tr>
  </table>`;
}

function greet(name?: string): string {
  return name ? `Hallo ${name},` : "Hallo,";
}

function formatDateNL(d: Date): string {
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatAmount(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

type SendResult = { id: string };

// ───── 1. Welcome (na accept invite) ──────────────────────────────

export async function sendOrgMemberWelcomeEmail(params: {
  to: string;
  name?: string;
  organizationName: string;
  licenseCode: string;
  userId?: string;
  licenseId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: `Welkom bij ${params.organizationName} — je teamlicentie staat klaar`,
    html: orgMemberWelcomeHtml(params),
    text: orgMemberWelcomeText(params),
    tags: [{ name: "category", value: "org_member_welcome" }],
    log: {
      category: "org_member_welcome",
      userId: params.userId ?? null,
      licenseId: params.licenseId ?? null,
    },
  });
}

function orgMemberWelcomeHtml(params: {
  name?: string;
  organizationName: string;
  licenseCode: string;
}): string {
  return shellHtml(
    `Welkom bij ${params.organizationName}`,
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
    <p style="margin:0 0 14px 0;">Je hoort er nu bij. Je teamlicentie:</p>
    ${codeBlock(params.licenseCode)}
    ${cta(`${emailBase()}/download?utm_source=org_welcome`, "Download de app")}
    <p style="margin:0 0 10px 0;font-weight:700;color:${BRAND.navy};">Zo activeer je:</p>
    <ol style="margin:0;padding:0 0 0 20px;color:${BRAND.text};">
      <li style="margin-bottom:6px;">Download via ${brandLink(`${emailBase()}/download`, "dicteren.ai/download")}.</li>
      <li style="margin-bottom:6px;">Open de app. Het activatiescherm verschijnt meteen.</li>
      <li>Plak je code. Klaar.</li>
    </ol>
    <p style="margin:18px 0 0 0;font-size:14px;color:${BRAND.textMuted};">Je code werkt op maximaal 2 apparaten. Verlies je 'm? Bekijk je code altijd terug op ${brandLink(`${emailBase()}/account/licenses`, "je account")}.</p>`,
  );
}

function orgMemberWelcomeText(params: {
  name?: string;
  organizationName: string;
  licenseCode: string;
}): string {
  return [
    greet(params.name),
    "",
    `Je hoort er nu bij ${params.organizationName}. Je teamlicentie:`,
    "",
    params.licenseCode,
    "",
    "Download de app:",
    `${emailBase()}/download`,
    "",
    "Zo activeer je:",
    "1. Open de app na de installatie.",
    "2. Plak je code in het activatiescherm.",
    "3. Klaar.",
    "",
    "Je code werkt op maximaal 2 apparaten.",
    "Code kwijt? Kijk op je account:",
    `${emailBase()}/account/licenses`,
    "",
    "Dicteren.ai",
  ].join("\n");
}

// ───── 2. Owner notification: member accepted ────────────────────

export async function sendOrgOwnerMemberJoinedEmail(params: {
  to: string;
  ownerName?: string;
  organizationName: string;
  memberEmail: string;
  memberName?: string | null;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: `${params.memberName ?? params.memberEmail} is lid van ${params.organizationName}`,
    html: orgOwnerMemberJoinedHtml(params),
    text: orgOwnerMemberJoinedText(params),
    tags: [{ name: "category", value: "org_owner_joined" }],
    log: { category: "org_owner_joined", userId: params.userId ?? null },
  });
}

function orgOwnerMemberJoinedHtml(params: {
  ownerName?: string;
  organizationName: string;
  memberEmail: string;
  memberName?: string | null;
}): string {
  const member = params.memberName ?? params.memberEmail;
  return shellHtml(
    `${member} is binnen`,
    `<p style="margin:0 0 14px 0;">${greet(params.ownerName)}</p>
    <p style="margin:0 0 14px 0;"><strong>${member}</strong> heeft de uitnodiging voor <strong>${params.organizationName}</strong> aangenomen. De seat is nu actief.</p>
    ${cta(`${emailBase()}/account/organization`, "Bekijk team-dashboard")}
    <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">Daar zie je wie online is en hoeveel apparaten in gebruik zijn.</p>`,
  );
}

function orgOwnerMemberJoinedText(params: {
  ownerName?: string;
  organizationName: string;
  memberEmail: string;
  memberName?: string | null;
}): string {
  const member = params.memberName ?? params.memberEmail;
  return [
    greet(params.ownerName),
    "",
    `${member} heeft de uitnodiging voor ${params.organizationName} aangenomen.`,
    "De seat is nu actief.",
    "",
    `Team-dashboard: ${emailBase()}/account/organization`,
    "",
    "Dicteren.ai",
  ].join("\n");
}

// ───── 3. Member removed (door owner) ────────────────────────────

export async function sendOrgMemberRemovedEmail(params: {
  to: string;
  name?: string;
  organizationName: string;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: `Je toegang tot ${params.organizationName} is ingetrokken`,
    html: orgMemberRemovedHtml(params),
    text: orgMemberRemovedText(params),
    tags: [{ name: "category", value: "org_member_removed" }],
    log: { category: "org_member_removed", userId: params.userId ?? null },
  });
}

function orgMemberRemovedHtml(params: {
  name?: string;
  organizationName: string;
}): string {
  return shellHtml(
    "Je seat is ingetrokken",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
    <p style="margin:0 0 14px 0;">De beheerder van <strong>${params.organizationName}</strong> heeft je seat ingetrokken. Je apparaten zijn gedeactiveerd; je teamlicentie werkt niet meer.</p>
    <p style="margin:0 0 14px 0;">Je instellingen en geschiedenis blijven bewaard. Wil je weer dicteren?</p>
    ${cta(`${emailBase()}/prijzen`, "Bekijk persoonlijke licenties")}
    <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">Denk je dat dit een vergissing is? Neem contact op met de beheerder van ${params.organizationName}.</p>`,
  );
}

function orgMemberRemovedText(params: {
  name?: string;
  organizationName: string;
}): string {
  return [
    greet(params.name),
    "",
    `De beheerder van ${params.organizationName} heeft je seat ingetrokken.`,
    "Je apparaten zijn gedeactiveerd; je teamlicentie werkt niet meer.",
    "",
    "Je instellingen en geschiedenis blijven bewaard.",
    "Wil je weer dicteren? Bekijk de prijzen:",
    `${emailBase()}/prijzen`,
    "",
    "Denk je dat dit een vergissing is? Neem contact op met de beheerder.",
    "",
    "Dicteren.ai",
  ].join("\n");
}

// ───── 4. Owner notification: member left ────────────────────────

export async function sendOrgOwnerMemberLeftEmail(params: {
  to: string;
  ownerName?: string;
  organizationName: string;
  memberEmail: string;
  memberName?: string | null;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: `${params.memberName ?? params.memberEmail} heeft ${params.organizationName} verlaten`,
    html: orgOwnerMemberLeftHtml(params),
    text: orgOwnerMemberLeftText(params),
    tags: [{ name: "category", value: "org_owner_left" }],
    log: { category: "org_owner_left", userId: params.userId ?? null },
  });
}

function orgOwnerMemberLeftHtml(params: {
  ownerName?: string;
  organizationName: string;
  memberEmail: string;
  memberName?: string | null;
}): string {
  const member = params.memberName ?? params.memberEmail;
  return shellHtml(
    "Een seat is weer beschikbaar",
    `<p style="margin:0 0 14px 0;">${greet(params.ownerName)}</p>
    <p style="margin:0 0 14px 0;"><strong>${member}</strong> heeft <strong>${params.organizationName}</strong> verlaten. De seat staat weer in je pool — klaar voor een nieuwe uitnodiging.</p>
    ${cta(`${emailBase()}/account/organization`, "Wijs de seat opnieuw toe")}
    <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">Het abonnementsbedrag blijft hetzelfde. Wil je seats afschalen? Dat kan ook in het dashboard.</p>`,
  );
}

function orgOwnerMemberLeftText(params: {
  ownerName?: string;
  organizationName: string;
  memberEmail: string;
  memberName?: string | null;
}): string {
  const member = params.memberName ?? params.memberEmail;
  return [
    greet(params.ownerName),
    "",
    `${member} heeft ${params.organizationName} verlaten.`,
    "De seat staat weer in je pool — klaar voor een nieuwe uitnodiging.",
    "",
    `Team-dashboard: ${emailBase()}/account/organization`,
    "",
    "Het abonnementsbedrag blijft hetzelfde.",
    "Wil je seats afschalen? Dat kan ook in het dashboard.",
    "",
    "Dicteren.ai",
  ].join("\n");
}

// ───── 5. Invite reminder (24u na verzenden) ─────────────────────

export async function sendOrgInviteReminderEmail(params: {
  to: string;
  organizationName: string;
  inviterName: string;
  inviteUrl: string;
  licenseCode: string;
  expiresAt: Date;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: `Herinnering: je staat op de gastenlijst van ${params.organizationName}`,
    html: orgInviteReminderHtml(params),
    text: orgInviteReminderText(params),
    tags: [{ name: "category", value: "org_invite_reminder" }],
    log: { category: "org_invite_reminder" },
  });
}

function orgInviteReminderHtml(params: {
  organizationName: string;
  inviterName: string;
  inviteUrl: string;
  licenseCode: string;
  expiresAt: Date;
}): string {
  return shellHtml(
    `Je uitnodiging staat nog open`,
    `<p style="margin:0 0 14px 0;">Hallo,</p>
    <p style="margin:0 0 14px 0;"><strong>${params.inviterName}</strong> nodigde je gisteren uit voor <strong>${params.organizationName}</strong>. Je teamlicentie staat klaar:</p>
    ${codeBlock(params.licenseCode)}
    ${cta(params.inviteUrl, "Uitnodiging accepteren")}
    <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">De link werkt tot ${formatDateNL(params.expiresAt)}. Geen interesse? Negeren mag — je krijgt geen nieuwe herinnering.</p>`,
  );
}

function orgInviteReminderText(params: {
  organizationName: string;
  inviterName: string;
  inviteUrl: string;
  licenseCode: string;
  expiresAt: Date;
}): string {
  return [
    "Hallo,",
    "",
    `${params.inviterName} nodigde je gisteren uit voor ${params.organizationName}.`,
    "Je teamlicentie:",
    params.licenseCode,
    "",
    `Accepteer hier: ${params.inviteUrl}`,
    "",
    `De link werkt tot ${formatDateNL(params.expiresAt)}.`,
    "Geen interesse? Negeren mag — je krijgt geen nieuwe herinnering.",
    "",
    "Dicteren.ai",
  ].join("\n");
}

// ───── 6. Seats expanded ──────────────────────────────────────────

export async function sendOrgSeatsExpandedEmail(params: {
  to: string;
  ownerName?: string;
  organizationName: string;
  delta: number;
  newTotal: number;
  newAnnualCents: number;
  currency: string;
  prorataChargeCents: number;
  newCodes: string[];
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: `${params.delta} extra ${params.delta === 1 ? "seat" : "seats"} actief voor ${params.organizationName}`,
    html: orgSeatsExpandedHtml(params),
    text: orgSeatsExpandedText(params),
    tags: [{ name: "category", value: "org_seats_expanded" }],
    log: { category: "org_seats_expanded", userId: params.userId ?? null },
  });
}

function codeListBlock(codes: string[]): string {
  if (codes.length === 0) return "";
  const rows = codes
    .map(
      (c) =>
        `<div style="font-family:'SF Mono','JetBrains Mono',Menlo,Consolas,monospace;font-size:16px;font-weight:700;letter-spacing:0.04em;color:${BRAND.navy};padding:8px 0;border-top:1px solid ${BRAND.borderSoft};">${c}</div>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:18px 0;">
    <tr>
      <td style="background:${BRAND.codeBg};border:1px solid ${BRAND.border};border-radius:14px;padding:18px 22px;">
        ${rows}
      </td>
    </tr>
  </table>`;
}

function orgSeatsExpandedHtml(params: {
  ownerName?: string;
  organizationName: string;
  delta: number;
  newTotal: number;
  newAnnualCents: number;
  currency: string;
  prorataChargeCents: number;
  newCodes: string[];
}): string {
  return shellHtml(
    `${params.delta} ${params.delta === 1 ? "seat" : "seats"} erbij`,
    `<p style="margin:0 0 14px 0;">${greet(params.ownerName)}</p>
    <p style="margin:0 0 14px 0;">Je hebt <strong>${params.delta} ${params.delta === 1 ? "seat" : "seats"}</strong> toegevoegd aan <strong>${params.organizationName}</strong>. Totaal nu <strong>${params.newTotal} seats</strong>.</p>
    ${params.prorataChargeCents > 0 ? `<p style="margin:0 0 14px 0;">Pro-rata bedrag voor de lopende periode: <strong>${formatAmount(params.prorataChargeCents, params.currency)}</strong>. Vanaf de volgende incasso: <strong>${formatAmount(params.newAnnualCents, params.currency)} per jaar</strong>.</p>` : `<p style="margin:0 0 14px 0;">Je nieuwe abonnement gaat in bij de volgende incasso: <strong>${formatAmount(params.newAnnualCents, params.currency)} per jaar</strong>.</p>`}
    <p style="margin:0 0 8px 0;font-weight:700;color:${BRAND.navy};">Nieuwe codes (nog niet toegewezen):</p>
    ${codeListBlock(params.newCodes)}
    ${cta(`${emailBase()}/account/organization`, "Wijs seats toe in dashboard")}
    <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">Per code: maximaal 2 apparaten per gebruiker.</p>`,
  );
}

function orgSeatsExpandedText(params: {
  ownerName?: string;
  organizationName: string;
  delta: number;
  newTotal: number;
  newAnnualCents: number;
  currency: string;
  prorataChargeCents: number;
  newCodes: string[];
}): string {
  return [
    greet(params.ownerName),
    "",
    `Je hebt ${params.delta} ${params.delta === 1 ? "seat" : "seats"} toegevoegd aan ${params.organizationName}.`,
    `Totaal nu ${params.newTotal} seats.`,
    "",
    params.prorataChargeCents > 0
      ? `Pro-rata bedrag voor de lopende periode: ${formatAmount(params.prorataChargeCents, params.currency)}.`
      : `Geen extra charge nu — credit verrekend met volgende incasso.`,
    `Vanaf de volgende incasso: ${formatAmount(params.newAnnualCents, params.currency)} per jaar.`,
    "",
    "Nieuwe codes (nog niet toegewezen):",
    ...params.newCodes,
    "",
    `Wijs ze toe in het dashboard: ${emailBase()}/account/organization`,
    "",
    "Per code: maximaal 2 apparaten per gebruiker.",
    "",
    "Dicteren.ai",
  ].join("\n");
}

// ───── 7. Seats reduced ──────────────────────────────────────────

export async function sendOrgSeatsReducedEmail(params: {
  to: string;
  ownerName?: string;
  organizationName: string;
  delta: number;
  newTotal: number;
  newAnnualCents: number;
  currency: string;
  nextBillingAt: Date | null;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: `${params.delta} ${params.delta === 1 ? "seat" : "seats"} verwijderd uit ${params.organizationName}`,
    html: orgSeatsReducedHtml(params),
    text: orgSeatsReducedText(params),
    tags: [{ name: "category", value: "org_seats_reduced" }],
    log: { category: "org_seats_reduced", userId: params.userId ?? null },
  });
}

function orgSeatsReducedHtml(params: {
  ownerName?: string;
  organizationName: string;
  delta: number;
  newTotal: number;
  newAnnualCents: number;
  currency: string;
  nextBillingAt: Date | null;
}): string {
  return shellHtml(
    "Seats afgeschaald",
    `<p style="margin:0 0 14px 0;">${greet(params.ownerName)}</p>
    <p style="margin:0 0 14px 0;">Je hebt <strong>${params.delta} ${params.delta === 1 ? "seat" : "seats"}</strong> verwijderd uit <strong>${params.organizationName}</strong>. Totaal nu <strong>${params.newTotal} seats</strong>.</p>
    <p style="margin:0 0 14px 0;">Je nieuwe bedrag vanaf ${params.nextBillingAt ? formatDateNL(params.nextBillingAt) : "de volgende incasso"}: <strong>${formatAmount(params.newAnnualCents, params.currency)} per jaar</strong>.</p>
    <p style="margin:0 0 14px 0;">Geen restitutie nu — je houdt waarde van de al-betaalde periode.</p>
    ${cta(`${emailBase()}/account/organization`, "Bekijk team-dashboard")}`,
  );
}

function orgSeatsReducedText(params: {
  ownerName?: string;
  organizationName: string;
  delta: number;
  newTotal: number;
  newAnnualCents: number;
  currency: string;
  nextBillingAt: Date | null;
}): string {
  return [
    greet(params.ownerName),
    "",
    `Je hebt ${params.delta} ${params.delta === 1 ? "seat" : "seats"} verwijderd uit ${params.organizationName}.`,
    `Totaal nu ${params.newTotal} seats.`,
    "",
    `Nieuw bedrag vanaf ${params.nextBillingAt ? formatDateNL(params.nextBillingAt) : "de volgende incasso"}: ${formatAmount(params.newAnnualCents, params.currency)} per jaar.`,
    "",
    "Geen restitutie nu — je houdt waarde van de al-betaalde periode.",
    "",
    `Team-dashboard: ${emailBase()}/account/organization`,
    "",
    "Dicteren.ai",
  ].join("\n");
}

// ───── 8. Tier changed ──────────────────────────────────────────

export async function sendOrgTierChangedEmail(params: {
  to: string;
  ownerName?: string;
  organizationName: string;
  newTierLabel: string;
  newDiscountPct: number;
  newPerSeatCents: number;
  direction: "up" | "down";
  currency: string;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject:
      params.direction === "up"
        ? `Je krijgt nu ${params.newDiscountPct}% volumekorting`
        : `Je staffel-korting is aangepast`,
    html: orgTierChangedHtml(params),
    text: orgTierChangedText(params),
    tags: [{ name: "category", value: "org_tier_changed" }],
    log: { category: "org_tier_changed", userId: params.userId ?? null },
  });
}

function orgTierChangedHtml(params: {
  ownerName?: string;
  organizationName: string;
  newTierLabel: string;
  newDiscountPct: number;
  newPerSeatCents: number;
  direction: "up" | "down";
  currency: string;
}): string {
  return shellHtml(
    params.direction === "up" ? "Volumekorting actief" : "Tariefwijziging",
    `<p style="margin:0 0 14px 0;">${greet(params.ownerName)}</p>
    ${
      params.direction === "up"
        ? `<p style="margin:0 0 14px 0;">Door je seat-uitbreiding val je nu in de <strong>${params.newTierLabel}</strong>. Vanaf nu krijgt elke seat van <strong>${params.organizationName}</strong> <strong>${params.newDiscountPct}% volumekorting</strong>: ${formatAmount(params.newPerSeatCents, params.currency)} per gebruiker per jaar.</p>`
        : `<p style="margin:0 0 14px 0;">Door je seat-verlaging val je nu in de <strong>${params.newTierLabel}</strong>. Het tarief per seat is nu ${formatAmount(params.newPerSeatCents, params.currency)} per jaar.</p>`
    }
    ${cta(`${emailBase()}/account/organization`, "Bekijk team-dashboard")}
    <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">De factuur volgt apart per mail bij de volgende incasso.</p>`,
  );
}

function orgTierChangedText(params: {
  ownerName?: string;
  organizationName: string;
  newTierLabel: string;
  newDiscountPct: number;
  newPerSeatCents: number;
  direction: "up" | "down";
  currency: string;
}): string {
  return [
    greet(params.ownerName),
    "",
    params.direction === "up"
      ? `Door je seat-uitbreiding val je nu in de ${params.newTierLabel}.`
      : `Door je seat-verlaging val je nu in de ${params.newTierLabel}.`,
    "",
    params.direction === "up"
      ? `Vanaf nu krijgt elke seat ${params.newDiscountPct}% volumekorting:`
      : "Nieuw tarief per seat:",
    `${formatAmount(params.newPerSeatCents, params.currency)} per gebruiker per jaar.`,
    "",
    `Team-dashboard: ${emailBase()}/account/organization`,
    "",
    "De factuur volgt apart per mail bij de volgende incasso.",
    "",
    "Dicteren.ai",
  ].join("\n");
}

// ───── 9. Device revoked door owner/admin ────────────────────────

export async function sendOrgDeviceRevokedEmail(params: {
  to: string;
  name?: string;
  organizationName: string;
  platform: string | null;
  revokedByName: string;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: `Een apparaat is uitgelogd door ${params.organizationName}`,
    html: orgDeviceRevokedHtml(params),
    text: orgDeviceRevokedText(params),
    tags: [{ name: "category", value: "org_device_revoked" }],
    log: { category: "org_device_revoked", userId: params.userId ?? null },
  });
}

function orgDeviceRevokedHtml(params: {
  name?: string;
  organizationName: string;
  platform: string | null;
  revokedByName: string;
}): string {
  const platformLabel = params.platform ?? "een apparaat";
  return shellHtml(
    "Apparaat uitgelogd",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
    <p style="margin:0 0 14px 0;"><strong>${params.revokedByName}</strong> heeft je toegang op <strong>${platformLabel}</strong> ingetrokken voor <strong>${params.organizationName}</strong>.</p>
    <p style="margin:0 0 14px 0;">Je seat zelf blijft actief. Je kunt je code opnieuw activeren op een ander apparaat.</p>
    ${cta(`${emailBase()}/account/licenses`, "Bekijk je code")}
    <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">Denk je dat dit een vergissing is? Neem contact op met de beheerder van ${params.organizationName}.</p>`,
  );
}

function orgDeviceRevokedText(params: {
  name?: string;
  organizationName: string;
  platform: string | null;
  revokedByName: string;
}): string {
  const platformLabel = params.platform ?? "een apparaat";
  return [
    greet(params.name),
    "",
    `${params.revokedByName} heeft je toegang op ${platformLabel} ingetrokken voor ${params.organizationName}.`,
    "",
    "Je seat zelf blijft actief. Je kunt je code opnieuw activeren op een ander apparaat.",
    "",
    `Bekijk je code: ${emailBase()}/account/licenses`,
    "",
    "Denk je dat dit een vergissing is? Neem contact op met de beheerder.",
    "",
    "Dicteren.ai",
  ].join("\n");
}

// ───── 10. Subscription fully canceled ───────────────────────────

export async function sendOrgSubscriptionCanceledEmail(params: {
  to: string;
  name?: string;
  organizationName: string;
  accessUntil: Date | null;
  recipientType: "owner" | "member";
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: `Abonnement ${params.organizationName} opgezegd`,
    html: orgSubscriptionCanceledHtml(params),
    text: orgSubscriptionCanceledText(params),
    tags: [{ name: "category", value: "org_subscription_canceled" }],
    log: {
      category: "org_subscription_canceled",
      userId: params.userId ?? null,
    },
  });
}

function orgSubscriptionCanceledHtml(params: {
  name?: string;
  organizationName: string;
  accessUntil: Date | null;
  recipientType: "owner" | "member";
}): string {
  const tail = params.accessUntil
    ? `Iedereen houdt toegang tot <strong>${formatDateNL(params.accessUntil)}</strong>. Daarna stopt de app met werken.`
    : "Toegang stopt meteen.";
  return shellHtml(
    "Abonnement opgezegd",
    `<p style="margin:0 0 14px 0;">${greet(params.name)}</p>
    <p style="margin:0 0 14px 0;">${params.recipientType === "owner" ? `Je zegging voor` : `Het abonnement voor`} <strong>${params.organizationName}</strong> is verwerkt. ${tail}</p>
    <p style="margin:0 0 18px 0;">Je instellingen en geschiedenis blijven bewaard.</p>
    ${cta(`${emailBase()}/prijzen`, "Bekijk de prijzen")}
    <p style="margin:0;font-size:14px;color:${BRAND.textMuted};">Per ongeluk opgezegd? Antwoord op deze mail, dan zetten we het terug.</p>`,
  );
}

function orgSubscriptionCanceledText(params: {
  name?: string;
  organizationName: string;
  accessUntil: Date | null;
  recipientType: "owner" | "member";
}): string {
  return [
    greet(params.name),
    "",
    params.recipientType === "owner"
      ? `Je opzegging voor ${params.organizationName} is verwerkt.`
      : `Het abonnement voor ${params.organizationName} is opgezegd.`,
    "",
    params.accessUntil
      ? `Iedereen houdt toegang tot ${formatDateNL(params.accessUntil)}. Daarna stopt de app met werken.`
      : "Toegang stopt meteen.",
    "",
    "Je instellingen en geschiedenis blijven bewaard.",
    "Bekijk de prijzen:",
    `${emailBase()}/prijzen`,
    "",
    "Per ongeluk opgezegd? Antwoord op deze mail, dan zetten we het terug.",
    "",
    "Dicteren.ai",
  ].join("\n");
}
