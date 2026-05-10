import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import {
  applyEdits,
  modify,
  parse,
  parseTree,
  type JSONPath,
  type Node,
} from "jsonc-parser";

const FORMAT_OPTS = { tabSize: 2, insertSpaces: true, eol: "\n" } as const;

/**
 * Read a JSON or JSONC file and return its raw text plus the parsed value.
 * Missing files yield `{ text: "", value: {} }` so callers can treat
 * "create" and "update" the same way.
 */
export async function readJsonc(path: string): Promise<{
  text: string;
  value: unknown;
  exists: boolean;
}> {
  if (!existsSync(path)) {
    return { text: "", value: {}, exists: false };
  }
  const text = await readFile(path, "utf8");
  if (text.trim() === "") {
    return { text: "", value: {}, exists: true };
  }
  const errors: { error: number; offset: number; length: number }[] = [];
  const value = parse(text, errors, { allowTrailingComma: true });
  if (errors.length > 0) {
    throw new Error(
      `Failed to parse ${path}: ${errors.length} JSONC error(s); refusing to overwrite. ` +
        `Fix the file manually or move it aside, then re-run.`,
    );
  }
  return { text, value, exists: true };
}

/**
 * Atomically write `content` to `path`, creating parent directories as needed.
 * Writes to a sibling temp file and renames so a crash mid-write can never
 * leave a half-written config behind.
 */
export async function atomicWrite(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, content, "utf8");
  await rename(tmp, path);
}

/**
 * Set the value at `jsonPath` in JSONC text, preserving comments and
 * surrounding formatting. If `value` is undefined, the property is removed.
 */
export function setIn(text: string, jsonPath: JSONPath, value: unknown): string {
  const edits = modify(text || "{}\n", jsonPath, value, { formattingOptions: FORMAT_OPTS });
  return applyEdits(text || "{}\n", edits);
}

/**
 * Read the parse tree (for advanced inspections like "does this path exist?").
 */
export function tree(text: string): Node | undefined {
  return parseTree(text, [], { allowTrailingComma: true });
}

export function pretty(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
