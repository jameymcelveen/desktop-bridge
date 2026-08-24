import os from 'node:os';
import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { AppContext } from '../context.js';
import { jsonResult, toolError } from '../lib/result.js';
import { runCommand } from '../lib/process.js';
import { assertMacOS } from '../lib/macos.js';
import { redactEnv } from '../lib/redact.js';

function cpuTimes(): { idle: number; total: number } {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    idle += cpu.times.idle;
    total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
  }
  return { idle, total };
}

async function sampleCpuPercent(sampleMs = 150): Promise<number> {
  const a = cpuTimes();
  await new Promise((resolve) => {
    setTimeout(resolve, sampleMs);
  });
  const b = cpuTimes();
  const idle = b.idle - a.idle;
  const total = b.total - a.total;
  if (total <= 0) {
    return 0;
  }
  return Math.round((1 - idle / total) * 1000) / 10;
}

function parseDf(stdout: string): Array<{
  filesystem: string;
  sizeBytes: number;
  usedBytes: number;
  availableBytes: number;
  capacityPercent: number;
  mount: string;
}> {
  const lines = stdout.trim().split('\n').slice(1);
  const disks: ReturnType<typeof parseDf> = [];
  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length < 6) {
      continue;
    }
    const mount = parts.slice(5).join(' ');
    const sizeKb = Number(parts[1]);
    const usedKb = Number(parts[2]);
    const availKb = Number(parts[3]);
    const cap = Number.parseInt(parts[4] ?? '0', 10);
    if (!Number.isFinite(sizeKb)) {
      continue;
    }
    disks.push({
      filesystem: parts[0] ?? '',
      sizeBytes: sizeKb * 1024,
      usedBytes: usedKb * 1024,
      availableBytes: availKb * 1024,
      capacityPercent: cap,
      mount,
    });
  }
  return disks;
}

function parseOsaList(raw: string): Array<{
  name: string;
  pid: number;
  backgroundOnly: boolean;
  visible: boolean;
}> {
  const tokens = raw.split(', ').map((item) => item.trim());
  if (tokens.length === 0 || (tokens.length === 1 && tokens[0] === '')) {
    return [];
  }
  if (tokens.length % 4 !== 0) {
    return [{ name: raw, pid: -1, backgroundOnly: false, visible: true }];
  }
  const group = tokens.length / 4;
  const apps: Array<{ name: string; pid: number; backgroundOnly: boolean; visible: boolean }> = [];
  for (let i = 0; i < group; i += 1) {
    const name = tokens[i] ?? '';
    const pid = Number.parseInt(tokens[i + group] ?? '', 10);
    const backgroundOnly = (tokens[i + group * 2] ?? '').toLowerCase() === 'true';
    const visible = (tokens[i + group * 3] ?? '').toLowerCase() === 'true';
    apps.push({ name, pid: Number.isFinite(pid) ? pid : -1, backgroundOnly, visible });
  }
  apps.sort((a, b) => a.name.localeCompare(b.name));
  return apps;
}

export function registerSystemTools(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    'get_system_stats',
    {
      title: 'Get system stats',
      description: 'CPU percent (short sample), load average, memory, and disk usage (df -kP).',
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async () => {
      try {
        const [cpuPercent, df] = await Promise.all([
          sampleCpuPercent(),
          runCommand({
            command: 'df',
            args: ['-kP'],
            cwd: os.homedir(),
            timeoutMs: 8_000,
            maxOutputBytes: ctx.config.maxOutputBytes,
            shell: false,
          }),
        ]);
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        const load = os.loadavg();
        const cpus = os.cpus();
        return jsonResult({
          cpu: {
            percent: cpuPercent,
            cores: cpus.length,
            model: cpus[0]?.model ?? 'unknown',
            loadAverage: { '1m': load[0], '5m': load[1], '15m': load[2] },
          },
          memory: {
            totalBytes: total,
            freeBytes: free,
            usedBytes: used,
            usedPercent: Math.round((used / total) * 1000) / 10,
          },
          disks: parseDf(df.stdout),
        });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.registerTool(
    'get_system_info',
    {
      title: 'Get system info',
      description:
        'Hostname, OS, architecture, uptime, user, home, and environment variables. Secret-looking keys are redacted.',
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async () => {
      try {
        const user = os.userInfo();
        return jsonResult({
          hostname: os.hostname(),
          platform: os.platform(),
          type: os.type(),
          release: os.release(),
          arch: os.arch(),
          endianness: os.endianness(),
          uptimeSeconds: Math.floor(os.uptime()),
          bootTime: new Date(Date.now() - os.uptime() * 1000).toISOString(),
          homeDir: os.homedir(),
          tmpDir: os.tmpdir(),
          user: { username: user.username, uid: user.uid, gid: user.gid, shell: user.shell },
          node: { version: process.version, execPath: process.execPath, pid: process.pid },
          env: redactEnv(process.env),
        });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.registerTool(
    'list_applications',
    {
      title: 'List running applications',
      description:
        'Foreground macOS application processes from System Events (name, pid, visible). includeBackground includes agents.',
      inputSchema: z.object({
        includeBackground: z
          .boolean()
          .default(false)
          .describe('If true, list all processes, not just non-background apps'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ includeBackground }) => {
      try {
        assertMacOS();
        const script = includeBackground
          ? 'tell application "System Events" to get {name, unix id, background only, visible} of every process'
          : 'tell application "System Events" to get {name, unix id, background only, visible} of every process whose background only is false';
        const result = await runCommand({
          command: 'osascript',
          args: ['-e', script],
          cwd: os.homedir(),
          timeoutMs: 15_000,
          maxOutputBytes: ctx.config.maxOutputBytes,
          shell: false,
        });
        if (result.exitCode !== 0) {
          return jsonResult(
            {
              error: 'osascript failed',
              stderr: result.stderr,
              stdout: result.stdout,
              hint: 'Grant Automation permission for System Events if macOS prompted.',
            },
            true,
          );
        }
        const apps = parseOsaList(result.stdout.trim());
        return jsonResult({ count: apps.length, applications: apps });
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
