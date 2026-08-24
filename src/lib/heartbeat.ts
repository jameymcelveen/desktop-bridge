import os from 'node:os';
import { SERVER_NAME, SERVER_VERSION, type BridgeConfig } from '../config.js';
import type { PathGuard } from './paths.js';

export type HeartbeatPayload = {
  server: string;
  version: string;
  hostname: string;
  platform: string;
  arch: string;
  release: string;
  uptimeSeconds: number;
  pid: number;
  allowShell: boolean;
  rootCount: number;
  loadAverage: number[];
  memory: { totalBytes: number; freeBytes: number };
};

export function buildHeartbeat(config: BridgeConfig, paths: PathGuard): HeartbeatPayload {
  return {
    server: SERVER_NAME,
    version: SERVER_VERSION,
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    uptimeSeconds: Math.floor(os.uptime()),
    pid: process.pid,
    allowShell: config.allowShell,
    rootCount: paths.roots.length,
    loadAverage: os.loadavg(),
    memory: { totalBytes: os.totalmem(), freeBytes: os.freemem() },
  };
}

export function startHeartbeat(config: BridgeConfig, paths: PathGuard): () => void {
  if (!config.statusUrl || !config.statusToken) {
    return () => undefined;
  }

  const url = config.statusUrl;
  const token = config.statusToken;

  const tick = (): void => {
    void fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildHeartbeat(config, paths)),
    }).catch((err: unknown) => {
      console.error(
        `[desktop-bridge] heartbeat failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  };

  tick();
  const handle = setInterval(tick, config.statusIntervalMs);
  handle.unref();
  console.error(`[desktop-bridge] status heartbeat → ${url} every ${config.statusIntervalMs}ms`);
  return () => clearInterval(handle);
}
