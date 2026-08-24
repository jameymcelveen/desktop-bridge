const loginEl = document.querySelector('#login');
const dashEl = document.querySelector('#dash');
const form = document.querySelector('#login-form');
const loginError = document.querySelector('#login-error');
const who = document.querySelector('#who');
const dot = document.querySelector('#dot');
const stateLabel = document.querySelector('#state-label');
const seen = document.querySelector('#seen');
const facts = document.querySelector('#facts');

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

function showLogin(domain) {
  dashEl.classList.add('hidden');
  loginEl.classList.remove('hidden');
  const input = document.querySelector('#email');
  if (domain && input && !input.value) {
    input.placeholder = `you@${domain}`;
  }
}

function showDash(email) {
  loginEl.classList.add('hidden');
  dashEl.classList.remove('hidden');
  who.textContent = email;
}

function formatBytes(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    return '—';
  }
  const gb = n / 1024 ** 3;
  return `${gb.toFixed(1)} GiB`;
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
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

function renderStatus(status) {
  const state = status.state || 'offline';
  dot.className = `dot ${state}`;
  stateLabel.textContent =
    state === 'online' ? 'Mac is online' : state === 'stale' ? 'Last seen, heartbeat stale' : 'Mac is offline';
  seen.textContent = status.receivedAt
    ? `Heartbeat ${formatAge(status.ageMs)} (${status.receivedAt})`
    : 'No heartbeat received yet. Point DesktopBridge at this site’s /api/heartbeat.';

  const b = status.bridge || {};
  const mem = b.memory || {};
  const used =
    typeof mem.totalBytes === 'number' && typeof mem.freeBytes === 'number'
      ? mem.totalBytes - mem.freeBytes
      : null;
  const rows = [
    ['Host', b.hostname || '—'],
    ['Version', b.version || '—'],
    ['OS', b.platform ? `${b.platform} ${b.release || ''} ${b.arch || ''}`.trim() : '—'],
    ['Uptime', typeof b.uptimeSeconds === 'number' ? `${Math.floor(b.uptimeSeconds / 3600)}h ${Math.floor((b.uptimeSeconds % 3600) / 60)}m` : '—'],
    ['Load', Array.isArray(b.loadAverage) ? b.loadAverage.map((n) => Number(n).toFixed(2)).join(' · ') : '—'],
    ['Memory', used !== null ? `${formatBytes(used)} used / ${formatBytes(mem.totalBytes)}` : '—'],
    ['Shell', b.allowShell === undefined ? '—' : b.allowShell ? 'enabled' : 'disabled'],
    ['Roots', b.rootCount ?? '—'],
    ['PID', b.pid ?? '—'],
  ];
  facts.replaceChildren(
    ...rows.flatMap(([k, v]) => {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = String(v);
      return [dt, dd];
    }),
  );
}

async function refresh() {
  const status = await api('/api/status');
  renderStatus(status);
}

async function boot() {
  try {
    const me = await api('/api/me');
    showDash(me.email);
    await refresh();
    setInterval(() => {
      void refresh().catch(() => undefined);
    }, 10_000);
  } catch (err) {
    showLogin(err && /mcelveen/.test(String(err.message)) ? 'mcelveen.us' : 'mcelveen.us');
  }
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
    await refresh();
    setInterval(() => {
      void refresh().catch(() => undefined);
    }, 10_000);
  } catch (err) {
    loginError.hidden = false;
    loginError.textContent = err instanceof Error ? err.message : 'Sign-in failed';
  }
});

document.querySelector('#logout')?.addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' });
  window.location.reload();
});

void boot();
