import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { BridgeError } from '../errors.js';
import { PathGuard, isInsideRoot } from './paths.js';

describe('PathGuard', () => {
  let root: string;
  let guard: PathGuard;

  before(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'desktop-bridge-paths-'));
    await fs.mkdir(path.join(root, 'allowed'));
    await fs.writeFile(path.join(root, 'allowed', 'note.txt'), 'hello');
    guard = new PathGuard([root]);
  });

  after(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('allows reads inside a root', async () => {
    const real = await guard.resolveFile(path.join(root, 'allowed', 'note.txt'));
    assert.equal(real, await fs.realpath(path.join(root, 'allowed', 'note.txt')));
  });

  it('rejects path traversal out of a root', async () => {
    await assert.rejects(
      () => guard.resolveExisting(path.join(root, 'allowed', ...Array(16).fill('..'), 'etc', 'passwd')),
      (err: unknown) => err instanceof BridgeError && err.code === 'PATH_NOT_ALLOWED',
    );
    await assert.rejects(
      () => guard.resolveExisting('/etc/passwd'),
      (err: unknown) => err instanceof BridgeError && err.code === 'PATH_NOT_ALLOWED',
    );
  });

  it('isInsideRoot treats the root itself as inside', () => {
    assert.equal(isInsideRoot(root, root), true);
    assert.equal(isInsideRoot(path.join(root, 'x'), root), true);
    assert.equal(isInsideRoot(path.join(root, '..', 'outside'), root), false);
  });

  it('creates parent dirs for writes when asked', async () => {
    const dest = path.join(root, 'allowed', 'nested', 'out.txt');
    const real = await guard.resolveWritable(dest, true);
    await fs.writeFile(real, 'ok');
    assert.equal(await fs.readFile(real, 'utf8'), 'ok');
  });

  it('does not follow a symlink that escapes the root', async () => {
    const link = path.join(root, 'escape');
    try {
      await fs.symlink('/etc', link);
    } catch {
      return;
    }
    await assert.rejects(
      () => guard.resolveExisting(path.join(link, 'hosts')),
      (err: unknown) => err instanceof BridgeError && err.code === 'PATH_NOT_ALLOWED',
    );
  });
});
