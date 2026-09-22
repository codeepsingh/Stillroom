import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { createUnprovenCallTx, createUnprovenDeployTx, submitTxAsync } from '@midnight-ntwrk/midnight-js-contracts';
import { Contract, ledger, pureCircuits, type Witnesses } from '../managed/contract/index.js';
import { getNetwork, setContractAddress, validateContractAddress, type Network } from '../config.js';
import { fromHex, toHex, type ConnectedSession } from './midnight.js';

export const PROOF_TRUST_NOTE = 'The score is self-attested, not issuer-verified. A new credential can enter again: this is not Sybil resistance. Witnesses are absent from the public ledger, but your wallet’s proving service may receive them. Use only a trusted wallet and prover. Reusing the same credential and pass ID across contracts produces linkable nullifiers.';
export const randomHex = () => toHex(crypto.getRandomValues(new Uint8Array(32)));
export function secretBytes(secret: string): Uint8Array {
  const bytes = fromHex(secret.trim());
  if (bytes.length !== 32 || !bytes.some(Boolean)) throw new Error('Enter a nonzero 32-byte (64 hexadecimal character) recovery key.');
  return bytes;
}
export function compiledStillroom(inputs: { score?: bigint; credential?: Uint8Array; stewardSecret?: Uint8Array } = {}) {
  const witnesses: Witnesses<undefined> = {
    get_eligibility_score: () => {
      if (inputs.score === undefined) throw new Error('Private score missing.');
      return [undefined, inputs.score];
    },
    get_passphrase: () => {
      if (inputs.credential?.length !== 32) throw new Error('Private credential missing.');
      return [undefined, inputs.credential];
    },
    steward_secret: () => {
      if (inputs.stewardSecret?.length !== 32) throw new Error('Steward key missing.');
      return [undefined, inputs.stewardSecret];
    },
  };
  return CompiledContract.make('StillroomContract', Contract<undefined>).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withCompiledFileAssets(new URL('/managed', window.location.origin).toString()),
  );
}
export type GateParameters = { threshold: string; pass: string; deadline: string; curator: string; limit: string };
export function gateArguments(value: GateParameters): [bigint, Uint8Array, bigint, Uint8Array, bigint] {
  if (!/^\d+$/.test(value.threshold) || !/^\d+$/.test(value.limit)) throw new Error('Threshold and capacity must be whole numbers.');
  const threshold = BigInt(value.threshold), limit = BigInt(value.limit);
  if (threshold > 100n) throw new Error('Threshold must be from 0 to 100.');
  if (limit < 1n || limit > 4_294_967_295n) throw new Error('Capacity must be from 1 to 4,294,967,295.');
  const seconds = Math.floor(new Date(value.deadline).getTime() / 1000);
  if (!Number.isFinite(seconds) || seconds <= Date.now() / 1000 + 120) throw new Error('Choose a deadline more than two minutes in the future.');
  return [threshold, secretBytes(value.pass), BigInt(seconds), secretBytes(value.curator), limit];
}
export type DeploymentRecord = { network: Network; address: string; txId?: string; status: 'submitting' | 'pending' | 'confirmed' | 'unknown'; submittedAt: number };
const recordKey = (network: Network) => `STILLROOM_DEPLOYMENT_V1:${network}`;
export function getDeployment(network = getNetwork()): DeploymentRecord | null {
  try {
    const value = JSON.parse(localStorage.getItem(recordKey(network)) || 'null');
    if (!value || value.network !== network || !['submitting', 'pending', 'confirmed', 'unknown'].includes(value.status)) return null;
    validateContractAddress(value.address);
    return value;
  } catch { return null; }
}
export function saveDeployment(record: DeploymentRecord) {
  localStorage.setItem(recordKey(record.network), JSON.stringify(record));
  if (record.status === 'pending' || record.status === 'confirmed') setContractAddress(record.address, record.network);
}
export function clearDeployment(network = getNetwork()) { localStorage.removeItem(recordKey(network)); }
export async function readStillroom(session: ConnectedSession, address: string) {
  session.assertActive();
  const raw = await session.providers.publicDataProvider.queryContractState(validateContractAddress(address));
  if (!raw) return null;
  const state = ledger(raw.data);
  if (new TextDecoder().decode(state.edition).replace(/\0/g, '') !== 'Stillroom:v1.0') throw new Error('Address is not a Stillroom v1 contract.');
  return state;
}
export async function deployStillroom(session: ConnectedSession, parameters: GateParameters, stewardSecret: string, maintenanceKey: string, onUpdate: (record: DeploymentRecord) => void) {
  session.assertActive();
  const network = session.config.networkId as Network;
  if (getDeployment(network)) throw new Error('A deployment is already recorded on this network. Recover or explicitly archive it first.');
  const [threshold, pass, deadline, curator, limit] = gateArguments(parameters);
  const data = await createUnprovenDeployTx(session.providers, {
    compiledContract: compiledStillroom(),
    args: [threshold, pass, deadline, curator, pureCircuits.steward_public_key(secretBytes(stewardSecret)), limit],
    signingKey: maintenanceKey,
  });
  // A candidate address is persisted before opening the submission boundary, so
  // losing the connection cannot silently encourage a duplicate deployment.
  let record: DeploymentRecord = { address: data.public.contractAddress, network, status: 'submitting', submittedAt: Date.now() };
  saveDeployment(record); onUpdate(record);
  try {
    const txId = await submitTxAsync(session.providers, { unprovenTx: data.private.unprovenTx });
    record = { ...record, txId, status: 'pending' };
    saveDeployment(record); onUpdate(record); // BEFORE any indexer request
    // The maintenance key is already in the user's encrypted recovery file;
    // do not reinsert sensitive material into a possibly disconnected session.
    return record;
  } catch (error) {
    record = { ...record, status: 'unknown' };
    saveDeployment(record); onUpdate(record);
    throw error;
  }
}
export async function confirmDeployment(session: ConnectedSession, record: DeploymentRecord) {
  if (record.network !== session.config.networkId) throw new Error('Reconnect on the deployment network.');
  const state = await readStillroom(session, record.address);
  if (!state) return null;
  const confirmed: DeploymentRecord = { ...record, status: 'confirmed' };
  saveDeployment(confirmed);
  return confirmed;
}
export async function stewardAction(session: ConnectedSession, address: string, secret: string, action: 'open_gate' | 'close_gate' | 'rotate_gate', parameters?: GateParameters) {
  session.assertActive();
  const bytes = secretBytes(secret);
  const state = await readStillroom(session, address);
  if (!state) throw new Error('Contract is not indexed yet.');
  if (toHex(state.steward) !== toHex(pureCircuits.steward_public_key(bytes))) throw new Error('This recovery key does not match the public steward commitment.');
  const compiledContract = compiledStillroom({ stewardSecret: bytes });
  try {
    const data = action === 'rotate_gate'
      ? await createUnprovenCallTx(session.providers, { compiledContract, contractAddress: address, circuitId: action, args: gateArguments(parameters!) })
      : await createUnprovenCallTx(session.providers, { compiledContract, contractAddress: address, circuitId: action });
    return await submitTxAsync(session.providers, { unprovenTx: data.private.unprovenTx, circuitId: action });
  } finally { bytes.fill(0); }
}
