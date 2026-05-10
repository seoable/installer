import { paths } from "../lib/paths.js";
import { stdioBridgeEntry } from "../lib/server-config.js";
import type { Client } from "../types.js";
import { detectByConfigPath, mergeJsoncServer, removeJsoncServer } from "./_helpers.js";

const RESTART = "Reload the editor hosting Continue (VS Code / JetBrains).";

const client: Client = {
  id: "continue",
  name: "Continue.dev",
  async detect() {
    return detectByConfigPath(paths.continueConfig());
  },
  async install(ctx) {
    return mergeJsoncServer({
      path: paths.continueConfig(),
      serversKey: ["mcpServers"],
      entry: stdioBridgeEntry(ctx.auth),
      ctx,
      clientName: this.name,
      restartHint: RESTART,
    });
  },
  async uninstall(ctx) {
    return removeJsoncServer({
      path: paths.continueConfig(),
      serversKey: ["mcpServers"],
      ctx,
      clientName: this.name,
    });
  },
};

export default client;
