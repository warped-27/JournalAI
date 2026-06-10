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
import { DEFAULT_ON_DEVICE_MODEL, type ModelInfo } from './modelInfo';
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
import type { AiProvider } from '../providers/types';

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
  status:           OnDeviceStatus;
  downloadProgress: number;          // 0–1 during download
  errorMessage:     string | null;
  modelInfo:        ModelInfo;
  provider:         AiProvider | null;
  startDownload:    () => Promise<void>;
  cancelDownload:   () => Promise<void>;
  loadModel:        () => Promise<void>;
  unloadModel:      () => Promise<void>;
  deleteLocalModel: () => Promise<void>;
}

const OnDeviceContext = createContext<OnDeviceContextValue | null>(null);

export function OnDeviceProvider({ children }: { children: ReactNode }) {
  const model = DEFAULT_ON_DEVICE_MODEL;
  const [status,           setStatus]           = useState<OnDeviceStatus>('not-downloaded');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMessage,     setErrorMessage]     = useState<string | null>(null);
  const [provider,         setProvider]         = useState<AiProvider | null>(null);
  const downloadHandleRef = useRef<{ cancel: () => Promise<void> } | null>(null);

  // ── Initial availability check ─────────────────────────────────────────────
  useEffect(() => {
    if (!isNativePlatform() || !LLAMA_RN_AVAILABLE) {
      setStatus('unavailable'); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    isModelDownloaded(model)
      .then((exists) => setStatus(exists ? 'ready' : 'not-downloaded'))
      .catch(() => setStatus('not-downloaded'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Download ───────────────────────────────────────────────────────────────
  const startDownload = useCallback(async () => {
    if (!isNativePlatform()) return;
    setStatus('downloading');
    setDownloadProgress(0);
    setErrorMessage(null);
    try {
      const { cancel, completion } = startModelDownload(model, (fraction) => {
        setDownloadProgress(fraction);
      });
      downloadHandleRef.current = { cancel };
      await completion;
      downloadHandleRef.current = null;
      setStatus('ready');
    } catch (e) {
      downloadHandleRef.current = null;
      setErrorMessage(e instanceof Error ? e.message : 'Download failed');
      setStatus('download-error');
    }
  }, [model]);

  const cancelDownload = useCallback(async () => {
    const handle = downloadHandleRef.current;
    if (handle) {
      await handle.cancel();
      downloadHandleRef.current = null;
    }
    setStatus('not-downloaded');
    setDownloadProgress(0);
  }, []);

  // ── Load / unload ──────────────────────────────────────────────────────────
  const loadModel = useCallback(async () => {
    if (!isNativePlatform()) return;
    setStatus('loading');
    setErrorMessage(null);
    try {
      const p = await initLlamaRnProvider(
        getModelPath(model),
        (progress) => {
          // initLlama reports 0–100 progress while loading weights
          setDownloadProgress(progress / 100);
        },
      );
      setProvider(p);
      setStatus('loaded');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Failed to load model');
      setStatus('error');
    }
  }, [model]);

  const unloadModel = useCallback(async () => {
    await releaseLlamaRnProvider();
    setProvider(null);
    setStatus('ready');
  }, []);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteLocalModel = useCallback(async () => {
    if (!isNativePlatform()) return;
    if (status === 'loaded') await releaseLlamaRnProvider();
    setProvider(null);
    await deleteModel(model);
    setStatus('not-downloaded');
  }, [model, status]);

  return (
    <OnDeviceContext.Provider
      value={{
        status,
        downloadProgress,
        errorMessage,
        modelInfo:     model,
        provider,
        startDownload,
        cancelDownload,
        loadModel,
        unloadModel,
        deleteLocalModel,
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
