import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { paths } from "../lib/paths.js";
import { remoteHttpEntry } from "../lib/server-config.js";
import { SEOABLE_MCP_URL, SEOABLE_SERVER_KEY, type Client, type InstallContext, type InstallResult } from "../types.js";
import { mergeJsoncServer, removeJsoncServer } from "./_helpers.js";

const RESTART = "Restart any running Claude Code sessions (run `claude` again).";

interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
}

function which(cmd: string): Promise<string | null> {
  const probe = process.platform === "win32" ? "where" : "which";
  return new Promise((resolve) => {
    const child = spawn(probe, [cmd], { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    child.stdout.on("data", (b) => (out += b.toString()));
    child.on("error", () => resolve(null));
    child.on("close", (code) => {
      if (code !== 0) return resolve(null);
      const first = out.split(/\r?\n/).map((s) => s.trim()).find(Boolean);
      resolve(first ?? null);
    });
  });
}

function run(cmd: string, args: string[]): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (b) => (stdout += b.toString()));
    child.stderr.on("data", (b) => (stderr += b.toString()));
    child.on("error", (err) => resolve({ code: 1, stdout, stderr: stderr || String(err) }));
    child.on("close", (code) => resolve({ code: code ?? 0, stdout, stderr }));
  });
}

const client: Client = {
  id: "claude-code",
  name: "Claude Code",
  async detect() {
    if (await which("claude")) return true;
    return existsSync(paths.claudeCodeUserConfig());
  },

  async install(ctx: InstallContext): Promise<InstallResult> {
    const claudeBin = await which("claude");

    // Preferred path: use the official CLI so user-scope and the rest of
    // Claude Code's bookkeeping stay consistent.
    if (claudeBin) {
      if (ctx.dryRun) {
        return {
          status: "installed",
          detail: `Claude Code (dry-run, via \`claude mcp add\`)`,
          path: claudeBin,
          restartHint: RESTART,
        };
      }

      // Best-effort idempotency: remove any prior entry, then add fresh.
      await run(claudeBin, ["mcp", "remove", SEOABLE_SERVER_KEY, "--scope", "user"]);

      const args = [
        "mcp", "add", SEOABLE_SERVER_KEY,
        "--scope", "user",
        "--transport", "http",
        SEOABLE_MCP_URL,
      ];
      if (ctx.auth.kind === "api-key") {
        args.push("--header", `Authorization: Bearer ${ctx.auth.key}`);
      }
      const res = await run(claudeBin, args);
      if (res.code !== 0) {
        return {
          status: "error",
          path: claudeBin,
          detail: `\`claude mcp add\` exited ${res.code}: ${res.stderr.trim() || res.stdout.trim()}`,
        };
      }
      return {
        status: "installed",
        path: claudeBin,
        detail: "Claude Code (via `claude mcp add`)",
        restartHint: RESTART,
      };
    }

    // Fallback: edit ~/.claude.json directly. This is the user-level config
    // Claude Code writes when you run `claude mcp add --scope user`.
    return mergeJsoncServer({
      path: paths.claudeCodeUserConfig(),
      serversKey: ["mcpServers"],
      entry: remoteHttpEntry(ctx.auth),
      ctx,
      clientName: this.name,
      restartHint: RESTART,
    });
  },

  async uninstall(ctx) {
    const claudeBin = await which("claude");
    if (claudeBin) {
      if (ctx.dryRun) {
        return { status: "removed", path: claudeBin, detail: "Claude Code (dry-run)" };
      }
      const res = await run(claudeBin, ["mcp", "remove", SEOABLE_SERVER_KEY, "--scope", "user"]);
      if (res.code !== 0) {
        // Fall through to file edit if the CLI didn't know about it.
      } else {
        return { status: "removed", path: claudeBin, detail: "Claude Code" };
      }
    }
    return removeJsoncServer({
      path: paths.claudeCodeUserConfig(),
      serversKey: ["mcpServers"],
      ctx,
      clientName: this.name,
    });
  },
};

export default client;
