# Use Stillroom

## Visitor

1. Open **The gate**. Check the selected Preview/Preprod network and public threshold, capacity and expiry.
2. If the contract is unconfigured, open **Deployment settings**. Do not mistake an empty state for a functioning deployment.
3. Connect a supported Midnight wallet. Use the wallet selector if several extensions are installed. For Level 2 evidence, explicitly use Lace on Preprod.
4. Enter a whole-number score from 0–100. This is self-attested, not an accredited credential.
5. Generate a random entry secret, or paste a saved 64-character hexadecimal secret. Never use a wallet mnemonic. Save the optional private backup somewhere secure if you want to reuse the same credential in a later session.
6. Select **Prove eligibility**. Review the wallet transaction and wait for proof generation/submission.
7. Keep the returned transaction ID. “Submitted” is not “confirmed.” The UI observes whether the matching nullifier appears in indexed public state. Inspect the explorer if indexing is delayed.
8. Reuse of this secret for the same pass is rejected. A different secret is not a verified different person.

Disconnecting clears application private session data. It does not necessarily revoke the browser extension's previously granted site permission; revoke that in the extension when required.

## Steward

Deploy through `/admin`, then manage the configured instance at `/steward`. Supply the steward recovery secret associated with the public steward hash. Wallet funds pay fees, but the circuit checks the separate application authority.

- **Close** stops new entries.
- **Open** resumes only while the gate has not expired or reached lifetime capacity.
- **Rotate** changes the public threshold, pass ID, deadline, curator ID and capacity. Every pass ID is one-use across rotations. A rotation retains historical receipts and counts; the new capacity must exceed lifetime entries.

A new deadline must be in the future. These limits are enforced in the contract, not merely in the UI. The sealed steward hash is not changed by rotation. If the steward secret is lost, deploying a new instance is the recovery path for this MVP.

## Public observer

Open **Observatory**. No wallet is required to read public state. It shows real indexed data or an explicit unavailable/empty state. Nullifiers are displayed as a set of markers, not asserted to be chronological events. The interface does not infer real identities from them.

## Demo recording checklist

Record a funded, verifiable Preprod instance:

1. Show the address/network without showing a recovery secret.
2. Connect Lace, then briefly show the public entry terms.
3. Demonstrate a below-threshold input being rejected.
4. Submit a qualifying private witness; wait for the real transaction and indexed receipt.
5. Show the public count and marker without exposing the score on-chain.
6. Demonstrate duplicate prevention and wallet disconnect.
7. If time permits, use the steward key privately to pause the gate and show visitor rejection.

Blur extension balances or other incidental personal information if needed. Do not stage a pending transaction as a successful circuit call.
