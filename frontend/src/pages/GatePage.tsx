import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { createUnprovenCallTx, submitTxAsync } from '@midnight-ntwrk/midnight-js-contracts';
import { ArrowUpRight, Check, Fingerprint, Leaf, LockKeyhole, RefreshCw } from 'lucide-react';
import { compiledStillroom } from '../lib/stillroom';
import { useWallet } from '../contexts/WalletContext';
import { getContractAddress, getExplorerTxUrl, getNetwork } from '../config';
import { fromHex, toHex } from '../lib/midnight';
import { hasUsedPass } from '../lib/identity';
import { useContractState } from '../hooks/useContractState';

export default function GatePage() {
  const { session, isConnected, connect, isConnecting } = useWallet();
  const { ledgerState, isLoading, error, refetch } = useContractState(5000);
  const [score, setScore] = useState('');
  const [secret, setSecret] = useState('');
  const [status, setStatus] = useState<'ready' | 'proving' | 'submitted' | 'error'>('ready');
  const [message, setMessage] = useState('');
  const [txId, setTxId] = useState('');
  const [submittedSecret, setSubmittedSecret] = useState('');
  const submitting = useRef(false);
  const configured = Boolean(getContractAddress());
  const validScore = /^\d{1,3}$/.test(score) && BigInt(score) <= 100n;
  const validSecret = /^[a-f0-9]{64}$/i.test(secret) && !/^0+$/.test(secret);
  const hasUsed = useMemo(() => validSecret && hasUsedPass(secret, ledgerState), [secret, validSecret, ledgerState]);
  const confirmed = Boolean(submittedSecret && hasUsedPass(submittedSecret, ledgerState));
  const expired = ledgerState && Number(ledgerState.entry_deadline) * 1000 <= Date.now();
  const full = ledgerState && ledgerState.total_entries >= ledgerState.entry_limit;
  const thresholdMet = validScore && ledgerState && BigInt(score) >= ledgerState.entry_threshold;
  const canProve = Boolean(isConnected && ledgerState?.gate_open && !expired && !full && validSecret && thresholdMet && !hasUsed && status !== 'proving' && status !== 'submitted');
  useEffect(() => { if (!isConnected) { setSecret(''); setScore(''); setSubmittedSecret(''); } }, [isConnected]);

  async function prove(event: React.FormEvent) {
    event.preventDefault();
    if (!canProve || !session || submitting.current) return;
    submitting.current = true;
    setStatus('proving'); setMessage('Building the proof and requesting wallet approval. Your configured proving service may process the private inputs.'); setTxId('');
    try {
      if (session.config.networkId !== getNetwork()) throw new Error('The wallet network changed. Disconnect and reconnect.');
      const contractAddress = getContractAddress();
      session.assertActive();
      const call = await createUnprovenCallTx(session.providers, {
        compiledContract: compiledStillroom({ score: BigInt(score), credential: fromHex(secret) }),
        contractAddress, circuitId: 'prove_entry',
      });
      const id = await submitTxAsync(session.providers, { unprovenTx: call.private.unprovenTx });
      if (typeof id !== 'string' || !id) throw new Error('Submission did not return a transaction identifier. Check the wallet before retrying.');
      setTxId(id); setSubmittedSecret(secret); setStatus('submitted');
      setMessage('Transaction submitted. Waiting for the public indexer to show your receipt; this is not yet a confirmation.');
      void refetch();
    } catch (cause) { setStatus('error'); setMessage(cause instanceof Error ? cause.message : 'The proof could not be submitted. Check your wallet before retrying.'); }
    finally { submitting.current = false; }
  }

  function downloadSecret() {
    if (!validSecret) return;
    const blob = new Blob([JSON.stringify({ application: 'Stillroom', purpose: 'entry-secret', secret, network: getNetwork(), contract: getContractAddress() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'stillroom-entry-secret.json'; a.click(); URL.revokeObjectURL(url);
  }

  return <div className="page">
    <div className="page-heading"><span className="section-label"><Leaf size={16} /> The gate</span><h1>A shared rule.<br />A private way in.</h1><p>See the terms of entry, then prove that your private score meets them. Your score is self-attested: this experiment checks a relation, not a real-world credential.</p></div>
    <div className="two-col">
      <section className="panel" aria-labelledby="gate-state-title"><div className="panel-head"><h2 id="gate-state-title">The entry terms</h2><span className={`status ${!ledgerState?.gate_open ? 'closed' : ''}`}>{!ledgerState ? 'Not indexed' : expired ? 'Expired' : full ? 'At capacity' : ledgerState.gate_open ? 'Open' : 'Closed'}</span></div>
        {error && <div className="notice error" role="alert">{error}<button className="tiny-button" onClick={() => void refetch()}>Retry</button></div>}
        {!configured ? <div className="empty-state"><Leaf size={25} /><h3>A gate has not been planted yet.</h3><p>Deploy an instance, or configure an existing address for {getNetwork()}.</p><Link className="btn btn-secondary" to="/admin">Open deployment settings <ArrowUpRight size={16} /></Link></div> : !ledgerState ? <div className="empty-state">{isLoading ? 'Reading public gate state…' : 'No matching contract is indexed. Check the address and network in deployment settings.'}</div> : <div className="data-list">
          <div className="data-row"><span className="label">Minimum score</span><strong>{String(ledgerState.entry_threshold)} / 100</strong></div>
          <div className="data-row"><span className="label">Lifetime entries / capacity</span><strong>{String(ledgerState.total_entries)} / {String(ledgerState.entry_limit)}</strong></div>
          <div className="data-row"><span className="label">Closes</span><strong>{new Date(Number(ledgerState.entry_deadline) * 1000).toLocaleString()}</strong></div>
          <div className="data-row"><span className="label">Pass identifier</span><strong className="mono" title={toHex(ledgerState.access_pass_id)}>{toHex(ledgerState.access_pass_id).slice(0, 16)}…</strong></div>
        </div>}
        <div className="notice" style={{ marginTop: 22 }}><LockKeyhole size={16} /> The ledger receives a nullifier and a new entry count, not your score or secret. The public configuration and transaction metadata remain visible.</div><Link className="text-link" to="/privacy">Read the privacy boundaries <ArrowUpRight size={16} /></Link>
      </section>
      <section className="panel" aria-labelledby="witness-title"><span className="section-label"><Fingerprint size={16} /> Your side of the threshold</span><h2 id="witness-title">Keep the particulars yours.</h2><p>The inputs below are private witnesses. They are kept in this session, not in application localStorage. A trusted proving service is part of the privacy boundary.</p>
        {!isConnected ? <div className="empty-state"><h3>Start with your wallet.</h3><p>Connect a supported Midnight wallet on {getNetwork()}. You will approve a transaction before anything is submitted.</p><button className="btn btn-primary" onClick={() => void connect(getNetwork())} disabled={isConnecting}>{isConnecting ? 'Connecting…' : 'Connect wallet'}</button></div> : <form onSubmit={prove}>
          <div className="field"><label htmlFor="private-score">Private eligibility score</label><input id="private-score" type="text" inputMode="numeric" autoComplete="off" value={score} onChange={e => setScore(e.target.value)} placeholder="A whole number from 0 to 100" aria-describedby="score-help" disabled={status === 'proving' || status === 'submitted'} /><small id="score-help">{score && !validScore ? 'Use a whole number between 0 and 100.' : validScore && ledgerState && !thresholdMet ? `The public rule requires at least ${ledgerState.entry_threshold}.` : 'Self-attested input; not an independently verified score.'}</small></div>
          <div className="field"><label htmlFor="entry-secret">Private entry secret</label><input id="entry-secret" type="password" autoComplete="new-password" value={secret} onChange={e => setSecret(e.target.value.trim())} placeholder="Generate or paste a saved 64-character hex secret" disabled={status === 'proving' || status === 'submitted'} aria-describedby="secret-help" /><small id="secret-help">{secret && !validSecret ? 'Use 64 hexadecimal characters; an all-zero secret is not allowed.' : 'Back up this secret to retain the same receipt across visits. Never use your wallet seed phrase.'}</small></div>
          <div className="form-actions"><button type="button" className="btn btn-secondary" disabled={status === 'proving' || status === 'submitted'} onClick={() => setSecret(toHex(crypto.getRandomValues(new Uint8Array(32))))}>Generate secret</button><button type="button" className="btn btn-secondary" disabled={!validSecret} onClick={downloadSecret}>Save private backup</button></div>
          {hasUsed && status !== 'submitted' && <div className="notice" style={{ marginTop: 18 }}>This secret already has a receipt for the active pass. The circuit rejects its reuse.</div>}
          <button className="btn btn-primary full-width" type="submit" style={{ marginTop: 22 }} disabled={!canProve}>{status === 'proving' ? <><RefreshCw size={16} className="spin" /> Waiting for wallet and proof…</> : status === 'submitted' ? 'Submitted — inspect receipt below' : <>Prove eligibility <ArrowUpRight size={16} /></>}</button>
        </form>}
        {message && <div className={`notice ${status === 'error' ? 'error' : confirmed ? 'success' : ''}`} style={{ marginTop: 20 }} role={status === 'error' ? 'alert' : 'status'}>{confirmed ? <><Check size={16} /> Receipt found in public ledger state. The entry is indexed.</> : message}</div>}
        {txId && <div className="transaction-receipt"><span className="label">Submitted transaction</span><code>{txId}</code><a className="text-link" href={getExplorerTxUrl(txId)} target="_blank" rel="noopener noreferrer">Inspect transaction <ArrowUpRight size={16} /></a>{!confirmed && <button className="tiny-button" onClick={() => void refetch()}>Check indexing</button>}</div>}
      </section>
    </div>
  </div>;
}
