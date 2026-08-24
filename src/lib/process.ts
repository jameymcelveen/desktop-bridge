import { spawn, type ChildProcess } from 'node:child_process';
import { BridgeError } from '../errors.js';

export type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  truncated: boolean;
  durationMs: number;
};

export type RunCommandOptions = {
  command: string;
  args?: string[];
  cwd: string;
  timeoutMs: number;
  maxOutputBytes: number;
  shell?: boolean;
  input?: string;
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
};

function killProcessTree(child: ChildProcess): void {
  if (child.pid === undefined) {
    return;
  }
  try {
    if (process.platform === 'win32') {
      child.kill('SIGKILL');
      return;
    }
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    try {
      child.kill('SIGKILL');
    } catch {
      // already gone
    }
  }
}

export async function runCommand(options: RunCommandOptions): Promise<CommandResult> {
  const command = options.command.trim();
  if (command.length === 0) {
    throw new BridgeError('INVALID_ARGUMENT', 'Command must not be empty');
  }
  if (command.length > 32_768) {
    throw new BridgeError('INVALID_ARGUMENT', 'Command exceeds 32 KiB');
  }

  const started = Date.now();
  const stdoutDecoder = new TextDecoder('utf-8', { fatal: false });
  const stderrDecoder = new TextDecoder('utf-8', { fatal: false });
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let stdout = '';
  let stderr = '';
  let truncated = false;
  let timedOut = false;

  const useShell = options.shell ?? options.args === undefined;
  const spawnStdin = options.input === undefined ? 'ignore' : 'pipe';

  const child = useShell
    ? spawn(command, {
        shell: process.env.SHELL || true,
        cwd: options.cwd,
        env: options.env ?? process.env,
        stdio: [spawnStdin, 'pipe', 'pipe'],
        detached: process.platform !== 'win32',
      })
    : spawn(command, options.args ?? [], {
        cwd: options.cwd,
        env: options.env ?? process.env,
        stdio: [spawnStdin, 'pipe', 'pipe'],
        detached: process.platform !== 'win32',
      });

  const append = (kind: 'stdout' | 'stderr', chunk: Buffer): void => {
    if (truncated) {
      return;
    }
    const nextTotal = stdoutBytes + stderrBytes + chunk.byteLength;
    const allowed = Math.max(0, options.maxOutputBytes - (stdoutBytes + stderrBytes));
    const slice = chunk.byteLength > allowed ? chunk.subarray(0, allowed) : chunk;
    if (kind === 'stdout') {
      const text = stdoutDecoder.decode(slice, { stream: true });
      stdout += text;
      stdoutBytes += slice.byteLength;
      options.onStdout?.(text);
    } else {
      const text = stderrDecoder.decode(slice, { stream: true });
      stderr += text;
      stderrBytes += slice.byteLength;
      options.onStderr?.(text);
    }
    if (nextTotal > options.maxOutputBytes) {
      truncated = true;
      killProcessTree(child);
    }
  };

  child.stdout?.on('data', (chunk: Buffer) => append('stdout', chunk));
  child.stderr?.on('data', (chunk: Buffer) => append('stderr', chunk));

  if (options.input !== undefined) {
    child.stdin?.end(options.input);
  }

  const abort = (): void => killProcessTree(child);
  options.signal?.addEventListener('abort', abort, { once: true });

  let timeout: NodeJS.Timeout | undefined;
  try {
    const result = await new Promise<CommandResult>((resolve, reject) => {
      child.on('error', reject);

      timeout = setTimeout(() => {
        timedOut = true;
        killProcessTree(child);
      }, options.timeoutMs);

      child.on('close', (exitCode, signal) => {
        stdout += stdoutDecoder.decode();
        stderr += stderrDecoder.decode();
        resolve({
          stdout,
          stderr,
          exitCode,
          signal,
          timedOut,
          truncated,
          durationMs: Date.now() - started,
        });
      });
    });

    return result;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
    options.signal?.removeEventListener('abort', abort);
  }
}
