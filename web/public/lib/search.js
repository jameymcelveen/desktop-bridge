export const ENGINES = {
  google: { label: 'Google', href: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  kagi: { label: 'Kagi', href: (q) => `https://kagi.com/search?q=${encodeURIComponent(q)}` },
  ddg: { label: 'DuckDuckGo', href: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
};

export const BANGS = {
  g: 'google',
  k: 'kagi',
  d: 'ddg',
  gh: (q) => `https://github.com/search?q=${encodeURIComponent(q)}`,
  yt: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  w: (q) => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`,
  maps: (q) => `https://www.google.com/maps/search/${encodeURIComponent(q)}`,
};

export function resolveSearch(raw, engine = 'google') {
  const q = String(raw || '').trim();
  if (!q) {
    return null;
  }
  if (/^https?:\/\//i.test(q)) {
    return q;
  }
  const bang = q.match(/^!([a-z]+)\s+(.+)$/i);
  if (bang) {
    const key = bang[1].toLowerCase();
    const rest = bang[2];
    const mapped = BANGS[key];
    if (typeof mapped === 'function') {
      return mapped(rest);
    }
    if (typeof mapped === 'string' && ENGINES[mapped]) {
      return ENGINES[mapped].href(rest);
    }
  }
  return ENGINES[engine]?.href(q) ?? ENGINES.google.href(q);
}
