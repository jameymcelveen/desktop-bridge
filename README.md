# DesktopBridge 🌉

Local **Model Context Protocol** server for macOS. Claude (or any MCP host) talks to it over **stdio** and can:

- Read, write, list, and search files inside **allowlisted directories**
- Read CPU / memory / disk stats, uptime, and a redacted environment
- List running applications
- Run shell commands with **separate stdout/stderr**, timeouts, and optional progress streaming
- Read and write the clipboard
- Capture screenshots and list displays

This process has the same OS rights as the user who launched it. Treat it like giving the model a terminal on your Mac, then shrink that blast radius with `DESKTOP_BRIDGE_ROOTS`.

## Requirements

- macOS (clipboard, screenshots, and application listing use Apple tools)
- Node.js **20.19+** (22 LTS recommended)

## Install

```bash
cd desktop-bridge
npm install
npm run build
npm test
```

The compiled entrypoint is `dist/index.js`.

## Connect to Claude Desktop

1. Build the server (`npm run build`).
2. Open **Claude Desktop → Settings → Developer → Edit Config**.
3. Merge the block from [`claude_desktop_config.example.json`](./claude_desktop_config.example.json), replacing the path and usernames:

```json
{
  "mcpServers": {
    "desktop-bridge": {
      "command": "node",
      "args": ["/Users/YOU/dev/desktop-bridge/dist/index.js"],
      "env": {
        "DESKTOP_BRIDGE_ROOTS": "/Users/YOU/Desktop,/Users/YOU/Documents,/Users/YOU/Downloads"
      }
    }
  }
}
```

4. Fully quit and reopen Claude Desktop.
5. Confirm **desktop-bridge** appears under MCP tools (bridge icon 🌉).

Config file on macOS:

`~/Library/Application Support/Claude/claude_desktop_config.json`

## Connect to Claude Code

```bash
claude mcp add desktop-bridge -- node /Users/YOU/dev/desktop-bridge/dist/index.js
```

Or add the same `command` / `args` / `env` block to `~/.claude.json`.

## Connect to Cursor

Add to `~/.cursor/mcp.json` (or the project `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "desktop-bridge": {
      "command": "node",
      "args": ["/Users/YOU/dev/desktop-bridge/dist/index.js"]
    }
  }
}
```

## Smoke-test without a host

```bash
npm run inspector
```

That launches the MCP Inspector against the built stdio server. Call `list_roots`, then `get_system_info`.

Logs go to **stderr** only. Do not `console.log` in this process — stdout is the JSON-RPC channel.

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `DESKTOP_BRIDGE_ROOTS` | `~/Desktop`, `~/Documents`, `~/Downloads` (if they exist) | Comma-separated directories file tools may touch. The OS temp dir is always added so screenshots have a place to land. |
| `DESKTOP_BRIDGE_MAX_FILE_BYTES` | `10485760` | Max size for a single file read/write (1 KiB–100 MiB). |
| `DESKTOP_BRIDGE_COMMAND_TIMEOUT_MS` | `30000` | Default `run_command` timeout (100–300000). |
| `DESKTOP_BRIDGE_MAX_OUTPUT_BYTES` | `1048576` | Combined stdout+stderr capture cap. Excess output kills the process and sets `truncated`. |
| `DESKTOP_BRIDGE_ALLOW_SHELL` | `true` | Set `false` to disable `run_command`. |
| `DESKTOP_BRIDGE_RESTRICT_SHELL_CWD` | `true` | When true, `run_command` cwd must sit inside an allowed root. |
| `DESKTOP_BRIDGE_STATUS_URL` | unset | Heartbeat POST URL for the status site (`…/api/heartbeat`). |
| `DESKTOP_BRIDGE_STATUS_TOKEN` | unset | Bearer token matching the site’s `HEARTBEAT_TOKEN`. |
| `DESKTOP_BRIDGE_STATUS_INTERVAL_MS` | `15000` | Heartbeat interval (5s–5m). |

Copy [`.env.example`](./.env.example) for a commented template. The server reads **process env** (Claude Desktop `env` block), not a `.env` file.

## Tools

| Tool | What it does |
| --- | --- |
| `list_roots` | Allowed directories and file-size cap |
| `read_file` | Text (optional line window) or base64 |
| `write_file` | Create/overwrite/append; optional `mkdir -p` |
| `list_directory` | Name, type, size, mtime, mode |
| `search_files` | Glob on names and/or regex on file contents |
| `get_system_stats` | CPU %, load, memory, `df` |
| `get_system_info` | Host, uptime, user, redacted env |
| `list_applications` | GUI (or all) processes via System Events |
| `run_command` | Shell with split stdout/stderr; `stream` → progress notifications |
| `read_clipboard` / `write_clipboard` | `pbpaste` / `pbcopy` |
| `get_display_info` | Display name, main flag, scale, frame |
| `take_screenshot` | PNG via `screencapture`; returns an image block when ≤ 5 MiB |

Resources: `desktop://roots`, `desktop://system/info`.  
Prompts: `inspect_desktop`, `find_file`.

## Security model

- **Files:** every path is `realpath`'d. The resolved path must stay inside a configured root. `..`, extra slashes, and symlinks that escape are rejected.
- **Home is not a default root.** That keeps `~/.ssh` and similar out of reach until you add them on purpose.
- **Shell:** still a full user shell. A command can `cd` anywhere even when cwd is restricted. Disable it with `DESKTOP_BRIDGE_ALLOW_SHELL=false` if you only want file/clipboard/screen tools.
- **Env:** keys matching password/token/secret/key/credential/cookie/session are replaced with `[redacted]`.
- **Stdio:** no network listener. The host spawns this process.

## macOS permissions

| Feature | Permission |
| --- | --- |
| Screenshots | **Screen Recording** for the app that spawned Node (Claude Desktop, Cursor, or Terminal) |
| `list_applications` | **Automation → System Events** if macOS prompts |
| Accessibility-heavy apps | may still hide titles; the tool lists process names either way |

If `screencapture` fails, open **System Settings → Privacy & Security → Screen Recording** and enable the host app, then restart it.

## Development

```bash
npm run build    # tsc → dist/
npm start        # node dist/index.js (stdio)
npm test         # compile + node:test
```

Layout: `src/lib/*` (path guard, process runner, glob/search), `src/tools/*` (MCP tools), `src/index.ts` (stdio entry).

## Status site

`web/` is a small Node app (no extra npm packages). Sign-in requires an `@mcelveen.us` email plus the site password (Railway/Vercel env `STATUS_PASSWORD`).

The Mac running DesktopBridge POSTs a heartbeat; the dashboard shows **online** (last 45s), **stale**, or **offline**.

- Site (Railway): https://status-production-84a0.up.railway.app/
- Alias (Vercel): https://desktop-bridge-status.vercel.app/ (redirects to Railway)

On the Mac, add to the MCP server env:

```
DESKTOP_BRIDGE_STATUS_URL=https://status-production-84a0.up.railway.app/api/heartbeat
DESKTOP_BRIDGE_STATUS_TOKEN=<HEARTBEAT_TOKEN from Railway>
```

## License

MIT
