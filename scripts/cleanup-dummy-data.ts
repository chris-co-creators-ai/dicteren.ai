// Eenmalige opschoning van categorie-A dummy/test-data (go: Christian 2026-06-10).
// Scope: meeting-seed (dummy-seed), clay-seed, losse test-contacten, alle 5 affiliates +
// hun referrals/commissies/coupons, en de Jeroen Stolk-demoketen (Pieter de Vries +
// Sanne Bakker users, hun orders/licenties, De Vries Notariaat-org + 5 team-licenties).
//
// Beschermd (categorie B, blijft): echte losse leads (Beau/Jarno/Job/Davi/Edwin/Bob),
// staff, echte lead-lijsten, de 10 ScrapeGraphAI-bureaus, de €0,12 keyholders-order +
// coupon GOLIVE-TEST-99.
//
// Dry-run (alleen tellen):  cd web && bun --conditions=react-server scripts/cleanup-dummy-data.ts
// Live verwijderen:         cd web && CLEANUP_LIVE=1 bun --conditions=react-server scripts/cleanup-dummy-data.ts
import { neon } from "@neondatabase/serverless";

const LIVE = process.env.CLEANUP_LIVE === "1";
const sql = neon(process.env.DATABASE_URL!);

const TEST_EMAILS = [
  "test@test.nl",
  "lars@dicteren.ai",
  "creative@seveke.nl",
  "onbkend@onbkend.nl",
  "marijke.visschedijk@onbekend.local",
  "ruud@kinderopvangikkeook.nl",
];
const DEMO_USER_EMAILS = ["pieter@devries-notariaat.nl", "sanne@bakker-mail.nl"];

const ids = (rows: Array<{ id: string }>) => rows.map((r) => r.id);

// ---- 1. Scope verzamelen (anchors) ----
const dummyContacts = ids(
  (await sql`
    SELECT id FROM crm_contacts
    WHERE enrichment_source IN ('dummy-seed','clay') OR email = ANY(${TEST_EMAILS})
  `) as Array<{ id: string }>,
);
const dummyOrgs = ids(
  (await sql`
    SELECT DISTINCT o.id FROM crm_organizations o
    WHERE o.source = 'reseller_recruitment'
       OR o.id IN (
         SELECT crm_organization_id FROM crm_contacts
         WHERE enrichment_source IN ('dummy-seed','clay') OR email = ANY(${TEST_EMAILS})
       )
  `) as Array<{ id: string }>,
);
const demoUsers = ids(
  (await sql`SELECT id FROM auth."user" WHERE email = ANY(${DEMO_USER_EMAILS})`) as Array<{ id: string }>,
);
const devriesOrgs = ids(
  (await sql`SELECT id FROM auth."organization" WHERE lower(name) LIKE '%vries%' OR lower(name) LIKE '%notariaat%'`) as Array<{ id: string }>,
);
const affiliates = ids((await sql`SELECT id FROM affiliates`) as Array<{ id: string }>);
const demoOrders = ids(
  (await sql`SELECT id FROM orders WHERE user_id = ANY(${demoUsers})`) as Array<{ id: string }>,
);

console.log("=== SCOPE (categorie A) ===");
console.log(`dummy crm_contacts:      ${dummyContacts.length}`);
console.log(`dummy crm_organizations: ${dummyOrgs.length}`);
console.log(`demo users:              ${demoUsers.length} (${DEMO_USER_EMAILS.join(", ")})`);
console.log(`De Vries auth.orgs:      ${devriesOrgs.length}`);
console.log(`affiliates:              ${affiliates.length}`);
console.log(`demo orders:             ${demoOrders.length}`);

if (!LIVE) {
  console.log("\nDRY-RUN. Niks verwijderd. Run met CLEANUP_LIVE=1 om te wissen.");
  process.exit(0);
}

// ---- 2. Verwijderen, children → parents ----
const n = (r: unknown) => (Array.isArray(r) ? r.length : 0);
const step = async (label: string, p: Promise<unknown>) => {
  await p;
  console.log(`  ✓ ${label}`);
};

console.log("\n=== LIVE VERWIJDEREN ===");
// Affiliate-keten
await step("affiliate_commissions", sql`DELETE FROM affiliate_commissions WHERE affiliate_id = ANY(${affiliates})`);
await step("affiliate_referrals", sql`DELETE FROM affiliate_referrals WHERE affiliate_id = ANY(${affiliates})`);
// Demo licenties (vóór orders: licenses.order_id → orders)
await step(
  "licenses (demo)",
  sql`DELETE FROM licenses WHERE user_id = ANY(${demoUsers}) OR organization_id = ANY(${devriesOrgs})`,
);
// Demo orders (vóór discount_codes + users + org)
await step("orders (demo)", sql`DELETE FROM orders WHERE id = ANY(${demoOrders})`);
// Affiliate-coupons (vóór affiliates). GOLIVE-TEST-99 blijft (geen affiliate_id).
await step(
  "discount_codes (affiliate + RESELLER-JEROEN)",
  sql`DELETE FROM discount_codes WHERE affiliate_id = ANY(${affiliates}) OR code = 'RESELLER-JEROEN'`,
);
// CRM children
await step(
  "lead_list_members",
  sql`DELETE FROM lead_list_members WHERE crm_contact_id = ANY(${dummyContacts}) OR user_id = ANY(${demoUsers})`,
);
await step(
  "crm_events",
  sql`DELETE FROM crm_events WHERE crm_contact_id = ANY(${dummyContacts}) OR crm_organization_id = ANY(${dummyOrgs})`,
);
await step("crm_org_tasks", sql`DELETE FROM crm_org_tasks WHERE crm_organization_id = ANY(${dummyOrgs})`);
await step("crm_contacts", sql`DELETE FROM crm_contacts WHERE id = ANY(${dummyContacts})`);
// Orgs alleen als er geen contact meer aan hangt (beschermt gedeelde orgs)
await step(
  "crm_organizations (verweesd)",
  sql`DELETE FROM crm_organizations WHERE id = ANY(${dummyOrgs})
      AND NOT EXISTS (SELECT 1 FROM crm_contacts c WHERE c.crm_organization_id = crm_organizations.id)`,
);
// Auth-keten demo-users + De Vries org
await step("auth.member", sql`DELETE FROM auth."member" WHERE "organizationId" = ANY(${devriesOrgs}) OR "userId" = ANY(${demoUsers})`);
await step("auth.invitation", sql`DELETE FROM auth."invitation" WHERE "organizationId" = ANY(${devriesOrgs})`);
await step("auth.session", sql`DELETE FROM auth."session" WHERE "userId" = ANY(${demoUsers})`);
await step("auth.account", sql`DELETE FROM auth."account" WHERE "userId" = ANY(${demoUsers})`);
await step("auth.organization (De Vries)", sql`DELETE FROM auth."organization" WHERE id = ANY(${devriesOrgs})`);
await step("auth.user (demo)", sql`DELETE FROM auth."user" WHERE id = ANY(${demoUsers})`);
// Affiliates zelf
await step("affiliates", sql`DELETE FROM affiliates WHERE id = ANY(${affiliates})`);

console.log("\nKlaar.");
process.exit(0);
