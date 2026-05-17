import { describe, it, expect } from "vitest";
import { parseFlags, isNonInteractive } from "../src/cli.js";

describe("isNonInteractive", () => {
  it("treats --dry-run as non-interactive (regression: must not prompt)", () => {
    expect(isNonInteractive(parseFlags(["--dry-run"]))).toBe(true);
  });

  it("treats --yes as non-interactive", () => {
    expect(isNonInteractive(parseFlags(["--yes"]))).toBe(true);
    expect(isNonInteractive(parseFlags(["-y"]))).toBe(true);
  });

  it("is interactive by default (no flags)", () => {
    expect(isNonInteractive(parseFlags([]))).toBe(false);
  });

  it("--client alone does not imply non-interactive", () => {
    expect(isNonInteractive(parseFlags(["--client", "cursor"]))).toBe(false);
  });

  it("--dry-run stays non-interactive alongside other flags", () => {
    expect(
      isNonInteractive(parseFlags(["--dry-run", "--client", "cursor"])),
    ).toBe(true);
  });
});
