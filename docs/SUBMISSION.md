# Level 1–4 requirements audit

This is an evidence checklist, not a pass certificate. A file existing locally cannot prove a successful public deployment, approved idea, or passing hosted CI run. No commits or repository initialization were performed as part of implementation.

## Level 1 — New Moon

| Requirement | Delivery / remaining evidence |
| --- | --- |
| Toolchain installed | Local compilation and build are checked in the verification record. Node 22 is configured for CI; check your own Node/Compact/Docker installation. |
| First Compact contract with ledger and witness | `contracts/stillroom.compact`: public policy, private score/secret and authenticated steward operations. |
| Deliberate disclose() | Public policy and receipt values are explicitly disclosed. |
| Contract compiles | `npm run compile`; four state-changing circuits. Capture your successful output. |
| Passing tests | `npm test` runs compiled-runtime/application tests; these are not a funded network deployment. |
| managed/ circuits and keys | `contracts/managed/stillroom`, matching browser source/public copies; `npm run verify:assets`. |
| Deployment on Preview or Preprod | **Owner:** deploy, save address and show it on an explorer. |
| Initial idea + public/private README | Complete in `README.md`. |
| Public repo / 5 meaningful commits | **Owner:** create repo and real meaningful history. |
| Compile and deployed-address screenshots | **Owner:** capture actual successful commands/deployment. |

## Level 2 — Waxing Crescent

| Requirement | Delivery / remaining evidence |
| --- | --- |
| Lace connect / disconnect | Implemented through detected wallet connector. **Owner:** exercise your installed Lace version on Preprod and record it. |
| Frontend circuit invocation | `/gate` constructs/submits `prove_entry` with real bound witnesses. **Owner:** complete a funded on-chain transaction and record success. |
| Observable privacy behavior | Score is not a public ledger field; receipt and count are disclosed. Observe the result on a real deployment. |
| Preprod address | **Owner:** deploy on Preprod. Preview alone does not meet this level's stated requirement. |
| Live demo / video / public repo | **Owner:** publish and record connection plus successful call. |
| Privacy claim | `README.md`, `/privacy`, `docs/PRIVACY.md`. |
| 8 meaningful commits | **Owner.** |

## Level 3 — First Quarter

| Requirement | Delivery / remaining evidence |
| --- | --- |
| Functional privacy dApp | Contract, browser deployment, access flow and steward controls implemented. Real network execution remains an owner verification step. |
| 3+ passing tests | Compiled-runtime tests cover initialization, qualifying/invalid scores, duplicate prevention, unauthorized authority, expiry, capacity and rotation. See latest local verification. |
| CI/CD workflow | `.github/workflows/ci.yml` compiles, tests, checks assets, typechecks/builds and runs browser tests. |
| Passing CI runs | **Owner:** push the public repository and obtain a passing run. Do not use a fabricated badge. |
| Chosen and approved idea | `PROPOSAL.md` selects Eligibility Gate. **Owner:** submit and obtain approval. |
| Privacy model | Explicit observer/issuer/prover/metadata limitations documented. |
| Test screenshot + one-minute full demo | **Owner:** capture real results and transactions. |
| Live demo + 10 meaningful commits | **Owner.** |

## Level 4 — Waxing Gibbous

| Requirement | Delivery / remaining evidence |
| --- | --- |
| MVP live on Preprod | Hosting configuration and `/admin` deployment prepared. **Owner:** actual live app + indexed Preprod address. |
| README + setup + usage | Complete. |
| Product-repo CI/CD running | Workflows prepared; **owner** must establish passing hosted runs. |
| Product X profile linked | **Owner:** create profile and replace the README release-record status with its real link. |
| MVP demo video | **Owner:** record and publish. |
| Public repo / 15 meaningful commits | **Owner.** |

## What remains beyond contract deployment, screenshots and commits

The programme also asks for a hosted live demo, demo video, passing public CI runs, proposal approval and a product X profile/link. Those cannot be honestly completed by changing local source files. They remain explicit owner actions.

## Evidence record to fill after release

| Evidence | Actual value |
| --- | --- |
| Public repository | [github.com/codeepsingh/Stillroom](https://github.com/codeepsingh/Stillroom) |
| Hosted application | [stillroommid.netlify.app](https://stillroommid.netlify.app/) |
| Preview deployment (optional) | Not deployed |

| Preprod contract address | [1AM Explorer Deployment Tx](https://explorer.1am.xyz/tx/1f3d2e01e7400582e00e97267ec3fd1128d6d04974c727b5dbee3538723df12a?network=preprod) |
| Successful circuit transaction | [`1f3d2e01...`](https://explorer.1am.xyz/tx/1f3d2e01e7400582e00e97267ec3fd1128d6d04974c727b5dbee3538723df12a?network=preprod) |
| Public passing CI run | Available on GitHub Actions |
| Approved proposal | [PROPOSAL.md](PROPOSAL.md) |
| Product X profile | Not created |
| Demo video | [Google Drive Demo Recording](https://drive.google.com/file/d/1n-PGiX6bxJa3yJJo49SvyTN4R5p-NJY-/view?usp=sharing) |
| Compile / deployment / tests / UI screenshots | `sub images/ss1.png` - `ss4.png` |

| Meaningful commit count | 91+ commits |


Do not add secret recovery files, mnemonics or private witness values to the evidence directory.
