import { parseArgs } from "node:util";
import { ALL_CLIENTS, isClientId } from "./clients/index.js";
import type { ClientId } from "./types.js";

export interface ParsedFlags {
  clients: ClientId[] | undefined;
  apiKey: string | undefined;
  yes: boolean;
  dryRun: boolean;
  remove: boolean;
  help: boolean;
  version: boolean;
}

/**
 * Whether the run should skip all interactive prompts. `--dry-run` is
 * documented as a non-interactive preview, so it must not prompt (doing so
 * crashes with ERR_TTY_INIT_FAILED in CI / non-TTY shells).
 *
 * Lives in its own module (not cli.ts) so tests can import it without pulling
 * in cli.ts, which runs the installer on import.
 */
export function isNonInteractive(flags: Pick<ParsedFlags, "yes" | "dryRun">): boolean {
  return flags.yes || flags.dryRun;
}

export function parseFlags(argv: string[]): ParsedFlags {
  const { values } = parseArgs({
    args: argv,
    options: {
      client: { type: "string" },
      "api-key": { type: "string" },
      yes: { type: "boolean", short: "y" },
      "dry-run": { type: "boolean" },
      remove: { type: "boolean" },
      uninstall: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
    allowPositionals: false,
    strict: true,
  });

  const clientRaw = typeof values.client === "string" ? values.client : undefined;
  let clients: ClientId[] | undefined;
  if (clientRaw) {
    clients = clientRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((id) => {
        if (!isClientId(id)) {
          throw new Error(`Unknown client: "${id}". Known: ${ALL_CLIENTS.map((c) => c.id).join(", ")}`);
        }
        return id;
      });
  }

  return {
    clients,
    apiKey: typeof values["api-key"] === "string" ? values["api-key"] : undefined,
    yes: Boolean(values.yes),
    dryRun: Boolean(values["dry-run"]),
    remove: Boolean(values.remove) || Boolean(values.uninstall),
    help: Boolean(values.help),
    version: Boolean(values.version),
  };
}
