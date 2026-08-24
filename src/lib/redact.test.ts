import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isSensitiveEnvKey, redactEnv } from './redact.js';

describe('redactEnv', () => {
  it('redacts secret-looking keys and leaves others', () => {
    const out = redactEnv({
      PATH: '/usr/bin',
      API_KEY: 'abc',
      GITHUB_TOKEN: 'ghs_x',
      HOME: '/Users/you',
    });
    assert.equal(out.PATH, '/usr/bin');
    assert.equal(out.API_KEY, '[redacted]');
    assert.equal(out.GITHUB_TOKEN, '[redacted]');
    assert.equal(out.HOME, '/Users/you');
  });

  it('detects password/token/credential names', () => {
    assert.equal(isSensitiveEnvKey('DB_PASSWORD'), true);
    assert.equal(isSensitiveEnvKey('SESSION_COOKIE'), true);
    assert.equal(isSensitiveEnvKey('EDITOR'), false);
  });
});
