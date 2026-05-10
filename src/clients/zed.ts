import { paths } from "../lib/paths.js";
import { stdioBridgeEntry } from "../lib/server-config.js";
import type { Client } from "../types.js";
import { detectByConfigPath, mergeJsoncServer, removeJsoncServer } from "./_helpers.js";

const RESTART = "Restart Zed for the new MCP server to register.";

const client: Client = {
  id: "zed",
  name: "Zed",
  async detect() {
    return detectByConfigPath(paths.zedSettings());
  },
  async install(ctx) {
    return mergeJsoncServer({
      path: paths.zedSettings(),
      serversKey: ["context_servers"],
      entry: stdioBridgeEntry(ctx.auth),
      ctx,
      clientName: this.name,
      restartHint: RESTART,
    });
  },
  async uninstall(ctx) {
    return removeJsoncServer({
      path: paths.zedSettings(),
      serversKey: ["context_servers"],
      ctx,
      clientName: this.name,
    });
  },
};

export default client;
