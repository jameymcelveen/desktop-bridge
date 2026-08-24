import assert from 'node:assert/strict';
import os from 'node:os';
import { describe, it } from 'node:test';
import { runCommand } from './process.js';

describe('runCommand', () => {
  it('captures stdout separately from stderr', async () => {
    const result = await runCommand({
      command: 'printf "out"; printf "err" 1>&2',
      cwd: os.tmpdir(),
      timeoutMs: 5_000,
      maxOutputBytes: 64_000,
      shell: true,
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, 'out');
    assert.equal(result.stderr, 'err');
    assert.equal(result.timedOut, false);
  });

  it('returns a non-zero exit code without throwing', async () => {
    const result = await runCommand({
      command: 'false',
      cwd: os.tmpdir(),
      timeoutMs: 5_000,
      maxOutputBytes: 64_000,
      shell: true,
    });
    assert.equal(result.exitCode, 1);
  });

  it('times out a hung command and sets timedOut', async () => {
    const result = await runCommand({
      command: 'sleep 30',
      cwd: os.tmpdir(),
      timeoutMs: 400,
      maxOutputBytes: 64_000,
      shell: true,
    });
    assert.equal(result.timedOut, true);
  });
});
