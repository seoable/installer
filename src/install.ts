import { ALL_CLIENTS, detectInstalledClients, getClient } from "./clients/index.js";
import type {
  AuthMethod,
  Client,
  ClientId,
  InstallContext,
  InstallResult,
} from "./types.js";

export interface InstallOptions {
  /** Which clients to install for. If omitted, all detected clients are used. */
  clients?: ClientId[];
  auth?: AuthMethod;
  dryRun?: boolean;
}

export interface InstallReport {
  client: Client;
  result: InstallResult;
}

/**
 * Programmatic install entry point. Returns one report per attempted client.
 * Never throws on a single client's failure — instead returns an
 * `InstallResult` with status "error" so callers can render a summary.
 */
export async function install(options: InstallOptions = {}): Promise<InstallReport[]> {
  const ctx: InstallContext = {
    auth: options.auth ?? { kind: "oauth" },
    dryRun: options.dryRun ?? false,
  };
  const targets = await resolveTargets(options.clients);
  const reports: InstallReport[] = [];
  for (const client of targets) {
    const result = await client.install(ctx);
    reports.push({ client, result });
  }
  return reports;
}

export async function uninstall(options: InstallOptions = {}): Promise<InstallReport[]> {
  const ctx: InstallContext = {
    auth: options.auth ?? { kind: "oauth" },
    dryRun: options.dryRun ?? false,
  };
  const targets = await resolveTargets(options.clients);
  const reports: InstallReport[] = [];
  for (const client of targets) {
    const result = await client.uninstall(ctx);
    reports.push({ client, result });
  }
  return reports;
}

async function resolveTargets(ids?: ClientId[]): Promise<Client[]> {
  if (ids && ids.length > 0) return ids.map(getClient);
  return detectInstalledClients();
}

export interface ListClientsOptions {
  detectedOnly?: boolean;
}

export async function listClients(options: ListClientsOptions = {}): Promise<
  { id: ClientId; name: string; detected: boolean }[]
> {
  const results = await Promise.all(
    ALL_CLIENTS.map(async (c) => ({
      id: c.id,
      name: c.name,
      detected: await c.detect(),
    })),
  );
  return options.detectedOnly ? results.filter((r) => r.detected) : results;
}
