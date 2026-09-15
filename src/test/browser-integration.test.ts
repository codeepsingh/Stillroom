import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createConnectedSession, createPrivateStateProvider, fromHex } from '../../frontend/src/lib/midnight.js';
import { getContractAddress, getNetwork, setContractAddress, setNetwork, validateContractAddress } from '../../frontend/src/config.js';
import { decryptRecovery, encryptRecovery } from '../../frontend/src/lib/recovery.js';
import { gateArguments, getDeployment, saveDeployment } from '../../frontend/src/lib/stillroom.js';

const address = 'ab'.repeat(32), txId = 'cd'.repeat(32);
beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value), removeItem: (key: string) => data.delete(key) });
  vi.stubGlobal('window', Object.assign(new EventTarget(), { location: { origin: 'https://stillroom.example' }, navigator: { userAgent: 'node-test' }, fetch: globalThis.fetch }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const api = (networkId = 'preview') => ({
  getConfiguration: vi.fn(async () => ({ networkId, indexerUri: 'https://indexer.preview.midnight.network/api/v4/graphql', indexerWsUri: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws' })),
  getUnshieldedAddress: async () => ({ unshieldedAddress: 'wallet-address' }),
  getShieldedAddresses: async () => ({ shieldedCoinPublicKey: address, shieldedEncryptionPublicKey: address }),
  getProvingProvider: async () => ({ prove: async () => new Uint8Array(), check: async () => [] }),
  balanceUnsealedTransaction: vi.fn(), submitTransaction: vi.fn(async (): Promise<unknown> => undefined), disconnect: vi.fn(async () => undefined),
});

describe('browser network and provider safeguards', () => {
  it('defaults to Preview and ignores legacy unscoped contract addresses', () => {
    localStorage.setItem('DEPLOYED_CONTRACT_ADDRESS', address);
    expect(getNetwork()).toBe('preview'); expect(getContractAddress()).toBe('');
    setContractAddress(address); setNetwork('preprod'); expect(getContractAddress()).toBe('');
    setNetwork('preview'); expect(getContractAddress()).toBe(address);
  });
  it('uses the public build address only on its configured network', () => {
    vi.stubEnv('VITE_NETWORK', 'preprod'); vi.stubEnv('VITE_CONTRACT_ADDRESS', address);
    expect(getNetwork()).toBe('preprod'); expect(getContractAddress()).toBe(address);
    setNetwork('preview'); expect(getContractAddress()).toBe('');
  });
  it('prefers browser configuration over a same-network public build address', () => {
    vi.stubEnv('VITE_NETWORK', 'preview'); vi.stubEnv('VITE_CONTRACT_ADDRESS', address);
    setContractAddress(txId); expect(getContractAddress()).toBe(txId);
  });
  it('supports separate published addresses and rejects invalid environment values', () => {
    vi.stubEnv('VITE_PREVIEW_CONTRACT_ADDRESS', address); vi.stubEnv('VITE_PREPROD_CONTRACT_ADDRESS', txId);
    expect(getContractAddress('preview')).toBe(address); expect(getContractAddress('preprod')).toBe(txId);
    vi.stubEnv('VITE_PREVIEW_CONTRACT_ADDRESS', 'not-a-contract'); expect(getContractAddress('preview')).toBe('');
  });
  it('validates hexadecimal contract addresses, not wallet addresses', () => {
    expect(validateContractAddress(` 0x${address.toUpperCase()} `)).toBe(address);
    for (const value of ['', 'mn_addr_preview1test', '00'.repeat(32), 'zz'.repeat(32)]) expect(() => validateContractAddress(value)).toThrow();
  });
  it('rejects malformed hex instead of silently zero-filling bytes', () => {
    expect(() => fromHex('0xz1')).toThrow(); expect(() => fromHex('abc')).toThrow();
  });
  it('requires contract-scoped private state and clears state plus signing keys', async () => {
    const provider = createPrivateStateProvider();
    await expect(provider.get('guest')).rejects.toThrow(/contract address/);
    provider.setContractAddress(address); await provider.set('guest', { score: 80n }); await provider.setSigningKey(address, txId);
    provider.setContractAddress(txId); expect(await provider.get('guest')).toBeNull();
    provider.setContractAddress(address); expect(await provider.get('guest')).toEqual({ score: 80n });
    await provider.clear(); await provider.clearSigningKeys();
    expect(await provider.get('guest')).toBeNull(); expect(await provider.getSigningKey(address)).toBeNull();
  });
  it('fails early for missing wallet proving capabilities', async () => {
    await expect(createConnectedSession({})).rejects.toThrow(/lacks getConfiguration/);
    const wallet = api(); wallet.getProvingProvider = async () => ({} as never);
    await expect(createConnectedSession(wallet)).rejects.toThrow(/incompatible proving/);
  });
  it('rejects a connection to a network other than the selected network', async () => {
    await expect(createConnectedSession(api('preprod'), 'preview')).rejects.toThrow(/select preview/);
  });
  it('returns a real ledger identifier when the wallet submission returns void', async () => {
    const wallet = api(); const session = await createConnectedSession(wallet);
    const transaction = { serialize: () => new Uint8Array([1, 2]), identifiers: () => [txId] };
    expect(await session.providers.midnightProvider.submitTx(transaction as never)).toBe(txId);
    expect(wallet.submitTransaction).toHaveBeenCalledWith('0102');
  });
  it('never fabricates an identifier for an unidentifiable submission', async () => {
    const session = await createConnectedSession(api());
    await expect(session.providers.midnightProvider.submitTx({ serialize: () => new Uint8Array([1]), identifiers: () => [] } as never)).rejects.toThrow(/Status is unknown/);
  });
  it('revokes old sessions and clears secrets on disconnect', async () => {
    const wallet = api(); const session = await createConnectedSession(wallet);
    const provider = session.providers.privateStateProvider;
    provider.setContractAddress(address); await provider.set('guest', { score: 99n }); await provider.setSigningKey(address, txId);
    await session.disconnect();
    expect(await provider.get('guest')).toBeNull(); expect(await provider.getSigningKey(address)).toBeNull();
    expect(() => session.assertActive()).toThrow(/disconnected/); expect(wallet.disconnect).toHaveBeenCalled();
  });
  it('rejects transactions after the extension changes network independently', async () => {
    const wallet = api(); const session = await createConnectedSession(wallet);
    wallet.getConfiguration.mockResolvedValue({ networkId: 'preprod', indexerUri: '', indexerWsUri: '' });
    await expect(session.providers.midnightProvider.submitTx({} as never)).rejects.toThrow(/changed networks/);
    expect(wallet.submitTransaction).not.toHaveBeenCalled();
  });
  it('persists a pending receipt and network-scoped address without private material', () => {
    saveDeployment({ network: 'preview', address, txId, status: 'pending', submittedAt: 123 });
    expect(getContractAddress()).toBe(address); expect(getDeployment()?.status).toBe('pending');
    setNetwork('preprod'); expect(getDeployment()).toBeNull();
  });
  it('validates constructor bounds before asking the wallet to prove', () => {
    const value = { threshold: '72', pass: address, curator: address, deadline: new Date(Date.now() + 86400000).toISOString(), limit: '144' };
    const args = gateArguments(value); expect(args[0]).toBe(72n); expect(args[4]).toBe(144n);
    expect(() => gateArguments({ ...value, threshold: '101' })).toThrow(/Threshold/);
    expect(() => gateArguments({ ...value, limit: '0' })).toThrow(/Capacity/);
    expect(() => gateArguments({ ...value, deadline: '2000-01-01' })).toThrow(/future/);
  });
});

describe('encrypted recovery backup', () => {
  it('round-trips keys while keeping raw secrets out of the persisted file', async () => {
    const keys = { stewardSecret: address, maintenanceKey: txId };
    const encoded = await encryptRecovery(keys, 'a-strong-recovery-password');
    expect(encoded).not.toContain(address); expect(encoded).not.toContain(txId);
    expect(await decryptRecovery(encoded, 'a-strong-recovery-password')).toEqual(keys);
    await expect(decryptRecovery(encoded, 'wrong-password-long')).rejects.toThrow(/Incorrect/);
  });
  it('requires a recovery password of at least 12 characters', async () => {
    await expect(encryptRecovery({ stewardSecret: address, maintenanceKey: txId }, 'short')).rejects.toThrow(/12/);
  });
});
