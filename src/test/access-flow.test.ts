import { describe, expect, it } from 'vitest';
import { pureCircuits } from '../../contracts/managed/stillroom/contract/index.js';
import { CompiledStillroomContract, witnesses } from '../../contracts/index.js';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
const bytes = (n: number) => new Uint8Array(32).fill(n);

describe('Stillroom hash domains and witness installation', () => {
  it('derives a deterministic 32-byte nullifier from the same secret and pass', () => {
    const first = pureCircuits.make_entry_nullifier(bytes(1), bytes(2));
    expect(first).toHaveLength(32);
    expect(first).toEqual(pureCircuits.make_entry_nullifier(bytes(1), bytes(2)));
  });
  it('changes only the pass and obtains a different nullifier', () => {
    expect(pureCircuits.make_entry_nullifier(bytes(1), bytes(2))).not.toEqual(pureCircuits.make_entry_nullifier(bytes(1), bytes(3)));
  });
  it('separates steward and entry hash domains', () => {
    expect(pureCircuits.steward_public_key(bytes(1))).not.toEqual(pureCircuits.make_entry_nullifier(bytes(1), bytes(2)));
  });
  it('configures actual witnesses instead of vacant witnesses', () => {
    expect(CompiledStillroomContract.tag).toBe('StillroomContract');
    expect(CompiledContract.getCompiledAssetsPath(CompiledStillroomContract)).toMatch(/managed[\\/]stillroom$/);
    const privateState = { score: 85n, passphrase: bytes(1), stewardSecret: bytes(9) };
    const ctx = { privateState, ledger: {} as never, contractAddress: '00'.repeat(32) };
    expect(witnesses.get_eligibility_score(ctx)).toEqual([privateState, 85n]);
    expect(witnesses.get_passphrase(ctx)).toEqual([privateState, bytes(1)]);
    expect(witnesses.steward_secret(ctx)).toEqual([privateState, bytes(9)]);
  });
  it('fails closed for missing witness material', () => {
    const ctx = { privateState: {}, ledger: {} as never, contractAddress: '00'.repeat(32) };
    expect(() => witnesses.get_eligibility_score(ctx)).toThrow(/Missing/);
    expect(() => witnesses.get_passphrase(ctx)).toThrow(/Missing/);
    expect(() => witnesses.steward_secret(ctx)).toThrow(/Missing/);
  });
});
