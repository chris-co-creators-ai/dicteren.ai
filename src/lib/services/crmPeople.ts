// Dicteren.ai — Loader voor één gepagineerde CRM-personen-pagina.
//
// Combineert de server-side gefilterde query (crmList) met de rijke hydratie:
// klanten krijgen hun commerce-velden via listCustomerFunnel gescoped op de
// page-ids (niet alle users), prospects komen volledig uit de query-rij. Geeft
// de rij-vorm terug die crm-view's tabel verwacht. Wordt hergebruikt door
// page.tsx (eerste pagina, server) en /api/admin/crm/people (volgende pagina's).

import "server-only";
import {
  listCrmPeoplePage,
  countCrmPeople,
  type CrmPeopleFilters,
  type CrmPeopleCursor,
} from "./crmList";
import { listCustomerFunnel, classifyStage } from "./identity";
import { dispositionByOrgIds, type OrgDispositionState } from "./crmDeals";
import {
  attributesByUser,
  defaultStageFor,
  defaultTemperatureFor,
} from "./customerCrm";
import {
  listLeadLists,
  membershipsByUser,
  membershipsByContact,
} from "./leadList";
import {
  enrichmentByContact,
  type ProspectEnrichment,
} from "./crmContactEnrichment";
import { funnelColumnsByContactIds } from "./partnerFunnel";
import type { FunnelColumn } from "./partnerFunnelShared";

export type CrmPersonRow = {
  id: string;
  name: string;
  email: string;
  /** Alleen gevuld voor prospects (crm_contacts.phone); klanten hebben geen telefoonveld. */
  phone: string | null;
  /** Contactpersoon-velden (prospects; migratie 0038). */
  firstName: string | null;
  lastName: string | null;
  mobilePhone: string | null;
  roleAtCompany: string | null;
  /** Org-bedrijfsvelden in de Personen-grid (prospects met org). */
  orgKvk: string | null;
  orgVatNumber: string | null;
  orgBrancheVereniging: string | null;
  orgAantalVestigingen: number | null;
  orgHoofdkantoor: string | null;
  orgSpecialisatie: string | null;
  emailVerified: boolean;
  role: string | null;
  createdAt: string;
  trialStartedAt: string | null;
  trialExpiresAt: string | null;
  trialStatus: string | null;
  paidLicenseCount: number;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsBounced: number;
  stage: "lead" | "trial_active" | "trial_expired" | "converted";
  segment: "consumer" | "team" | "partner" | "trial" | "lead";
  licenseSource: string | null;
  discountType: string | null;
  discountValue: number | null;
  mollieCustomerId: string | null;
  subscriptionStatus: string | null;
  nextBillingAt: string | null;
  accountOwner: {
    affiliateId: string;
    code: string;
    name: string;
    convertedAt: string | null;
  } | null;
  discountCodeUsed: { id: string; code: string; affiliateId: string | null } | null;
  crmStage:
    | "lead"
    | "prospect"
    | "mql"
    | "sql"
    | "customer"
    | "lost"
    | "churned"
    | "reseller";
  /** Funnel-spoor (migratie 0052): bepaalt het bord en de Partner-tab. */
  prospectType: "eindklant" | "reseller";
  /** Afgeleide partner-funnel-kolom (exact `deriveFunnelColumn` uit
   *  partnerFunnelShared — zelfde 7-stage-waarheid als de cockpit). Alleen bij
   *  reseller-prospects zinvol. */
  funnelColumn: FunnelColumn;
  crmTemperature: "cold" | "lukewarm" | "warm" | "hot";
  assignedToUserId: string | null;
  notes: string | null;
  customFields: Record<string, string | number | null> | null;
  listIds: string[];
  kind: "customer" | "prospect";
  /** True zodra er een auth.user achter dit contact zit (inbound-signup gematcht). */
  hasAccount: boolean;
  company: string | null;
  organizationId: string | null;
  /** Clay-aligned GTM-verrijking; alleen gevuld voor prospects. */
  enrichment: ProspectEnrichment | null;
  /** Call-center: laatste beluitkomst + volgende actie + vlaggen (org-niveau). */
  lastDisposition: string | null;
  lastDispositionAt: string | null;
  nextAction: string | null;
  nextActionAt: string | null;
  doNotCall: boolean;
  wrongNumber: boolean;
};

export async function loadCrmPeoplePage(args: {
  sessionUserId: string;
  filters?: CrmPeopleFilters;
  cursor?: CrmPeopleCursor | null;
  limit?: number;
}): Promise<{
  rows: CrmPersonRow[];
  nextCursor: CrmPeopleCursor | null;
  total: number;
}> {
  const filters = args.filters ?? {};
  const [{ rows: page, nextCursor }, total] = await Promise.all([
    listCrmPeoplePage({ filters, cursor: args.cursor, limit: args.limit }),
    countCrmPeople(filters),
  ]);

  const customerIds = page.filter((r) => r.kind === "customer").map((r) => r.id);
  const prospectIds = page.filter((r) => r.kind === "prospect").map((r) => r.id);
  const prospectOrgIds = page
    .filter((r) => r.kind === "prospect" && r.organizationId)
    .map((r) => r.organizationId as string);

  const lists = await listLeadLists({ userId: args.sessionUserId });
  const visibleListIds = lists.map((l) => l.id);
  const [
    funnelRows,
    attrs,
    memberships,
    contactMemberships,
    enrichments,
    dispositions,
    funnelColumns,
  ] = await Promise.all([
      customerIds.length
        ? listCustomerFunnel({ userIds: customerIds })
        : Promise.resolve([]),
      customerIds.length
        ? attributesByUser(customerIds)
        : Promise.resolve(new Map()),
      membershipsByUser({ visibleListIds }),
      membershipsByContact({ visibleListIds }),
      prospectIds.length
        ? enrichmentByContact(prospectIds)
        : Promise.resolve(new Map<string, ProspectEnrichment>()),
      dispositionByOrgIds(prospectOrgIds),
      prospectIds.length
        ? funnelColumnsByContactIds(prospectIds)
        : Promise.resolve(new Map<string, FunnelColumn>()),
    ]);
  const funnelById = new Map(funnelRows.map((r) => [r.id, r]));

  const rows: CrmPersonRow[] = [];
  for (const p of page) {
    if (p.kind === "customer") {
      const r = funnelById.get(p.id);
      if (!r) continue;
      const attr = attrs.get(p.id);
      rows.push({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: null,
        firstName: null,
        lastName: null,
        mobilePhone: null,
        roleAtCompany: null,
        orgKvk: null,
        orgVatNumber: null,
        orgBrancheVereniging: null,
        orgAantalVestigingen: null,
        orgHoofdkantoor: null,
        orgSpecialisatie: null,
        emailVerified: r.emailVerified,
        role: r.role,
        createdAt: r.createdAt.toISOString(),
        trialStartedAt: r.trialStartedAt?.toISOString() ?? null,
        trialExpiresAt: r.trialExpiresAt?.toISOString() ?? null,
        trialStatus: r.trialStatus,
        paidLicenseCount: r.paidLicenseCount,
        emailsSent: r.emailsSent,
        emailsOpened: r.emailsOpened,
        emailsClicked: r.emailsClicked,
        emailsBounced: r.emailsBounced,
        stage: classifyStage(r),
        segment: r.segment,
        licenseSource: r.licenseSource,
        discountType: r.discountType,
        discountValue: r.discountValue,
        mollieCustomerId: r.mollieCustomerId,
        subscriptionStatus: r.subscriptionStatus,
        nextBillingAt: r.nextBillingAt?.toISOString() ?? null,
        accountOwner: r.accountOwner
          ? {
              affiliateId: r.accountOwner.affiliateId,
              code: r.accountOwner.code,
              name: r.accountOwner.name,
              convertedAt: r.accountOwner.convertedAt?.toISOString() ?? null,
            }
          : null,
        discountCodeUsed: r.discountCodeUsed
          ? {
              id: r.discountCodeUsed.id,
              code: r.discountCodeUsed.code,
              affiliateId: r.discountCodeUsed.affiliateId,
            }
          : null,
        crmStage: attr?.stage ?? defaultStageFor(r.paidLicenseCount, r.trialStatus),
        prospectType: "eindklant",
        funnelColumn: "nieuw",
        crmTemperature:
          attr?.temperature ??
          defaultTemperatureFor(r.trialStatus, r.paidLicenseCount),
        assignedToUserId: attr?.assignedToUserId ?? null,
        notes: attr?.notes ?? null,
        customFields:
          (attr?.customFields as Record<string, string | number | null>) ??
          null,
        listIds: memberships.get(r.id) ?? [],
        kind: "customer",
        hasAccount: true,
        company: null,
        organizationId: null,
        enrichment: null,
        lastDisposition: null,
        lastDispositionAt: null,
        nextAction: null,
        nextActionAt: null,
        doNotCall: false,
        wrongNumber: false,
      });
    } else {
      const dispo: OrgDispositionState | undefined = p.organizationId
        ? dispositions.get(p.organizationId)
        : undefined;
      rows.push({
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        firstName: p.firstName,
        lastName: p.lastName,
        mobilePhone: p.mobilePhone,
        roleAtCompany: p.roleAtCompany,
        orgKvk: p.orgKvk,
        orgVatNumber: p.orgVatNumber,
        orgBrancheVereniging: p.orgBrancheVereniging,
        orgAantalVestigingen: p.orgAantalVestigingen,
        orgHoofdkantoor: p.orgHoofdkantoor,
        orgSpecialisatie: p.orgSpecialisatie,
        emailVerified: true,
        role: null,
        createdAt: p.createdAt,
        trialStartedAt: null,
        trialExpiresAt: null,
        trialStatus: null,
        paidLicenseCount: 0,
        emailsSent: 0,
        emailsOpened: 0,
        emailsClicked: 0,
        emailsBounced: 0,
        stage: "lead",
        segment: "lead",
        licenseSource: null,
        discountType: null,
        discountValue: null,
        mollieCustomerId: null,
        subscriptionStatus: null,
        nextBillingAt: null,
        accountOwner: null,
        discountCodeUsed: null,
        crmStage: (p.crmStage as CrmPersonRow["crmStage"]) ?? "lead",
        prospectType: p.prospectType,
        funnelColumn: funnelColumns.get(p.id) ?? "nieuw",
        crmTemperature: (p.temperature as CrmPersonRow["crmTemperature"]) ?? "cold",
        assignedToUserId: p.assigneeId,
        notes: p.notes,
        customFields: null,
        listIds: contactMemberships.get(p.id) ?? [],
        kind: "prospect",
        hasAccount: p.hasAccount,
        company: p.company,
        organizationId: p.organizationId,
        enrichment: enrichments.get(p.id) ?? null,
        lastDisposition: dispo?.lastDisposition ?? null,
        lastDispositionAt: dispo?.lastDispositionAt
          ? dispo.lastDispositionAt.toISOString()
          : null,
        nextAction: dispo?.nextAction ?? null,
        nextActionAt: dispo?.nextActionAt ? dispo.nextActionAt.toISOString() : null,
        doNotCall: dispo?.doNotCall ?? false,
        wrongNumber: dispo?.wrongNumber ?? false,
      });
    }
  }

  return { rows, nextCursor, total };
}
