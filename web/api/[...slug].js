import { handle } from '../app.mjs';

/** Vercel sometimes strips `/api` from `req.url` on catch-all routes. */
function restoreApiPath(req) {
  const raw = req.url || '/';
  const url = raw.startsWith('http') ? new URL(raw) : new URL(raw, 'http://local');
  if (url.pathname === '/health' || url.pathname === '/api' || url.pathname.startsWith('/api/')) {
    return;
  }
  req.url = `/api${url.pathname === '/' ? '' : url.pathname}${url.search}`;
}

export default async function handler(req, res) {
  restoreApiPath(req);
  await handle(req, res);
}
