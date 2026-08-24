import { handle } from '../app.mjs';

export default async function handler(req, res) {
  await handle(req, res);
}
