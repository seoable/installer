import { homedir, platform } from "node:os";
import { join } from "node:path";

// All path lookups are lazy. `os.homedir()` and platform() are re-read every
// call so tests can sandbox by setting `process.env.HOME` between cases.

export const isMac = (): boolean => platform() === "darwin";
export const isWindows = (): boolean => platform() === "win32";
export const isLinux = (): boolean => platform() === "linux";

function envPath(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

/** Platform-appropriate "user application data" root. */
export function appDataDir(): string {
  if (isWindows()) return envPath("APPDATA") ?? join(homedir(), "AppData", "Roaming");
  if (isMac()) return join(homedir(), "Library", "Application Support");
  return envPath("XDG_CONFIG_HOME") ?? join(homedir(), ".config");
}

export function home(...segments: string[]): string {
  return join(homedir(), ...segments);
}

export function appData(...segments: string[]): string {
  return join(appDataDir(), ...segments);
}

export const paths = {
  claudeDesktopConfig: (): string => appData("Claude", "claude_desktop_config.json"),
  claudeCodeUserConfig: (): string => home(".claude.json"),
  cursorConfig: (): string => home(".cursor", "mcp.json"),
  vscodeUserMcp: (): string => {
    if (isWindows()) return appData("Code", "User", "mcp.json");
    if (isMac()) return home("Library", "Application Support", "Code", "User", "mcp.json");
    return home(".config", "Code", "User", "mcp.json");
  },
  vscodeUserSettings: (): string => {
    if (isWindows()) return appData("Code", "User", "settings.json");
    if (isMac()) return home("Library", "Application Support", "Code", "User", "settings.json");
    return home(".config", "Code", "User", "settings.json");
  },
  windsurfConfig: (): string => home(".codeium", "windsurf", "mcp_config.json"),
  clineSettings: (): string => {
    const base = (() => {
      if (isWindows()) return appData("Code", "User");
      if (isMac()) return home("Library", "Application Support", "Code", "User");
      return home(".config", "Code", "User");
    })();
    return join(base, "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json");
  },
  zedSettings: (): string => {
    if (isWindows()) return appData("Zed", "settings.json");
    return home(".config", "zed", "settings.json");
  },
  continueConfig: (): string => home(".continue", "config.json"),
  geminiSettings: (): string => home(".gemini", "settings.json"),
} as const;
