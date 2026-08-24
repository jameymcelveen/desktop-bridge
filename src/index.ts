#!/usr/bin/env node
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { loadConfig, SERVER_NAME, SERVER_VERSION } from './config.js';
import { startHeartbeat } from './lib/heartbeat.js';
import { PathGuard } from './lib/paths.js';
import { createServer } from './server.js';

function main(): void {
  try {
    const config = loadConfig();
    const paths = new PathGuard(config.roots);
    console.error(
      `[desktop-bridge] ${SERVER_NAME} v${SERVER_VERSION} starting (${paths.roots.length} root(s))`,
    );
    for (const root of paths.roots) {
      console.error(`[desktop-bridge] root: ${root}`);
    }
    startHeartbeat(config, paths);
    serveStdio(() => createServer(config, paths));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[desktop-bridge] fatal: ${message}`);
    process.exitCode = 1;
  }
}

main();
