import fs from 'node:fs/promises';
import path from 'node:path';
import { BridgeError } from '../errors.js';
import { matchesGlob } from './glob.js';

const SKIP_DIR_NAMES = new Set([
  '.git',
  '.hg',
  '.svn',
  '.Trash',
  '.Trashes',
  'node_modules',
  'DerivedData',
]);

export type DirEntry = {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'symlink' | 'other';
  sizeBytes: number | null;
  modifiedAt: string | null;
  mode: string | null;
};

export type SearchHit = {
  path: string;
  name: string;
  sizeBytes: number;
  modifiedAt: string;
  match: 'name' | 'content' | 'both';
  line?: number;
  excerpt?: string;
};

function formatMode(mode: number): string {
  return (mode & 0o777).toString(8).padStart(3, '0');
}

export async function listDirectory(dir: string): Promise<DirEntry[]> {
  const names = await fs.readdir(dir);
  names.sort((a, b) => a.localeCompare(b));
  const entries: DirEntry[] = [];

  for (const name of names) {
    const full = path.join(dir, name);
    try {
      const lstat = await fs.lstat(full);
      let type: DirEntry['type'] = 'other';
      if (lstat.isSymbolicLink()) {
        type = 'symlink';
      } else if (lstat.isDirectory()) {
        type = 'directory';
      } else if (lstat.isFile()) {
        type = 'file';
      }
      entries.push({
        name,
        path: full,
        type,
        sizeBytes: lstat.isDirectory() ? null : lstat.size,
        modifiedAt: lstat.mtime.toISOString(),
        mode: formatMode(lstat.mode),
      });
    } catch {
      entries.push({
        name,
        path: full,
        type: 'other',
        sizeBytes: null,
        modifiedAt: null,
        mode: null,
      });
    }
  }

  return entries;
}

async function isProbablyBinary(filePath: string): Promise<boolean> {
  const handle = await fs.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(8000);
    const { bytesRead } = await handle.read(buf, 0, buf.length, 0);
    return buf.subarray(0, bytesRead).includes(0);
  } finally {
    await handle.close();
  }
}

export type SearchOptions = {
  root: string;
  namePattern?: string;
  contentPattern?: string;
  contentFlags?: string;
  maxResults: number;
  maxFileBytes: number;
};

export async function searchFiles(options: SearchOptions): Promise<SearchHit[]> {
  if (!options.namePattern && !options.contentPattern) {
    throw new BridgeError('INVALID_ARGUMENT', 'Provide namePattern and/or contentPattern');
  }

  let contentRegex: RegExp | undefined;
  if (options.contentPattern) {
    try {
      contentRegex = new RegExp(options.contentPattern, options.contentFlags ?? 'i');
    } catch (err) {
      throw new BridgeError(
        'INVALID_ARGUMENT',
        `Invalid contentPattern: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const hits: SearchHit[] = [];

  const walk = async (dir: string): Promise<void> => {
    if (hits.length >= options.maxResults) {
      return;
    }
    let names: string[];
    try {
      names = await fs.readdir(dir);
    } catch {
      return;
    }

    for (const name of names) {
      if (hits.length >= options.maxResults) {
        return;
      }
      const full = path.join(dir, name);
      let stat;
      try {
        stat = await fs.lstat(full);
      } catch {
        continue;
      }

      if (stat.isSymbolicLink()) {
        continue;
      }
      if (stat.isDirectory()) {
        if (!SKIP_DIR_NAMES.has(name)) {
          await walk(full);
        }
        continue;
      }
      if (!stat.isFile()) {
        continue;
      }

      const relative = path.relative(options.root, full);
      const nameMatch = options.namePattern
        ? matchesGlob(options.namePattern, relative, name)
        : !contentRegex;
      let contentMatch = false;
      let line: number | undefined;
      let excerpt: string | undefined;

      if (contentRegex && stat.size <= options.maxFileBytes && !(await isProbablyBinary(full))) {
        try {
          const text = await fs.readFile(full, 'utf8');
          const lines = text.split(/\r?\n/);
          for (let i = 0; i < lines.length; i += 1) {
            const current = lines[i] ?? '';
            if (contentRegex.test(current)) {
              contentMatch = true;
              line = i + 1;
              excerpt = current.length > 240 ? `${current.slice(0, 237)}...` : current;
              break;
            }
          }
        } catch {
          // unreadable as utf8
        }
      }

      const matched =
        options.namePattern && contentRegex
          ? nameMatch && contentMatch
          : nameMatch || contentMatch;
      if (!matched) {
        continue;
      }

      hits.push({
        path: full,
        name,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        match: nameMatch && contentMatch ? 'both' : nameMatch ? 'name' : 'content',
        line,
        excerpt,
      });
    }
  };

  await walk(options.root);
  return hits;
}
