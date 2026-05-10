import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { paths } from "../lib/paths.js";
import { remoteHttpEntry } from "../lib/server-config.js";
import type { Client } from "../types.js";
import { mergeJsoncServer, removeJsoncServer } from "./_helpers.js";

// VS Code user MCP config uses `servers` as the root key (not `mcpServers`)
// and the file is JSONC. We detect by looking for the User dir VS Code uses
// for either `settings.json` or `mcp.json`.
const RESTART = "Reload VS Code (Cmd/Ctrl+Shift+P → 'Developer: Reload Window').";

function vscodeUserDirExists(): boolean {
  return existsSync(dirname(paths.vscodeUserMcp())) || existsSync(dirname(paths.vscodeUserSettings()));
}

const client: Client = {
  id: "vscode",
  name: "VS Code (Copilot)",
  async detect() {
    return vscodeUserDirExists();
  },
  async install(ctx) {
    return mergeJsoncServer({
      path: paths.vscodeUserMcp(),
      serversKey: ["servers"],
      entry: remoteHttpEntry(ctx.auth),
      ctx,
      clientName: this.name,
      restartHint: RESTART,
    });
  },
  async uninstall(ctx) {
    return removeJsoncServer({
      path: paths.vscodeUserMcp(),
      serversKey: ["servers"],
      ctx,
      clientName: this.name,
    });
  },
};

export default client;
