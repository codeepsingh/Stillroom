import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Moon, Sun, LogOut, Menu, X, AlertCircle, ArrowUpRight } from 'lucide-react';
import { useWallet } from './contexts/WalletContext';
import { CONFIG_EVENT, getNetwork, setNetwork } from './config';
import LandingPage from './pages/LandingPage';
const GatePage = lazy(() => import('./pages/GatePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const StewardPage = lazy(() => import('./pages/StewardPage'));
const ObservatoryPage = lazy(() => import('./pages/ObservatoryPage'));
const PhilosophyPage = lazy(() => import('./pages/PhilosophyPage'));

export function BotanicalMark({ className = '' }: { className?: string }) {
  return <svg className={className} width="34" height="42" viewBox="0 0 34 42" fill="none" aria-hidden="true"><path d="M16 39C19 28 16 17 23 3M18 28C6 28 4 22 3 16C11 16 16 20 18 28ZM18 20C28 20 32 14 31 9C24 9 19 13 18 20ZM19 12C10 12 10 5 12 1C18 3 20 6 19 12ZM16 35C24 35 28 30 28 25C22 25 17 29 16 35Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function initialTheme(): 'day' | 'night' {
  try { const stored = localStorage.getItem('STILLROOM_THEME'); if (stored === 'day' || stored === 'night') return stored; } catch { /* Storage may be unavailable. */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'night' : 'day';
}

export default function App() {
  const { address, isConnected, connect, disconnect, isConnecting, walletStatus, walletName, availableWallets, error, clearError } = useWallet();
  const [theme, setTheme] = useState(initialTheme);
  const [network, updateNetwork] = useState(getNetwork);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState('');
  useEffect(() => {
    const sync = () => updateNetwork(getNetwork());
    window.addEventListener(CONFIG_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(CONFIG_EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  const menuButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => { try { if (localStorage.getItem('STILLROOM_THEME')) return; } catch { /* Follow system without storage. */ } setTheme(preference.matches ? 'night' : 'day'); };
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    setMobileOpen(false);
    const titles: Record<string, string> = { '/': 'A quieter kind of belonging', '/gate': 'Enter the gate', '/observatory': 'The observatory', '/privacy': 'Our privacy model', '/steward': 'Steward desk', '/admin': 'Deployment settings' };
    document.title = `${titles[location.pathname] || 'Room not found'} · Stillroom`;
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMobileOpen(false); menuButton.current?.focus(); } };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [mobileOpen]);
  const toggleTheme = () => { const next = theme === 'night' ? 'day' : 'night'; setTheme(next); try { localStorage.setItem('STILLROOM_THEME', next); } catch { /* Theme remains usable without storage. */ } };
  const changeNetwork = (value: 'preview' | 'preprod') => { disconnect(); setNetwork(value); updateNetwork(value); };
  const shortAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : '';

  return <div className="site-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="topbar">
      <Link className="brand" to="/" aria-label="Stillroom home"><BotanicalMark /><span>stillroom<span className="brand-caption">A quieter kind of belonging</span></span></Link>
      <nav id="main-navigation" aria-label="Main navigation" className={`main-nav ${mobileOpen ? 'open' : ''}`}>
        <NavLink to="/gate">The gate</NavLink><NavLink to="/observatory">Observatory</NavLink><NavLink to="/privacy">Our philosophy</NavLink><NavLink to="/steward">Steward desk</NavLink>
      </nav>
      <div className="topbar-actions">
        <label className="network-control"><span className="network-dot" /><span className="sr-only">Midnight network</span><select value={network} onChange={event => changeNetwork(event.target.value as 'preview' | 'preprod')} disabled={isConnecting}><option value="preview">Preview</option><option value="preprod">Preprod</option></select></label>
        <button className="icon-button theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'night' ? 'day' : 'night'} mode`} title={`Switch to ${theme === 'night' ? 'day' : 'night'} mode`}>{theme === 'night' ? <Sun size={18} /> : <Moon size={18} />}</button>
        {isConnected ? <button className="connect-button connected" onClick={disconnect} aria-label={`Disconnect ${walletName || 'wallet'} ${shortAddress}`}><span className="network-dot" /><span>{shortAddress}</span><LogOut size={15} aria-hidden="true" /></button> : <button className="connect-button" onClick={() => void connect(network, selectedWallet || undefined)} disabled={isConnecting}>{isConnecting ? 'Connecting…' : 'Connect wallet'}<ArrowUpRight size={15} aria-hidden="true" /></button>}
        <button ref={menuButton} className="icon-button mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-expanded={mobileOpen} aria-controls="main-navigation" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}>{mobileOpen ? <X size={21} /> : <Menu size={21} />}</button>
      </div>
    </header>
    {!isConnected && availableWallets.length > 1 && <div className="wallet-choice"><label htmlFor="wallet-choice">Connect using</label><select id="wallet-choice" value={selectedWallet} disabled={isConnecting} onChange={event => setSelectedWallet(event.target.value)}><option value="">Default detected wallet</option>{availableWallets.map(wallet => <option value={wallet.id} key={wallet.id}>{wallet.name}</option>)}</select><span>Choose Lace here for Preprod submission evidence.</span></div>}
    {error && <div className="wallet-error" role="alert"><AlertCircle size={19} aria-hidden="true" /><span>{error}</span><button className="icon-button" onClick={clearError} aria-label="Dismiss wallet error"><X size={18} /></button></div>}
    <main id="main-content" tabIndex={-1} key={network}><Suspense fallback={<div className="page" role="status">Opening the room…</div>}><Routes><Route path="/" element={<LandingPage />} /><Route path="/gate" element={<GatePage />} /><Route path="/steward" element={<StewardPage />} /><Route path="/admin" element={<AdminPage />} /><Route path="/observatory" element={<ObservatoryPage />} /><Route path="/privacy" element={<PhilosophyPage />} /><Route path="/philosophy" element={<PhilosophyPage />} /><Route path="*" element={<div className="page"><div className="page-heading"><span className="section-label">A path less travelled</span><h1>This room isn’t here.</h1><p>The address may have changed. Return to the garden to find your way.</p><Link className="btn btn-primary" to="/">Back to Stillroom</Link></div></div>} /></Routes></Suspense></main>
    <footer className="footer"><div className="footer-intro"><Link className="brand" to="/"><BotanicalMark /><span>stillroom</span></Link><p>A private-access experiment for communities<br />that leave room for the individual.</p></div><nav aria-label="Footer navigation"><Link to="/privacy">Privacy & principles</Link><Link to="/admin">Deployment settings</Link><Link to="/steward">Steward desk</Link></nav><div className="footer-note"><span className="network-label"><span className="network-dot" />Built on Midnight</span><span>{network === 'preview' ? 'Preview' : 'Preprod'} network · Experimental software</span>{walletStatus === 'not-found' && <span>Connect with a Midnight-compatible wallet.</span>}</div></footer>
  </div>;
}
