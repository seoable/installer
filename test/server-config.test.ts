import { describe, expect, it } from "vitest";
import { remoteHttpEntry, stdioBridgeEntry } from "../src/lib/server-config.js";
import { SEOABLE_MCP_URL } from "../src/types.js";

describe("remoteHttpEntry", () => {
  it("emits a bare HTTP entry for OAuth", () => {
    expect(remoteHttpEntry({ kind: "oauth" })).toEqual({
      type: "http",
      url: SEOABLE_MCP_URL,
    });
  });

  it("adds Authorization header for API key", () => {
    expect(remoteHttpEntry({ kind: "api-key", key: "sk_live_xyz" })).toEqual({
      type: "http",
      url: SEOABLE_MCP_URL,
      headers: { Authorization: "Bearer sk_live_xyz" },
    });
  });
});

describe("stdioBridgeEntry", () => {
  it("uses npx + mcp-remote for OAuth", () => {
    expect(stdioBridgeEntry({ kind: "oauth" })).toEqual({
      command: "npx",
      args: ["-y", "mcp-remote", SEOABLE_MCP_URL],
    });
  });

  it("appends --header for API key", () => {
    expect(stdioBridgeEntry({ kind: "api-key", key: "sk_test_abc" })).toEqual({
      command: "npx",
      args: [
        "-y",
        "mcp-remote",
        SEOABLE_MCP_URL,
        "--header",
        "Authorization: Bearer sk_test_abc",
      ],
    });
  });
});
