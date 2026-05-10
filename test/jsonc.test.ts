import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { atomicWrite, readJsonc, setIn } from "../src/lib/jsonc.js";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "seoable-jsonc-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("readJsonc", () => {
  it("returns empty object when file doesn't exist", async () => {
    const result = await readJsonc(join(dir, "missing.json"));
    expect(result.exists).toBe(false);
    expect(result.text).toBe("");
    expect(result.value).toEqual({});
  });

  it("parses JSONC with comments and trailing commas", async () => {
    const path = join(dir, "config.json");
    await writeFile(
      path,
      `{
  // comment
  "a": 1,
  /* block */
  "b": [1, 2, 3,],
}
`,
    );
    const result = await readJsonc(path);
    expect(result.exists).toBe(true);
    expect(result.value).toEqual({ a: 1, b: [1, 2, 3] });
  });

  it("throws on malformed JSON instead of clobbering", async () => {
    const path = join(dir, "bad.json");
    await writeFile(path, `{ "a": :: }`);
    await expect(readJsonc(path)).rejects.toThrow(/refusing to overwrite/);
  });
});

describe("setIn", () => {
  it("preserves comments and unrelated keys when adding", () => {
    const input = `{
  // memory server
  "mcpServers": {
    "memory": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-memory"] }
  }
}
`;
    const out = setIn(input, ["mcpServers", "seoable"], {
      type: "http",
      url: "https://api.seoable.dev/mcp",
    });

    expect(out).toContain("// memory server");
    expect(out).toContain('"memory"');
    expect(out).toContain('"seoable"');
    expect(out).toContain('"https://api.seoable.dev/mcp"');
  });

  it("removes a key when value is undefined", () => {
    const input = `{
  "mcpServers": {
    "seoable": { "type": "http", "url": "x" },
    "other": { "command": "echo" }
  }
}
`;
    const out = setIn(input, ["mcpServers", "seoable"], undefined);
    expect(out).not.toContain("seoable");
    expect(out).toContain('"other"');
  });

  it("creates nested structure from an empty file", () => {
    const out = setIn("", ["mcpServers", "seoable"], { url: "x" });
    const parsed = JSON.parse(out);
    expect(parsed).toEqual({ mcpServers: { seoable: { url: "x" } } });
  });
});

describe("atomicWrite", () => {
  it("creates parent directories", async () => {
    const path = join(dir, "deep", "nested", "file.json");
    await atomicWrite(path, '{"ok":true}\n');
    const text = await readFile(path, "utf8");
    expect(text).toBe('{"ok":true}\n');
  });

  it("leaves no temp file behind on success", async () => {
    const path = join(dir, "out.json");
    await atomicWrite(path, "{}\n");
    const fs = await import("node:fs/promises");
    const entries = await fs.readdir(dir);
    expect(entries.filter((e) => e.endsWith(".tmp"))).toHaveLength(0);
  });
});
