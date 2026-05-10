import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { paths } from "../lib/paths.js";
import { stdioBridgeEntry } from "../lib/server-config.js";
import type { Client } from "../types.js";
import { mergeJsoncServer, removeJsoncServer } from "./_helpers.js";

const RESTART = "Reopen VS Code (or reload window) to pick up Cline's new MCP server.";

const client: Client = {
  id: "cline",
  name: "Cline",
  async detect() {
    // Cline's global storage dir only exists after the extension has run at
    // least once. Detect by the storage dir, not just any VS Code presence.
    return existsSync(dirname(paths.clineSettings()));
  },
  async install(ctx) {
    return mergeJsoncServer({
      path: paths.clineSettings(),
      serversKey: ["mcpServers"],
      entry: stdioBridgeEntry(ctx.auth),
      ctx,
      clientName: this.name,
      restartHint: RESTART,
    });
  },
  async uninstall(ctx) {
    return removeJsoncServer({
      path: paths.clineSettings(),
      serversKey: ["mcpServers"],
      ctx,
      clientName: this.name,
    });
  },
};

export default client;
