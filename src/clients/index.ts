import type { Client, ClientId } from "../types.js";
import claudeDesktop from "./claude-desktop.js";
import claudeCode from "./claude-code.js";
import cursor from "./cursor.js";
import vscode from "./vscode.js";
import windsurf from "./windsurf.js";
import cline from "./cline.js";
import zed from "./zed.js";
import continueClient from "./continue.js";
import gemini from "./gemini.js";

/**
 * All clients @seoable/install knows how to configure. Order here is the
 * order shown in interactive prompts and summary tables.
 */
export const ALL_CLIENTS: readonly Client[] = [
  claudeDesktop,
  claudeCode,
  cursor,
  vscode,
  windsurf,
  cline,
  zed,
  continueClient,
  gemini,
];

const BY_ID: Record<ClientId, Client> = Object.fromEntries(
  ALL_CLIENTS.map((c) => [c.id, c]),
) as Record<ClientId, Client>;

export function getClient(id: ClientId): Client {
  const c = BY_ID[id];
  if (!c) throw new Error(`Unknown client id: ${id}`);
  return c;
}

export function isClientId(value: string): value is ClientId {
  return value in BY_ID;
}

export async function detectInstalledClients(): Promise<Client[]> {
  const checks = await Promise.all(
    ALL_CLIENTS.map(async (c) => ({ client: c, present: await c.detect() })),
  );
  return checks.filter((r) => r.present).map((r) => r.client);
}
