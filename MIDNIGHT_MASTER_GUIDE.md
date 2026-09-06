# Stillroom — Midnight implementation guide

This project-specific guide documents the actual integration, rather than presenting example snippets as verified production behavior. It complements `docs/SETUP.md`, `docs/PRIVACY.md` and the generated contract declarations.

## Version boundary

- Compact 0.31.0; Compact runtime 0.16.0.
- Midnight.js 4.1.1; Compact.js 2.5.1; ledger-v8 8.1.0.
- Node 22 LTS in CI; React 19 and Vite 6.
- Preview for initial browser deployment; Preprod for Level 2–4 evidence.

Do not mix compiler, runtime and ledger versions casually. Verify package APIs against installed declarations, not outdated copied snippets. Windows `compact.exe` is unrelated to Midnight.

## Build order

```sh
npm ci
npm run compile
npm run verify:assets
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Compilation produces `contracts/managed/stillroom`. Browser bindings go to `frontend/src/managed/contract`; circuit IR and keys are published at `frontend/public/managed`. Do not edit these generated assets. A key request returning SPA HTML is a deployment error, not a proof-server issue.

## Contract design

`contracts/stillroom.compact` contains four exported state-changing circuits:

- `prove_entry`: enforce range/threshold, open/expiry/capacity and nullifier uniqueness.
- `rotate_gate`: validate steward witness, new pass ID, future deadline and lifetime capacity.
- `close_gate`: authorize and pause.
- `open_gate`: authorize and resume only within capacity/deadline.

`steward_public_key` and `make_entry_nullifier` are exported pure circuits. The edition and steward commitment are sealed. The receipt domain separators are specific to Stillroom. Gate rotation preserves lifetime count/history and forbids pass-ID reuse.

Witnesses supply the score, entry secret and steward recovery secret. `disclose()` marks public policy and derived receipts. It is not encryption. No issuer signature or identity constraint exists in this MVP.

## Constructor

Read `contracts/managed/stillroom/contract/index.d.ts` after compiling. The argument order is:

1. `threshold`: bigint / Uint<64>, application range 0–100.
2. `pass`: 32-byte Uint8Array, nonzero.
3. `deadline`: bigint / Unix seconds.
4. `curator`: 32-byte Uint8Array public identifier.
5. `steward_hash`: 32-byte derived authority commitment, nonzero.
6. `limit`: bigint / Uint<32>, positive lifetime capacity.

Never pass the steward secret as the public steward hash. Use the generated pure circuit to derive it. Never replace a missing hash function with random bytes; that would silently make administration unrecoverable.

## Browser session

`frontend/src/lib/midnight.ts` constructs six provider roles:

1. session-scoped private state;
2. indexer public data;
3. fetched ZK configuration;
4. wallet-backed proving;
5. wallet transaction balancing;
6. transaction submission.

Validate connector capabilities and the wallet-reported network. `setNetworkId` must precede ledger operations. A nonempty, legitimate submission result is required; do not invent a transaction ID from serialized bytes or the word “submitted.”

The indexer adapter omits absent GraphQL offsets rather than sending null. Preserve ledger parameter and contract-state semantics for transaction construction. Read-only state queries and proving-related public-state queries are both important.

## Witness binding

The contract requires witnesses. Build the CompiledContract with `withWitnesses`, providing callbacks that return `[privateState, value]`. Do not use `withVacantWitnesses` for this contract and assume a separately supplied `witnesses` property overrides it. Use the generated signatures and SDK declarations.

## Deployment and confirmation

Create the unproven deployment with `createUnprovenDeployTx`; submit through `submitTxAsync`. Proof generation is delegated through the wallet's configured path, not abolished. It can be slow and a remote proving service may handle sensitive inputs.

Save the public address/receipt promptly after submission so an indexer delay is recoverable. Keep “submitted,” “indexed” and error states distinct. A saved address in one browser is not shared deployment configuration for other visitors. Configure the public hosting environment or enter the address on each browser.

Back up application steward authority before deployment. Keep any SDK maintenance signing material separate. Never request or persist a wallet seed phrase in this frontend.

## Tests and evidence

Deterministic tests execute generated Compact circuits. They provide useful coverage without DUST or Docker but do not verify consensus submission, wallet approval, remote proving or a Preprod deployment. Browser smoke tests verify UI behavior without an installed wallet. Manual network evidence must close that boundary.

CI must compile and test, not merely build a static UI. A workflow file cannot be described as a passing run until it has executed on the public repository.

## Privacy wording to preserve

Use “not written to public ledger state,” not “never leaves the browser.” Use “blocks reuse of this secret/pass combination,” not “one person, one vote.” Use “self-attested threshold proof,” not “verified membership.” Do not promise total anonymity or universal nullifier unlinkability.
