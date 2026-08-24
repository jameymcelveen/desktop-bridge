export const DEFAULT_HOME = {
  version: 1,
  displayName: 'Jamey',
  searchEngine: 'google',
  notes: '',
  weather: {
    latitude: 34.19,
    longitude: -79.76,
    label: 'Florence, SC',
  },
  links: [
    { id: 'github', title: 'GitHub', url: 'https://github.com/jameymcelveen', icon: 'github' },
    { id: 'claude', title: 'Claude', url: 'https://claude.ai', icon: 'spark' },
    { id: 'cursor', title: 'Cursor', url: 'https://cursor.com', icon: 'cursor' },
    { id: 'mail', title: 'Mail', url: 'https://mail.google.com', icon: 'mail' },
    { id: 'calendar', title: 'Calendar', url: 'https://calendar.google.com', icon: 'cal' },
    { id: 'site', title: 'Site', url: 'https://jameymcelveen.com', icon: 'globe' },
    { id: 'christ', title: 'Christ Medical', url: 'https://www.christmedical.com', icon: 'cross' },
    { id: 'qiklog', title: 'QikLog', url: 'https://qiklog.com', icon: 'terminal' },
    { id: 'bridge', title: 'DesktopBridge', url: 'https://github.com/jameymcelveen/desktop-bridge', icon: 'bridge' },
    { id: 'railway', title: 'Railway', url: 'https://railway.app', icon: 'train' },
    { id: 'vercel', title: 'Vercel', url: 'https://vercel.com', icon: 'triangle' },
  ],
};

const SEARCH_ENGINES = new Set(['google', 'kagi', 'ddg']);
const MAX_NOTES = 20_000;
const MAX_LINKS = 48;
const MAX_NAME = 80;

export function isHttpUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function slugId(value, fallback) {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  return slug || fallback;
}

export function sanitizeLink(raw, index) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const title = String(raw.title || '').trim().slice(0, 40);
  const url = String(raw.url || '').trim();
  if (!title || !isHttpUrl(url)) {
    return null;
  }
  const icon = String(raw.icon || 'globe')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 24);
  return {
    id: slugId(raw.id, `link-${index}`),
    title,
    url,
    icon: icon || 'globe',
  };
}

export function sanitizeHome(input) {
  const base = DEFAULT_HOME;
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const links = Array.isArray(raw.links)
    ? raw.links.map(sanitizeLink).filter(Boolean).slice(0, MAX_LINKS)
    : base.links;
  const weatherIn = raw.weather && typeof raw.weather === 'object' ? raw.weather : {};
  const latitude = Number(weatherIn.latitude);
  const longitude = Number(weatherIn.longitude);
  const weather =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? {
          latitude,
          longitude,
          label: String(weatherIn.label || '').trim().slice(0, 80) || base.weather.label,
        }
      : { ...base.weather };
  const engine = String(raw.searchEngine || base.searchEngine).toLowerCase();
  return {
    version: 1,
    displayName: String(raw.displayName || base.displayName).trim().slice(0, MAX_NAME) || base.displayName,
    searchEngine: SEARCH_ENGINES.has(engine) ? engine : base.searchEngine,
    notes: String(raw.notes ?? '').slice(0, MAX_NOTES),
    weather,
    links: links.length > 0 ? links : base.links,
  };
}

export function applyHomePatch(current, patch) {
  const now = sanitizeHome(current);
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return now;
  }
  return sanitizeHome({
    ...now,
    ...patch,
    weather: { ...now.weather, ...(patch.weather && typeof patch.weather === 'object' ? patch.weather : {}) },
    links: Array.isArray(patch.links) ? patch.links : now.links,
    notes: patch.notes === undefined ? now.notes : patch.notes,
  });
}
