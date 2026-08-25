const MAX_QUERY = 100;
const MAX_ITEMS = 8;

export function normalizeSuggestQuery(raw) {
  const q = String(raw ?? '')
    .replace(/[\u0000-\u001f]/g, '')
    .trim()
    .slice(0, MAX_QUERY);
  if (!q || /^https?:\/\//i.test(q) || q.startsWith('!')) {
    return '';
  }
  return q;
}

export function parseGoogleSuggest(body) {
  if (!Array.isArray(body) || !Array.isArray(body[1])) {
    return [];
  }
  return body[1]
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim())
    .slice(0, MAX_ITEMS);
}

export function suggestUrl(query) {
  const url = new URL('https://suggestqueries.google.com/complete/search');
  url.searchParams.set('client', 'firefox');
  url.searchParams.set('hl', 'en');
  url.searchParams.set('q', query);
  return url;
}

export async function getSuggestions(raw, fetcher = fetch) {
  const query = normalizeSuggestQuery(raw);
  if (!query) {
    return [];
  }
  const res = await fetcher(suggestUrl(query), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) {
    throw new Error(`suggest ${res.status}`);
  }
  return parseGoogleSuggest(await res.json());
}
