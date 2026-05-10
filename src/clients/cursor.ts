import { paths } from "../lib/paths.js";
import { remoteHttpEntry } from "../lib/server-config.js";
import type { Client } from "../types.js";
import { detectByConfigPath, mergeJsoncServer, removeJsoncServer } from "./_helpers.js";

const RESTART = "Reload Cursor (Cmd/Ctrl+Shift+P → 'Reload Window').";

const client: Client = {
  id: "cursor",
  name: "Cursor",
  async detect() {
    return detectByConfigPath(paths.cursorConfig());
  },
  async install(ctx) {
    return mergeJsoncServer({
      path: paths.cursorConfig(),
      serversKey: ["mcpServers"],
      entry: remoteHttpEntry(ctx.auth),
      ctx,
      clientName: this.name,
      restartHint: RESTART,
    });
  },
  async uninstall(ctx) {
    return removeJsoncServer({
      path: paths.cursorConfig(),
      serversKey: ["mcpServers"],
      ctx,
      clientName: this.name,
    });
  },
};

export default client;
