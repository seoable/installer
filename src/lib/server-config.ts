import { SEOABLE_MCP_URL, type AuthMethod } from "../types.js";

/**
 * Config entry for a client that natively speaks remote HTTP MCP
 * (Claude Desktop ≥0.10, Cursor ≥0.43, VS Code Copilot, Claude Code).
 */
export interface RemoteHttpEntry {
  type: "http";
  url: string;
  headers?: Record<string, string>;
}

/**
 * Config entry for a stdio-only client. Uses `mcp-remote` as a local proxy
 * that handles the browser-based OAuth dance and forwards traffic to the
 * remote server.
 */
export interface StdioBridgeEntry {
  command: string;
  args: string[];
}

export function remoteHttpEntry(auth: AuthMethod): RemoteHttpEntry {
  const entry: RemoteHttpEntry = { type: "http", url: SEOABLE_MCP_URL };
  if (auth.kind === "api-key") {
    entry.headers = { Authorization: `Bearer ${auth.key}` };
  }
  return entry;
}

export function stdioBridgeEntry(auth: AuthMethod): StdioBridgeEntry {
  const args = ["-y", "mcp-remote", SEOABLE_MCP_URL];
  if (auth.kind === "api-key") {
    args.push("--header", `Authorization: Bearer ${auth.key}`);
  }
  return { command: "npx", args };
}
