// Dicteren.ai — OAuth Protected Resource Metadata (RFC 9728) voor MCP-clients.
//
// De MCP-auth-discovery loopt: client → MCP-endpoint → 401 (met WWW-Authenticate
// resource_metadata) → leest dit PRM-document → vindt de authorization server →
// leest /.well-known/oauth-authorization-server. Hermes en de MCP Inspector
// volgen die keten. Better Auth's mcp-plugin levert het document.
import { oAuthProtectedResourceMetadata } from "better-auth/plugins";
import { auth } from "@/lib/auth/server";

export const GET = oAuthProtectedResourceMetadata(auth);
