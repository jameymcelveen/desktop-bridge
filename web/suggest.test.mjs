import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getSuggestions, normalizeSuggestQuery, parseGoogleSuggest } from './suggest.mjs';

describe('suggest', () => {
  it('drops bangs, urls, and empty queries', () => {
    assert.equal(normalizeSuggestQuery('  hello  '), 'hello');
    assert.equal(normalizeSuggestQuery('!g foo'), '');
    assert.equal(normalizeSuggestQuery('https://google.com'), '');
    assert.equal(normalizeSuggestQuery(''), '');
  });

  it('parses the firefox client payload', () => {
    assert.deepEqual(parseGoogleSuggest(['how to', ['how to screenshot', 'how to train your dragon', 12, '']]), [
      'how to screenshot',
      'how to train your dragon',
    ]);
  });

  it('returns Google phrases from the upstream body', async () => {
    const fetcher = async () =>
      new Response(JSON.stringify(['node', ['node.js', 'nodejs fetch']]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    assert.deepEqual(await getSuggestions('node', fetcher), ['node.js', 'nodejs fetch']);
  });
});
