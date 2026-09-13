import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const circuits = ['prove_entry', 'rotate_gate', 'close_gate', 'open_gate'];
const generated = 'contracts/managed/stillroom';
const served = 'frontend/public/managed';
const required = ['contract/index.js', 'contract/index.d.ts', ...circuits.flatMap(name => [`keys/${name}.prover`, `keys/${name}.verifier`, `zkir/${name}.zkir`])];
const hash = data => createHash('sha256').update(data).digest('hex');
for (const file of required) {
  const source = await readFile(new URL(`${generated}/${file}`, root));
  const copy = await readFile(new URL(`${served}/${file}`, root));
  if (!source.length || hash(source) !== hash(copy)) throw new Error(`Missing or stale public managed asset: ${file}. Run npm run compile.`);
}
for (const file of ['index.js', 'index.d.ts']) {
  const source = await readFile(new URL(`${generated}/contract/${file}`, root));
  const copy = await readFile(new URL(`frontend/src/managed/contract/${file}`, root));
  if (hash(source) !== hash(copy)) throw new Error(`Stale frontend contract binding: ${file}`);
}
let bytes = 0;
async function size(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const child = path.join(dir, entry.name);
    if (entry.isDirectory()) await size(child);
    else bytes += (await stat(child)).size;
  }
}
await size(fileURLToPath(new URL(served, root)));
console.log(`Stillroom: ${circuits.length} circuits verified; contract bindings and public proving assets match (${(bytes / 1024 / 1024).toFixed(1)} MiB).`);
