import { paths } from "../lib/paths.js";
import { stdioBridgeEntry } from "../lib/server-config.js";
import type { Client } from "../types.js";
import { detectByConfigPath, mergeJsoncServer, removeJsoncServer } from "./_helpers.js";

const RESTART = "Restart the Gemini CLI session to load the new MCP server.";

const client: Client = {
  id: "gemini",
  name: "Gemini CLI",
  async detect() {
    return detectByConfigPath(paths.geminiSettings());
  },
  async install(ctx) {
    return mergeJsoncServer({
      path: paths.geminiSettings(),
      serversKey: ["mcpServers"],
      entry: stdioBridgeEntry(ctx.auth),
      ctx,
      clientName: this.name,
      restartHint: RESTART,
    });
  },
  async uninstall(ctx) {
    return removeJsoncServer({
      path: paths.geminiSettings(),
      serversKey: ["mcpServers"],
      ctx,
      clientName: this.name,
    });
  },
};

export default client;
