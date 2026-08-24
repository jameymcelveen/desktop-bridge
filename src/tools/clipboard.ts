import os from 'node:os';
import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { AppContext } from '../context.js';
import { jsonResult, toolError } from '../lib/result.js';
import { runCommand } from '../lib/process.js';
import { assertMacOS } from '../lib/macos.js';

export function registerClipboardTools(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    'read_clipboard',
    {
      title: 'Read clipboard',
      description: 'Read the current macOS clipboard as text (pbpaste).',
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async () => {
      try {
        assertMacOS();
        const result = await runCommand({
          command: 'pbpaste',
          args: [],
          cwd: os.homedir(),
          timeoutMs: 5_000,
          maxOutputBytes: ctx.config.maxOutputBytes,
          shell: false,
        });
        if (result.exitCode !== 0) {
          return jsonResult({ error: 'pbpaste failed', stderr: result.stderr }, true);
        }
        return jsonResult({ text: result.stdout, bytes: Buffer.byteLength(result.stdout, 'utf8') });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.registerTool(
    'write_clipboard',
    {
      title: 'Write clipboard',
      description: 'Replace the macOS clipboard with the given text (pbcopy).',
      inputSchema: z.object({
        text: z.string().describe('Text to place on the clipboard'),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async ({ text }) => {
      try {
        assertMacOS();
        if (Buffer.byteLength(text, 'utf8') > ctx.config.maxFileBytes) {
          return jsonResult({ error: 'Clipboard payload exceeds DESKTOP_BRIDGE_MAX_FILE_BYTES' }, true);
        }
        const result = await runCommand({
          command: 'pbcopy',
          args: [],
          cwd: os.homedir(),
          timeoutMs: 5_000,
          maxOutputBytes: ctx.config.maxOutputBytes,
          shell: false,
          input: text,
        });
        if (result.exitCode !== 0) {
          return jsonResult({ error: 'pbcopy failed', stderr: result.stderr }, true);
        }
        return jsonResult({ ok: true, bytes: Buffer.byteLength(text, 'utf8') });
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
