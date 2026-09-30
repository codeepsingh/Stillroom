# Stillroom

**Let the proof in. Keep the person private.**

Stillroom is a privacy-first access desk built on Midnight. A visitor proves that a private, self-supplied eligibility score meets a public threshold. The contract records a pass-scoped nullifier and increments an entry counter without publishing the score or the pass secret. A steward can open, close, or reconfigure the gate using a separate private recovery key.

The interface takes its cues from a botanical reading room: quiet green, considered typography, local imagery, and a day/night theme. The landing page, access form, public register, privacy notes, steward controls, and browser deployment desk are one application—not a mock dashboard.

> **Delivery status:** source and local verification belong to this project. A public deployment, successful wallet transaction, live CI run, approved proposal, product X profile, demo video, screenshots, and commit history must be supplied before claiming Level 1–4 completion. No inherited contract address or fabricated activity is included.

## Interface & Application Screenshots

The Stillroom dApp interface combines private zero-knowledge proving workflows with an organic botanical design language:

| Access Desk & Landing | Privacy Gate Entry |
| :---: | :---: |
| ![Stillroom Landing & Hero](sub%20images/ss1.png) | ![Gate Access & Proof Entry](sub%20images/ss2.png) |
| *Hero access desk with threshold status and live wallet connection* | *Private witness inputs, ZK proving progress, and gate status* |

| On-Chain Observatory | Steward & Management Desk |
| :---: | :---: |
| ![On-Chain Observatory](sub%20images/ss3.png) | ![Steward Controls & Key Management](sub%20images/ss4.png) |
| *Public ledger transparency, entry logs, and nullifier records* | *Steward recovery key generation, gate rotation, and administration* |


## Initial product idea

Independent communities need a way to check access conditions without collecting another profile or database of personal information. Stillroom explores an eligibility gate where Midnight verifies a threshold over a private witness and publishes only the minimum gate configuration and an entry receipt. The current MVP demonstrates private threshold checking over self-attested scores; a production credential gate would additionally require trusted issuer attestations and a carefully designed membership/revocation system.

**Provided idea category:** Age / Eligibility Gate. This is an eligibility-threshold prototype, **not** an age-verification or identity-verification service. See [the product proposal](PROPOSAL.md).

## Start locally

Prerequisites:

- Node.js **22 LTS** and npm (the application requires Node 22 or newer).
- Compact compiler **0.31.0** with its proving-key generator, for recompiling contracts.
- A Midnight browser wallet exposing the supported connector APIs: 1AM, Midnight Lace, or Nightly.
- For network transactions: the selected network, funded wallet/DUST, working indexer, and the wallet's configured proving service. Browser deployment is not instant and may still require a proof server behind the wallet.
- Docker is optional for the local proof server/network, not needed for deterministic contract tests or the frontend build.

```sh
npm ci
npm run compile
npm run check
npm run dev
```

Open the development URL printed by Vite. `npm run compile` creates genuine compiler output and copies it into the browser's source and public asset directories. Checked-in generated artifacts allow `npm run build` without a compiler; after changing Compact source, always recompile.

```sh
npm test               # compiled-contract and application unit tests
npm run typecheck      # strict frontend TypeScript checking
npm run verify:assets  # verify bindings, circuits, and public key copies match
npm run build          # typecheck + production frontend; output in dist/
npm run preview        # serve the production frontend locally
npx playwright install chromium
npm run test:e2e       # browser smoke tests; not on-chain wallet tests
```

See [setup](docs/SETUP.md) for Windows/WSL, environment variables, and proving services.

## Deploy from the browser

1. Start the application and open **Deployment** (`/admin`). Preview is the default network. Choose **Preprod** to collect Level 2–4 evidence.
2. Connect a supported wallet on the same network. The app checks the returned network and required capabilities; an installed extension alone is not sufficient.
3. Configure the public threshold, pass/curator identifiers, deadline, and entry capacity.
4. Generate steward and maintenance recovery keys, encrypt the recovery file with a strong password, and download it. This is an application authority secret, **not your wallet seed phrase**. Do not put either in the repository, screenshots, frontend environment variables, or issue reports.
5. Review the parameters and deploy. Approve the transaction in the wallet. Proving, balancing, submission, and indexing can take time.
6. Keep the returned address and transaction details. The app distinguishes submission from indexed confirmation. If confirmation times out, check the saved address instead of creating another deployment.
7. The network-scoped address is picked up by the app immediately. For other visitors and devices, set `VITE_CONTRACT_ADDRESS` and `VITE_NETWORK` in the hosting environment and rebuild.

Deployment creates a new instance; `/steward` manages an existing instance. Knowledge of its steward recovery key is required to authorize administrative circuits. The page route itself is not an authorization boundary.

## Use the application

| Page | Purpose |
| --- | --- |
| `/` | Product introduction and access entry point |
| `/gate` | Read the active gate, enter private witness values, and submit an eligibility proof |
| `/observatory` | Read public gate state and receipts without revealing witness preimages |
| `/privacy` | Understand precisely what is public, private, and outside the guarantee |
| `/admin` | Configure or deploy a contract with the browser wallet |
| `/steward` | Open, close, or rotate gate configuration with a private steward key |

A visitor needs a configured, indexed contract and a connected wallet before submitting a real proof. Empty pages direct you to deployment rather than displaying fictitious activity. Keep a high-entropy pass secret: reuse is rejected for the same pass identifier, but a new secret represents a new nullifier. This is **not one-person-one-entry**.

Full walkthrough: [usage](docs/USAGE.md).

## Privacy model

### Public ledger state

An observer can read the eligibility threshold, pass and curator identifiers, expiry, steward public-key hash, gate-open flag, capacity, total entry count, nullifier set, entry log, and contract edition. They can observe transaction timing, circuit actions and changes in that public state. A pass-scoped nullifier is a public receipt, not encryption of the full ledger.

### Private witnesses

The eligibility score, entry secret, and steward recovery secret are supplied through witnesses. They are not explicitly written to public ledger state or passed as public administrative arguments. The contract uses `disclose()` deliberately for public configuration and receipt values.

### Boundaries of the claim

- The proof establishes a threshold relation; it **does not establish the truth or provenance of a self-supplied score**.
- A nullifier blocks reuse of one secret for one pass ID. It does not prevent someone choosing another secret or linking identical secret/pass combinations across deployments.
- No claim of total anonymity is made. Network requests, wallet providers, transaction metadata, or external observations may correlate activity.
- Witnesses are handled by the browser and proof-generation path. A wallet or remote proving service can see sensitive inputs depending on its architecture. Use a trusted/local proving service for sensitive values.
- Browser memory and downloaded recovery files are not protected from a compromised device or malicious extension. Secrets are not intentionally persisted in application localStorage; private state is session-scoped.
- Public thresholds constrain what a successful proof implies. Proof privacy cannot hide the fact that the threshold was met.

See [the threat model](docs/PRIVACY.md) for precise assumptions.

## Contract

Source: `contracts/stillroom.compact`.

| Circuit | Purpose |
| --- | --- |
| `prove_entry` | Check open/expiry/capacity and private score; reject reused nullifiers; record entry |
| `rotate_gate` | Steward-authorized public gate configuration change |
| `close_gate` | Steward-authorized pause |
| `open_gate` | Steward-authorized resume |
| `steward_public_key` | Pure, domain-separated authority hash |
| `make_entry_nullifier` | Pure, domain-separated receipt derivation |

The six constructor arguments are threshold (`Uint<64>`), pass ID (`Bytes<32>`), deadline (`Uint<64>`), curator ID (`Bytes<32>`), steward hash (`Bytes<32>`), and capacity (`Uint<32>`). The browser uses the compiler-generated types; do not edit generated JavaScript, circuit files, or keys by hand.

## Architecture

```text
contracts/                     Compact source and generated managed/stillroom/
frontend/src/                  React application and Midnight connector
frontend/src/managed/contract/ Generated browser contract bindings
frontend/public/managed/       Circuits and proving/verifying assets served at /managed
src/test/                      Deterministic runtime and application tests
scripts/                       Compiler wrapper and artifact validation
e2e/                          Browser smoke tests
.github/workflows/             Compile, test, build, and optional Pages deployment
docs/                         Setup, usage, privacy, and submission evidence
```

The browser session provides private state, public data, ZK configuration, proof generation, wallet balancing, and transaction submission. That is **six provider roles**, even where ecosystem guides refer to the “five provider pattern.” The SDK and generated Compact runtime versions are pinned together. Private witnesses are bound with `CompiledContract.withWitnesses`; they are not replaced by vacant witnesses.

## Hosting and CI/CD

The root build emits `dist/`. Vercel and Netlify configuration files are included. Build with `npm ci && npm run build`, publish `dist`, and preserve `/managed` files as static binary assets. Do not rewrite missing key files to the SPA's HTML entrypoint.

The CI workflow compiles, validates generated assets, runs tests, typechecks/builds the frontend, and runs Chromium smoke tests. A separate manually triggered GitHub Pages deployment is provided for a root/custom-domain Pages site; Vercel or Netlify is simpler for project-subpath hosting. Workflow files are implementation, **not evidence that a public run has passed**.

## Level 1–4 submission

The complete [requirements and evidence checklist](docs/SUBMISSION.md) distinguishes implemented code from externally verifiable deliverables. The [local verification record](docs/VERIFICATION.md) documents 45 passing contract/application tests, 22 passing browser checks, compiler/build results, and known warnings.

| Level | Prepared here | Still required from the owner |
| --- | --- | --- |
| 1 | Compact source, private witnesses, managed assets, tests, product idea, setup documentation | Deployment address, compile/deployment screenshots, public repository, 5 meaningful commits |
| 2 | Wallet connection/disconnection, browser circuit flow, privacy documentation | Successful Lace + Preprod transaction evidence, hosted demo, demo video, 8 meaningful commits |
| 3 | Tests, compile/test/build CI workflow, proposal and privacy model | Passing public CI runs, proposal approval, full demo video, test screenshot, 10 meaningful commits |
| 4 | Browser MVP, technical and user documentation, deployment workflow | Live Preprod MVP, product X profile/link, public pipeline run, demo video, 15 meaningful commits |

### Public release record

- **Live application:** not published.
- **Preprod contract address:** not deployed.
- **Verified transaction:** not recorded.
- **Public CI run:** not available until repository setup.
- **Product X profile:** not created.
- **Proposal approval:** not submitted.

Replace these status lines with real evidence after release. There are intentionally no inherited URLs, synthetic badges, placeholder addresses, or claimed commits.
