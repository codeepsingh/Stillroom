# Stillroom threat model

## Claim

A valid `prove_entry` call proves that a private, self-attested score is within 0–100 and meets the public threshold, the gate is open and before its deadline, lifetime capacity is available, and the derived nullifier has not been used. It publishes the nullifier, pass association and incremented count.

This is a zero-knowledge eligibility **relation**, not evidence that the input describes a real person. Witnesses are untrusted inputs constrained by the circuit, not inherently authentic credentials.

## Public data

All ledger state is public, including fields without an `export` modifier. Stillroom publishes threshold, current and previously used pass IDs, deadline, curator ID, steward hash, open flag, lifetime count, lifetime capacity, used nullifiers, entry log and edition. Observers may also see transaction metadata, circuit calls and timing. Public IDs should not contain identifying personal information.

`disclose()` is a deliberate compiler annotation for disclosure; it does not encrypt values. An observer learns that a successful input met the public threshold even without learning its exact value.

## Witnesses

The score, entry secret and steward secret are not explicitly written to the ledger. Browser input handlers and witness callbacks access them. The proving path may also access them, depending on wallet and proof-service implementation. “Not on-chain” must never be interpreted as “never leaves the browser.”

No analytics, third-party font requests or remote image requests are needed by the UI. Indexer and wallet calls are still network interactions. The operator of a hosted frontend can modify its JavaScript, so the frontend host is a trust dependency.

## Nullifiers

The receipt is a domain-separated persistent hash of the secret and pass ID. Identical inputs generate identical receipts. A random 32-byte secret resists guessing; a weak user-chosen secret does not. The contract prevents reuse of a secret for the same pass ID, not multiple identities, multiple secrets, or multiple wallets.

The nullifier does not include the deployed contract address. Reusing a secret and pass ID across contracts is linkable. New pass IDs distinguish rounds; used pass IDs cannot be reintroduced. Rotation preserves historical nullifiers, logs and lifetime entry count. Capacity remains lifetime-wide, not a fresh per-round allowance.

## Administration

The sealed steward hash authenticates `rotate_gate`, `open_gate` and `close_gate` against a private secret. The route is public; authorization is enforced by the circuit. Wallet connection alone confers no steward powers. Loss of the recovery key loses application administration. This version does not rotate the sealed steward authority or implement multi-party administration.

A separately generated contract-maintenance signing key can exist in the SDK deployment path. Application steward authority and SDK maintenance authority are different responsibilities. Do not assume an application recovery file grants contract-code maintenance or vice versa.

## Local state and backups

Witness data is kept in session memory and cleared on wallet disconnect where managed by the application. JavaScript cannot guarantee secure erasure from process memory. LocalStorage contains public network/address/theme settings, not deliberate plaintext witness storage. Steward/maintenance recovery files are password-encrypted in the browser before download. Protect the password separately; there is no password reset. Optional visitor entry-secret backups are plaintext under the user's control; protect them with encrypted storage and never publish them.

## Not guaranteed

- Issuer authenticity, identity verification, age verification or Sybil resistance.
- Anonymity against traffic analysis, malicious extensions, compromised proving services or wallet correlation.
- Availability, transaction finality speed, indexer correctness, censorship resistance of a particular operator, or an audited production security posture.
- An on-chain success merely because the frontend reports that submission returned an ID.

## Production extensions

Use issuer-authenticated credentials and explicit revocation; bind nullifiers to a reviewed application/deployment scope; commission a security review; design safe authority recovery; define proving-service trust requirements; test network failures, concurrency and browser memory exposure; and obtain independent protocol/privacy review before processing consequential personal information.
