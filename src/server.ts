import { McpServer } from '@modelcontextprotocol/server';
import { SERVER_NAME, SERVER_VERSION, type BridgeConfig } from './config.js';
import type { AppContext } from './context.js';
import { BRIDGE_ICON } from './icons.js';
import { PathGuard } from './lib/paths.js';
import { registerPrompts } from './prompts.js';
import { registerResources } from './resources.js';
import { registerClipboardTools } from './tools/clipboard.js';
import { registerFileTools } from './tools/files.js';
import { registerScreenTools } from './tools/screen.js';
import { registerShellTools } from './tools/shell.js';
import { registerSystemTools } from './tools/system.js';

export function createServer(config: BridgeConfig, paths: PathGuard = new PathGuard(config.roots)): McpServer {
  const ctx: AppContext = { config, paths };

  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
      title: 'DesktopBridge',
      description:
        'Local Mac desktop bridge: files (allowlisted roots), system stats, shell, clipboard, and screenshots.',
      icons: [BRIDGE_ICON],
    },
    {
      instructions: [
        "You are connected to DesktopBridge on the user's Mac.",
        'Call list_roots before file operations. Paths outside those directories are rejected.',
        'run_command executes locally with a timeout; stdout and stderr are separate.',
        'Screenshots need Screen Recording permission for the host app. Clipboard uses pbpaste/pbcopy.',
        'Do not dump secrets from the environment; sensitive keys are already redacted.',
      ].join(' '),
    },
  );

  registerFileTools(server, ctx);
  registerSystemTools(server, ctx);
  registerShellTools(server, ctx);
  registerClipboardTools(server, ctx);
  registerScreenTools(server, ctx);
  registerResources(server, config, paths);
  registerPrompts(server);

  return server;
}
