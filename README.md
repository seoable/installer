# @seoable/install

One-command installer for the [Seoable MCP server](https://seoable.dev/docs/mcp). Detects every MCP-aware app on your machine and wires up `https://api.seoable.dev/mcp` so you can use Seoable's SEO tools directly inside Claude, Cursor, VS Code, Windsurf, and friends.

```bash
npx -y @seoable/install
```

That's it. The installer:

1. Detects which MCP-aware clients you have installed.
2. Asks which ones to configure.
3. Merges a `seoable` server entry into each client's MCP config (preserving comments and existing servers).
4. Tells you which apps to restart.

OAuth is the default — the first time you use a tool, the client opens a browser to authorize against your Seoable account. If you prefer an API key, run with `--api-key sk_live_...`.

## Supported clients

| Client | Transport | Notes |
| --- | --- | --- |
| Claude Desktop | Remote HTTP | macOS, Windows, Linux |
| Claude Code | Remote HTTP | Uses the `claude mcp add` CLI when available |
| Cursor | Remote HTTP | `~/.cursor/mcp.json` |
| VS Code (Copilot) | Remote HTTP | User `mcp.json`, JSONC preserved |
| Windsurf | stdio via `mcp-remote` | `~/.codeium/windsurf/mcp_config.json` |
| Cline | stdio via `mcp-remote` | VS Code global storage |
| Zed | stdio via `mcp-remote` | `settings.json` `context_servers` key |
| Continue.dev | stdio via `mcp-remote` | `~/.continue/config.json` |
| Gemini CLI | stdio via `mcp-remote` | `~/.gemini/settings.json` |

Clients that natively speak remote HTTP get the URL directly. Stdio-only clients get a `npx mcp-remote https://api.seoable.dev/mcp` bridge, which handles the OAuth dance in a browser.

## Usage

```bash
# Interactive — pick clients from a checklist
npx -y @seoable/install

# Non-interactive: configure everything detected
npx -y @seoable/install --yes

# Limit to specific clients
npx -y @seoable/install --client cursor,claude-desktop

# Use an API key instead of OAuth
npx -y @seoable/install --api-key sk_live_xxxxxxxxxxxx

# Preview without writing
npx -y @seoable/install --dry-run

# Remove Seoable from every client
npx -y @seoable/install --remove
```

## Flags

| Flag | Description |
| --- | --- |
| `--client <ids>` | Comma-separated client ids to target (skips detection prompt). |
| `--api-key <key>` | Use a Bearer API key instead of OAuth. |
| `--yes`, `-y` | Skip prompts; install to all detected clients. |
| `--dry-run` | Print planned changes without writing. |
| `--remove`, `--uninstall` | Remove the Seoable entry from every (selected) client. |
| `--help`, `-h` | Print usage. |
| `--version`, `-v` | Print version. |

## Programmatic use

```ts
import { install, listClients } from "@seoable/install";

const detected = await listClients({ detectedOnly: true });
await install({ clients: detected.map((c) => c.id), auth: { kind: "oauth" } });
```

## License

MIT
