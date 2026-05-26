// Dicteren.ai — Drizzle schema barrel
//
// Centraal re-export. Drizzle-kit leest dit als single entrypoint
// (zie drizzle.config.ts → schema: "./src/lib/db/schema/index.ts").
//
// Domeinen:
//  - auth-bridge      — re-exports van Better Auth's auth.* tabellen
//  - licensing        — licenses, devices, activations, plans
//  - billing          — orders, payments, subscriptions, discount-codes
//  - identity-extensions — user/organization billing + staff page-blocks
//  - crm              — customer-attributes, lead-lists, column-prefs
//  - partner          — maatschappelijke outreach + tasks + comments
//  - affiliate        — reseller-program met commissions
//  - communication    — email logs, contact messages, rate-limit events
//  - audit            — events (audit + product analytics)

export * from "./auth-bridge";
export * from "./licensing";
export * from "./billing";
export * from "./identity-extensions";
export * from "./crm";
export * from "./partner";
export * from "./affiliate";
export * from "./communication";
export * from "./audit";
export * from "./orgSeats";
