export const SEOABLE_MCP_URL = "https://api.seoable.dev/mcp";
export const SEOABLE_SERVER_KEY = "seoable";

export type AuthMethod =
  | { kind: "oauth" }
  | { kind: "api-key"; key: string };

export type ClientId =
  | "claude-desktop"
  | "claude-code"
  | "cursor"
  | "vscode"
  | "windsurf"
  | "cline"
  | "zed"
  | "continue"
  | "gemini";

export type InstallStatus =
  | "installed"
  | "updated"
  | "removed"
  | "skipped"
  | "not-detected"
  | "error";

export interface InstallResult {
  status: InstallStatus;
  /** Path that was written to (or would be written to in --dry-run). */
  path?: string;
  /** Human-readable note shown in the summary table. */
  detail?: string;
  /** Restart instruction shown after a successful install. */
  restartHint?: string;
}

export interface InstallContext {
  auth: AuthMethod;
  dryRun: boolean;
}

export interface Client {
  id: ClientId;
  name: string;
  /** Returns true when the client appears to be installed on this machine. */
  detect(): Promise<boolean>;
  install(ctx: InstallContext): Promise<InstallResult>;
  uninstall(ctx: InstallContext): Promise<InstallResult>;
}
