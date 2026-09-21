import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { ContractState } from '@midnight-ntwrk/compact-runtime';
import type { MidnightProvider, WalletProvider, ProofProvider, PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types';
import { CostModel, LedgerParameters, Transaction, ZswapChainState } from '@midnight-ntwrk/ledger-v8';
import { getNetwork, type Network, validateContractAddress } from '../config.js';

export function toHex(bytes: Uint8Array | number[] | string): string {
  if (typeof bytes === 'string') return bytes.replace(/^0x/, '');
  return Array.from(bytes, (b) => Number(b).toString(16).padStart(2, '0')).join('');
}

export function fromHex(hex: string): Uint8Array {
  const normalized = hex.replace(/^0x/, '');
  if (normalized.length % 2 || !/^[0-9a-f]*$/i.test(normalized)) throw new Error('Invalid hexadecimal secret.');
  const result = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < result.length; i += 1) result[i] = Number.parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  return result;
}

export function createPrivateStateProvider(): PrivateStateProvider<string, unknown> {
  let scope = '';
  const state = new Map<string, unknown>();
  const signingKeys = new Map<string, string>();
  const key = (id: string) => {
    if (!scope) throw new Error('Set the contract address before accessing private state.');
    return `${scope}:${id}`;
  };
  return {
    setContractAddress(address: string) { scope = address; },
    async set(id: string, value: unknown) { state.set(key(id), value); },
    async get(id: string) { return state.get(key(id)) ?? null; },
    async remove(id: string) { state.delete(key(id)); },
    async clear() { state.clear(); },
    async setSigningKey(address: string, value: string) { signingKeys.set(address, value); },
    async getSigningKey(address: string) { return signingKeys.get(address) ?? null; },
    async removeSigningKey(address: string) { signingKeys.delete(address); },
    async clearSigningKeys() { signingKeys.clear(); },
    async exportPrivateStates() { throw new Error('Private state export is not enabled in this browser session.'); },
    async importPrivateStates() { throw new Error('Private state import is not enabled in this browser session.'); },
    async exportSigningKeys() { throw new Error('Signing key export is not enabled in this browser session.'); },
    async importSigningKeys() { throw new Error('Signing key import is not enabled in this browser session.'); },
  };
}

export function createPatchedPublicDataProvider(queryUrl: string, subscriptionUrl: string) {
  const base = indexerPublicDataProvider(queryUrl, subscriptionUrl);
  async function latest(contractAddress: string, fields: string) {
    const response = await fetch(queryUrl, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        query: `query STILLROOM_STATE($address: HexEncoded!) { contractAction(address: $address) { ${fields} } }`,
        variables: { address: validateContractAddress(contractAddress) },
      }),
    });
    if (!response.ok) throw new Error(`Indexer request failed (${response.status}).`);
    const payload = await response.json();
    if (payload.errors?.length) throw new Error(payload.errors.map((error: { message: string }) => error.message).join('; '));
    return payload.data?.contractAction ?? null;
  }
  return {
    ...base,
    async queryContractState(contractAddress: string, config?: unknown) {
      if (config) return base.queryContractState(contractAddress, config as any);
      const action = await latest(contractAddress, 'state');
      return action ? ContractState.deserialize(fromHex(action.state)) : null;
    },
    async queryZSwapAndContractState(contractAddress: string, config?: any) {
      if (config) return base.queryZSwapAndContractState(contractAddress, config);
      const action = await latest(contractAddress, 'state zswapState transaction { block { ledgerParameters } }');
      if (!action) return null;
      if (!action.zswapState || !action.transaction?.block?.ledgerParameters) {
        throw new Error('Indexer omitted Zswap state or ledger parameters; refusing to guess network parameters.');
      }
      return [ZswapChainState.deserialize(fromHex(action.zswapState)), ContractState.deserialize(fromHex(action.state)),
        LedgerParameters.deserialize(fromHex(action.transaction.block.ledgerParameters))] as [ZswapChainState, ContractState, LedgerParameters];
    },
  };
}

export type ConnectedSession = {
  api: any;
  config: any;
  unshieldedAddress: string;
  assertActive: () => void;
  disconnect: () => Promise<void>;
  providers: {
    privateStateProvider: ReturnType<typeof createPrivateStateProvider>;
    publicDataProvider: ReturnType<typeof createPatchedPublicDataProvider>;
    zkConfigProvider: FetchZkConfigProvider<any>;
    proofProvider: ProofProvider;
    walletProvider: WalletProvider;
    midnightProvider: MidnightProvider;
  };
};

export async function createConnectedSession(api: any, expectedNetwork: Network = getNetwork()): Promise<ConnectedSession> {
  for (const method of ['getConfiguration', 'getUnshieldedAddress', 'getShieldedAddresses', 'getProvingProvider', 'balanceUnsealedTransaction', 'submitTransaction']) {
    if (typeof api?.[method] !== 'function') throw new Error(`Wallet lacks ${method}. Use a compatible 1AM connector; detected wallets do not all support proving.`);
  }
  let active = true;
  const assertActive = () => {
    if (!active) throw new Error('Wallet session disconnected. Reconnect before submitting.');
    if (getNetwork() !== expectedNetwork) throw new Error('Network changed. Reconnect the wallet.');
  };
  const [config, unshielded, shielded] = await Promise.all([
    api.getConfiguration(),
    api.getUnshieldedAddress(),
    api.getShieldedAddresses(),
  ]);
  if (config.networkId !== expectedNetwork) throw new Error(`Wallet is on ${config.networkId}; select ${expectedNetwork} in the extension and reconnect.`);
  if (!config.indexerUri || !config.indexerWsUri || !shielded.shieldedCoinPublicKey || !shielded.shieldedEncryptionPublicKey) throw new Error('Wallet returned incomplete network configuration or shielded keys.');
  setNetworkId(expectedNetwork);

  const zkConfigProvider = new FetchZkConfigProvider(
    new URL('/managed', window.location.origin).toString(),
    window.fetch.bind(window),
  );
  const provingProvider = await api.getProvingProvider(zkConfigProvider);
  if (typeof provingProvider?.prove !== 'function' || typeof provingProvider?.check !== 'function') throw new Error('Wallet returned an incompatible proving provider.');
  const checkWalletNetwork = async () => {
    assertActive();
    const current = await api.getConfiguration();
    if (current.networkId !== expectedNetwork) throw new Error('The wallet changed networks. Reconnect on the selected network.');
    assertActive();
  };
  const proofProvider: ProofProvider = {
    async proveTx(unprovenTx) {
      await checkWalletNetwork();
      return unprovenTx.prove(provingProvider, CostModel.initialCostModel());
    },
  };
  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => shielded.shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shielded.shieldedEncryptionPublicKey,
    balanceTx: async (tx) => {
      await checkWalletNetwork();
      const balanced = await api.balanceUnsealedTransaction(toHex(tx.serialize()));
      if (!balanced?.tx) throw new Error('Wallet could not balance this transaction.');
      return Transaction.deserialize('signature', 'proof', 'binding', fromHex(balanced.tx));
    },
  };
  const midnightProvider: MidnightProvider = {
    submitTx: async (tx) => {
      await checkWalletNetwork();
      // Ledger identifiers, unlike a serialized prefix or transaction hash, are
      // actual watchable IDs. Some connectors legitimately return void.
      const identifiers: string[] = tx.identifiers();
      const result = await api.submitTransaction(toHex(tx.serialize()));
      const id = typeof result === 'string' ? result : result?.transactionId || result?.id;
      if (typeof id === 'string' && /^[0-9a-f]{64}$/i.test(id)) return id;
      if (identifiers.length && identifiers[0]) return identifiers[0];
      throw new Error('Submission returned without a transaction identifier. Status is unknown; check the contract before retrying.');
    },
  };
  const privateStateProvider = createPrivateStateProvider();
  return {
    api,
    config,
    assertActive,
    async disconnect() {
      active = false;
      await privateStateProvider.clear();
      await privateStateProvider.clearSigningKeys();
      if (typeof api.disconnect === 'function') await api.disconnect();
    },
    unshieldedAddress: typeof unshielded === 'string' ? unshielded : unshielded.unshieldedAddress,
    providers: {
      privateStateProvider,
      publicDataProvider: createPatchedPublicDataProvider(config.indexerUri, config.indexerWsUri),
      zkConfigProvider,
      proofProvider,
      walletProvider,
      midnightProvider,
    },
  };
}
