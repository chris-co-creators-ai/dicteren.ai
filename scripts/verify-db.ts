import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

const tables = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name;
`;

const enums = await sql`
  SELECT t.typname AS enum_name
  FROM pg_type t
  JOIN pg_enum e ON t.oid = e.enumtypid
  GROUP BY t.typname
  ORDER BY t.typname;
`;

console.log("Tables:", tables.map((r) => r.table_name).join(", "));
console.log("Enums:", enums.map((r) => r.enum_name).join(", "));
console.log("\nRow counts:");
for (const { table_name } of tables) {
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM ${sql.unsafe(table_name as string)}`;
  console.log(`  ${table_name}: ${count}`);
}
