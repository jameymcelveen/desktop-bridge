import fs from 'node:fs/promises';
import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { AppContext } from '../context.js';
import { BridgeError } from '../errors.js';
import { jsonResult, toolError } from '../lib/result.js';
import { listDirectory, searchFiles } from '../lib/search.js';

const encodingSchema = z.enum(['utf8', 'base64']).default('utf8');

function looksBinary(buffer: Buffer): boolean {
  return buffer.subarray(0, Math.min(buffer.length, 8000)).includes(0);
}

export function registerFileTools(server: McpServer, ctx: AppContext): void {
  server.registerTool(
    'list_roots',
    {
      title: 'List allowed roots',
      description:
        'List directories this server may read and write. File tools reject paths outside these roots.',
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async () => jsonResult({ roots: ctx.paths.roots, maxFileBytes: ctx.config.maxFileBytes }),
  );

  server.registerTool(
    'read_file',
    {
      title: 'Read file',
      description:
        'Read a file inside an allowed root. Use encoding=base64 for binary. offset/limit are 1-based line numbers for utf8.',
      inputSchema: z.object({
        path: z.string().min(1).describe('Absolute or ~ path to a file'),
        encoding: encodingSchema.describe('utf8 for text, base64 for binary'),
        offset: z.number().int().min(1).optional().describe('First line to return (utf8 only)'),
        limit: z.number().int().min(1).optional().describe('Max lines to return (utf8 only)'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ path: filePath, encoding, offset, limit }) => {
      try {
        const real = await ctx.paths.resolveFile(filePath);
        const stat = await fs.stat(real);
        if (stat.size > ctx.config.maxFileBytes) {
          throw new BridgeError(
            'FILE_TOO_LARGE',
            `File is ${stat.size} bytes; max is ${ctx.config.maxFileBytes}. Raise DESKTOP_BRIDGE_MAX_FILE_BYTES or read a smaller file.`,
          );
        }
        const buf = await fs.readFile(real);
        if (encoding === 'base64') {
          return jsonResult({
            path: real,
            encoding: 'base64',
            sizeBytes: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            content: buf.toString('base64'),
          });
        }
        if (looksBinary(buf)) {
          throw new BridgeError(
            'INVALID_ARGUMENT',
            'File looks binary (contains a NUL byte). Re-read with encoding=base64.',
          );
        }
        const lines = buf.toString('utf8').split(/\r?\n/);
        const totalLines = lines.length;
        const start = (offset ?? 1) - 1;
        const end = limit === undefined ? lines.length : start + limit;
        const content = offset === undefined && limit === undefined ? buf.toString('utf8') : lines.slice(start, end).join('\n');
        return jsonResult({
          path: real,
          encoding: 'utf8',
          sizeBytes: stat.size,
          modifiedAt: stat.mtime.toISOString(),
          totalLines,
          content,
        });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.registerTool(
    'write_file',
    {
      title: 'Write file',
      description:
        'Create or overwrite a file inside an allowed root. createDirectories mkdir -p the parent. append adds to an existing file.',
      inputSchema: z.object({
        path: z.string().min(1).describe('Absolute or ~ path to write'),
        content: z.string().describe('File contents (text or base64)'),
        encoding: encodingSchema.describe('How to interpret content'),
        createDirectories: z.boolean().default(false),
        append: z.boolean().default(false),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },
    async ({ path: filePath, content, encoding, createDirectories, append }) => {
      try {
        const bytes = encoding === 'base64' ? Buffer.from(content, 'base64') : Buffer.from(content, 'utf8');
        if (encoding === 'base64' && bytes.length === 0 && content.trim().length > 0) {
          throw new BridgeError('INVALID_ARGUMENT', 'content is not valid base64');
        }
        if (bytes.length > ctx.config.maxFileBytes) {
          throw new BridgeError(
            'FILE_TOO_LARGE',
            `Payload is ${bytes.length} bytes; max is ${ctx.config.maxFileBytes}`,
          );
        }
        const real = await ctx.paths.resolveWritable(filePath, createDirectories);
        await fs.writeFile(real, bytes, { flag: append ? 'a' : 'w' });
        const stat = await fs.stat(real);
        return jsonResult({
          path: real,
          sizeBytes: stat.size,
          modifiedAt: stat.mtime.toISOString(),
          appended: append,
        });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.registerTool(
    'list_directory',
    {
      title: 'List directory',
      description: 'List files and subdirectories with type, size, modified time, and mode.',
      inputSchema: z.object({
        path: z.string().min(1).describe('Directory to list'),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ path: dirPath }) => {
      try {
        const real = await ctx.paths.resolveDirectory(dirPath);
        const entries = await listDirectory(real);
        return jsonResult({ path: real, count: entries.length, entries });
      } catch (err) {
        return toolError(err);
      }
    },
  );

  server.registerTool(
    'search_files',
    {
      title: 'Search files',
      description:
        'Walk an allowed directory. namePattern is a glob (* and **). contentPattern is a JavaScript regex matched per line. Symlinks are not followed.',
      inputSchema: z.object({
        path: z.string().min(1).describe('Directory to search'),
        namePattern: z.string().min(1).optional().describe('Glob vs relative path or basename'),
        contentPattern: z.string().min(1).optional().describe('Regex source matched against each line'),
        contentFlags: z
          .string()
          .regex(/^[gimsuy]*$/)
          .optional()
          .describe('RegExp flags; default i'),
        maxResults: z.number().int().min(1).max(500).default(50),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ path: dirPath, namePattern, contentPattern, contentFlags, maxResults }) => {
      try {
        const real = await ctx.paths.resolveDirectory(dirPath);
        const hits = await searchFiles({
          root: real,
          namePattern,
          contentPattern,
          contentFlags,
          maxResults,
          maxFileBytes: Math.min(ctx.config.maxFileBytes, 1024 * 1024),
        });
        return jsonResult({
          path: real,
          count: hits.length,
          truncated: hits.length >= maxResults,
          hits,
        });
      } catch (err) {
        return toolError(err);
      }
    },
  );
}
