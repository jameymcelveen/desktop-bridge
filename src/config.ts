import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { homedir } from 'node:os';
import { BridgeError } from './errors.js';

export const SERVER_NAME = 'DesktopBridge';
export const SERVER_VERSION = '1.0.0';

export type BridgeConfig = {
  roots: string[];
  maxFileBytes: number;
  commandTimeoutMs: number;
  maxOutputBytes: number;
  allowShell: boolean;
  restrictShellCwd: boolean;
};

function parseIntEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new BridgeError(
      'INVALID_ARGUMENT',
      `${name} must be an integer between ${min} and ${max}`,
    );
  }
  return n;
}

function parseBoolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  throw new BridgeError('INVALID_ARGUMENT', `${name} must be a boolean`);
}

export function expandHome(input: string): string {
  if (input === '~') {
    return homedir();
  }
  if (input.startsWith('~/')) {
    return path.join(homedir(), input.slice(2));
  }
  return input;
}

function defaultRoots(): string[] {
  return [
    path.join(homedir(), 'Desktop'),
    path.join(homedir(), 'Documents'),
    path.join(homedir(), 'Downloads'),
    os.tmpdir(),
  ];
}

function resolveExistingRoot(spec: string): string | undefined {
  const abs = path.resolve(expandHome(spec.trim()));
  if (!fs.existsSync(abs)) {
    console.error(`[desktop-bridge] skipping missing root: ${abs}`);
    return undefined;
  }
  try {
    return fs.realpathSync(abs);
  } catch (err) {
    console.error(
      `[desktop-bridge] skipping unreadable root ${abs}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return undefined;
  }
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BridgeConfig {
  const rawRoots = env.DESKTOP_BRIDGE_ROOTS;
  const specs =
    rawRoots === undefined
      ? defaultRoots()
      : rawRoots
          .split(',')
          .map((part) => part.trim())
          .filter((part) => part.length > 0);

  if (specs.length === 0) {
    throw new BridgeError(
      'INVALID_ARGUMENT',
      'DESKTOP_BRIDGE_ROOTS is empty. Provide at least one directory.',
    );
  }

  const resolved = specs.map(resolveExistingRoot).filter((root): root is string => Boolean(root));
  const tmp = resolveExistingRoot(os.tmpdir());
  if (tmp) {
    resolved.push(tmp);
  }
  const roots = [...new Set(resolved)];
  if (roots.length === 0) {
    throw new BridgeError(
      'INVALID_ARGUMENT',
      'No valid allowed roots. Set DESKTOP_BRIDGE_ROOTS to existing directories.',
    );
  }

  return {
    roots,
    maxFileBytes: parseIntEnv('DESKTOP_BRIDGE_MAX_FILE_BYTES', 10 * 1024 * 1024, 1024, 100 * 1024 * 1024),
    commandTimeoutMs: parseIntEnv('DESKTOP_BRIDGE_COMMAND_TIMEOUT_MS', 30_000, 100, 300_000),
    maxOutputBytes: parseIntEnv('DESKTOP_BRIDGE_MAX_OUTPUT_BYTES', 1024 * 1024, 1024, 20 * 1024 * 1024),
    allowShell: parseBoolEnv('DESKTOP_BRIDGE_ALLOW_SHELL', true),
    restrictShellCwd: parseBoolEnv('DESKTOP_BRIDGE_RESTRICT_SHELL_CWD', true),
  };
}
