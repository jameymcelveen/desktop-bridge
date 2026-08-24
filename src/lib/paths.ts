import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { expandHome } from '../config.js';
import { BridgeError } from '../errors.js';

export function normalizeUserPath(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    throw new BridgeError('INVALID_PATH', 'Path must not be empty');
  }
  if (trimmed.includes('\0')) {
    throw new BridgeError('INVALID_PATH', 'Path must not contain NUL bytes');
  }
  return path.resolve(expandHome(trimmed));
}

export function isInsideRoot(candidate: string, root: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export function assertInsideRoots(candidate: string, roots: readonly string[]): string {
  const match = roots.find((root) => isInsideRoot(candidate, root));
  if (!match) {
    throw new BridgeError(
      'PATH_NOT_ALLOWED',
      `Path is outside allowed directories: ${candidate}`,
    );
  }
  return match;
}

export class PathGuard {
  readonly roots: readonly string[];

  constructor(roots: readonly string[]) {
    if (roots.length === 0) {
      throw new BridgeError('INVALID_ARGUMENT', 'At least one allowed root is required');
    }
    this.roots = roots.map((root) => fsSync.realpathSync(path.resolve(expandHome(root))));
  }

  /**
   * Resolves an existing path, follows symlinks, and requires the real path to stay inside a root.
   */
  async resolveExisting(input: string): Promise<string> {
    const abs = normalizeUserPath(input);
    try {
      await fs.access(abs);
    } catch {
      throw new BridgeError('NOT_FOUND', `Path does not exist: ${abs}`);
    }
    const real = await fs.realpath(abs);
    assertInsideRoots(real, this.roots);
    return real;
  }

  /**
   * Resolves a path for write. If it already exists, the real path must stay inside a root.
   * If it does not, the nearest existing ancestor must, and remaining segments are appended
   * to that ancestor's real path so `..` and symlinked parents cannot escape.
   */
  async resolveWritable(input: string, createDirs: boolean): Promise<string> {
    const abs = normalizeUserPath(input);

    try {
      const stat = await fs.lstat(abs);
      if (stat.isDirectory()) {
        throw new BridgeError('IS_DIRECTORY', `Path is a directory: ${abs}`);
      }
      const real = await fs.realpath(abs);
      assertInsideRoots(real, this.roots);
      return real;
    } catch (err) {
      if (err instanceof BridgeError) {
        throw err;
      }
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        throw err;
      }
    }

    let ancestor = path.dirname(abs);
    while (true) {
      try {
        await fs.access(ancestor);
        break;
      } catch {
        const parent = path.dirname(ancestor);
        if (parent === ancestor) {
          throw new BridgeError('NOT_FOUND', `No existing parent directory for ${abs}`);
        }
        ancestor = parent;
      }
    }

    const realAncestor = await fs.realpath(ancestor);
    assertInsideRoots(realAncestor, this.roots);

    const remainder = path.relative(ancestor, abs);
    if (remainder.startsWith('..') || path.isAbsolute(remainder)) {
      throw new BridgeError('PATH_NOT_ALLOWED', `Path is outside allowed directories: ${abs}`);
    }

    const finalPath = path.join(realAncestor, remainder);
    assertInsideRoots(finalPath, this.roots);

    const parentDir = path.dirname(finalPath);
    if (parentDir !== realAncestor) {
      if (!createDirs) {
        throw new BridgeError('NOT_FOUND', `Parent directory does not exist: ${parentDir}`);
      }
      await fs.mkdir(parentDir, { recursive: true });
      const realParent = await fs.realpath(parentDir);
      assertInsideRoots(realParent, this.roots);
      return path.join(realParent, path.basename(finalPath));
    }

    return finalPath;
  }

  async resolveDirectory(input: string): Promise<string> {
    const real = await this.resolveExisting(input);
    const stat = await fs.stat(real);
    if (!stat.isDirectory()) {
      throw new BridgeError('IS_FILE', `Path is not a directory: ${real}`);
    }
    return real;
  }

  async resolveFile(input: string): Promise<string> {
    const real = await this.resolveExisting(input);
    const stat = await fs.stat(real);
    if (!stat.isFile()) {
      throw new BridgeError('IS_DIRECTORY', `Path is not a regular file: ${real}`);
    }
    return real;
  }
}
