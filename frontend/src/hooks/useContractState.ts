import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ledger } from '../managed/contract/index.js';
import { CONFIG_EVENT, getContractAddress, getNetwork, getNetworkConfig } from '../config';
import { createPatchedPublicDataProvider } from '../lib/midnight';

export function useContractState(interval = 5000, requestedAddress?: string) {
  const [ledgerState, setLedgerState] = useState<ReturnType<typeof ledger> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [, rerender] = useState(0);
  const generation = useRef(0);
  const network = getNetwork();
  const address = requestedAddress ?? getContractAddress();
  const provider = useMemo(() => {
    const config = getNetworkConfig(network);
    return createPatchedPublicDataProvider(config.indexerUri, config.indexerWsUri);
  }, [network]);
  const refetch = useCallback(async () => {
    const request = ++generation.current;
    if (!address) { setIsLoading(false); setLedgerState(null); setError(null); return; }
    try {
      setIsLoading(true);
      const state = await provider.queryContractState(address);
      if (request !== generation.current) return;
      const value = state?.data ? ledger(state.data) : null;
      if (value && new TextDecoder().decode(value.edition).replace(/\0/g, '') !== 'Stillroom:v1.0') throw new Error('This is not a Stillroom v1 contract.');
      setLedgerState(value); setError(null); setLastUpdate(new Date());
    } catch (cause) {
      if (request !== generation.current) return;
      setLedgerState(null);
      setError(cause instanceof Error ? cause.message : 'Unable to read the Midnight indexer.');
    } finally { if (request === generation.current) setIsLoading(false); }
  }, [address, network, provider]);
  useEffect(() => {
    const changed = () => { generation.current += 1; setLedgerState(null); setLastUpdate(null); rerender((n) => n + 1); };
    window.addEventListener(CONFIG_EVENT, changed); window.addEventListener('storage', changed);
    return () => { window.removeEventListener(CONFIG_EVENT, changed); window.removeEventListener('storage', changed); };
  }, []);
  useEffect(() => {
    setLedgerState(null); setLastUpdate(null); void refetch();
    const timer = window.setInterval(() => void refetch(), Math.max(interval, 1000));
    return () => { generation.current += 1; window.clearInterval(timer); };
  }, [refetch, interval]);
  return { ledgerState, isLoading, error, lastUpdate, refetch };
}
