import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import type { MidnightProviders, MidnightProvider, WalletProvider } from '@midnight-ntwrk/midnight-js-types';
import type { StillroomPrivateState } from '../contracts/index.js';
import type { NetworkConfig } from './config.js';

export type StillroomCircuit = 'prove_entry' | 'rotate_gate' | 'close_gate' | 'open_gate';
export type StillroomProviders = MidnightProviders<StillroomCircuit, string, StillroomPrivateState>;
export function buildProviders(
  wallet: { wallet: { walletProvider: WalletProvider; midnightProvider: MidnightProvider } },
  zkConfigPath: string,
  config: NetworkConfig,
  storage: { accountId: string; password: () => string | Promise<string> },
): StillroomProviders {
  if (!storage?.accountId || !storage.password) throw new Error('Provide an account ID and secret encryption password provider.');
  setNetworkId(config.networkId);
  const zkConfigProvider = new NodeZkConfigProvider<StillroomCircuit>(zkConfigPath);
  return {
    privateStateProvider: levelPrivateStateProvider<string, StillroomPrivateState>({
      midnightDbName: `stillroom-private-state-${config.networkId}`,
      accountId: storage.accountId,
      privateStoragePasswordProvider: storage.password,
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    // A remote proof server receives proving inputs: use a trusted endpoint.
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider: wallet.wallet.walletProvider,
    midnightProvider: wallet.wallet.midnightProvider,
  };
}
