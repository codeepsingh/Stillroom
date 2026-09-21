import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { ConnectedSession } from '../lib/midnight';
import { CONFIG_EVENT, getNetwork, setNetwork } from '../config';

export type WalletStatus = 'checking' | 'detected' | 'not-found';
export type WalletType = '1am' | 'lace' | 'other' | null;
export type WalletEntry = { id: string; name: string; api: InitialAPI };

type WalletContextValue = {
  address: string | null;
  isConnected: boolean;
  walletType: WalletType;
  walletName: string | null;
  walletStatus: WalletStatus;
  isConnecting: boolean;
  session: ConnectedSession | null;
  availableWallets: WalletEntry[];
  error: string | null;
  clearError: () => void;
  connect: (network?: 'preview' | 'preprod', walletId?: string) => Promise<ConnectedSession | undefined>;
  disconnect: () => void;
};
const WalletContext = createContext<WalletContextValue | null>(null);

export function listInjectedWallets(): WalletEntry[] {
  if (typeof window === 'undefined') return [];
  const midnight = (window as any).midnight;
  if (!midnight) return [];
  return Object.entries(midnight).filter(([, api]) => typeof (api as any)?.connect === 'function').map(([id, api]) => ({
    id,
    api: api as InitialAPI,
    name: (api as any).name || (id === '1am' ? '1AM Wallet' : id === 'mnLace' ? 'Lace Wallet' : id),
  }));
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [walletStatus, setWalletStatus] = useState<WalletStatus>('checking');
  const [availableWallets, setAvailableWallets] = useState<WalletEntry[]>([]);
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [session, setSession] = useState<ConnectedSession | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connecting = useRef(false);
  const sessionRef = useRef<ConnectedSession | null>(null);
  const generation = useRef(0);

  const clearError = useCallback(() => setError(null), []);

  const detect = useCallback((timeout = 6000) => {
    const started = Date.now();
    const id = window.setInterval(() => {
      const wallets = listInjectedWallets();
      if (wallets.length) {
        setAvailableWallets(wallets); setWalletStatus('detected');
        setWalletName(wallets[0].name); setWalletType(wallets[0].id === '1am' ? '1am' : wallets[0].id.toLowerCase().includes('lace') ? 'lace' : 'other');
        window.clearInterval(id);
      } else if (Date.now() - started > timeout) {
        setWalletStatus('not-found'); window.clearInterval(id);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => detect(), [detect]);

  const disconnect = useCallback(() => {
    generation.current += 1;
    const hadSession = Boolean(sessionRef.current);
    void sessionRef.current?.disconnect().catch(() => undefined);
    sessionRef.current = null;
    if (hadSession) void import('../lib/identity').then(({ clearIdentity }) => clearIdentity());
    setSession(null); setAddress(null); setError(null);
    setWalletStatus(listInjectedWallets().length ? 'detected' : 'not-found');
  }, []);

  useEffect(() => {
    const checkNetwork = () => {
      if (sessionRef.current && sessionRef.current.config.networkId !== getNetwork()) disconnect();
    };
    window.addEventListener(CONFIG_EVENT, checkNetwork);
    window.addEventListener('storage', checkNetwork);
    return () => { window.removeEventListener(CONFIG_EVENT, checkNetwork); window.removeEventListener('storage', checkNetwork); };
  }, [disconnect]);

  const connect = useCallback(async (network: 'preview' | 'preprod' = getNetwork(), walletId?: string) => {
    if (connecting.current) return;
    if (sessionRef.current) disconnect();
    setNetwork(network);
    const attempt = generation.current;
    connecting.current = true; setIsConnecting(true); setError(null);
    try {
      const wallets = listInjectedWallets();
      if (!wallets.length) throw new Error('Install a Midnight-compatible wallet such as 1AM or Lace first.');
      const chosen = wallets.find((item) => item.id === walletId) || wallets.find((item) => item.id === '1am') || wallets[0];
      const api: ConnectedAPI = await chosen.api.connect(network);
      const { createConnectedSession } = await import('../lib/midnight');
      const connected = await createConnectedSession(api, network);
      if (attempt !== generation.current || network !== getNetwork()) { await connected.disconnect(); return; }
      sessionRef.current = connected;
      setSession(connected); setAddress(connected.unshieldedAddress); setWalletName(chosen.name);
      setWalletType(chosen.id === '1am' ? '1am' : chosen.id.toLowerCase().includes('lace') ? 'lace' : 'other');
      setError(null);
      return connected;
    } catch (cause: any) {
      const msg = cause?.message || String(cause);
      if (msg.toLowerCase().includes('syncing')) {
        setError('1AM Wallet is syncing with Midnight Network. Please click your 1AM extension icon in your browser toolbar and wait for sync to reach 100%.');
      } else if (msg.toLowerCase().includes('rate limit')) {
        setError('1AM Wallet rate limited due to repeated requests. Please wait 30 seconds before retrying.');
      } else {
        setError(msg);
      }
    } finally {
      connecting.current = false; setIsConnecting(false);
    }
  }, [disconnect]);

  return <WalletContext.Provider value={{ address, isConnected: Boolean(session), walletType, walletName, walletStatus, isConnecting, session, availableWallets, error, clearError, connect, disconnect }}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used inside WalletProvider');
  return context;
}
