import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveSearch } from './public/lib/search.js';

describe('resolveSearch', () => {
  it('sends a plain query to the selected engine', () => {
    assert.equal(resolveSearch('lit web components', 'google'), 'https://www.google.com/search?q=lit%20web%20components');
    assert.equal(resolveSearch('lit', 'kagi'), 'https://kagi.com/search?q=lit');
  });

  it('honors bangs and raw urls', () => {
    assert.equal(resolveSearch('!gh lit', 'google'), 'https://github.com/search?q=lit');
    assert.equal(resolveSearch('https://jameymcelveen.com', 'google'), 'https://jameymcelveen.com');
    assert.equal(resolveSearch('   ', 'google'), null);
  });
});
