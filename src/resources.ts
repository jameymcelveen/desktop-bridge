import os from 'node:os';
import type { McpServer } from '@modelcontextprotocol/server';
import { SERVER_NAME, SERVER_VERSION, type BridgeConfig } from './config.js';
import { redactEnv } from './lib/redact.js';
import type { PathGuard } from './lib/paths.js';

export function registerResources(server: McpServer, config: BridgeConfig, paths: PathGuard): void {
  server.registerResource(
    'roots',
    'desktop://roots',
    {
      description: 'Allowed filesystem roots for DesktopBridge file tools',
      mimeType: 'application/json',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify({ roots: paths.roots, maxFileBytes: config.maxFileBytes }, null, 2),
        },
      ],
    }),
  );

  server.registerResource(
    'system-info',
    'desktop://system/info',
    {
      description: 'Host identity, uptime, and redacted environment',
      mimeType: 'application/json',
    },
    async (uri) => {
      const user = os.userInfo();
      const body = {
        server: { name: SERVER_NAME, version: SERVER_VERSION },
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        uptimeSeconds: Math.floor(os.uptime()),
        homeDir: os.homedir(),
        user: user.username,
        env: redactEnv(process.env),
      };
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(body, null, 2),
          },
        ],
      };
    },
  );
}
