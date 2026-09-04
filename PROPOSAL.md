# Stillroom product proposal

**Selected idea:** Age / Eligibility Gate — privacy-preserving threshold checking.

**Approval status:** drafted, not submitted or approved.

## Problem

Small communities often collect unnecessary personal information just to check a single access condition. That creates retention obligations and exposes members to risks unrelated to the decision being made.

## MVP

Stillroom demonstrates a Midnight Compact eligibility gate. A steward publishes a threshold, pass identifier, opening deadline and lifetime entry capacity. A visitor proves that a private score meets the threshold. The ledger receives a nullifier receipt and a counter increment, not the score or its secret preimage. A private steward witness authorizes pause, resume and configuration rotation.

## Why Midnight

The state machine and selective disclosure are enforced by compiled zero-knowledge circuits. Public observers can inspect policy and outcomes without receiving the private score. This is not a frontend-only hidden field, off-chain honor-system counter, or encrypted database pretending to be a smart contract.

## MVP boundaries

The private score is self-attested. It is not signed by an issuer, linked to a verified person, or an age credential. Replay protection covers one secret/pass combination, not one human. These limitations are visible in the product, tests and documentation. The MVP does not sell access, move funds, issue credentials or manage payments.

## Core journeys

- A steward deploys through a wallet-backed browser portal and safely backs up authority material.
- A visitor connects on the selected network, proves eligibility and observes the receipt.
- A public observer reads policy and receipt count without seeing witness inputs.
- A steward pauses/resumes and rotates a gate under authenticated circuit checks.

## Acceptance criteria

- Genuine compiler-generated circuits and keys.
- Success, rejection, replay and unauthorized-admin runtime tests.
- UI wallet connection/disconnection, input validation and recoverable errors.
- Public/private documentation with no claim of complete anonymity.
- Production build and compile/test CI workflow.
- Verifiable Preprod deployment and successful circuit demo, supplied at release.

## Next phase

Replace self-attested inputs with issuer-authenticated, revocable credentials; define deployment-scoped nullifiers; design unique-person guarantees only if required; add authority recovery and independent audits. These are future work, not capabilities claimed by this delivery.

## Submission owner actions

Submit this proposal for the programme's approval, publish the application and Preprod evidence, create the product X profile, and provide a real demonstration and commit history.
