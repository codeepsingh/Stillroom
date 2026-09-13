// Historical script name retained for npm compatibility. Never rewrite generated
// bindings or disable their runtime-version checks: fail on incompatibility.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const bindings = path.join(__dirname, '..', 'contracts', 'managed', 'stillroom', 'contract', 'index.js');
if (fs.existsSync(bindings)) {
  import(pathToFileURL(bindings).href).then(({ pureCircuits }) => {
    if (pureCircuits.steward_public_key(new Uint8Array(32)).length !== 32) throw new Error('Invalid Stillroom runtime output');
    console.log('Stillroom generated bindings match the installed Compact runtime (no patches applied).');
  }).catch((error) => { console.error(error); process.exitCode = 1; });
}
