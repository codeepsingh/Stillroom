# Set up Stillroom

## Reproducible application setup

Use Node 22 LTS (`.nvmrc`) and npm. Run all commands from the repository root:

```sh
npm ci
npm run compile
npm run check
npm run dev
```

The lockfile is committed project material. Do not use `--force` or `--legacy-peer-deps` to bypass incompatible SDK packages. The frontend uses Vite's WebAssembly plugin and an ES2022 output target, which supports native top-level await in current Chromium/Firefox/Safari. Use a current desktop browser for wallet operations.

## Compact compiler

The project targets Compact 0.31.0 / Compact runtime 0.16.0. Install the official Compact toolchain, not the unrelated Windows filesystem utility named `compact.exe`.

With the Midnight Compact manager:

```sh
compact update 0.31.0
compact compile --version
compact compile contracts/stillroom.compact contracts/managed/stillroom
npm run copy:managed
```

Prefer `npm run compile`, which wraps platform-specific compiler selection and copies managed assets automatically. On Windows, use WSL Ubuntu with the toolchain installed inside Linux. The wrapper supports the local WSL compiler installation; inspect `scripts/compile-contract.mjs` for exact resolution and overrides. Do not assume Windows' `compact --version` verifies the blockchain toolchain.

Compilation must generate four exported state-changing circuits: `prove_entry`, `rotate_gate`, `close_gate`, and `open_gate`, plus genuine proving/verifying keys. `npm run verify:assets` checks all three generated locations agree. Pure circuits do not need independent transaction keys.

## Environment

Copy `frontend/.env.example` to `frontend/.env.local` when configuring a shared deployment.

```dotenv
VITE_NETWORK=preview
VITE_CONTRACT_ADDRESS=
```

Leave the address blank until you deploy. Switch both variables to the real Preprod configuration for the public release. The browser can save separate addresses for Preview and Preprod; a browser-saved address takes precedence over the build environment on that network. Only public configuration belongs in `VITE_*`: it is compiled into the client bundle.

Do not add a mnemonic, private wallet seed, steward recovery secret, or entry secret to any frontend environment variable.

## Wallet and proving service

Install a supported Midnight extension. The application checks for 1AM, Midnight Lace, and Nightly. Support depends on the installed wallet exposing the required configuration, address, proving, balancing, and submission methods. A wallet name in the UI is not proof that all versions implement these methods.

1. Select Preview or Preprod in the app.
2. Connect and approve the matching network in the extension.
3. Fund the wallet using that network's official tools and allow DUST to accrue.
4. Ensure the wallet's proving service is available.
5. Deploy through `/admin` or use an already-deployed matching instance.

Browser deployment avoids a separate seed-based deployment CLI. It does **not** remove the cost of proof generation or guarantee an instant deployment. A remote proof service may receive witness information. Prefer a trusted/local service.

For a local proof service, the included compose file also defines a development node/indexer:

```sh
docker compose up -d proof-server
docker compose logs proof-server
docker compose down
```

`npm run env:up` starts the complete local stack. Local Docker chain compatibility and DUST accrual must be checked separately; the standard tests execute compiled circuits locally and do not assert network deployment. The browser targets Preview/Preprod, not the Docker network.

## Build and host

```sh
npm run build
npm run preview
```

Host the root `dist/` folder. The complete `managed` directory must remain available. Test a direct request to `/managed/keys/prove_entry.prover`: it must return binary data, never `index.html`.

Vercel: use the root `vercel.json` and a project root at this directory. Netlify: use root `netlify.toml`. Both provide SPA fallback routing while retaining real static files. Public hosting needs HTTPS for clipboard and wallet access. Development on localhost is supported.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Missing generated import | Run `npm run compile` and `npm run verify:assets` |
| No wallet detected | Install/unlock a compatible Midnight extension and reload the page |
| Unsupported wallet method | Update or change wallet; the app will not simulate support |
| Network mismatch | Disconnect, switch extension/app to the same network, reconnect |
| Proving fails or stalls | Wallet proving configuration, service availability, managed asset responses, DUST |
| Indexer timeout after submit | Preserve address/transaction receipt and retry confirmation; do not blindly redeploy |
| Duplicate entry | The same secret was already used for this pass ID |
| Steward authorization rejected | Wrong recovery secret for this contract; wallet ownership alone is insufficient |
| App has no active contract | Deploy from `/admin`, or configure the correct address for the selected network |
| Theme preference resets | Check browser storage permissions; theme selection is local to this browser |

Never paste witness values, recovery files, or wallet seeds into bug reports.
