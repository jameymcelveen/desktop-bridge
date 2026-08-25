import crypto from 'node:crypto';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyHomePatch, DEFAULT_HOME, sanitizeHome } from './home.mjs';
import { getSuggestions } from './suggest.mjs';
import { getWeather } from './weather.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolvePublicDir() {
  const candidates = [
    path.join(__dirname, 'public'),
    path.join(__dirname, '..', 'public'),
    path.join(process.cwd(), 'public'),
  ];
  return candidates.find((dir) => fs.existsSync(path.join(dir, 'index.html'))) ?? candidates[0];
}

const PUBLIC_DIR = resolvePublicDir();
const DATA_FILE = process.env.RAILWAY_ENVIRONMENT
  ? path.join(__dirname, 'data', 'heartbeat.json')
  : path.join(os.tmpdir(), 'desktop-bridge-heartbeat.json');
const HOME_FILE = process.env.RAILWAY_ENVIRONMENT
  ? path.join(__dirname, 'data', 'home.json')
  : path.join(os.tmpdir(), 'desktop-bridge-home.json');
const COOKIE = 'db_session';
const SESSION_DAYS = 30;
const ONLINE_MS = 45_000;
const EMAIL_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAIN || 'mcelveen.us').toLowerCase();
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
};

/** @type {{ receivedAt: string, payload: Record<string, unknown> } | null} */
let heartbeat = null;
/** @type {ReturnType<typeof sanitizeHome>} */
let home = sanitizeHome(DEFAULT_HOME);
const loginAttempts = new Map();

function sessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not set');
  }
  return secret;
}

function statusPassword() {
  return process.env.STATUS_PASSWORD || '';
}

function heartbeatToken() {
  return process.env.HEARTBEAT_TOKEN || '';
}

function statusApiSecret() {
  return process.env.STATUS_API_SECRET || '';
}

function railwayOrigin() {
  return (process.env.RAILWAY_STATUS_ORIGIN || '').replace(/\/$/, '');
}

function hmac(value) {
  return crypto.createHmac('sha256', sessionSecret()).update(value).digest('base64url');
}

function isAllowedEmail(email) {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return false;
  }
  return normalized.endsWith(`@${EMAIL_DOMAIN}`);
}

function passwordMatches(given) {
  const expected = statusPassword();
  if (!expected) {
    return false;
  }
  const a = crypto.createHmac('sha256', sessionSecret()).update(String(given)).digest();
  const b = crypto.createHmac('sha256', sessionSecret()).update(expected).digest();
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function parseCookies(header) {
  const out = {};
  if (!header) {
    return out;
  }
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) {
      continue;
    }
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    out[key] = decodeURIComponent(value);
  }
  return out;
}

function readSession(req) {
  try {
    const token = parseCookies(req.headers.cookie || '')[COOKIE];
    if (!token) {
      return null;
    }
    const [body, sig] = token.split('.');
    if (!body || !sig || hmac(body) !== sig) {
      return null;
    }
    const session = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!session?.email || typeof session.exp !== 'number' || session.exp < Date.now()) {
      return null;
    }
    if (!isAllowedEmail(session.email)) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function sessionCookie(email, secure) {
  const body = Buffer.from(
    JSON.stringify({
      email: email.trim().toLowerCase(),
      exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
    }),
  ).toString('base64url');
  const token = `${body}.${hmac(body)}`;
  const parts = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${SESSION_DAYS * 24 * 60 * 60}`,
  ];
  if (secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

function clearCookie(secure) {
  const parts = [`${COOKIE}=`, 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

function isSecure(req) {
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  return proto === 'https';
}

function json(res, status, body, extraHeaders = {}) {
  if (status === 204) {
    res.writeHead(204, { 'Cache-Control': 'no-store', ...extraHeaders });
    res.end();
    return;
  }
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(payload);
}

function tooManyLogins(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const rec = loginAttempts.get(ip) || { count: 0, start: now };
  if (now - rec.start > windowMs) {
    rec.count = 0;
    rec.start = now;
  }
  rec.count += 1;
  loginAttempts.set(ip, rec);
  return rec.count > 12;
}

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  return forwarded || req.socket?.remoteAddress || 'unknown';
}

async function readBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      return req.body;
    }
    if (Buffer.isBuffer(req.body)) {
      return req.body.toString('utf8');
    }
    return JSON.stringify(req.body);
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function loadHeartbeatFromDisk() {
  try {
    heartbeat = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    heartbeat = heartbeat ?? null;
  }
}

function loadHomeFromDisk() {
  try {
    home = sanitizeHome(JSON.parse(fs.readFileSync(HOME_FILE, 'utf8')));
  } catch {
    home = home ?? sanitizeHome(DEFAULT_HOME);
  }
}

async function saveHome(next) {
  home = sanitizeHome(next);
  await fsPromises.mkdir(path.dirname(HOME_FILE), { recursive: true });
  await fsPromises.writeFile(HOME_FILE, JSON.stringify(home, null, 2), 'utf8');
  return home;
}

function normalizeIp(ip) {
  if (!ip || ip === 'unknown') {
    return undefined;
  }
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

async function saveHeartbeat(payload, extra = {}) {
  heartbeat = {
    receivedAt: new Date().toISOString(),
    payload: { ...payload, ...extra },
  };
  await fsPromises.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fsPromises.writeFile(DATA_FILE, JSON.stringify(heartbeat), 'utf8');
}

function viewOfHeartbeat() {
  if (!heartbeat) {
    return { online: false, state: 'offline', ageMs: null, receivedAt: null, bridge: null };
  }
  const ageMs = Date.now() - Date.parse(heartbeat.receivedAt);
  const state = Number.isFinite(ageMs) && ageMs <= ONLINE_MS ? 'online' : 'stale';
  return {
    online: state === 'online',
    state,
    ageMs: Number.isFinite(ageMs) ? ageMs : null,
    receivedAt: heartbeat.receivedAt,
    bridge: heartbeat.payload,
  };
}

function bearer(req) {
  const header = String(req.headers.authorization || '');
  if (header.startsWith('Bearer ')) {
    return header.slice(7);
  }
  return '';
}

function headerSecret(req) {
  return String(req.headers['x-status-secret'] || '');
}

function secretsEqual(given, expected) {
  if (!expected || !given) {
    return false;
  }
  const a = crypto.createHmac('sha256', sessionSecret()).update(given).digest();
  const b = crypto.createHmac('sha256', sessionSecret()).update(expected).digest();
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function proxyStatusFromRailway() {
  const origin = railwayOrigin();
  const secret = statusApiSecret();
  if (!origin || !secret) {
    return null;
  }
  const res = await fetch(`${origin}/api/internal/status`, {
    headers: { 'x-status-secret': secret },
  });
  if (!res.ok) {
    throw new Error(`upstream status ${res.status}`);
  }
  return res.json();
}

async function proxyHomeFromRailway() {
  const origin = railwayOrigin();
  const secret = statusApiSecret();
  if (!origin || !secret) {
    return null;
  }
  const res = await fetch(`${origin}/api/internal/home`, {
    headers: { 'x-status-secret': secret },
  });
  if (!res.ok) {
    throw new Error(`upstream home ${res.status}`);
  }
  return sanitizeHome(await res.json());
}

async function pushHomeToRailway(payload) {
  const origin = railwayOrigin();
  const secret = statusApiSecret();
  if (!origin || !secret) {
    return null;
  }
  const res = await fetch(`${origin}/api/internal/home`, {
    method: 'PUT',
    headers: {
      'x-status-secret': secret,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`upstream home save ${res.status}`);
  }
  return sanitizeHome(await res.json());
}

async function serveStatic(urlPath, res) {
  let relative = decodeURIComponent(urlPath.split('?')[0] || '/');
  if (relative === '/') {
    relative = '/index.html';
  }
  const full = path.normalize(path.join(PUBLIC_DIR, relative));
  if (!full.startsWith(PUBLIC_DIR)) {
    json(res, 400, { error: 'Invalid path' });
    return;
  }
  try {
    const data = await fsPromises.readFile(full);
    const ext = path.extname(full);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=3600',
    });
    res.end(data);
  } catch {
    json(res, 404, { error: 'Not found' });
  }
}

loadHeartbeatFromDisk();
loadHomeFromDisk();

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export async function handle(req, res) {
  try {
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url || '/', `http://${host}`);
    const method = (req.method || 'GET').toUpperCase();

    if (method === 'GET' && (url.pathname === '/health' || url.pathname === '/api/health')) {
      json(res, 200, { ok: true });
      return;
    }

    if (method === 'POST' && url.pathname === '/api/heartbeat') {
      if (!secretsEqual(bearer(req), heartbeatToken())) {
        json(res, 401, { error: 'Unauthorized' });
        return;
      }
      const raw = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(raw || '{}');
      } catch {
        json(res, 400, { error: 'Invalid JSON' });
        return;
      }
      if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
        const extra = { reportedFromIp: normalizeIp(clientIp(req)) };
        const origin = railwayOrigin();
        if (origin) {
          const upstream = await fetch(`${origin}/api/heartbeat`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${heartbeatToken()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ ...payload, ...extra }),
          });
          if (!upstream.ok && upstream.status !== 204) {
            json(res, 502, { error: `Upstream heartbeat failed (${upstream.status})` });
            return;
          }
        }
        await saveHeartbeat(payload, extra);
        json(res, 204, {});
        return;
      }
      json(res, 400, { error: 'Expected an object' });
      return;
    }

    if (method === 'GET' && url.pathname === '/api/internal/status') {
      if (!secretsEqual(headerSecret(req), statusApiSecret())) {
        json(res, 401, { error: 'Unauthorized' });
        return;
      }
      json(res, 200, viewOfHeartbeat());
      return;
    }

    if (method === 'GET' && url.pathname === '/api/me') {
      const session = readSession(req);
      if (!session) {
        json(res, 401, { error: 'Not signed in', domain: EMAIL_DOMAIN });
        return;
      }
      json(res, 200, { email: session.email, domain: EMAIL_DOMAIN });
      return;
    }

    if (method === 'POST' && url.pathname === '/api/login') {
      if (tooManyLogins(clientIp(req))) {
        json(res, 429, { error: 'Too many attempts. Wait a few minutes.' });
        return;
      }
      const raw = await readBody(req);
      let body;
      try {
        body = JSON.parse(raw || '{}');
      } catch {
        json(res, 400, { error: 'Invalid JSON' });
        return;
      }
      const email = String(body.email || '');
      const password = String(body.password || '');
      if (!isAllowedEmail(email)) {
        json(res, 403, { error: `Sign-in is limited to @${EMAIL_DOMAIN} addresses.` });
        return;
      }
      if (!passwordMatches(password)) {
        json(res, 401, { error: 'Email or password is wrong.' });
        return;
      }
      json(res, 200, { email: email.trim().toLowerCase() }, { 'Set-Cookie': sessionCookie(email, isSecure(req)) });
      return;
    }

    if (method === 'POST' && url.pathname === '/api/logout') {
      json(res, 204, {}, { 'Set-Cookie': clearCookie(isSecure(req)) });
      return;
    }

    if (method === 'GET' && url.pathname === '/api/status') {
      const session = readSession(req);
      if (!session) {
        json(res, 401, { error: 'Not signed in' });
        return;
      }
      try {
        const upstream = await proxyStatusFromRailway();
        json(res, 200, upstream ?? viewOfHeartbeat());
      } catch (err) {
        json(res, 502, {
          error: 'Could not read bridge status',
          detail: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    if (method === 'GET' && url.pathname === '/api/internal/home') {
      if (!secretsEqual(headerSecret(req), statusApiSecret())) {
        json(res, 401, { error: 'Unauthorized' });
        return;
      }
      loadHomeFromDisk();
      json(res, 200, home);
      return;
    }

    if (method === 'PUT' && url.pathname === '/api/internal/home') {
      if (!secretsEqual(headerSecret(req), statusApiSecret())) {
        json(res, 401, { error: 'Unauthorized' });
        return;
      }
      const raw = await readBody(req);
      let body;
      try {
        body = JSON.parse(raw || '{}');
      } catch {
        json(res, 400, { error: 'Invalid JSON' });
        return;
      }
      json(res, 200, await saveHome(applyHomePatch(home, body)));
      return;
    }

    if (method === 'GET' && url.pathname === '/api/home') {
      const session = readSession(req);
      if (!session) {
        json(res, 401, { error: 'Not signed in' });
        return;
      }
      try {
        const upstream = await proxyHomeFromRailway();
        json(res, 200, upstream ?? home);
      } catch {
        json(res, 200, home);
      }
      return;
    }

    if (method === 'PUT' && url.pathname === '/api/home') {
      const session = readSession(req);
      if (!session) {
        json(res, 401, { error: 'Not signed in' });
        return;
      }
      const raw = await readBody(req);
      let body;
      try {
        body = JSON.parse(raw || '{}');
      } catch {
        json(res, 400, { error: 'Invalid JSON' });
        return;
      }
      try {
        const next = applyHomePatch(home, body);
        await saveHome(next);
        const upstream = await pushHomeToRailway(next).catch(() => null);
        json(res, 200, upstream ?? next);
      } catch (err) {
        json(res, 502, {
          error: 'Could not save home config',
          detail: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    if (method === 'GET' && url.pathname === '/api/suggest') {
      const session = readSession(req);
      if (!session) {
        json(res, 401, { error: 'Not signed in' });
        return;
      }
      try {
        json(res, 200, {
          query: url.searchParams.get('q') || '',
          suggestions: await getSuggestions(url.searchParams.get('q')),
        });
      } catch (err) {
        json(res, 502, {
          error: 'Could not load suggestions',
          detail: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    if (method === 'GET' && url.pathname === '/api/weather') {
      const session = readSession(req);
      if (!session) {
        json(res, 401, { error: 'Not signed in' });
        return;
      }
      try {
        const cfg = (await proxyHomeFromRailway().catch(() => null)) ?? home;
        const weather = await getWeather({
          ip: clientIp(req),
          latitude: cfg.weather?.latitude,
          longitude: cfg.weather?.longitude,
          label: cfg.weather?.label,
        });
        json(res, 200, weather);
      } catch (err) {
        json(res, 502, {
          error: 'Could not read weather',
          detail: err instanceof Error ? err.message : String(err),
        });
      }
      return;
    }

    if (method === 'GET' || method === 'HEAD') {
      await serveStatic(url.pathname, res);
      return;
    }

    json(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    json(res, 500, { error: 'Internal error' });
  }
}

export { isAllowedEmail };
