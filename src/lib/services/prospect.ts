// Dicteren.ai — Prospect-toevoeging in CRM.
//
// Een prospect = een echte auth.user-row (zonder password, emailVerified=false)
// + een customer_attributes-row met stage=lead/prospect. Voordeel: dezelfde
// CRM-pipeline werkt voor prospects en bestaande klanten. Bij signup met
// dezelfde email wordt de prospect automatisch een ingelogde user.

import "server-only";
import { eq } from "drizzle-orm";
import { dbAuth, db } from "@/lib/db";
import { authUser } from "@/lib/db/auth-schema";
import { customerAttributes, leadListMembers } from "@/lib/db/schema";

export type ProspectInput = {
  email: string;
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  source?: string | null;
  notes?: string | null;
  assignedToUserId?: string | null;
  stage?:
    | "lead"
    | "prospect"
    | "mql"
    | "sql"
    | "customer"
    | "lost"
    | "churned"
    | null;
  temperature?: "cold" | "lukewarm" | "warm" | "hot" | null;
  customFields?: Record<string, string | number | null> | null;
};

export type ProspectImportResult = {
  created: number;
  updated: number;
  skipped: number;
  total: number;
  rows: Array<{
    email: string;
    status: "created" | "updated" | "skipped";
    userId?: string;
    reason?: string;
  }>;
};

/** Voegt een prospect toe (of update als email bestaat). */
export async function addProspect(args: {
  prospect: ProspectInput;
  addedByUserId: string;
  listIds?: string[];
}): Promise<{
  userId: string;
  status: "created" | "updated";
}> {
  const email = args.prospect.email.trim().toLowerCase();
  if (!email) throw new Error("email verplicht");

  // Bestaat de user al?
  const [existing] = await dbAuth
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, email))
    .limit(1);

  let userId: string;
  let status: "created" | "updated";

  if (existing) {
    userId = existing.id;
    status = "updated";
    // Optioneel naam updaten als prospect een naam meegeeft en user-name leeg is.
    if (args.prospect.name) {
      await dbAuth
        .update(authUser)
        .set({ name: args.prospect.name, updatedAt: new Date() })
        .where(eq(authUser.id, userId));
    }
  } else {
    const [inserted] = await dbAuth
      .insert(authUser)
      .values({
        email,
        name: args.prospect.name ?? email,
        emailVerified: false,
      })
      .returning({ id: authUser.id });
    userId = inserted.id;
    status = "created";
  }

  // Customer-attributes upsert.
  const customFields: Record<string, unknown> = {
    ...(args.prospect.customFields ?? {}),
  };
  if (args.prospect.company) customFields.company = args.prospect.company;
  if (args.prospect.phone) customFields.phone = args.prospect.phone;
  if (args.prospect.source) customFields.source = args.prospect.source;

  await db
    .insert(customerAttributes)
    .values({
      userId,
      stage: args.prospect.stage ?? "prospect",
      temperature: args.prospect.temperature ?? "cold",
      assignedToUserId: args.prospect.assignedToUserId ?? null,
      notes: args.prospect.notes ?? null,
      customFields:
        Object.keys(customFields).length > 0 ? customFields : null,
      lastActivityAt: new Date(),
    })
    .onConflictDoUpdate({
      target: customerAttributes.userId,
      set: {
        // Niet overschrijven als al een stage/temp ingesteld is — alleen
        // toevoegen waar leeg.
        notes: args.prospect.notes ?? null,
        customFields:
          Object.keys(customFields).length > 0 ? customFields : null,
        updatedAt: new Date(),
      },
    });

  // Add to lijsten als meegegeven.
  if (args.listIds && args.listIds.length > 0) {
    const values = args.listIds.map((listId) => ({
      listId,
      userId,
      addedByUserId: args.addedByUserId,
    }));
    await db
      .insert(leadListMembers)
      .values(values)
      .onConflictDoNothing();
  }

  return { userId, status };
}

/** Bulk-import van prospects (CSV). Per rij idempotent. */
export async function bulkImportProspects(args: {
  prospects: ProspectInput[];
  addedByUserId: string;
  listIds?: string[];
}): Promise<ProspectImportResult> {
  const result: ProspectImportResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    total: args.prospects.length,
    rows: [],
  };
  for (const p of args.prospects) {
    if (!p.email?.trim()) {
      result.skipped += 1;
      result.rows.push({
        email: p.email ?? "(leeg)",
        status: "skipped",
        reason: "email ontbreekt",
      });
      continue;
    }
    try {
      const { userId, status } = await addProspect({
        prospect: p,
        addedByUserId: args.addedByUserId,
        listIds: args.listIds,
      });
      if (status === "created") result.created += 1;
      else result.updated += 1;
      result.rows.push({ email: p.email, status, userId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "fout";
      result.skipped += 1;
      result.rows.push({ email: p.email, status: "skipped", reason: msg });
    }
  }
  return result;
}
