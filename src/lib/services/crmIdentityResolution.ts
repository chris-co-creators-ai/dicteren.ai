import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { authUsers, crmContacts, crmOrganizations, crmOrgTasks } from "@/lib/db/schema";
import { normalizeEmail } from "./emailNormalize";

// Inbound/outbound-split (PRD crm-inbound-outbound-split), Fase 2.
// Koppelt een nieuwe self-signup aan een bestaande CRM-prospect/org (één identiteit)
// en seint de AM. De match-laag is read-only en los testbaar; de write-wrapper doet
// de koppeling + de taak. Niet-blokkerend bedoeld: roep aan in de signup-after-hook
// met try/catch — een match-fout mag nooit een signup blokkeren.

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.nl", "outlook.com",
  "live.nl", "live.com", "yahoo.com", "icloud.com", "me.com", "ziggo.nl", "kpnmail.nl",
]);

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = /^https?:\/\//.test(url) ? url : "http://" + url;
    return new URL(u).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export type SignupMatch = {
  email: string;
  domain: string;
  isFreeDomain: boolean;
  contactId: string | null;
  contactAlreadyLinked: boolean;
  orgId: string | null;
  ownerUserId: string | null;
};

/** READ-ONLY: vind de CRM-match voor een signup-e-mail. Geen schrijf, los testbaar. */
export async function findSignupMatch(email: string): Promise<SignupMatch | null> {
  const lower = (email ?? "").trim().toLowerCase();
  if (!lower.includes("@")) return null;
  const norm = normalizeEmail(lower);
  const domain = lower.split("@")[1] ?? "";
  if (!domain) return null;

  const m: SignupMatch = {
    email: lower, domain, isFreeDomain: FREE_EMAIL_DOMAINS.has(domain),
    contactId: null, contactAlreadyLinked: false, orgId: null, ownerUserId: null,
  };

  // 1) Contact: exacte lower-e-mail (zelfde persoon). crm_contacts.email is niet
  //    genormaliseerd opgeslagen, dus normaliseer de kandidaten op hetzelfde domein als fallback.
  type ContactHit = { id: string; orgId: string | null; authUserId: string | null };
  const exact = await db
    .select({ id: crmContacts.id, orgId: crmContacts.crmOrganizationId, authUserId: crmContacts.authUserId })
    .from(crmContacts)
    .where(sql`lower(${crmContacts.email}) = ${lower}`)
    .limit(1);
  let hit: ContactHit | null = exact[0] ?? null;
  if (!hit) {
    const sameDomain = await db
      .select({ id: crmContacts.id, email: crmContacts.email, orgId: crmContacts.crmOrganizationId, authUserId: crmContacts.authUserId })
      .from(crmContacts)
      .where(sql`lower(${crmContacts.email}) LIKE ${"%@" + domain}`)
      .limit(50);
    const found = sameDomain.find((c) => c.email && normalizeEmail(c.email) === norm);
    hit = found ? { id: found.id, orgId: found.orgId, authUserId: found.authUserId } : null;
  }
  if (hit) {
    m.contactId = hit.id;
    m.contactAlreadyLinked = !!hit.authUserId;
    if (hit.orgId) m.orgId = hit.orgId;
  }

  // 2) Org: via de matched contact z'n org, anders via e-maildomein ↔ website
  //    (gratis providers overslaan — dat is geen bedrijf).
  let org: { id: string; ownerId: string | null } | null = null;
  if (m.orgId) {
    const [o] = await db
      .select({ id: crmOrganizations.id, ownerId: crmOrganizations.accountOwnerId })
      .from(crmOrganizations).where(eq(crmOrganizations.id, m.orgId)).limit(1);
    org = o ?? null;
  }
  if (!org && !m.isFreeDomain) {
    const orgs = await db
      .select({ id: crmOrganizations.id, website: crmOrganizations.website, ownerId: crmOrganizations.accountOwnerId })
      .from(crmOrganizations).where(sql`${crmOrganizations.website} IS NOT NULL`);
    const found = orgs.find((o) => hostOf(o.website) === domain);
    if (found) org = { id: found.id, ownerId: found.ownerId };
  }
  if (org) {
    m.orgId = org.id;
    m.ownerUserId = org.ownerId;
  }
  return m;
}

/** WRITE: koppel de signup aan de CRM-prospect (idempotent) + maak één AM-taak op de org. */
export async function resolveSignupToCrm(args: {
  userId: string;
  email: string;
  accountType?: string | null;
}): Promise<SignupMatch & { taskCreated: boolean }> {
  const match = await findSignupMatch(args.email);
  if (!match) {
    return {
      email: (args.email ?? "").toLowerCase(), domain: "", isFreeDomain: false,
      contactId: null, contactAlreadyLinked: false, orgId: null, ownerUserId: null, taskCreated: false,
    };
  }

  // Koppel de contact aan de login (alleen als nog niet gelinkt — idempotent).
  if (match.contactId && !match.contactAlreadyLinked) {
    await db.update(crmContacts)
      .set({ authUserId: args.userId, updatedAt: new Date() })
      .where(and(eq(crmContacts.id, match.contactId), isNull(crmContacts.authUserId)));
  }

  // AM-signaal: taak op de org, gerouteerd naar de owner. Alleen bij een org.
  let taskCreated = false;
  if (match.orgId) {
    const label = args.accountType === "business" ? "zakelijk" : "persoonlijk";
    const known = match.contactId ? " — bekende prospect" : "";
    await db.insert(crmOrgTasks).values({
      crmOrganizationId: match.orgId,
      title: `Nieuw account (${label}) op @${match.domain}${known}. Bekijk in /admin/users.`,
      kind: "signup_match",
      createdByUserId: match.ownerUserId ?? null,
    });
    taskCreated = true;
  }
  return { ...match, taskCreated };
}

// ───── Account-signalen (Fase 5) ─────────────────────────────
// READ-ONLY. Welke login-accounts delen dit e-mailadres / e-maildomein, en onder
// welk segment? Voedt het "Account-signalen"-blok in de /crm persoon- + org-panels:
// een prospect die zelf een account/trial startte = heet; meerdere 'persoonlijke'
// accounts op één zakelijk domein = team-/upsell-haak (Twenty's domein↔bedrijf-truc).

export type AccountSignalItem = {
  userId: string;
  name: string;
  email: string;
  accountType: string | null;
  createdAt: string;
};

export type AccountSignals = {
  domain: string | null;
  isFreeDomain: boolean;
  self: AccountSignalItem | null;
  domainAccounts: {
    total: number;
    personal: number;
    business: number;
    items: AccountSignalItem[];
  };
};

function toItem(r: {
  userId: string;
  name: string;
  email: string;
  accountType: string | null;
  createdAt: Date | string;
}): AccountSignalItem {
  return {
    userId: r.userId,
    name: r.name,
    email: r.email,
    accountType: r.accountType ?? null,
    createdAt:
      r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  };
}

export async function getAccountSignals(args: {
  email?: string | null;
  domain?: string | null;
}): Promise<AccountSignals> {
  const email = (args.email ?? "").trim().toLowerCase();
  const domainRaw = (args.domain ?? "").trim().toLowerCase();
  const fromEmail = email.includes("@") ? email.split("@")[1] ?? "" : "";
  // domain mag een bare host ("acme.nl") of een volledige website-URL
  // ("https://www.acme.nl/contact") zijn — hostOf normaliseert beide.
  const domain = (hostOf(domainRaw) || fromEmail).replace(/^www\./, "");
  const isFreeDomain = domain ? FREE_EMAIL_DOMAINS.has(domain) : false;

  const result: AccountSignals = {
    domain: domain || null,
    isFreeDomain,
    self: null,
    domainAccounts: { total: 0, personal: 0, business: 0, items: [] },
  };

  const cols = {
    userId: authUsers.id,
    name: authUsers.name,
    email: authUsers.email,
    accountType: authUsers.accountType,
    createdAt: authUsers.createdAt,
  };

  // 1) Zelf-account: exact dezelfde mens (lower-e-mail).
  if (email.includes("@")) {
    const [u] = await db
      .select(cols)
      .from(authUsers)
      .where(sql`lower(${authUsers.email}) = ${email}`)
      .limit(1);
    if (u) result.self = toItem(u);
  }

  // 2) Domein-accounts: alleen voor een zakelijk domein (gratis providers overslaan).
  if (domain && !isFreeDomain) {
    const rows = await db
      .select(cols)
      .from(authUsers)
      .where(sql`lower(${authUsers.email}) LIKE ${"%@" + domain}`)
      .orderBy(sql`${authUsers.createdAt} DESC`)
      .limit(100);
    const items = rows.map(toItem);
    result.domainAccounts = {
      total: items.length,
      personal: items.filter((i) => (i.accountType ?? "personal") === "personal")
        .length,
      business: items.filter((i) => i.accountType === "business").length,
      items,
    };
  }

  return result;
}
