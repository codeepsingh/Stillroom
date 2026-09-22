import { pureCircuits } from '../managed/contract/index.js';
import { fromHex, toHex } from './midnight';

export type PrivateIdentity = { secret: string; label: string; createdAt: number };
let identity: PrivateIdentity | undefined;
// Migrate away from the old plaintext browser storage without reading its secret.
if (typeof localStorage !== 'undefined') {
  localStorage.removeItem('STILLROOM_PRIVATE_IDENTITY_V1');
  localStorage.removeItem('STILLROOM_STEWARD_SECRET');
}
export function getIdentity(): PrivateIdentity {
  return identity ??= { secret: toHex(crypto.getRandomValues(new Uint8Array(32))), label: 'Session-only guest credential', createdAt: Date.now() };
}
export function saveIdentity(value: PrivateIdentity) {
  if (fromHex(value.secret).length !== 32) throw new Error('Credential must be 32 bytes.');
  identity = { ...value };
}
export function clearIdentity() {
  if (identity) identity.secret = '';
  identity = undefined;
}
export function publicFingerprint(secret: string) {
  return toHex(pureCircuits.make_entry_nullifier(fromHex(secret), new Uint8Array(32)));
}
export function sessionNullifier(secret: string, pass: Uint8Array) {
  return pureCircuits.make_entry_nullifier(fromHex(secret), pass);
}
export function hasUsedPass(secret: string, state: any): boolean {
  if (!state?.access_pass_id || !secret) return false;
  return Boolean(state.used_nullifiers?.member(sessionNullifier(secret, state.access_pass_id)));
}
