import os from 'node:os';
import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { AppContext } from '../context.js';
import { BridgeError } from '../errors.js';
import { reportProgress, type ProgressContext } from '../lib/progress.js';
import { jsonResult, toolError } from '../lib/result.js';
import { runCommand } from '../lib/process.js';

export function registerShellTools(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    'run_command',
    {
      title: 'Run shell command',
      description:
        'Run a command with the user shell. stdout and stderr are captured separately. stream=true sends MCP progress notifications as output arrives. cwd must be inside an allowed root unless DESKTOP_BRIDGE_RESTRICT_SHELL_CWD=false.',
      inputSchema: z.object({
        command: z.string().min(1).max(32_768).describe('Shell command string, including pipes and redirects'),
        cwd: z.string().optional().describe('Working directory; defaults to the first allowed root'),
        timeoutMs: z
          .number()
          .int()
          .min(100)
          .max(300_000)
          .optional()
          .describe('Timeout in ms; defaults to DESKTOP_BRIDGE_COMMAND_TIMEOUT_MS'),
        stream: z.boolean().default(false).describe('Emit progress notifications while the process runs'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async ({ command, cwd, timeoutMs, stream }, extra) => {
      try {
        if (!ctx.config.allowShell) {
          throw new BridgeError(
            'COMMAND_DISABLED',
            'Shell execution is disabled (DESKTOP_BRIDGE_ALLOW_SHELL=false).',
          );
        }

        let workingDir = cwd ?? ctx.paths.roots[0] ?? os.homedir();
        if (ctx.config.restrictShellCwd) {
          workingDir = await ctx.paths.resolveDirectory(workingDir);
        }

        let progress = 0;
        const onChunk = stream
          ? (chunk: string, streamName: 'stdout' | 'stderr'): void => {
              progress += chunk.length;
              void reportProgress(
                extra as ProgressContext,
                progress,
                `${streamName}: ${chunk.slice(-400)}`,
              );
            }
          : undefined;

        const result = await runCommand({
          command,
          cwd: workingDir,
          timeoutMs: timeoutMs ?? ctx.config.commandTimeoutMs,
          maxOutputBytes: ctx.config.maxOutputBytes,
          shell: true,
          onStdout: onChunk ? (chunk) => onChunk(chunk, 'stdout') : undefined,
          onStderr: onChunk ? (chunk) => onChunk(chunk, 'stderr') : undefined,
        });

        const failed = result.timedOut || result.exitCode !== 0;
        return jsonResult(
          {
            command,
            cwd: workingDir,
            exitCode: result.exitCode,
            signal: result.signal,
            timedOut: result.timedOut,
            truncated: result.truncated,
            durationMs: result.durationMs,
            stdout: result.stdout,
            stderr: result.stderr,
          },
          failed,
        );
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
