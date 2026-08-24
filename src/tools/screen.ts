import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { CallToolResult } from '@modelcontextprotocol/server';
import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { AppContext } from '../context.js';
import { jsonResult, toolError } from '../lib/result.js';
import { runCommand } from '../lib/process.js';
import { assertMacOS } from '../lib/macos.js';

const JXA_DISPLAYS = `
ObjC.import('AppKit');
const screens = $.NSScreen.screens;
const main = $.NSScreen.mainScreen;
const out = [];
const count = screens.count;
for (let i = 0; i < count; i++) {
  const s = screens.objectAtIndex(i);
  const f = s.frame;
  const vf = s.visibleFrame;
  let name = 'Display ' + (i + 1);
  try { name = ObjC.unwrap(s.localizedName); } catch (e) {}
  const isMain = main && s === main;
  out.push({
    index: i + 1,
    name: name,
    main: !!isMain,
    backingScaleFactor: s.backingScaleFactor,
    frame: { x: f.origin.x, y: f.origin.y, width: f.size.width, height: f.size.height },
    visibleFrame: { x: vf.origin.x, y: vf.origin.y, width: vf.size.width, height: vf.size.height }
  });
}
JSON.stringify({ displays: out, count: out.length });
`;

export function registerScreenTools(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    'get_display_info',
    {
      title: 'Get display info',
      description: 'List attached displays: name, main flag, scale factor, and frame in Cocoa points.',
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async () => {
      try {
        assertMacOS();
        const result = await runCommand({
          command: 'osascript',
          args: ['-l', 'JavaScript'],
          cwd: os.homedir(),
          timeoutMs: 10_000,
          maxOutputBytes: ctx.config.maxOutputBytes,
          shell: false,
          input: JXA_DISPLAYS,
        });
        if (result.exitCode !== 0) {
          return jsonResult(
            { error: 'Failed to query displays', stderr: result.stderr, stdout: result.stdout },
            true,
          );
        }
        try {
          return jsonResult(JSON.parse(result.stdout));
        } catch {
          return jsonResult({ raw: result.stdout });
        }
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.registerTool(
    'take_screenshot',
    {
      title: 'Take screenshot',
      description:
        'Capture the screen with screencapture. display is the 1-based display id (-D). Saves PNG under an allowed path (default: a timestamped file in the temp dir). Requires Screen Recording permission for the host app that launched this server.',
      inputSchema: z.object({
        path: z
          .string()
          .optional()
          .describe('Destination .png path inside an allowed root. Default: timestamped file in the temp dir.'),
        display: z.number().int().min(1).max(16).optional().describe('1-based display index for screencapture -D'),
        includeCursor: z.boolean().default(false),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false },
    },
    async ({ path: destPath, display, includeCursor }) => {
      try {
        assertMacOS();
        const stamp = new Date().toISOString().replaceAll(':', '').replaceAll('.', '');
        const target =
          destPath ?? path.join(os.tmpdir(), 'desktop-bridge', `screenshot-${stamp}.png`);
        const real = await ctx.paths.resolveWritable(target, true);
        const args = ['-x', '-t', 'png'];
        if (includeCursor) {
          args.push('-C');
        }
        if (display !== undefined) {
          args.push('-D', String(display));
        }
        args.push(real);

        const result = await runCommand({
          command: 'screencapture',
          args,
          cwd: os.homedir(),
          timeoutMs: 20_000,
          maxOutputBytes: ctx.config.maxOutputBytes,
          shell: false,
        });
        if (result.exitCode !== 0) {
          return jsonResult(
            {
              error: 'screencapture failed',
              stderr: result.stderr,
              stdout: result.stdout,
              hint: 'System Settings → Privacy & Security → Screen Recording: enable the app that launched this server (Claude, Cursor, or Terminal).',
            },
            true,
          );
        }

        const buf = await fs.readFile(real);
        const stat = await fs.stat(real);
        const payload: CallToolResult = {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ path: real, sizeBytes: stat.size, mimeType: 'image/png' }, null, 2),
            },
          ],
        };
        if (buf.length <= 5 * 1024 * 1024) {
          payload.content.push({
            type: 'image',
            data: buf.toString('base64'),
            mimeType: 'image/png',
          });
        } else {
          payload.content.push({
            type: 'text',
            text: 'Screenshot is larger than 5 MiB; image bytes omitted. Read the file from path with read_file encoding=base64.',
          });
        }
        return payload;
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
