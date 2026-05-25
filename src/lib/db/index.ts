import { neon, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";
import * as authSchema from "./auth-schema";

const sql = neon(process.env.DATABASE_URL!);

// Beide schemas exposeren zodat better-auth's drizzle-adapter de auth.*
// tabellen kan vinden naast onze public.* business tables.
//
// db: HTTP driver, snel voor losse queries, MAAR ondersteunt geen transactions
// (memory feedback_drizzle_neon_limits). 99% van onze code gebruikt deze.
export const db = drizzle(sql, { schema: { ...schema, ...authSchema } });

// dbAuth: WebSocket driver via Pool, ondersteunt wel db.transaction(). Wordt
// uitsluitend door better-auth's drizzleAdapter gebruikt — die doet runtime
// transacties voor token-create/session-rotate. Niet voor business-queries.
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const dbAuth = drizzleWs(pool, {
  schema: { ...schema, ...authSchema },
});

export { schema, authSchema };
