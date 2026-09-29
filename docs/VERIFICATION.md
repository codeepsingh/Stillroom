# Local verification record

These are actual local results, not public-chain or hosted-CI claims.

| Check | Result |
| --- | --- |
| Compact compiler | 0.31.0 through WSL |
| Contract compilation | Passed; `prove_entry`, `rotate_gate`, `close_gate`, `open_gate` |
| Managed artifacts | Four real prover/verifier pairs and circuit IR; approximately 10.9 MiB per complete managed copy |
| Artifact synchronization | `npm run verify:assets` passed; source and public copies match |
| Root + frontend TypeScript | `npm run typecheck` passed |
| Compiled-contract/application tests | 45 passed across four test files |
| Node 22 compatibility | Same 45 tests passed under Node 22.23.3 |
| Production frontend | `npm run build` passed, output at root `dist/` |
| Chromium desktop/mobile tests | 22 passed |
| Responsive audit | No horizontal overflow on `/`, `/gate`, `/admin` at 375, 768, 1024 and 1440px; reduced motion enabled |
| Theme audit | Day/night screenshot inspection; toggle persists across reload |
| Wallet UI test | Mocked Lace connect/disconnect and selected-network forwarding passed; not an installed-wallet transaction |
| Public asset serving | Browser test fetched a genuine binary proving key, not HTML |
| npm audit | Zero reported vulnerabilities in the installed lockfile |
| Branding scan | No previous-project identifiers found in application source, documentation, package metadata or managed artifacts; dependency caches and agent metadata excluded |
| Docker executable | 29.6.1 present; full local chain/proof-server stack not exercised |

## Expected non-failing warnings

- A Midnight SDK JavaScript chunk remains larger than Vite's default 500 KiB advisory threshold. The wallet/ledger code and application routes are lazy-loaded; the landing page does not eagerly load ledger WASM. The ledger WASM binary itself is about 10 MiB uncompressed.
- Compiler-generated source maps reference source locations that the host-side test runner cannot resolve after WSL compilation/copying. Generated runtime tests still execute and pass. Generated artifacts were not hand-patched to hide this warning.
- Rollup removes an upstream pure-annotation comment it cannot interpret. This is not a build failure.

## Not verified locally

- A funded real-wallet deployment or circuit transaction on Preview/Preprod.
- A particular installed version of Lace/1AM/Nightly against live proving infrastructure.
- Public consensus finality, actual explorer confirmation, or sustained network availability.
- Hosted CI/CD runs, a public live deployment, proposal approval, product profile or demo evidence.

Use `docs/SUBMISSION.md` to close these evidence gaps before submission. Do not present mocked connector tests as on-chain tests.
