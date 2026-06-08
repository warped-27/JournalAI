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
import { DEFAULT_WHISPER_MODEL } from './whisperModelInfo';
import {
  isModelDownloaded,
  startModelDownload,
  deleteModel,
  getModelPath,
} from '../onDevice/modelManager';
import {
  WHISPER_RN_AVAILABLE,
  initWhisperModel,
  transcribeWithWhisper,
  releaseWhisperModel,
} from './whisperTranscribe';

export type WhisperStatus =
  | 'unavailable'      // not native (web/Tauri) or whisper.rn not built
  | 'not-downloaded'
  | 'downloading'
  | 'download-error'
  | 'ready'            // file present, model not loaded
  | 'loading'
  | 'loaded'
  | 'error';

interface WhisperContextValue {
  status:           WhisperStatus;
  downloadProgress: number;
  errorMessage:     string | null;
  /** Transcribe an audio file. Returns null if model not loaded. */
  transcribe:       (audioPath: string) => Promise<string | null>;
  startDownload:    () => Promise<void>;
  cancelDownload:   () => Promise<void>;
  loadModel:        () => Promise<void>;
  unloadModel:      () => Promise<void>;
  deleteLocalModel: () => Promise<void>;
}

const WhisperContext = createContext<WhisperContextValue | null>(null);

export function WhisperProvider({ children }: { children: ReactNode }) {
  const model = DEFAULT_WHISPER_MODEL;
  const [status,           setStatus]           = useState<WhisperStatus>('not-downloaded');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMessage,     setErrorMessage]     = useState<string | null>(null);
  const downloadHandleRef = useRef<{ cancel: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (!isNativePlatform() || !WHISPER_RN_AVAILABLE) {
      setStatus('unavailable');
      return;
    }
    isModelDownloaded(model)
      .then((exists) => setStatus(exists ? 'ready' : 'not-downloaded'))
      .catch(() => setStatus('not-downloaded'));
  }, []);

  const startDownload = useCallback(async () => {
    if (!isNativePlatform()) return;
    setStatus('downloading');
    setDownloadProgress(0);
    setErrorMessage(null);
    try {
      const { cancel, completion } = startModelDownload(model, setDownloadProgress);
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
    await downloadHandleRef.current?.cancel();
    downloadHandleRef.current = null;
    setStatus('not-downloaded');
    setDownloadProgress(0);
  }, []);

  const loadModel = useCallback(async () => {
    if (!isNativePlatform()) return;
    setStatus('loading');
    setErrorMessage(null);
    const ok = await initWhisperModel(getModelPath(model));
    if (ok) {
      setStatus('loaded');
    } else {
      setErrorMessage('Failed to load Whisper model');
      setStatus('error');
    }
  }, [model]);

  const unloadModel = useCallback(async () => {
    await releaseWhisperModel();
    setStatus('ready');
  }, []);

  const deleteLocalModel = useCallback(async () => {
    if (!isNativePlatform()) return;
    if (status === 'loaded') await releaseWhisperModel();
    await deleteModel(model);
    setStatus('not-downloaded');
  }, [model, status]);

  const transcribe = useCallback(async (audioPath: string): Promise<string | null> => {
    if (status !== 'loaded') return null;
    return transcribeWithWhisper(audioPath);
  }, [status]);

  return (
    <WhisperContext.Provider value={{
      status, downloadProgress, errorMessage,
      transcribe,
      startDownload, cancelDownload,
      loadModel, unloadModel, deleteLocalModel,
    }}>
      {children}
    </WhisperContext.Provider>
  );
}

export function useWhisper(): WhisperContextValue {
  const ctx = useContext(WhisperContext);
  if (!ctx) throw new Error('useWhisper must be used inside WhisperProvider');
  return ctx;
}
