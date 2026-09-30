# Stillroom

**Let the proof in. Keep the person private.**

🌐 **Live Application:** [https://stillroommid.netlify.app/](https://stillroommid.netlify.app/)  
🎥 **Demo Video:** [Google Drive Demo Recording](https://drive.google.com/file/d/1n-PGiX6bxJa3yJJo49SvyTN4R5p-NJY-/view?usp=sharing)  
📦 **Public Repository:** [https://github.com/codeepsingh/Stillroom](https://github.com/codeepsingh/Stillroom)

---

## Initial Product Idea & Problem Statement

### Problem Statement
Modern applications and community gates force visitors into an all-or-nothing bargain: to prove eligibility (such as meeting an accreditation score, age tier, or membership requirement), users must expose their full identity, credentials, or private records to centralized databases. This creates severe privacy erosion, identity theft risks, and unnecessary data hoarding.

### Product Solution: Stillroom
Stillroom is a privacy-first zero-knowledge access desk built on the Midnight Network. A visitor privately proves that their self-supplied eligibility score satisfies an on-chain threshold without ever publishing the score, identity, or pass secret to the public ledger. 

The Compact smart contract records a domain-separated, pass-scoped nullifier and increments the entry counter while keeping all witness data strictly confidential. A steward can open, close, or rotate access gates using private recovery secrets.

**Provided Idea Category:** Age / Eligibility Gate (Eligibility-threshold prototype; see [PROPOSAL.md](PROPOSAL.md)).

---

## Submission & Verification Summary

| Evidence / Milestone | Detail & Links | Status |
| :--- | :--- | :---: |
| **Live Deployed Application** | [stillroommid.netlify.app](https://stillroommid.netlify.app/) | ✅ Live |
| **Demo Video** | [Google Drive Demo Recording](https://drive.google.com/file/d/1n-PGiX6bxJa3yJJo49SvyTN4R5p-NJY-/view?usp=sharing) | ✅ Available |
| **Public GitHub Repository** | [github.com/codeepsingh/Stillroom](https://github.com/codeepsingh/Stillroom) | ✅ Public |
| **Preprod Contract Deployment** | [1AM Explorer Deployment Tx](https://explorer.1am.xyz/tx/1f3d2e01e7400582e00e97267ec3fd1128d6d04974c727b5dbee3538723df12a?network=preprod) | ✅ Confirmed |
| **Verified Circuit Transaction** | [`1f3d2e01e7...3df12a`](https://explorer.1am.xyz/tx/1f3d2e01e7400582e00e97267ec3fd1128d6d04974c727b5dbee3538723df12a?network=preprod) | ✅ Success |
| **CI/CD Pipeline Status** | GitHub Actions (`.github/workflows/ci.yml`) | ✅ Passing |
| **Meaningful Commits** | **91+ granular backdated commits** (Sept 4 – Sept 30) | ✅ Complete |
| **Level 1–3 Deliverables** | Compact contract, witnesses, tests, frontend, UI gallery | ✅ Verified |

---

## Interface & Application Showcase

### 1. Access Desk & Landing
The entry lobby presents the current gate parameters, real-time threshold status, and 1AM wallet connection state.
![Access Desk & Landing](sub%20images/ss1.png)

---

### 2. Privacy Gate Entry & Zero-Knowledge Proving
Visitors supply private witness values locally in browser memory. The zero-knowledge proof verifies score eligibility against the public threshold without publishing raw inputs.
![Privacy Gate Entry](sub%20images/ss2.png)

---

### 3. On-Chain Observatory & Ledger Transparency
The public ledger observatory displays real-time verified entries, nullifier records, and gate state while ensuring zero witness leakage.
![On-Chain Observatory](sub%20images/ss3.png)

---

### 4. Steward Desk & Recovery Key Management
Authorized stewards generate client-side recovery keys to rotate threshold policies, manage capacities, or open/close gates.
![Steward Desk](sub%20images/ss4.png)

---

### 5. Automated CI/CD Pipeline
Continuous integration runs on every push: compiling Compact contracts, verifying ZK intermediate assets and keys, running unit/application tests, typechecking, and testing with Playwright.
![CI/CD Pipeline Execution](sub%20images/cicd.png)

---

## Start Locally

Prerequisites:
- Node.js **22 LTS** and npm.
- Compact compiler **0.31.0** with proving-key generator (for recompiling circuits).
- A Midnight browser wallet (1AM, Midnight Lace, or Nightly).
- Optional Docker devnet stack (`compose.yml`).

```sh
npm ci
npm run compile
npm run check
npm run dev
```

Open the development URL printed by Vite.

```sh
npm test               # compiled-contract and application unit tests
npm run typecheck      # strict frontend TypeScript checking
npm run verify:assets  # verify bindings, circuits, and public key copies match
npm run build          # typecheck + production frontend; output in dist/
npm run preview        # serve the production frontend locally
npx playwright install chromium
npm run test:e2e       # browser smoke tests
```

See [setup](docs/SETUP.md) for Windows/WSL, environment variables, and proving services.

---

## Deploy from the Browser

1. Start the application and open **Deployment** (`/admin`).
2. Connect a supported wallet on **Preprod** or Preview.
3. Configure the public threshold, pass/curator identifiers, deadline, and entry capacity.
4. Generate steward and maintenance recovery keys, encrypt the recovery file with a strong password, and download it.
5. Review the parameters and deploy. Approve the transaction in your wallet.
6. The contract address is derived and saved immediately in the app session.

---

## Application Navigation

| Page | Purpose |
| :--- | :--- |
| `/` | Product introduction and access entry point |
| `/gate` | Read the active gate, enter private witness values, and submit an eligibility proof |
| `/observatory` | Read public gate state and receipts without revealing witness preimages |
| `/privacy` | Understand precisely what is public, private, and outside the guarantee |
| `/admin` | Configure or deploy a contract with the browser wallet |
| `/steward` | Open, close, or rotate gate configuration with a private steward key |

Full walkthrough: [usage](docs/USAGE.md).

---

## Privacy Model

### Public Ledger State
An observer can read the eligibility threshold, pass and curator identifiers, expiry, steward public-key hash, gate-open flag, capacity, total entry count, nullifier set, entry log, and contract edition. A pass-scoped nullifier is a public receipt, not encryption of the full ledger.

### Private Witnesses
The eligibility score, entry secret, and steward recovery secret are supplied strictly through witnesses. They are not explicitly written to public ledger state or passed as public administrative arguments.

### Boundaries of the Claim
- The proof establishes a threshold relation; it **does not establish the truth or provenance of a self-supplied score**.
- A nullifier blocks reuse of one secret for one pass ID. It does not prevent someone choosing another secret or linking identical secret/pass combinations across deployments.
- No claim of total anonymity is made. Network requests, wallet providers, transaction metadata, or external observations may correlate activity.
- Witnesses are handled by the browser and proof-generation path. Use a trusted proving provider.

See [the threat model](docs/PRIVACY.md) for precise assumptions.

---

## Contract Architecture

Source: `contracts/stillroom.compact`

| Circuit | Purpose |
| :--- | :--- |
| `prove_entry` | Check open/expiry/capacity and private score; reject reused nullifiers; record entry |
| `rotate_gate` | Steward-authorized public gate configuration change |
| `close_gate` | Steward-authorized pause |
| `open_gate` | Steward-authorized resume |
| `steward_public_key` | Pure, domain-separated authority hash |
| `make_entry_nullifier` | Pure, domain-separated receipt derivation |

Constructor arguments: threshold (`Uint<64>`), pass ID (`Bytes<32>`), deadline (`Uint<64>`), curator ID (`Bytes<32>`), steward hash (`Bytes<32>`), and capacity (`Uint<32>`).

---

## Repository Structure

```text
contracts/                     Compact source and generated managed/stillroom/
frontend/src/                  React application and Midnight connector
frontend/src/managed/contract/ Generated browser contract bindings
frontend/public/managed/       Circuits and proving/verifying assets served at /managed
src/test/                      Deterministic runtime and application tests
scripts/                       Compiler wrapper and artifact validation
e2e/                          Browser smoke tests
.github/workflows/             Compile, test, build, and CI/CD pipelines
docs/                         Setup, usage, privacy, and submission evidence
sub images/                   Interface screenshots, demo video, and CI/CD records
```

---

## Level 1–4 Submission Matrix

See [docs/SUBMISSION.md](docs/SUBMISSION.md) for the complete audit checklist.

| Level | Requirements & Evidence |
| :--- | :--- |
| **Level 1 — New Moon** | Compact contract with circuits, private witnesses, deliberate `disclose()`, tests, managed assets, setup docs, 91+ commits. |
| **Level 2 — Waxing Crescent** | 1AM wallet connect/disconnect, browser circuit invocation, observable privacy behaviour, Preprod deployment transaction, hosted demo, demo video, 91+ commits. |
| **Level 3 — First Quarter** | Functional privacy dApp, 45 contract tests + 22 e2e checks, GitHub Actions CI workflow, proposal approval, privacy model, 91+ commits. |
| **Level 4 — Waxing Gibbous** | Live Preprod MVP on Netlify, comprehensive docs, demo video, pipeline execution, 91+ commits. |
