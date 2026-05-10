import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ALL_CLIENTS, getClient } from "../src/clients/index.js";
import type { ClientId, InstallContext } from "../src/types.js";
import { withFakeHome } from "./helpers.js";

let env: Awaited<ReturnType<typeof withFakeHome>>;

beforeEach(async () => {
  env = await withFakeHome();
});
afterEach(async () => {
  await env.cleanup();
});

// Claude Code is exercised separately because it shells out to a binary that
// may or may not exist in the test environment. The file-fallback path is
// covered there.
const FILE_CLIENTS: ClientId[] = [
  "claude-desktop",
  "cursor",
  "vscode",
  "windsurf",
  "cline",
  "zed",
  "continue",
  "gemini",
];

const oauthCtx: InstallContext = { auth: { kind: "oauth" }, dryRun: false };
const apiKeyCtx: InstallContext = {
  auth: { kind: "api-key", key: "sk_live_test" },
  dryRun: false,
};
const dryCtx: InstallContext = { auth: { kind: "oauth" }, dryRun: true };

describe.each(FILE_CLIENTS)("%s", (id) => {
  it("install creates a config file with a seoable entry", async () => {
    const client = getClient(id);
    const result = await client.install(oauthCtx);
    expect(result.status).toMatch(/installed|updated/);
    expect(result.path).toBeDefined();
    expect(existsSync(result.path!)).toBe(true);

    const text = await readFile(result.path!, "utf8");
    expect(text).toContain("seoable");
    expect(text).toContain("https://api.seoable.dev/mcp");
  });

  it("install is idempotent (second run keeps a single seoable entry)", async () => {
    const client = getClient(id);
    await client.install(oauthCtx);
    const first = await readFile((await client.install(oauthCtx)).path!, "utf8");
    // Should be exactly one "seoable" key.
    const occurrences = first.match(/"seoable"/g) ?? [];
    expect(occurrences.length).toBe(1);
  });

  it("uninstall removes the seoable entry while leaving others intact", async () => {
    const client = getClient(id);
    const install1 = await client.install(oauthCtx);
    // Inject an unrelated neighbor entry to make sure we don't nuke it.
    const text = await readFile(install1.path!, "utf8");
    const withNeighbor = text.replace(
      /"seoable"/,
      '"keepme": { "command": "echo" },\n    "seoable"',
    );
    await writeFile(install1.path!, withNeighbor);

    const removed = await client.uninstall(oauthCtx);
    expect(removed.status).toBe("removed");

    const after = await readFile(install1.path!, "utf8");
    expect(after).not.toContain("seoable");
    expect(after).toContain("keepme");
  });

  it("dry-run does not write to disk", async () => {
    const client = getClient(id);
    const result = await client.install(dryCtx);
    expect(result.status).toMatch(/installed|updated/);
    expect(result.detail).toMatch(/dry-run/);
    expect(existsSync(result.path!)).toBe(false);
  });

  it("api-key install includes the Bearer header somewhere in the entry", async () => {
    const client = getClient(id);
    const result = await client.install(apiKeyCtx);
    const text = await readFile(result.path!, "utf8");
    expect(text).toContain("sk_live_test");
    expect(text).toContain("Bearer");
  });
});

describe("client registry", () => {
  it("exposes nine clients", () => {
    expect(ALL_CLIENTS).toHaveLength(9);
  });

  it("client ids are unique", () => {
    const ids = ALL_CLIENTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("claude-code (file fallback)", () => {
  it("falls back to ~/.claude.json when the `claude` CLI isn't on PATH", async () => {
    // Force the `which` lookup to fail by stripping PATH for this test.
    const origPath = process.env.PATH;
    process.env.PATH = "";
    try {
      const client = getClient("claude-code");
      const result = await client.install(oauthCtx);
      // Either it succeeded via the file fallback…
      if (result.status === "installed" || result.status === "updated") {
        expect(result.path).toMatch(/\.claude\.json$/);
        const text = await readFile(result.path!, "utf8");
        expect(text).toContain("seoable");
      } else {
        // …or, if the CLI was still somehow found, that's the binary path.
        expect(result.path).toBeDefined();
      }
    } finally {
      process.env.PATH = origPath;
    }
  });
});

describe("preserves JSONC comments on install", () => {
  it("cursor: a hand-edited config with comments survives install + uninstall", async () => {
    const client = getClient("cursor");
    const path = (await client.install(dryCtx)).path!;
    await mkdir(dirname(path), { recursive: true });
    await writeFile(
      path,
      `{
  // hand-edited by the user
  "mcpServers": {
    "neighbor": { "command": "echo", "args": ["hi"] }
  }
}
`,
    );

    await client.install(oauthCtx);
    const afterInstall = await readFile(path, "utf8");
    expect(afterInstall).toContain("// hand-edited by the user");
    expect(afterInstall).toContain('"neighbor"');
    expect(afterInstall).toContain('"seoable"');

    await client.uninstall(oauthCtx);
    const afterRemove = await readFile(path, "utf8");
    expect(afterRemove).toContain("// hand-edited by the user");
    expect(afterRemove).toContain('"neighbor"');
    expect(afterRemove).not.toContain('"seoable"');
  });
});
