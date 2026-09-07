import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Contract, type Witnesses } from './managed/stillroom/contract/index.js';
export { Contract, ledger, pureCircuits, type Ledger, type ImpureCircuits, type PureCircuits } from './managed/stillroom/contract/index.js';

export type StillroomPrivateState = { score?: bigint; passphrase?: Uint8Array; stewardSecret?: Uint8Array };
export const witnesses: Witnesses<StillroomPrivateState> = {
  get_eligibility_score: ({ privateState }) => {
    if (privateState.score === undefined) throw new Error('Missing private eligibility score');
    return [privateState, privateState.score];
  },
  get_passphrase: ({ privateState }) => {
    if (privateState.passphrase?.length !== 32) throw new Error('Missing 32-byte private credential');
    return [privateState, privateState.passphrase];
  },
  steward_secret: ({ privateState }) => {
    if (privateState.stewardSecret?.length !== 32) throw new Error('Missing 32-byte steward secret');
    return [privateState, privateState.stewardSecret];
  },
};
const currentDir = path.dirname(fileURLToPath(import.meta.url));
export const zkConfigPath = path.resolve(currentDir, 'managed', 'stillroom');
export const CompiledStillroomContract = CompiledContract.make('StillroomContract', Contract).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);
