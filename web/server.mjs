#!/usr/bin/env node
import http from 'node:http';
import { handle } from './app.mjs';

const port = Number.parseInt(process.env.PORT || '8787', 10);

http.createServer((req, res) => {
  void handle(req, res);
}).listen(port, '0.0.0.0', () => {
  console.error(`DesktopBridge status listening on :${port}`);
});
