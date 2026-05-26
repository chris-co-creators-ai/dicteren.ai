// Re-export Better Auth's auth.* tables onder oude `authUsers`/`authOrganizations`
// namen zodat bestaande imports werken zonder Better Auth's owned schema aan
// te raken. Single source = ../auth-schema.ts.

import {
  authUser as betterAuthUser,
  authOrg as betterAuthOrg,
  authMember as betterAuthMember,
  authInvitation as betterAuthInvitation,
} from "../auth-schema";

export const authUsers = betterAuthUser;
export const authOrganizations = betterAuthOrg;
export const authMembers = betterAuthMember;
export const authInvitations = betterAuthInvitation;

export type AuthUser = typeof authUsers.$inferSelect;
export type AuthOrganization = typeof authOrganizations.$inferSelect;
export type AuthMember = typeof authMembers.$inferSelect;
