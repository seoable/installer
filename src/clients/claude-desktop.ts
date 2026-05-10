import { paths } from "../lib/paths.js";
import { remoteHttpEntry } from "../lib/server-config.js";
import type { Client } from "../types.js";
import { detectByConfigPath, mergeJsoncServer, removeJsoncServer } from "./_helpers.js";

const RESTART = "Quit and reopen Claude Desktop (Cmd/Ctrl+Q, not just close-window).";

const client: Client = {
  id: "claude-desktop",
  name: "Claude Desktop",
  async detect() {
    return detectByConfigPath(paths.claudeDesktopConfig());
  },
  async install(ctx) {
    return mergeJsoncServer({
      path: paths.claudeDesktopConfig(),
      serversKey: ["mcpServers"],
      entry: remoteHttpEntry(ctx.auth),
      ctx,
      clientName: this.name,
      restartHint: RESTART,
    });
  },
  async uninstall(ctx) {
    return removeJsoncServer({
      path: paths.claudeDesktopConfig(),
      serversKey: ["mcpServers"],
      ctx,
      clientName: this.name,
    });
  },
};

export default client;
