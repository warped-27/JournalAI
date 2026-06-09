import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { secretGet, secretSet } from '../crypto/secureSecrets';
import type { WebDavConfig } from './providers/webdavSync';

const SYNC_CFG_KEY  = 'nj_sync_config';
const SYNC_META_KEY = 'nj_sync_meta';

export type SyncProviderType = 'none' | 'webdav' | 'file';

export interface SyncConfig {
  provider: SyncProviderType;
  webdav?:  WebDavConfig;
}

interface SyncMeta {
  lastSyncAt: number | null;
  lastEtag:   string | null;
}

interface SyncContextValue {
  config:       SyncConfig;
  setConfig:    (c: SyncConfig) => Promise<void>;
  isSyncing:    boolean;
  setIsSyncing: (v: boolean) => void;
  lastSyncAt:   number | null;
  setLastSyncAt:(v: number) => void;
  lastEtag:     string | null;
  setLastEtag:  (v: string | null) => void;
  lastError:    string | null;
  setLastError: (v: string | null) => void;
  hasConfigured: boolean;
  showOnboarding: boolean;
  dismissOnboarding: () => void;
  triggerOnboarding: () => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [config,          setConfigState]     = useState<SyncConfig>({ provider: 'none' });
  const [isSyncing,       setIsSyncing]       = useState(false);
  const [lastSyncAt,      setLastSyncAtState] = useState<number | null>(null);
  const [lastEtag,        setLastEtagState]   = useState<string | null>(null);
  const [lastError,       setLastError]       = useState<string | null>(null);
  const [showOnboarding,  setShowOnboarding]  = useState(false);

  useEffect(() => {
    secretGet(SYNC_CFG_KEY).then((raw) => {
      if (!raw) return;
      try { setConfigState(JSON.parse(raw) as SyncConfig); } catch {}
    });
    secretGet(SYNC_META_KEY).then((raw) => {
      if (!raw) return;
      try {
        const meta = JSON.parse(raw) as SyncMeta;
        if (meta.lastSyncAt) setLastSyncAtState(meta.lastSyncAt);
        if (meta.lastEtag)   setLastEtagState(meta.lastEtag);
      } catch {}
    });
  }, []);

  const setConfig = useCallback(async (c: SyncConfig) => {
    await secretSet(SYNC_CFG_KEY, JSON.stringify(c));
    setConfigState(c);
  }, []);

  const setLastSyncAt = useCallback((v: number) => {
    setLastSyncAtState(v);
    // persist asynchronously — fire-and-forget is fine here
    setLastEtagState((etag) => {
      void secretSet(SYNC_META_KEY, JSON.stringify({ lastSyncAt: v, lastEtag: etag }));
      return etag;
    });
  }, []);

  const setLastEtag = useCallback((v: string | null) => {
    setLastEtagState(v);
    setLastSyncAtState((ts) => {
      void secretSet(SYNC_META_KEY, JSON.stringify({ lastSyncAt: ts, lastEtag: v }));
      return ts;
    });
  }, []);

  const dismissOnboarding = useCallback(() => setShowOnboarding(false), []);
  const triggerOnboarding = useCallback(() => setShowOnboarding(true),  []);

  return (
    <SyncContext.Provider
      value={{
        config,
        setConfig,
        isSyncing,
        setIsSyncing,
        lastSyncAt,
        setLastSyncAt,
        lastEtag,
        setLastEtag,
        lastError,
        setLastError,
        hasConfigured: config.provider !== 'none',
        showOnboarding,
        dismissOnboarding,
        triggerOnboarding,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>');
  return ctx;
}
