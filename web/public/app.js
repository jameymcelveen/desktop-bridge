import { iconSvg } from './icons.js';

const loginEl = document.querySelector('#login');
const dashEl = document.querySelector('#dash');
const form = document.querySelector('#login-form');
const loginError = document.querySelector('#login-error');
const who = document.querySelector('#who');
const hello = document.querySelector('#hello');
const dateLine = document.querySelector('#date-line');
const clockEl = document.querySelector('#clock');
const searchForm = document.querySelector('#search-form');
const searchInput = document.querySelector('#search');
const enginesEl = document.querySelector('#engines');
const linksEl = document.querySelector('#links');
const weatherEl = document.querySelector('#weather');
const notesEl = document.querySelector('#notes');
const notesStatus = document.querySelector('#notes-status');
const wordEl = document.querySelector('#word');
const dot = document.querySelector('#dot');
const stateLabel = document.querySelector('#state-label');
const seen = document.querySelector('#seen');
const facts = document.querySelector('#facts');
const settings = document.querySelector('#settings');
const settingsBackdrop = document.querySelector('#settings-backdrop');
const displayNameInput = document.querySelector('#display-name');
const searchEngineInput = document.querySelector('#search-engine');
const linksJson = document.querySelector('#links-json');
const settingsMsg = document.querySelector('#settings-msg');

const ENGINES = {
  google: { label: 'Google', href: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
  kagi: { label: 'Kagi', href: (q) => `https://kagi.com/search?q=${encodeURIComponent(q)}` },
  ddg: { label: 'DuckDuckGo', href: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
};

const BANGS = {
  g: 'google',
  k: 'kagi',
  d: 'ddg',
  gh: (q) => `https://github.com/search?q=${encodeURIComponent(q)}`,
  yt: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
  w: (q) => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`,
  maps: (q) => `https://www.google.com/maps/search/${encodeURIComponent(q)}`,
};

const WORDS = [
  { ref: 'Joshua 1:9', text: 'Be strong and courageous. Do not be frightened, and do not be dismayed, for the Lord your God is with you wherever you go.' },
  { ref: 'Micah 6:8', text: 'He has told you, O man, what is good; and what does the Lord require of you but to do justice, and to love kindness, and to walk humbly with your God?' },
  { ref: 'Colossians 3:23', text: 'Whatever you do, work heartily, as for the Lord and not for men.' },
  { ref: 'Proverbs 3:5–6', text: 'Trust in the Lord with all your heart, and do not lean on your own understanding. In all your ways acknowledge him, and he will make straight your paths.' },
  { ref: 'Psalm 46:10', text: 'Be still, and know that I am God.' },
  { ref: 'Matthew 6:33', text: 'But seek first the kingdom of God and his righteousness, and all these things will be added to you.' },
  { ref: 'Philippians 4:6–7', text: 'Do not be anxious about anything, but in everything by prayer and supplication with thanksgiving let your requests be made known to God.' },
  { ref: 'John 13:34', text: 'A new commandment I give to you, that you love one another: just as I have loved you, you also are to love one another.' },
];

/** @type {{ displayName: string, searchEngine: string, notes: string, links: Array<{id:string,title:string,url:string,icon:string}> }} */
let home = {
  displayName: 'Jamey',
  searchEngine: 'google',
  notes: '',
  links: [],
};

let notesTimer = 0;

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (res.status === 204) {
    return null;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

function greeting(name) {
  const hour = new Date().getHours();
  const when = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${when}, ${name}` : when;
}

function tickClock() {
  const now = new Date();
  clockEl.textContent = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(now);
  dateLine.textContent = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now);
  hello.textContent = greeting(home.displayName);
}

function showLogin() {
  dashEl.classList.add('hidden');
  loginEl.classList.remove('hidden');
}

function showDash(email) {
  loginEl.classList.add('hidden');
  dashEl.classList.remove('hidden');
  who.textContent = email;
  searchInput?.focus();
}

function renderEngines() {
  enginesEl.replaceChildren(
    ...Object.entries(ENGINES).map(([id, engine]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = engine.label;
      btn.className = id === home.searchEngine ? 'active' : '';
      btn.addEventListener('click', () => {
        home.searchEngine = id;
        renderEngines();
        void saveHome({ searchEngine: id });
      });
      return btn;
    }),
  );
}

function renderLinks() {
  linksEl.replaceChildren(
    ...(home.links || []).map((link) => {
      const a = document.createElement('a');
      a.href = link.url;
      a.rel = 'noopener noreferrer';
      a.title = link.title;
      const tile = document.createElement('span');
      tile.className = 'tile';
      tile.innerHTML = iconSvg(link.icon);
      const label = document.createElement('span');
      label.className = 'link-label';
      label.textContent = link.title;
      a.append(tile, label);
      return a;
    }),
  );
}

function renderWord() {
  const day = Math.floor(Date.now() / 86_400_000);
  const verse = WORDS[day % WORDS.length];
  wordEl.replaceChildren();
  wordEl.append(document.createTextNode(`“${verse.text}”`));
  const cite = document.createElement('cite');
  cite.textContent = verse.ref;
  wordEl.append(cite);
}

function formatBytes(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    return '—';
  }
  return `${(n / 1024 ** 3).toFixed(1)} GiB`;
}

function formatAge(ms) {
  if (ms === null || ms === undefined) {
    return 'never';
  }
  if (ms < 2000) {
    return 'just now';
  }
  const s = Math.round(ms / 1000);
  if (s < 60) {
    return `${s}s ago`;
  }
  const m = Math.round(s / 60);
  if (m < 60) {
    return `${m}m ago`;
  }
  return `${Math.round(m / 60)}h ago`;
}

function copyable(value) {
  const wrap = document.createElement('span');
  wrap.textContent = value;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'copy';
  btn.textContent = 'copy';
  btn.addEventListener('click', () => {
    void navigator.clipboard.writeText(value);
    btn.textContent = 'copied';
    setTimeout(() => {
      btn.textContent = 'copy';
    }, 1200);
  });
  wrap.append(btn);
  return wrap;
}

function renderStatus(status) {
  const state = status.state || 'offline';
  dot.className = `dot ${state}`;
  stateLabel.textContent =
    state === 'online' ? 'Online' : state === 'stale' ? 'Stale heartbeat' : 'Offline';
  seen.textContent = status.receivedAt
    ? `Heartbeat ${formatAge(status.ageMs)}`
    : 'No heartbeat yet. Point DesktopBridge at /api/heartbeat.';

  const b = status.bridge || {};
  const mem = b.memory || {};
  const used =
    typeof mem.totalBytes === 'number' && typeof mem.freeBytes === 'number'
      ? mem.totalBytes - mem.freeBytes
      : null;
  const rows = [
    ['Host', b.hostname],
    ['Public IP', b.publicIp || b.reportedFromIp],
    ['LAN', b.lanPrimary],
    ['Load', Array.isArray(b.loadAverage) ? b.loadAverage.map((n) => Number(n).toFixed(2)).join(' · ') : null],
    ['Memory', used !== null ? `${formatBytes(used)} / ${formatBytes(mem.totalBytes)}` : null],
    ['Uptime', typeof b.uptimeSeconds === 'number' ? `${Math.floor(b.uptimeSeconds / 3600)}h` : null],
  ].filter(([, v]) => v);

  facts.replaceChildren(
    ...rows.flatMap(([k, v]) => {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      if (k === 'Public IP' || k === 'LAN' || k === 'Host') {
        dd.append(copyable(String(v)));
      } else {
        dd.textContent = String(v);
      }
      return [dt, dd];
    }),
  );
}

function renderWeather(w) {
  if (!w || typeof w.temperature !== 'number') {
    weatherEl.innerHTML = '<p class="muted">Waiting on the sky…</p>';
    return;
  }
  const unit = String(w.units?.temperature ?? '°F').replace('°F', '°');
  weatherEl.innerHTML = `
    <div class="temp">${Math.round(w.temperature)}${unit}</div>
    <div class="condition">${w.label ?? ''}</div>
    <div class="muted">${w.place ?? ''}</div>
    <div class="row">
      <span>H ${Math.round(w.high ?? w.temperature)}${unit}</span>
      <span>L ${Math.round(w.low ?? w.temperature)}${unit}</span>
      <span>${Math.round(w.wind ?? 0)} ${w.units?.wind ?? 'mph'}</span>
    </div>
  `;
}

function fillSettings() {
  displayNameInput.value = home.displayName || '';
  searchEngineInput.value = home.searchEngine || 'google';
  linksJson.value = JSON.stringify(home.links || [], null, 2);
}

async function saveHome(patch) {
  home = await api('/api/home', { method: 'PUT', body: JSON.stringify(patch) });
  renderEngines();
  renderLinks();
  tickClock();
  return home;
}

function openSettings() {
  fillSettings();
  settings.classList.remove('hidden');
  settingsBackdrop.classList.remove('hidden');
}

function closeSettings() {
  settings.classList.add('hidden');
  settingsBackdrop.classList.add('hidden');
}

function resolveSearch(raw) {
  const q = raw.trim();
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
  return ENGINES[home.searchEngine]?.href(q) ?? ENGINES.google.href(q);
}

async function refreshStatus() {
  renderStatus(await api('/api/status'));
}

async function loadHome() {
  home = await api('/api/home');
  notesEl.value = home.notes || '';
  renderEngines();
  renderLinks();
  fillSettings();
  tickClock();
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.hidden = true;
  try {
    const me = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        email: document.querySelector('#email').value,
        password: document.querySelector('#password').value,
      }),
    });
    showDash(me.email);
    await loadHome();
    await Promise.all([
      refreshStatus().catch(() => undefined),
      api('/api/weather').then(renderWeather).catch(() => renderWeather(null)),
    ]);
  } catch (err) {
    loginError.hidden = false;
    loginError.textContent = err instanceof Error ? err.message : 'Sign-in failed';
  }
});

searchForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const href = resolveSearch(searchInput.value);
  if (href) {
    window.location.href = href;
  }
});

notesEl?.addEventListener('input', () => {
  notesStatus.textContent = 'Saving…';
  clearTimeout(notesTimer);
  notesTimer = window.setTimeout(() => {
    void saveHome({ notes: notesEl.value })
      .then(() => {
        notesStatus.textContent = 'Saved';
      })
      .catch(() => {
        notesStatus.textContent = 'Save failed';
      });
  }, 600);
});

document.querySelector('#settings-btn')?.addEventListener('click', openSettings);
settingsBackdrop?.addEventListener('click', closeSettings);
document.querySelector('#logout')?.addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  window.location.reload();
});

document.querySelector('#save-settings')?.addEventListener('click', async () => {
  settingsMsg.textContent = '';
  let links;
  try {
    links = JSON.parse(linksJson.value || '[]');
  } catch {
    settingsMsg.textContent = 'Links JSON is invalid.';
    return;
  }
  try {
    await saveHome({
      displayName: displayNameInput.value.trim(),
      searchEngine: searchEngineInput.value,
      links,
    });
    settingsMsg.textContent = 'Saved.';
  } catch (err) {
    settingsMsg.textContent = err instanceof Error ? err.message : 'Save failed';
  }
});

document.querySelector('#copy-home')?.addEventListener('click', async (event) => {
  await navigator.clipboard.writeText('https://home.jameymcelveen.com');
  event.currentTarget.textContent = 'Copied';
  setTimeout(() => {
    event.currentTarget.textContent = 'Copy URL';
  }, 1400);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeSettings();
  }
  const typing =
    event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
  if (!typing && (event.key === '/' || ((event.metaKey || event.ctrlKey) && event.key === 'k'))) {
    event.preventDefault();
    searchInput?.focus();
  }
});

renderWord();
tickClock();
setInterval(tickClock, 15_000);

void (async function boot() {
  try {
    const me = await api('/api/me');
    showDash(me.email);
    await loadHome();
    await Promise.all([
      refreshStatus().catch(() => undefined),
      api('/api/weather').then(renderWeather).catch(() => renderWeather(null)),
    ]);
    setInterval(() => {
      void refreshStatus().catch(() => undefined);
    }, 10_000);
  } catch {
    showLogin();
  }
})();
