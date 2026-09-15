import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const sdk = vi.hoisted(() => ({ build: vi.fn(), submit: vi.fn() }));
vi.mock('@midnight-ntwrk/midnight-js-contracts', () => ({ createUnprovenDeployTx: sdk.build, submitTxAsync: sdk.submit, createUnprovenCallTx: vi.fn() }));
import { deployStillroom, getDeployment, confirmDeployment } from '../../frontend/src/lib/stillroom.js';
import { getContractAddress } from '../../frontend/src/config.js';
import type { ConnectedSession } from '../../frontend/src/lib/midnight.js';
import { pureCircuits } from '../../contracts/managed/stillroom/contract/index.js';

const address = 'ab'.repeat(32), txId = 'cd'.repeat(32), secret = '12'.repeat(32);
const parameters = () => ({ threshold: '72', limit: '144', pass: '34'.repeat(32), curator: '56'.repeat(32), deadline: new Date(Date.now() + 86400000).toISOString() });
const provider = { queryContractState: vi.fn(async () => null) };
const session = { config: { networkId: 'preview' }, assertActive: () => {}, providers: { publicDataProvider: provider } } as unknown as ConnectedSession;
beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { origin: 'https://stillroom.example' } }));
  sdk.build.mockReset().mockResolvedValue({ public: { contractAddress: address }, private: { unprovenTx: {}, signingKey: secret } });
  sdk.submit.mockReset().mockResolvedValue(txId);
  provider.queryContractState.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe('deployment lifecycle at the SDK boundary (no network)', () => {
  it('passes all six constructor args in order and persists accepted submission before indexer access', async () => {
    const value = parameters(), updates: string[] = [];
    sdk.submit.mockImplementationOnce(async () => {
      expect(getDeployment()?.status).toBe('submitting');
      expect(getDeployment()?.address).toBe(address);
      return txId;
    });
    await deployStillroom(session, value, secret, secret, (record) => updates.push(record.status));
    const options = sdk.build.mock.calls[0][1];
    expect(options.args).toEqual([72n, new Uint8Array(32).fill(0x34), BigInt(Math.floor(Date.parse(value.deadline) / 1000)), new Uint8Array(32).fill(0x56), pureCircuits.steward_public_key(new Uint8Array(32).fill(0x12)), 144n]);
    expect(options).not.toHaveProperty('witnesses');
    expect(updates).toEqual(['submitting', 'pending']);
    expect(getContractAddress()).toBe(address); expect(getDeployment()?.txId).toBe(txId);
    expect(provider.queryContractState).not.toHaveBeenCalled();
  });
  it('preserves the candidate address and prevents silent redeployment after ambiguous failure', async () => {
    sdk.submit.mockRejectedValueOnce(new Error('Connection lost during submission'));
    await expect(deployStillroom(session, parameters(), secret, secret, () => {})).rejects.toThrow(/Connection lost/);
    expect(getDeployment()).toMatchObject({ address, status: 'unknown' });
    await expect(deployStillroom(session, parameters(), secret, secret, () => {})).rejects.toThrow(/already recorded/);
    expect(sdk.submit).toHaveBeenCalledTimes(1);
  });
  it('rechecks a pending deployment without constructing or submitting again', async () => {
    const record = await deployStillroom(session, parameters(), secret, secret, () => {});
    expect(await confirmDeployment(session, record)).toBeNull();
    expect(getDeployment()?.status).toBe('pending');
    expect(sdk.build).toHaveBeenCalledTimes(1); expect(sdk.submit).toHaveBeenCalledTimes(1);
    expect(provider.queryContractState).toHaveBeenCalledWith(address);
  });
  it('keeps a saved pending receipt across an indexer timeout', async () => {
    const record = await deployStillroom(session, parameters(), secret, secret, () => {});
    provider.queryContractState.mockRejectedValueOnce(new Error('Indexer timeout'));
    await expect(confirmDeployment(session, record)).rejects.toThrow(/timeout/);
    expect(getDeployment()?.address).toBe(address); expect(getDeployment()?.status).toBe('pending');
    expect(sdk.submit).toHaveBeenCalledTimes(1);
  });
});
