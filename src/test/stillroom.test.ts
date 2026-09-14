import { describe, expect, it } from 'vitest';
import { createCircuitContext, createConstructorContext, dummyContractAddress, sampleUserAddress } from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, pureCircuits } from '../../contracts/managed/stillroom/contract/index.js';

const bytes = (n: number) => new Uint8Array(32).fill(n);
const NOW = 1_800_000_000;
const deadline = BigInt(NOW + 3600);
const steward = bytes(9);
const stewardHash = pureCircuits.steward_public_key(steward);
const user = sampleUserAddress();
function setup(options: { threshold?: bigint; pass?: Uint8Array; deadline?: bigint; hash?: Uint8Array; limit?: bigint } = {}) {
  let score = 90n, secret = bytes(1), admin = steward;
  const contract = new Contract<undefined>({
    get_eligibility_score: () => [undefined, score],
    get_passphrase: () => [undefined, secret],
    steward_secret: () => [undefined, admin],
  });
  let state = contract.initialState(createConstructorContext(undefined, user), options.threshold ?? 72n, options.pass ?? bytes(2), options.deadline ?? deadline, bytes(3), options.hash ?? stewardHash, options.limit ?? 10n).currentContractState.data;
  const context = (time = NOW) => createCircuitContext(dummyContractAddress(), user, state, undefined, undefined, undefined, time);
  const apply = (result: ReturnType<typeof contract.circuits.prove_entry>) => { state = result.context.currentQueryContext.state; return ledger(state); };
  return { contract, context, apply, read: () => ledger(state), witness: (s = 90n, p = bytes(1), a = steward) => { score = s; secret = p; admin = a; }, enter: (time = NOW) => apply(contract.circuits.prove_entry(context(time))), rotate: (pass = bytes(4), limit = 10n, time = deadline, threshold = 80n) => apply(contract.circuits.rotate_gate(context(), threshold, pass, time, bytes(5), limit)) };
}

describe('Stillroom real compiled runtime', () => {
  it('initializes all public invariants', () => {
    const state = setup().read();
    expect(state.entry_threshold).toBe(72n); expect(state.entry_limit).toBe(10n);
    expect(state.total_entries).toBe(0n); expect(state.gate_open).toBe(true);
    expect(state.used_pass_ids.member(bytes(2))).toBe(true);
    expect(new TextDecoder().decode(state.edition).replace(/\0/g, '')).toBe('Stillroom:v1.0');
  });
  it.each([
    [{ threshold: 101n }, /Threshold/], [{ limit: 0n }, /capacity/],
    [{ deadline: 0n }, /Deadline/], [{ pass: bytes(0) }, /Pass identifier/], [{ hash: bytes(0) }, /Steward commitment/],
  ] as const)('rejects malformed constructor configuration %#', (options, error) => expect(() => setup(options)).toThrow(error));
  it('accepts the exact threshold and writes only the expected nullifier and pass log', () => {
    const h = setup(); h.witness(72n); const state = h.enter();
    const nul = pureCircuits.make_entry_nullifier(bytes(1), bytes(2));
    expect(state.total_entries).toBe(1n); expect(state.used_nullifiers.member(nul)).toBe(true);
    expect(state.entry_log.lookup(nul)).toEqual(bytes(2));
    expect('score' in state).toBe(false); expect('passphrase' in state).toBe(false);
  });
  it.each([71n, 101n])('rejects a score outside the allowed threshold range: %s', (score) => {
    const h = setup(); h.witness(score); expect(() => h.enter()).toThrow(/threshold|Score/); expect(h.read().total_entries).toBe(0n);
  });
  it('rejects the same credential for the same pass', () => {
    const h = setup(); h.enter(); expect(() => h.enter()).toThrow(/already been used/); expect(h.read().total_entries).toBe(1n);
  });
  it('enforces capacity even for a fresh credential', () => {
    const h = setup({ limit: 1n }); h.enter(); h.witness(90n, bytes(8));
    expect(() => h.enter()).toThrow(/capacity/);
    h.apply(h.contract.circuits.close_gate(h.context()));
    expect(() => h.contract.circuits.open_gate(h.context())).toThrow(/capacity/);
  });
  it('enforces strict deadline: before succeeds, exact deadline and later fail', () => {
    expect(setup().enter(Number(deadline) - 1).total_entries).toBe(1n);
    for (const time of [Number(deadline), Number(deadline) + 1]) expect(() => setup().enter(time)).toThrow(/expired/);
  });
  it('allows steward close/open and rejects entry while closed', () => {
    const h = setup(); expect(h.apply(h.contract.circuits.close_gate(h.context())).gate_open).toBe(false);
    expect(() => h.enter()).toThrow(/closed/);
    expect(h.apply(h.contract.circuits.open_gate(h.context())).gate_open).toBe(true);
  });
  it('rejects an incorrect steward on all administrative circuits', () => {
    const h = setup(); h.witness(90n, bytes(1), bytes(7));
    expect(() => h.contract.circuits.close_gate(h.context())).toThrow(/Not authorized/);
    expect(() => h.contract.circuits.open_gate(h.context())).toThrow(/Not authorized/);
    expect(() => h.rotate()).toThrow(/Not authorized/);
  });
  it('does not reopen an expired pass', () => {
    const h = setup(); h.apply(h.contract.circuits.close_gate(h.context()));
    expect(() => h.contract.circuits.open_gate(h.context(Number(deadline)))).toThrow(/expired/);
  });
  it('rotates with preserved lifetime count, audit history, and steward commitment', () => {
    const h = setup(); h.enter(); const state = h.rotate();
    expect(state.total_entries).toBe(1n); expect(state.entry_threshold).toBe(80n);
    expect(state.steward).toEqual(stewardHash); expect(state.used_nullifiers.size()).toBe(1n);
    expect(h.enter().total_entries).toBe(2n); // same secret, genuinely different pass
    expect(h.read().used_nullifiers.size()).toBe(2n);
  });
  it('rejects rotation to any previously used pass identifier', () => {
    const h = setup(); expect(() => h.rotate(bytes(2))).toThrow(/already used/);
    h.rotate(); expect(() => h.rotate(bytes(2))).toThrow(/already used/);
  });
  it('rejects invalid rotation capacity, threshold, pass, and deadline', () => {
    const h = setup(); h.enter();
    expect(() => h.rotate(bytes(4), 1n)).toThrow(/lifetime entries/);
    expect(() => h.rotate(bytes(4), 10n, BigInt(NOW))).toThrow(/future/);
    expect(() => h.rotate(bytes(0))).toThrow(/nonzero/);
    expect(() => h.rotate(bytes(4), 10n, deadline, 101n)).toThrow(/Threshold/);
  });
  it('explicitly permits new self-chosen credentials; this is not Sybil resistance', () => {
    const h = setup(); h.enter(); h.witness(90n, bytes(6)); expect(h.enter().total_entries).toBe(2n);
  });
});
