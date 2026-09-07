import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = resolve(root, 'contracts/stillroom.compact');
const target = resolve(root, 'contracts/managed/stillroom');
const flags = process.argv.slice(2);
if (flags.some((flag) => flag !== '--skip-zk')) throw new Error('Supported option: --skip-zk (development only).');
const args = [...flags, source, target];
const windowsPath = (value) => value.replace(/^([A-Za-z]):/, (_, drive) => `/mnt/${drive.toLowerCase()}`).replaceAll('\\', '/');
const wslHome = process.platform === 'win32'
  ? spawnSync('wsl.exe', ['--', 'printenv', 'HOME'], { encoding: 'utf8', shell: false }).stdout?.trim()
  : undefined;
const candidates = process.platform === 'win32'
  ? [
      ['compactc', args],
      ['wsl.exe', ['--', 'compactc', ...flags, windowsPath(source), windowsPath(target)]],
      ...(wslHome ? [
        ['wsl.exe', ['--', `${wslHome}/.compact/bin/compactc`, ...flags, windowsPath(source), windowsPath(target)]],
        ['wsl.exe', ['--', `${wslHome}/.local/bin/compact`, 'compile', ...flags, windowsPath(source), windowsPath(target)]],
      ] : []),
    ]
  : [['compactc', args], ['compact', ['compile', ...args]]];

if (process.env.COMPACTC) candidates.unshift([process.env.COMPACTC, args]);
if (!existsSync(source)) throw new Error(`Missing Compact source: ${source}`);
let lastError = '';
for (const [command, commandArgs] of candidates) {
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit', shell: false });
  if (result.status === 0) {
    if (!flags.includes('--skip-zk')) {
      for (const circuit of ['prove_entry', 'rotate_gate', 'close_gate', 'open_gate']) {
        for (const artifact of [`keys/${circuit}.prover`, `keys/${circuit}.verifier`, `zkir/${circuit}.bzkir`]) {
          if (!existsSync(resolve(target, artifact))) throw new Error(`Compiler did not generate ${artifact}`);
        }
      }
    }
    console.log(`Stillroom circuits: prove_entry, rotate_gate, close_gate, open_gate${flags.includes('--skip-zk') ? ' (development-only, keys skipped)' : ' — proving and verifying assets present'}`);
    process.exit(0);
  }
  lastError = `${command} exited with ${result.status ?? result.error?.message ?? 'an unknown error'}`;
}
throw new Error(`Unable to run the Compact compiler. Tried compactc and compact. ${lastError}`);
