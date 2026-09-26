import { Link } from 'react-router-dom';
import { ArrowUpRight, Eye, Leaf, RefreshCw } from 'lucide-react';
import { getContractAddress, getExplorerContractUrl, getNetwork } from '../config';
import { toHex } from '../lib/midnight';
import { useContractState } from '../hooks/useContractState';

export default function ObservatoryPage() {
  const address = getContractAddress();
  const { ledgerState, isLoading, error, lastUpdate, refetch } = useContractState(8000);
  const nullifiers: string[] = [];
  if (ledgerState?.used_nullifiers?.[Symbol.iterator]) for (const item of ledgerState.used_nullifiers) nullifiers.push(toHex(item));
  const fill = ledgerState ? Math.min(100, Number(ledgerState.total_entries) / Math.max(1, Number(ledgerState.entry_limit)) * 100) : 0;
  return <div className="page"><div className="page-heading"><span className="section-label"><Eye size={16} /> The observatory</span><h1>The record is open.<br />The particulars aren’t.</h1><p>A window into public contract state on {getNetwork()}. Read the entry terms and proof markers without accessing anyone’s private score or secret.</p></div>
    {!address && <div className="notice">No contract is configured for this network. <Link className="help-link" to="/admin">Open deployment settings</Link> to plant the first gate or add an existing address.</div>}
    {error && <div className="notice error" role="alert">{error} The last successful read may be stale.</div>}
    <div className="metric-band"><div className="metric"><strong>{ledgerState ? String(ledgerState.total_entries) : '—'}</strong><small>Lifetime entries</small></div><div className="metric"><strong>{ledgerState ? String(ledgerState.entry_limit) : '—'}</strong><small>Entry capacity</small></div><div className="metric"><strong>{ledgerState ? String(ledgerState.entry_threshold) : '—'}</strong><small>Minimum score</small></div><div className="metric"><strong>{ledgerState ? ledgerState.gate_open ? 'Open' : 'Closed' : '—'}</strong><small>Gate switch</small></div></div>
    <div className="two-col"><section className="panel"><div className="panel-head"><h2>Public terms</h2><button className="icon-button" onClick={() => void refetch()} disabled={isLoading || !address} aria-label="Refresh public gate state"><RefreshCw size={17} className={isLoading ? 'spin' : ''} /></button></div>
      {!ledgerState ? <div className="empty-state"><Leaf size={24} /><h3>{isLoading && address ? 'Reading the indexer…' : 'No indexed state to show.'}</h3><p>{address ? 'Check the address, network and deployment confirmation.' : 'Real entries will appear here after deployment.'}</p><Link className="text-link" to="/admin">Deployment settings <ArrowUpRight size={16} /></Link></div> : <><div className="data-list"><div className="data-row"><span className="label">Contract</span><a className="text-link mono" href={getExplorerContractUrl()} target="_blank" rel="noopener noreferrer" title={address}>{address.slice(0, 12)}… <ArrowUpRight size={14} /></a></div><div className="data-row"><span className="label">Pass identifier</span><strong className="mono" title={toHex(ledgerState.access_pass_id)}>{toHex(ledgerState.access_pass_id).slice(0, 16)}…</strong></div><div className="data-row"><span className="label">Deadline</span><strong>{new Date(Number(ledgerState.entry_deadline) * 1000).toLocaleString()}</strong></div><div className="data-row"><span className="label">Curator identifier</span><strong className="mono" title={toHex(ledgerState.curator_id)}>{toHex(ledgerState.curator_id).slice(0, 16)}…</strong></div></div><p className="label" style={{ marginTop: 22 }}>Lifetime capacity used</p><div className="progress" role="progressbar" aria-label="Entry capacity used" aria-valuenow={fill} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${fill}%` }} /></div><p className="label">{fill.toFixed(1)}% · Rotation keeps the lifetime history.</p></>}
      {lastUpdate && <p className="label" style={{ marginTop: 20 }}>Last successful read: {lastUpdate.toLocaleTimeString()}</p>}
    </section><section className="panel"><span className="section-label">The disclosed receipts</span><h2>Entries, not profiles.</h2><p>A nullifier marks a used secret/pass combination. These are public markers, not an ordered timeline, and identical inputs can be correlated.</p>
      {!ledgerState ? <div className="empty-state">Receipts are unavailable until a contract is indexed.</div> : nullifiers.length === 0 ? <div className="empty-state">No entry receipts have been recorded.</div> : <div className="feed">{nullifiers.slice(0, 100).map(item => <div className="feed-item" key={item}><span className="feed-dot" /><div><strong>Recorded proof marker</strong><p>{item}</p></div></div>)}</div>}
      {nullifiers.length > 100 && <p className="label">Showing the first 100 of {nullifiers.length} markers.</p>}<Link className="text-link" to="/privacy">What an observer can learn <ArrowUpRight size={16} /></Link>
    </section></div>
  </div>;
}
