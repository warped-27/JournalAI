import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { isNativePlatform } from '../../platform/detect';
import { DEFAULT_ON_DEVICE_MODEL, AVAILABLE_MODELS, findModelById, type ModelInfo } from './modelInfo';
import {
  isModelDownloaded,
  startModelDownload,
  deleteModel,
  getModelPath,
} from './modelManager';
import {
  initLlamaRnProvider,
  releaseLlamaRnProvider,
  LLAMA_RN_AVAILABLE,
} from '../providers/llamaRnProvider';
import { secretGet, secretSet } from '../../crypto/secureSecrets';
import type { AiProvider } from '../providers/types';

const MODEL_ID_KEY = 'nj_ondevice_model';

export type OnDeviceStatus =
  | 'unavailable'      // not native (web/Tauri)
  | 'not-downloaded'   // model file absent
  | 'downloading'      // download in progress
  | 'download-error'   // download failed
  | 'ready'            // file present, model not loaded
  | 'loading'          // llama.rn initialising
  | 'loaded'           // model ready, provider live
  | 'error';           // load error

interface OnDeviceContextValue {
  status:              OnDeviceStatus;
  downloadProgress:    number;          // 0–1 during download / load
  errorMessage:        string | null;
  modelInfo:           ModelInfo;
  selectedModelId:     string;
  downloadedModelIds:  ReadonlySet<string>; // all models with a local file on disk
  provider:            AiProvider | null;
  startDownload:       () => Promise<void>;
  cancelDownload:      () => Promise<void>;
  loadModel:           () => Promise<void>;
  unloadModel:         () => Promise<void>;
  deleteLocalModel:    () => Promise<void>;
  deleteModelById:     (id: string) => Promise<void>; // delete any downloaded model by id
  selectModel:         (id: string) => Promise<void>;
}

const OnDeviceContext = createContext<OnDeviceContextValue | null>(null);

export function OnDeviceProvider({ children }: { children: ReactNode }) {
  const [selectedModelId,   setSelectedModelId]   = useState(DEFAULT_ON_DEVICE_MODEL.id);
  const [status,            setStatus]            = useState<OnDeviceStatus>('not-downloaded');
  const [downloadProgress,  setDownloadProgress]  = useState(0);
  const [errorMessage,      setErrorMessage]      = useState<string | null>(null);
  const [provider,          setProvider]          = useState<AiProvider | null>(null);
  const [downloadedModelIds, setDownloadedModelIds] = useState<ReadonlySet<string>>(new Set());
  const downloadHandleRef = useRef<{ cancel: () => Promise<void> } | null>(null);

  // ── Initial load: restore persisted model choice + scan all download states ───
  useEffect(() => {
    if (!isNativePlatform() || !LLAMA_RN_AVAILABLE) {
      setStatus('unavailable'); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    let cancelled = false;
    (async () => {
      // Restore persisted model choice
      let id = DEFAULT_ON_DEVICE_MODEL.id;
      try {
        const saved = await secretGet(MODEL_ID_KEY);
        if (saved && findModelById(saved)) id = saved;
      } catch { /* storage unavailable — use default */ }

      if (cancelled) return;
      setSelectedModelId(id);

      // Check download status for ALL models so the picker can show indicators
      const checks = await Promise.all(
        AVAILABLE_MODELS.map((m) =>
          isModelDownloaded(m).then((exists) => (exists ? m.id : null)).catch(() => null),
        ),
      );
      if (cancelled) return;
      const downloaded = new Set(checks.filter((x): x is string => x !== null));
      setDownloadedModelIds(downloaded);
      setStatus(downloaded.has(id) ? 'ready' : 'not-downloaded');
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Select a different model ──────────────────────────────────────────────────
  const selectModel = useCallback(async (id: string) => {
    if (id === selectedModelId) return;

    // Cancel any in-progress download
    const handle = downloadHandleRef.current;
    if (handle) {
      await handle.cancel().catch(() => {});
      downloadHandleRef.current = null;
    }

    // Unload if a model is currently live
    if (status === 'loaded' || status === 'loading') {
      await releaseLlamaRnProvider().catch(() => {});
    }

    setProvider(null);
    setDownloadProgress(0);
    setErrorMessage(null);
    setSelectedModelId(id);
    await secretSet(MODEL_ID_KEY, id).catch(() => {});

    // Derive status from the cached set — no extra file-system call needed
    setStatus((prev) => {
      if (prev === 'unavailable') return 'unavailable';
      return downloadedModelIds.has(id) ? 'ready' : 'not-downloaded';
    });
  }, [selectedModelId, status, downloadedModelIds]);

  // ── Download ──────────────────────────────────────────────────────────────────
  const startDownload = useCallback(async () => {
    if (!isNativePlatform()) return;
    const m = findModelById(selectedModelId) ?? DEFAULT_ON_DEVICE_MODEL;
    setStatus('downloading');
    setDownloadProgress(0);
    setErrorMessage(null);
    try {
      const { cancel, completion } = startModelDownload(m, (fraction) => {
        setDownloadProgress(fraction);
      });
      downloadHandleRef.current = { cancel };
      await completion;
      downloadHandleRef.current = null;
      setDownloadedModelIds((prev) => new Set([...prev, m.id]));
      setStatus('ready');
    } catch (e) {
      downloadHandleRef.current = null;
      setErrorMessage(e instanceof Error ? e.message : 'Download failed');
      setStatus('download-error');
    }
  }, [selectedModelId]);

  const cancelDownload = useCallback(async () => {
    const handle = downloadHandleRef.current;
    if (handle) {
      await handle.cancel();
      downloadHandleRef.current = null;
    }
    setStatus('not-downloaded');
    setDownloadProgress(0);
  }, []);

  // ── Load / unload ─────────────────────────────────────────────────────────────
  const loadModel = useCallback(async () => {
    if (!isNativePlatform()) return;
    const m = findModelById(selectedModelId) ?? DEFAULT_ON_DEVICE_MODEL;
    setStatus('loading');
    setErrorMessage(null);
    try {
      const p = await initLlamaRnProvider(
        getModelPath(m),
        (progress) => { setDownloadProgress(progress / 100); },
      );
      setProvider(p);
      setStatus('loaded');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Failed to load model');
      setStatus('error');
    }
  }, [selectedModelId]);

  const unloadModel = useCallback(async () => {
    await releaseLlamaRnProvider();
    setProvider(null);
    setStatus('ready');
  }, []);

  // ── Delete (selected model) ───────────────────────────────────────────────────
  const deleteLocalModel = useCallback(async () => {
    if (!isNativePlatform()) return;
    const m = findModelById(selectedModelId) ?? DEFAULT_ON_DEVICE_MODEL;
    if (status === 'loaded') await releaseLlamaRnProvider();
    setProvider(null);
    await deleteModel(m);
    setDownloadedModelIds((prev) => { const s = new Set(prev); s.delete(m.id); return s; });
    setStatus('not-downloaded');
  }, [selectedModelId, status]);

  // ── Delete any model by id (for cleaning up non-selected downloads) ───────────
  const deleteModelById = useCallback(async (id: string) => {
    if (!isNativePlatform()) return;
    const m = findModelById(id) ?? DEFAULT_ON_DEVICE_MODEL;
    // If deleting the currently loaded/selected model, unload it first
    if (id === selectedModelId) {
      if (status === 'loaded') await releaseLlamaRnProvider();
      setProvider(null);
      setStatus('not-downloaded');
    }
    await deleteModel(m);
    setDownloadedModelIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
  }, [selectedModelId, status]);

  const activeModel = findModelById(selectedModelId) ?? DEFAULT_ON_DEVICE_MODEL;

  return (
    <OnDeviceContext.Provider
      value={{
        status,
        downloadProgress,
        errorMessage,
        modelInfo:          activeModel,
        selectedModelId,
        downloadedModelIds,
        provider,
        startDownload,
        cancelDownload,
        loadModel,
        unloadModel,
        deleteLocalModel,
        deleteModelById,
        selectModel,
      }}
    >
      {children}
    </OnDeviceContext.Provider>
  );
}

export function useOnDevice(): OnDeviceContextValue {
  const ctx = useContext(OnDeviceContext);
  if (!ctx) throw new Error('useOnDevice must be used inside OnDeviceProvider');
  return ctx;
}
