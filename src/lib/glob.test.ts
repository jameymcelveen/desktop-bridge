import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { globToRegExp, matchesGlob } from './glob.js';

describe('globToRegExp', () => {
  it('matches a simple extension glob against a basename', () => {
    assert.equal(matchesGlob('*.ts', 'src/index.ts', 'index.ts'), true);
    assert.equal(matchesGlob('*.ts', 'src/index.js', 'index.js'), false);
  });

  it('treats ** as crossing directories', () => {
    const re = globToRegExp('src/**/*.ts');
    assert.equal(re.test('src/lib/glob.ts'), true);
    assert.equal(re.test('src/glob.ts'), true);
    assert.equal(re.test('test/glob.ts'), false);
  });

  it('matches ? as a single non-slash character', () => {
    assert.equal(matchesGlob('file?.txt', 'fileA.txt', 'fileA.txt'), true);
    assert.equal(matchesGlob('file?.txt', 'fileAB.txt', 'fileAB.txt'), false);
  });
});
