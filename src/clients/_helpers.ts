import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { atomicWrite, readJsonc, setIn } from "../lib/jsonc.js";
import { SEOABLE_SERVER_KEY, type InstallContext, type InstallResult } from "../types.js";

/**
 * Detect a client by checking whether its config file already exists OR its
 * containing config directory exists (e.g. `~/.cursor/` even without an
 * mcp.json yet). Either signal is good enough to assume the client is
 * installed.
 */
export function detectByConfigPath(path: string): boolean {
  if (existsSync(path)) return true;
  const parent = dirname(path);
  return existsSync(parent);
}

interface JsoncMergeOptions {
  /** Absolute path to the config file. */
  path: string;
  /**
   * JSON path inside the file where MCP servers live, e.g.
   * `["mcpServers"]`, `["servers"]`, `["context_servers"]`.
   */
  serversKey: string[];
  /** The Seoable entry to install under `serversKey -> "seoable"`. */
  entry: unknown;
  ctx: InstallContext;
  /** Display name for log/restart text. */
  clientName: string;
  restartHint?: string;
}

/**
 * Merge the Seoable entry into a JSONC config file at `serversKey.seoable`,
 * creating the file (and any parent directories) if needed. Preserves
 * comments and unrelated keys.
 */
export async function mergeJsoncServer({
  path,
  serversKey,
  entry,
  ctx,
  clientName,
  restartHint,
}: JsoncMergeOptions): Promise<InstallResult> {
  try {
    const { text, exists } = await readJsonc(path);
    const seedText = text || "{}\n";
    const fullPath = [...serversKey, SEOABLE_SERVER_KEY];
    const next = setIn(seedText, fullPath, entry);
    if (ctx.dryRun) {
      return {
        status: exists ? "updated" : "installed",
        path,
        detail: `${clientName} (dry-run)`,
        ...(restartHint ? { restartHint } : {}),
      };
    }
    await atomicWrite(path, next);
    return {
      status: exists ? "updated" : "installed",
      path,
      detail: clientName,
      ...(restartHint ? { restartHint } : {}),
    };
  } catch (err) {
    return {
      status: "error",
      path,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Remove `serversKey.seoable` from a JSONC config file, leaving the rest
 * of the file untouched. No-ops if the file or key doesn't exist.
 */
export async function removeJsoncServer({
  path,
  serversKey,
  ctx,
  clientName,
}: Pick<JsoncMergeOptions, "path" | "serversKey" | "ctx" | "clientName">): Promise<InstallResult> {
  try {
    const { text, exists } = await readJsonc(path);
    if (!exists || text.trim() === "") {
      return { status: "skipped", path, detail: `${clientName}: no config` };
    }
    const next = setIn(text, [...serversKey, SEOABLE_SERVER_KEY], undefined);
    if (next === text) {
      return { status: "skipped", path, detail: `${clientName}: no Seoable entry` };
    }
    if (ctx.dryRun) {
      return { status: "removed", path, detail: `${clientName} (dry-run)` };
    }
    await atomicWrite(path, next);
    return { status: "removed", path, detail: clientName };
  } catch (err) {
    return {
      status: "error",
      path,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
