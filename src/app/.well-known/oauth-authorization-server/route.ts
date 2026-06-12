// Dicteren.ai — OAuth Authorization Server Metadata (RFC 8414) voor MCP-clients.
//
// Better Auth serveert dit ook op /api/auth/.well-known/oauth-authorization-server,
// maar sommige MCP-clients parsen de WWW-Authenticate-header niet en vallen terug
// op deze root-level well-known. Hermes Agent en de MCP Inspector horen daarbij.
import { oAuthDiscoveryMetadata } from "better-auth/plugins";
import { auth } from "@/lib/auth/server";

export const GET = oAuthDiscoveryMetadata(auth);
