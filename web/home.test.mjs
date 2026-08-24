import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyHomePatch, isHttpUrl, sanitizeHome, sanitizeLink } from './home.mjs';

describe('home config', () => {
  it('keeps http(s) links and drops javascript', () => {
    assert.equal(isHttpUrl('https://jameymcelveen.com'), true);
    assert.equal(isHttpUrl('javascript:alert(1)'), false);
    assert.equal(sanitizeLink({ title: 'Nope', url: 'javascript:alert(1)' }, 0), null);
    assert.equal(sanitizeLink({ title: 'Site', url: 'https://jameymcelveen.com' }, 0)?.title, 'Site');
  });

  it('fills defaults and applies a notes-only patch', () => {
    const home = sanitizeHome({});
    assert.equal(home.displayName, 'Jamey');
    assert.ok(home.links.length > 0);
    const patched = applyHomePatch(home, { notes: 'buy milk' });
    assert.equal(patched.notes, 'buy milk');
    assert.equal(patched.links.length, home.links.length);
  });

  it('rejects a non-engine search value', () => {
    assert.equal(sanitizeHome({ searchEngine: 'bing' }).searchEngine, 'google');
    assert.equal(sanitizeHome({ searchEngine: 'kagi' }).searchEngine, 'kagi');
  });
});
