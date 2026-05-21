import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
  // neon_auth is managed by Neon (Better Auth). Drizzle only owns the public
  // schema; FK references into neon_auth.* are defined for type safety but
  // never created/dropped by drizzle-kit.
  schemaFilter: ["public"],
  strict: true,
  verbose: true,
});
