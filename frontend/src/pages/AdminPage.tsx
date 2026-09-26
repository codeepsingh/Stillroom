import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sampleSigningKey } from '@midnight-ntwrk/compact-runtime';
import { Copy, Download, ExternalLink, RefreshCw, ShieldCheck } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { CONFIG_EVENT, getContractAddress, getExplorerContractUrl, getNetwork, setContractAddress, setNetwork, validateContractAddress, type Network } from '../config';
import { clearDeployment, confirmDeployment, deployStillroom, getDeployment, PROOF_TRUST_NOTE, randomHex, readStillroom, type DeploymentRecord, type GateParameters } from '../lib/stillroom';
import { downloadRecovery, encryptRecovery, type RecoveryKeys } from '../lib/recovery';

const initialParameters = (): GateParameters => ({ threshold: '72', limit: '144', pass: randomHex(), curator: randomHex(), deadline: new Date(Date.now() + 30 * 86400000 - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) });

export default function AdminPage() {
  const { session, connect, disconnect, isConnecting, error: walletError } = useWallet();
  const [network, selectNetwork] = useState(getNetwork);
  const [parameters, setParameters] = useState(initialParameters);
  const [keys, setKeys] = useState<RecoveryKeys | null>(null);
  const [password, setPassword] = useState('');
  const [downloaded, setDownloaded] = useState(false);
  const [backedUp, setBackedUp] = useState(false);
  const [record, setRecord] = useState<DeploymentRecord | null>(getDeployment);
  const [externalAddress, setExternalAddress] = useState(getContractAddress);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [archive, setArchive] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const changed = () => { selectNetwork(getNetwork()); setRecord(getDeployment()); setExternalAddress(getContractAddress()); };
    window.addEventListener(CONFIG_EVENT, changed);
    window.addEventListener('storage', changed);
    return () => { window.removeEventListener(CONFIG_EVENT, changed); window.removeEventListener('storage', changed); };
  }, []);
  useEffect(() => {
    if (!session) { setKeys(null); setPassword(''); setDownloaded(false); setBackedUp(false); }
  }, [session]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setFailed(false); setMessage('');
    try { await action(); } catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  const recover = () => run(async () => {
    if (!session || !record) throw new Error('Connect on the selected network first.');
    setMessage('Checking the indexer. This never submits another deployment.');
    const confirmed = await confirmDeployment(session, record);
    if (confirmed) { setRecord(confirmed); setMessage('Contract confirmed in the indexer. Ready for the steward desk.'); }
    else setMessage('Not indexed yet. Keep this address and check again later. Do not redeploy to fix indexer lag.');
  });
  const field = (name: keyof GateParameters, value: string) => setParameters((current) => ({ ...current, [name]: value }));

  return <div className="page admin-page">
    <header className="page-heading"><div className="eyebrow">Administration / browser deployment</div><h1>Open a new room.</h1><p>Choose a network, safeguard your recovery keys, then deploy the six-argument Stillroom contract. Deployment and ongoing stewardship are separate steps.</p></header>
    <section className="panel">
      <h2>01 / Network & wallet</h2>
      <div className="form-grid"><label className="field" htmlFor="deploy-network">Network<select id="deploy-network" value={network} disabled={busy || isConnecting} onChange={(event) => { disconnect(); setNetwork(event.target.value as Network); setMessage(''); }}><option value="preview">Preview · development</option><option value="preprod">Preprod · release testing</option></select></label>
      <div className="field"><span>Wallet connection</span><button className="btn btn-secondary" disabled={busy || isConnecting || Boolean(session)} onClick={() => void connect(network)}>{session ? `Connected on ${session.config.networkId}` : isConnecting ? 'Opening wallet…' : `Connect on ${network}`}</button></div></div>
      {walletError && <p className="status-message error" role="alert">{walletError}</p>}
      <p className="field-help">A detected extension must support proving, balancing, and submission. The app checks capabilities and rejects a network mismatch.</p>
    </section>

    {record ? <section className="panel" aria-labelledby="deployment-title">
      <h2 id="deployment-title">Saved deployment / {record.status === 'confirmed' ? 'confirmed' : record.status === 'pending' ? 'submitted, awaiting indexer' : 'submission status uncertain'}</h2>
      <p>Network: <strong>{record.network}</strong>. {record.status !== 'confirmed' && 'The contract address is saved. A delayed indexer is not a reason to deploy again.'}</p>
      <div className="transaction-receipt"><code>{record.address}</code></div>
      {record.txId && <p className="field-help">Transaction ID: <code>{record.txId}</code></p>}
      <div className="form-actions"><button className="btn btn-secondary" onClick={() => void run(async () => { await navigator.clipboard.writeText(record.address); setCopied(true); setMessage('Contract address copied.'); })}><Copy size={16} aria-hidden="true" />{copied ? 'Copied' : 'Copy address'}</button><a className="btn btn-secondary" href={getExplorerContractUrl(record.address, record.network)} target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden="true" />Explorer</a><button className="btn btn-primary" disabled={busy || !session} onClick={() => void recover()}><RefreshCw size={16} aria-hidden="true" />{busy ? 'Checking…' : 'Check confirmation'}</button><Link className="btn btn-secondary" to="/steward">Steward desk</Link></div>
      <details><summary>Deploy a different room</summary><p>This archives only this browser’s deployment receipt. It does not cancel or remove the contract, and a pending transaction may still confirm.</p><label className="check-label"><input type="checkbox" checked={archive} onChange={(event) => setArchive(event.target.checked)} />I saved the old address and understand this creates a separate contract.</label><button className="btn btn-secondary" disabled={!archive || busy} onClick={() => { clearDeployment(network); setRecord(null); setKeys(null); setDownloaded(false); setBackedUp(false); setArchive(false); setMessage('Previous receipt archived. The existing contract remains on-chain.'); }}>Prepare a different room</button></details>
    </section> : <>
      <section className="panel"><h2>02 / Encrypted recovery backup</h2><p>The steward secret controls rotate, open and close. The separate maintenance key controls contract maintenance. Neither is written to browser storage. Back up both before deploying.</p>
        <button className="btn btn-secondary" disabled={busy || !session} onClick={() => { setKeys({ stewardSecret: randomHex(), maintenanceKey: sampleSigningKey() }); setDownloaded(false); setBackedUp(false); setMessage('New keys generated in memory. Encrypt and save the backup next.'); }}>Generate random recovery keys</button>
        {keys && <><p className="status-message"><ShieldCheck size={16} aria-hidden="true" />Recovery keys are ready in this tab only.</p><label className="field" htmlFor="backup-password">Recovery file password<input id="backup-password" type="password" autoComplete="new-password" minLength={12} value={password} onChange={(event) => { setPassword(event.target.value); setDownloaded(false); setBackedUp(false); }} /><span className="field-help">At least 12 characters. Store it separately; there is no password reset.</span></label><button className="btn btn-secondary" disabled={busy || password.length < 12} onClick={() => void run(async () => { downloadRecovery(await encryptRecovery(keys, password)); setDownloaded(true); setMessage('Encrypted backup downloaded. Verify it is saved before continuing.'); })}><Download size={16} aria-hidden="true" />Download encrypted recovery file</button><label className="check-label"><input type="checkbox" checked={backedUp} disabled={!downloaded} onChange={(event) => setBackedUp(event.target.checked)} />I saved the encrypted file and its password outside this browser.</label></>}
      </section>
      <section className="panel"><h2>03 / Public constructor configuration</h2><p>These values are public. Capacity is a lifetime total across every pass rotation, not a per-person or per-pass limit.</p>
        <div className="form-grid"><label className="field" htmlFor="deploy-threshold">Threshold (0–100)<input id="deploy-threshold" type="number" min="0" max="100" value={parameters.threshold} onChange={(event) => field('threshold', event.target.value)} /></label><label className="field" htmlFor="deploy-limit">Lifetime capacity<input id="deploy-limit" type="number" min="1" max="4294967295" value={parameters.limit} onChange={(event) => field('limit', event.target.value)} /></label><label className="field" htmlFor="deploy-deadline">Deadline (your local time)<input id="deploy-deadline" type="datetime-local" value={parameters.deadline} onChange={(event) => field('deadline', event.target.value)} /></label><label className="field" htmlFor="deploy-pass">Public pass identifier (32-byte hex)<input id="deploy-pass" value={parameters.pass} onChange={(event) => field('pass', event.target.value)} /></label><label className="field" htmlFor="deploy-curator">Public curator identifier (32-byte hex)<input id="deploy-curator" value={parameters.curator} onChange={(event) => field('curator', event.target.value)} /></label></div>
        <p className="field-help">Constructor order: threshold, pass identifier, deadline in Unix seconds, curator identifier, steward commitment, lifetime capacity. The steward commitment is derived from your recovery secret.</p>
        <button className="btn btn-primary" disabled={busy || !session || !keys || !backedUp || !downloaded} onClick={() => void run(async () => { if (!session || !keys) return; setMessage('Building transaction; approve proving, balancing and submission in your wallet.'); const submitted = await deployStillroom(session, parameters, keys.stewardSecret, keys.maintenanceKey, setRecord); setRecord(submitted); setKeys(null); setPassword(''); setMessage('Submission accepted. Address saved immediately. Check confirmation without redeploying.'); })}>{busy ? 'Preparing / awaiting wallet…' : `Deploy on ${network}`}</button>
      </section>
    </>}
    <section className="panel"><h2>Use an existing contract</h2><p>Paste a Stillroom contract address for this network. We validate the hexadecimal format and indexed edition before saving it.</p><label className="field" htmlFor="external-contract">Contract address<input id="external-contract" value={externalAddress} onChange={(event) => setExternalAddress(event.target.value)} spellCheck={false} /></label><button className="btn btn-secondary" disabled={busy || !session || !externalAddress} onClick={() => void run(async () => { if (!session) return; const address = validateContractAddress(externalAddress); const state = await readStillroom(session, address); if (!state) throw new Error('No indexed contract at this address on this network. Check network or retry after indexer lag.'); setContractAddress(address, network); setMessage('Existing Stillroom contract validated and selected.'); })}>Validate & use contract</button></section>
    {message && <div className={`status-message ${failed ? 'error' : ''}`} role={failed ? 'alert' : 'status'} aria-live="polite">{message}</div>}
    <aside className="panel"><h2>Proof trust boundary</h2><p>{PROOF_TRUST_NOTE}</p><p>The public ledger includes all configuration, the steward commitment, edition, lifetime count, used pass IDs, nullifiers and entry log. Contract calls, timing and transaction metadata remain observable.</p></aside>
  </div>;
}
