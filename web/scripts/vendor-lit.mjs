import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dest = path.join(root, 'public', 'vendor');
const pkgs = ['lit', 'lit-html', 'lit-element', '@lit/reactive-element'];

function keep(src) {
  const rel = src.slice(root.length);
  if (rel.includes(`${path.sep}development${path.sep}`) || rel.endsWith(`${path.sep}development`)) {
    return false;
  }
  if (src.endsWith('.map') || src.endsWith('.d.ts') || src.endsWith('.ts')) {
    return false;
  }
  return true;
}

await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
for (const pkg of pkgs) {
  const from = path.join(root, 'node_modules', pkg);
  const to = path.join(dest, pkg);
  await cp(from, to, { recursive: true, filter: keep });
}
console.error(`vendored ${pkgs.join(', ')} → public/vendor`);
