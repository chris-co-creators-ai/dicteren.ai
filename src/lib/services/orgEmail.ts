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

// ───── 11. B2B payment-link (AM-initiated) ────────────────────────

export async function sendB2BPaymentLinkEmail(params: {
  to: string;
  contactName?: string;
  organizationName: string;
  seats: number;
  amountCents: number;
  planLabel: string;
  checkoutUrl: string;
  accountManagerName?: string;
  isResend?: boolean;
}): Promise<ServiceResult<SendResult>> {
  const subject = params.isResend
    ? `Herinnering: betaal-link voor ${params.organizationName}`
    : `Je betaal-link voor Dicteren.ai (${params.organizationName})`;
  return sendEmail({
    to: params.to,
    subject,
    html: b2bPaymentLinkHtml(params),
    text: b2bPaymentLinkText(params),
    tags: [{ name: "category", value: "b2b_payment_link" }],
    log: { category: "b2b_payment_link" },
  });
}

function b2bPaymentLinkHtml(params: {
  contactName?: string;
  organizationName: string;
  seats: number;
  amountCents: number;
  planLabel: string;
  checkoutUrl: string;
  accountManagerName?: string;
  isResend?: boolean;
}): string {
  const amount = new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(params.amountCents / 100);
  const intro = params.isResend
    ? `<p style="margin:0 0 14px 0;">Hoi${params.contactName ? " " + params.contactName : ""}, voor de zekerheid hier nog een keer je betaal-link voor <strong>${params.organizationName}</strong>.</p>`
    : `<p style="margin:0 0 14px 0;">Hoi${params.contactName ? " " + params.contactName : ""}, fijn dat je met Dicteren.ai aan de slag wilt.</p>
       <p style="margin:0 0 14px 0;">Voor <strong>${params.organizationName}</strong> staat je betaling klaar. Eén klik en je hebt direct toegang.</p>`;
  return shellHtml(
    "Je betaal-link staat klaar",
    `${intro}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;background:${BRAND.aquaWash};border-radius:12px;width:100%;">
      <tr>
        <td style="padding:18px 20px;">
          <div style="font-size:13px;color:${BRAND.textMuted};margin-bottom:6px;">Wat je krijgt</div>
          <div style="font-size:18px;font-weight:700;color:${BRAND.navy};margin-bottom:4px;">${params.planLabel}</div>
          <div style="font-size:15px;color:${BRAND.text};">${params.seats} ${params.seats === 1 ? "licentie" : "licenties"} voor je team</div>
          <div style="margin-top:14px;padding-top:14px;border-top:1px solid ${BRAND.aquaSoft};font-size:13px;color:${BRAND.textMuted};">Totaal te betalen (incl. btw)</div>
          <div style="font-size:22px;font-weight:700;color:${BRAND.navy};">${amount}</div>
        </td>
      </tr>
    </table>
    ${cta(params.checkoutUrl, "Betalen via Mollie")}
    <p style="margin:18px 0 14px 0;">Na betaling krijg je direct alle ${params.seats} licentiecodes in je inbox.${params.accountManagerName ? ` Vragen? Mail ${params.accountManagerName} of info@dicteren.ai.` : ""}</p>
    <p style="margin:0;font-size:13px;color:${BRAND.textMuted};">Liever per factuur betalen? Antwoord op deze mail.</p>`,
  );
}

function b2bPaymentLinkText(params: {
  contactName?: string;
  organizationName: string;
  seats: number;
  amountCents: number;
  planLabel: string;
  checkoutUrl: string;
  isResend?: boolean;
}): string {
  const amount = new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(params.amountCents / 100);
  return [
    params.isResend
      ? `Hoi${params.contactName ? " " + params.contactName : ""}, hier nog een keer de betaal-link voor ${params.organizationName}.`
      : `Hoi${params.contactName ? " " + params.contactName : ""}, fijn dat je met Dicteren.ai aan de slag wilt.`,
    "",
    `Voor ${params.organizationName} staat je betaling klaar:`,
    "",
    `${params.planLabel}`,
    `${params.seats} ${params.seats === 1 ? "licentie" : "licenties"} voor je team`,
    `Totaal te betalen (incl. btw): ${amount}`,
    "",
    "Betalen via Mollie:",
    params.checkoutUrl,
    "",
    `Na betaling krijg je direct alle ${params.seats} licentiecodes in je inbox.`,
    "Liever per factuur betalen? Antwoord op deze mail.",
    "",
    "Dicteren.ai",
  ].join("\n");
}

// ───── 13. Brand-identity-verzoek (AM → geïnteresseerde partner/reseller) ──

export async function sendBrandIdentityRequestEmail(params: {
  to: string;
  contactName?: string;
  organizationName: string;
  accountManagerName?: string;
  accountManagerEmail: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: `Wat we nodig hebben voor de partnership met ${params.organizationName}`,
    html: brandIdentityRequestHtml(params),
    text: brandIdentityRequestText(params),
    // Reageren gaat rechtstreeks naar de account manager, niet naar de
    // algemene inbox — de partner stuurt de bestanden terug in de reply.
    replyTo: params.accountManagerEmail,
    tags: [{ name: "category", value: "brand_identity_request" }],
    log: { category: "other" },
  });
}

function brandIdentityRequestHtml(params: {
  contactName?: string;
  organizationName: string;
  accountManagerName?: string;
}): string {
  const am = params.accountManagerName ?? "team Dicteren.ai";
  return shellHtml(
    "Even wat we van je nodig hebben",
    `<p style="margin:0 0 14px 0;">Hoi${params.contactName ? " " + params.contactName : ""},</p>
    <p style="margin:0 0 14px 0;">Leuk dat <strong>${params.organizationName}</strong> partner wil worden van Dicteren.ai. Om jullie eigen partnerpagina en materialen te bouwen, hebben we een paar dingen van je nodig.</p>
    <p style="margin:0 0 8px 0;font-weight:700;color:${BRAND.navy};">Stuur ons terug:</p>
    <ul style="margin:0 0 18px 18px;padding:0;color:${BRAND.text};">
      <li style="margin-bottom:6px;">Je logo (PNG of SVG)</li>
      <li style="margin-bottom:6px;">Je lettertype (naam of bestand)</li>
      <li style="margin-bottom:6px;">Je merkkleuren (hex-codes)</li>
      <li style="margin-bottom:6px;">Een paar foto's van je team</li>
      <li style="margin-bottom:6px;">Een korte omschrijving: wie je bent, wat je doet, en waarom je voor een partnership met Dicteren.ai koos</li>
    </ul>
    <p style="margin:0 0 14px 0;">Reageer gewoon op deze mail met de bestanden, dan gaan we ermee aan de slag.</p>
    <p style="margin:0;">Groet,<br>${am}</p>`,
  );
}

function brandIdentityRequestText(params: {
  contactName?: string;
  organizationName: string;
  accountManagerName?: string;
}): string {
  const am = params.accountManagerName ?? "team Dicteren.ai";
  return [
    `Hoi${params.contactName ? " " + params.contactName : ""},`,
    "",
    `Leuk dat ${params.organizationName} partner wil worden van Dicteren.ai. Om jullie eigen partnerpagina en materialen te bouwen, hebben we een paar dingen van je nodig.`,
    "",
    "Stuur ons terug:",
    "- Je logo (PNG of SVG)",
    "- Je lettertype (naam of bestand)",
    "- Je merkkleuren (hex-codes)",
    "- Een paar foto's van je team",
    "- Een korte omschrijving: wie je bent, wat je doet, en waarom je voor een partnership met Dicteren.ai koos",
    "",
    "Reageer gewoon op deze mail met de bestanden, dan gaan we ermee aan de slag.",
    "",
    "Groet,",
    am,
  ].join("\n");
}

// ───── 12. B2B welkomstmail met ALLE seat-codes (Route 2 + AM) ────

export async function sendB2BWelcomeWithCodesEmail(params: {
  to: string;
  ownerName?: string;
  organizationName: string;
  licenseCodes: string[];
  ownerCode: string;
  expiresAt: Date | null;
  organizationId: string;
  userId?: string;
}): Promise<ServiceResult<SendResult>> {
  return sendEmail({
    to: params.to,
    subject: `Welkom — alle ${params.licenseCodes.length} licentiecodes voor ${params.organizationName}`,
    html: b2bWelcomeWithCodesHtml(params),
    text: b2bWelcomeWithCodesText(params),
    tags: [{ name: "category", value: "b2b_welcome_with_codes" }],
    log: {
      category: "b2b_welcome_with_codes",
      userId: params.userId ?? null,
    },
  });
}

function b2bWelcomeWithCodesHtml(params: {
  ownerName?: string;
  organizationName: string;
  licenseCodes: string[];
  ownerCode: string;
  expiresAt: Date | null;
  organizationId: string;
}): string {
  const otherCodes = params.licenseCodes.filter((c) => c !== params.ownerCode);
  const codesBlock = otherCodes
    .map(
      (code, i) =>
        `<tr><td style="padding:6px 0;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:14px;color:${BRAND.navy};">${i + 1}. ${code}</td></tr>`,
    )
    .join("");
  const expires = params.expiresAt
    ? params.expiresAt.toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" })
    : "—";
  return shellHtml(
    `Welkom bij Dicteren.ai`,
    `<p style="margin:0 0 14px 0;">${greet(params.ownerName)}</p>
    <p style="margin:0 0 14px 0;">Top dat ${params.organizationName} met Dicteren.ai aan de slag gaat. Hieronder al jullie licentiecodes.</p>

    <p style="margin:22px 0 8px 0;font-weight:700;color:${BRAND.navy};">Jouw eigen code</p>
    ${codeBlock(params.ownerCode)}

    ${
      otherCodes.length > 0
        ? `<p style="margin:22px 0 8px 0;font-weight:700;color:${BRAND.navy};">${otherCodes.length} codes voor je collega's</p>
           <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.codeBg};border-radius:10px;width:100%;margin:8px 0 14px 0;">
             <tr><td style="padding:8px 18px;">${codesBlock}</td></tr>
           </table>
           <p style="margin:0 0 14px 0;font-size:14px;color:${BRAND.textMuted};">Twee opties: stuur de codes door, óf nodig je teamleden uit via je dashboard zodat ze automatisch een code krijgen.</p>`
        : ""
    }

    ${cta(`${emailBase()}/account/organization/${params.organizationId}`, "Open je dashboard")}

    <p style="margin:18px 0 10px 0;font-weight:700;color:${BRAND.navy};">Goed om te weten</p>
    <ul style="margin:0 0 0 18px;padding:0;color:${BRAND.text};">
      <li style="margin-bottom:6px;">Elke code werkt op maximaal 2 apparaten.</li>
      <li style="margin-bottom:6px;">Codes lopen tot ${expires}.</li>
      <li style="margin-bottom:6px;">Download de app via ${brandLink(`${emailBase()}/download`, "dicteren.ai/download")}.</li>
    </ul>`,
  );
}

function b2bWelcomeWithCodesText(params: {
  ownerName?: string;
  organizationName: string;
  licenseCodes: string[];
  ownerCode: string;
  expiresAt: Date | null;
  organizationId: string;
}): string {
  const otherCodes = params.licenseCodes.filter((c) => c !== params.ownerCode);
  const expires = params.expiresAt
    ? params.expiresAt.toLocaleDateString("nl-NL", { day: "2-digit", month: "long", year: "numeric" })
    : "—";
  return [
    greet(params.ownerName),
    "",
    `Top dat ${params.organizationName} met Dicteren.ai aan de slag gaat.`,
    "",
    "Jouw eigen code:",
    params.ownerCode,
    "",
    ...(otherCodes.length > 0
      ? [
          `Codes voor je collega's (${otherCodes.length}):`,
          ...otherCodes.map((c, i) => `${i + 1}. ${c}`),
          "",
          "Twee opties: stuur de codes door, of nodig je teamleden uit via je dashboard.",
          "",
        ]
      : []),
    "Open je dashboard:",
    `${emailBase()}/account/organization/${params.organizationId}`,
    "",
    "Download de app:",
    `${emailBase()}/download`,
    "",
    `Elke code werkt op maximaal 2 apparaten.`,
    `Codes lopen tot ${expires}.`,
    "",
    "Dicteren.ai",
  ].join("\n");
}
