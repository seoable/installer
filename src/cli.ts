import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { intro, outro, isCancel, cancel, multiselect, confirm, text, select, spinner } from "@clack/prompts";
import { ALL_CLIENTS, detectInstalledClients, isClientId } from "./clients/index.js";
import { install, uninstall, type InstallReport } from "./install.js";
import { log, pc } from "./lib/log.js";
import type { AuthMethod, Client, ClientId, InstallStatus } from "./types.js";

const HELP = `${pc.bold("seoable-install")} — install the Seoable MCP into every MCP-aware client.

${pc.bold("Usage")}
  npx -y @seoable/install [options]

${pc.bold("Options")}
  --client <ids>     Comma-separated client ids (e.g. cursor,claude-desktop).
                     Available: ${ALL_CLIENTS.map((c) => c.id).join(", ")}
  --api-key <key>    Use a Bearer API key (sk_live_...) instead of OAuth.
  --yes, -y          Install to all detected clients without prompting.
  --dry-run          Print planned changes; write nothing.
  --remove           Remove the Seoable entry from each target client.
  --uninstall        Alias for --remove.
  --help, -h         Show this help.
  --version, -v      Print version.
`;

async function readPkgVersion(): Promise<string> {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const candidates = [join(here, "..", "package.json"), join(here, "package.json")];
    for (const c of candidates) {
      try {
        const raw = await readFile(c, "utf8");
        const pkg = JSON.parse(raw) as { version?: string };
        if (pkg.version) return pkg.version;
      } catch {
        // try next
      }
    }
  } catch {
    // ignore
  }
  return "0.0.0";
}

interface ParsedFlags {
  clients: ClientId[] | undefined;
  apiKey: string | undefined;
  yes: boolean;
  dryRun: boolean;
  remove: boolean;
  help: boolean;
  version: boolean;
}

function parseFlags(argv: string[]): ParsedFlags {
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

function bail(message: string): never {
  cancel(message);
  process.exit(1);
}

async function pickClients(preselected: ClientId[] | undefined, yes: boolean): Promise<Client[]> {
  if (preselected && preselected.length > 0) {
    return preselected.map((id) => ALL_CLIENTS.find((c) => c.id === id)!);
  }

  const detected = await detectInstalledClients();
  if (detected.length === 0) {
    bail("No MCP-aware clients detected on this machine. Pass --client <id> to force, or install one first.");
  }

  if (yes) return detected;

  const choice = await multiselect({
    message: "Which clients should I configure?",
    options: detected.map((c) => ({ value: c.id, label: c.name, hint: c.id })),
    initialValues: detected.map((c) => c.id),
    required: true,
  });
  if (isCancel(choice)) bail("Cancelled.");

  const selected = choice as ClientId[];
  return selected.map((id) => ALL_CLIENTS.find((c) => c.id === id)!);
}

async function pickAuth(apiKey: string | undefined, yes: boolean): Promise<AuthMethod> {
  if (apiKey) return { kind: "api-key", key: apiKey };
  if (yes) return { kind: "oauth" };

  type AuthMode = "oauth" | "api-key";
  const mode = await select({
    message: "How should Seoable authenticate?",
    options: [
      { value: "oauth" as AuthMode, label: "OAuth (recommended)", hint: "browser sign-in via mcp-remote" },
      { value: "api-key" as AuthMode, label: "API key", hint: "paste sk_live_..." },
    ],
    initialValue: "oauth" as AuthMode,
  });
  if (isCancel(mode)) bail("Cancelled.");
  if (mode === "oauth") return { kind: "oauth" };

  const key = await text({
    message: "Paste your Seoable API key:",
    placeholder: "sk_live_...",
    validate(value) {
      if (!value || value.trim().length === 0) return "API key is required.";
      if (!/^sk_(live|test)_/.test(value.trim())) return "Expected key to start with sk_live_ or sk_test_.";
      return undefined;
    },
  });
  if (isCancel(key)) bail("Cancelled.");
  return { kind: "api-key", key: key.trim() };
}

function statusLabel(s: InstallStatus): string {
  switch (s) {
    case "installed": return pc.green("installed");
    case "updated": return pc.green("updated  ");
    case "removed": return pc.green("removed  ");
    case "skipped": return pc.dim("skipped  ");
    case "not-detected": return pc.dim("missing  ");
    case "error": return pc.red("error    ");
  }
}

function printSummary(reports: InstallReport[], dryRun: boolean): void {
  log.blank();
  log.info(pc.bold(dryRun ? "Planned changes" : "Summary"));
  for (const { client, result } of reports) {
    const head = `  ${statusLabel(result.status)}  ${pc.bold(client.name)}`;
    const where = result.path ? pc.dim(`  ${result.path}`) : "";
    console.log(head + where);
    if (result.detail && result.status === "error") {
      console.log(`    ${pc.red(result.detail)}`);
    }
  }

  const hints = new Set<string>();
  for (const { result } of reports) {
    if ((result.status === "installed" || result.status === "updated") && result.restartHint) {
      hints.add(result.restartHint);
    }
  }
  if (!dryRun && hints.size > 0) {
    log.blank();
    log.info(pc.bold("Next steps"));
    for (const h of hints) console.log(`  ${pc.cyan("→")} ${h}`);
  }
}

async function main(): Promise<void> {
  let flags: ParsedFlags;
  try {
    flags = parseFlags(process.argv.slice(2));
  } catch (err) {
    log.error(err instanceof Error ? err.message : String(err));
    console.log(`\n${HELP}`);
    process.exit(2);
    return;
  }

  if (flags.help) {
    console.log(HELP);
    return;
  }
  if (flags.version) {
    console.log(await readPkgVersion());
    return;
  }

  const action = flags.remove ? "Remove" : "Install";
  intro(pc.bgCyan(pc.black(` @seoable/install `)) + pc.dim(`  v${await readPkgVersion()}`));

  const targets = await pickClients(flags.clients, flags.yes);

  const auth: AuthMethod = flags.remove
    ? { kind: "oauth" }
    : await pickAuth(flags.apiKey, flags.yes);

  if (!flags.yes && !flags.dryRun && !flags.remove) {
    const ok = await confirm({
      message: `${action} Seoable MCP for ${targets.length} client(s)?`,
      initialValue: true,
    });
    if (isCancel(ok) || !ok) bail("Cancelled.");
  }

  const spin = spinner();
  spin.start(`${action}ing Seoable MCP…`);
  const reports = await (flags.remove
    ? uninstall({ clients: targets.map((c) => c.id), auth, dryRun: flags.dryRun })
    : install({ clients: targets.map((c) => c.id), auth, dryRun: flags.dryRun }));
  spin.stop(`${action} complete.`);

  printSummary(reports, flags.dryRun);

  const hadError = reports.some((r) => r.result.status === "error");
  outro(
    hadError
      ? pc.yellow("Finished with errors — see above.")
      : pc.green("All set. Welcome to Seoable."),
  );
  process.exit(hadError ? 1 : 0);
}

main().catch((err) => {
  log.error(err instanceof Error ? err.stack ?? err.message : String(err));
  process.exit(1);
});
