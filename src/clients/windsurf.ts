import { paths } from "../lib/paths.js";
import { stdioBridgeEntry } from "../lib/server-config.js";
import type { Client } from "../types.js";
import { detectByConfigPath, mergeJsoncServer, removeJsoncServer } from "./_helpers.js";

const RESTART = "Reload Windsurf (Cmd/Ctrl+Shift+P → 'Reload Window').";

const client: Client = {
  id: "windsurf",
  name: "Windsurf",
  async detect() {
    return detectByConfigPath(paths.windsurfConfig());
  },
  async install(ctx) {
    return mergeJsoncServer({
      path: paths.windsurfConfig(),
      serversKey: ["mcpServers"],
      entry: stdioBridgeEntry(ctx.auth),
      ctx,
      clientName: this.name,
      restartHint: RESTART,
    });
  },
  async uninstall(ctx) {
    return removeJsoncServer({
      path: paths.windsurfConfig(),
      serversKey: ["mcpServers"],
      ctx,
      clientName: this.name,
    });
  },
};

export default client;
