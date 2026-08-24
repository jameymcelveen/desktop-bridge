import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isAllowedEmail } from './app.mjs';

describe('isAllowedEmail', () => {
  it('accepts mcelveen.us addresses', () => {
    assert.equal(isAllowedEmail('jamey@mcelveen.us'), true);
    assert.equal(isAllowedEmail('Jamey@Mcelveen.US'), true);
  });

  it('rejects everything else', () => {
    assert.equal(isAllowedEmail('jamey@gmail.com'), false);
    assert.equal(isAllowedEmail('not-an-email'), false);
    assert.equal(isAllowedEmail(''), false);
  });
});
