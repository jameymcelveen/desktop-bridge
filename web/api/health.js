import { handle } from '../app.mjs';

export default async function handler(req, res) {
  req.url = '/api/health';
  await handle(req, res);
}
