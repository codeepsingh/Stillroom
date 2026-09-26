import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Pause, Play, RefreshCw, RotateCcw } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { getContractAddress, getExplorerContractUrl, getExplorerTxUrl, getNetwork } from '../config';
import { useContractState } from '../hooks/useContractState';
import { decryptRecovery } from '../lib/recovery';
import { PROOF_TRUST_NOTE, randomHex, stewardAction, type GateParameters } from '../lib/stillroom';
import { toHex } from '../lib/midnight';

export default function StewardPage() {
  const { session, connect, isConnecting, error: walletError } = useWallet();
  const { ledgerState, isLoading, error, refetch } = useContractState();
  const address = getContractAddress();
  const [secret, setSecret] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryFile, setRecoveryFile] = useState('');
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [txId, setTxId] = useState('');
  const [parameters, setParameters] = useState<GateParameters>(() => ({ threshold: '72', limit: '144', pass: randomHex(), curator: randomHex(), deadline: new Date(Date.now() + 30 * 86400000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) }));
  useEffect(() => { if (!session) { setSecret(''); setPassword(''); setRecoveryFile(''); } }, [session]);
  useEffect(() => { setTxId(''); setStatus(''); }, [address]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setFailed(false); setStatus('');
    try { await action(); } catch (cause) { setFailed(true); setStatus(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  };
  const call = (action: 'close_gate' | 'open_gate' | 'rotate_gate') => run(async () => {
    if (!session || !address) throw new Error('Connect a wallet and select an indexed contract first.');
    setStatus('Building proof. Review the request in your wallet.');
    const id = await stewardAction(session, address, secret, action, parameters);
    setTxId(id); setStatus('Transaction submitted, not yet confirmed. Refresh the public state or check the explorer; do not repeat the action just because the indexer is delayed.');
    await refetch();
  });
  const field = (name: keyof GateParameters, value: string) => setParameters((current) => ({ ...current, [name]: value }));
  return <div className="page steward-page">
    <header className="page-heading"><div className="eyebrow">Steward desk / operate a room</div><h1>Care for the threshold.</h1><p>Pause, reopen or rotate an existing room. Administrative calls prove knowledge of the steward secret without publishing it as a circuit argument.</p><Link className="btn btn-secondary" to="/admin">Deploy or select a contract</Link></header>
    <div className="two-col">
      <section className="panel"><h2>Active room / {getNetwork()}</h2>
        {!address ? <p className="empty-state">No contract selected on this network. Visit Admin to deploy or validate an existing address.</p> : <><div className="transaction-receipt"><code>{address}</code></div><div className="form-actions"><button className="btn btn-secondary" disabled={isLoading} onClick={() => void refetch()}><RefreshCw size={16} aria-hidden="true" />Refresh public state</button><a className="btn btn-secondary" href={getExplorerContractUrl(address)} target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" />Explorer</a></div></>}
        {error && <p className="status-message error" role="alert">{error}</p>}
        {isLoading && !ledgerState && address && <p className="status-message" role="status">Reading the indexer…</p>}
        {ledgerState && <><dl className="data-list"><div className="data-row"><dt>Status</dt><dd>{ledgerState.gate_open ? 'Open' : 'Closed'}</dd></div><div className="data-row"><dt>Threshold</dt><dd>{ledgerState.entry_threshold.toString()} / 100</dd></div><div className="data-row"><dt>Lifetime entries</dt><dd>{ledgerState.total_entries.toString()} / {ledgerState.entry_limit.toString()}</dd></div><div className="data-row"><dt>Deadline</dt><dd>{new Date(Number(ledgerState.entry_deadline) * 1000).toLocaleString()}</dd></div><div className="data-row"><dt>Steward commitment</dt><dd><code>{toHex(ledgerState.steward).slice(0, 20)}…</code></dd></div></dl><button className="btn btn-primary" disabled={busy || !session || !secret} onClick={() => void call(ledgerState.gate_open ? 'close_gate' : 'open_gate')}>{ledgerState.gate_open ? <><Pause size={16} aria-hidden="true" />Close gate</> : <><Play size={16} aria-hidden="true" />Open gate</>}</button><p className="field-help">Expired or full rooms cannot reopen. Rotate to a new pass, future deadline and sufficient lifetime capacity.</p></>}
      </section>
      <section className="panel"><h2>Unlock stewardship</h2><p>Import the encrypted recovery file downloaded before deployment, or enter your 64-character steward secret. Secrets stay in this tab’s memory only.</p>
        {!session && <button className="btn btn-secondary" disabled={isConnecting} onClick={() => void connect()}>{isConnecting ? 'Opening wallet…' : `Connect on ${getNetwork()}`}</button>}
        {walletError && <p className="status-message error" role="alert">{walletError}</p>}
        <label className="field" htmlFor="steward-file">Encrypted recovery file<input id="steward-file" type="file" accept=".json,application/json" disabled={!session || busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void run(async () => { if (file.size > 16384) throw new Error('Recovery file is too large.'); setRecoveryFile(await file.text()); setStatus('Encrypted recovery file loaded. Enter its password.'); }); }} /></label>
        <label className="field" htmlFor="steward-password">Recovery file password<input id="steward-password" type="password" autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button className="btn btn-secondary" disabled={!session || !recoveryFile || !password || busy} onClick={() => void run(async () => { const keys = await decryptRecovery(recoveryFile, password); setSecret(keys.stewardSecret); setPassword(''); setRecoveryFile(''); setStatus('Recovery key unlocked in memory. Each action checks it against the on-chain steward commitment.'); })}>Unlock recovery file</button>
        <details><summary>Enter steward secret manually</summary><label className="field" htmlFor="steward-key">Private steward key<input id="steward-key" type="password" autoComplete="off" value={secret} onChange={(event) => setSecret(event.target.value)} spellCheck={false} /></label></details>
        {secret && <button className="btn btn-secondary" disabled={busy} onClick={() => { setSecret(''); setStatus('Steward secret removed from the form.'); }}>Lock stewardship</button>}
      </section>
    </div>
    <section className="panel"><h2>Rotate the room</h2><p>Rotation reopens the gate under a never-before-used pass identifier. The count and nullifier audit history are preserved. The new capacity must exceed the number of lifetime entries.</p>
      <div className="form-grid"><label className="field" htmlFor="rotate-threshold">New threshold<input id="rotate-threshold" type="number" min="0" max="100" value={parameters.threshold} onChange={(event) => field('threshold', event.target.value)} /></label><label className="field" htmlFor="rotate-limit">New lifetime capacity<input id="rotate-limit" type="number" min="1" max="4294967295" value={parameters.limit} onChange={(event) => field('limit', event.target.value)} /></label><label className="field" htmlFor="rotate-deadline">New deadline (local time)<input id="rotate-deadline" type="datetime-local" value={parameters.deadline} onChange={(event) => field('deadline', event.target.value)} /></label><label className="field" htmlFor="rotate-pass">New public pass ID<input id="rotate-pass" value={parameters.pass} onChange={(event) => field('pass', event.target.value)} /></label><label className="field" htmlFor="rotate-curator">Public curator ID<input id="rotate-curator" value={parameters.curator} onChange={(event) => field('curator', event.target.value)} /></label></div>
      <div className="form-actions"><button className="btn btn-secondary" disabled={busy} onClick={() => field('pass', randomHex())}><RotateCcw size={16} aria-hidden="true" />Generate new pass ID</button><button className="btn btn-primary" disabled={busy || !session || !secret || !ledgerState} onClick={() => void call('rotate_gate')}>{busy ? 'Awaiting wallet…' : 'Rotate gate'}</button></div>
    </section>
    {status && <div className={`status-message ${failed ? 'error' : ''}`} role={failed ? 'alert' : 'status'} aria-live="polite">{status}{txId && <p><a href={getExplorerTxUrl(txId)} target="_blank" rel="noreferrer">View submitted transaction <ExternalLink size={14} aria-hidden="true" /></a></p>}</div>}
    <aside className="panel"><h2>Know what the proof means</h2><p>{PROOF_TRUST_NOTE}</p></aside>
  </div>;
}
