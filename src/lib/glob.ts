function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&').replace(/\*/g, '\\*');
}

/**
 * Converts a glob to a RegExp. `*` matches within a path segment, `**` matches across
 * segments, `?` matches a single non-slash character. Matching is case-insensitive.
 */
export function globToRegExp(pattern: string): RegExp {
  const normalized = pattern.replaceAll('\\', '/');
  let i = 0;
  let out = '^';

  while (i < normalized.length) {
    if (normalized.startsWith('**/', i)) {
      out += '(?:.*/)?';
      i += 3;
      continue;
    }
    if (normalized.startsWith('**', i) && i + 2 === normalized.length) {
      out += '.*';
      i += 2;
      continue;
    }

    const ch = normalized[i]!;
    if (ch === '*') {
      out += '[^/]*';
      i += 1;
      continue;
    }
    if (ch === '?') {
      out += '[^/]';
      i += 1;
      continue;
    }
    out += escapeRegex(ch);
    i += 1;
  }

  out += '$';
  return new RegExp(out, 'i');
}

export function matchesGlob(pattern: string, relativePath: string, basename: string): boolean {
  const regex = globToRegExp(pattern);
  const posix = relativePath.replaceAll('\\', '/');
  if (pattern.includes('/') || pattern.includes('\\')) {
    return regex.test(posix);
  }
  return regex.test(basename);
}
