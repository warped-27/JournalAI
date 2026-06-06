import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { Result } from '../lib/result';
import { err } from '../lib/result';
import { secretGet, secretSet, secretDelete } from '../crypto/secureSecrets';
import { askAi } from './aiService';

const AI_APIKEY_KEY  = 'nj_gemini_apikey';
const AI_CONSENT_KEY = 'nj_gemini_consent';
const AI_MODEL_KEY   = 'nj_gemini_model';

export const GEMINI_MODELS = [
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite (default)' },
  { id: 'gemini-2.0-flash',      label: 'Gemini 2.0 Flash' },
  { id: 'gemini-1.5-flash',      label: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-flash-8b',   label: 'Gemini 1.5 Flash 8B (lightest)' },
] as const;

export const DEFAULT_MODEL = GEMINI_MODELS[0].id;

interface AiContextValue {
  apiKey: string | null;
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => Promise<void>;
  model: string;
  setModel: (model: string) => Promise<void>;
  hasConsented: boolean;
  giveConsent: () => Promise<void>;
  pendingConsent: boolean;
  requestWithConsent: (
    noteContent: string,
    instruction: string,
  ) => Promise<Result<string, Error>>;
  isLoading: boolean;
}

const AiContext = createContext<AiContextValue | null>(null);

export function AiProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState]   = useState<string | null>(null);
  const [model,  setModelState]    = useState<string>(DEFAULT_MODEL);
  const [hasConsented, setHasConsented] = useState(false);
  const [pendingConsent, setPendingConsent] = useState(false);
  const [isLoading, setIsLoading]  = useState(false);

  const pendingCallRef = useRef<{
    noteContent: string;
    instruction: string;
    resolve: (r: Result<string, Error>) => void;
  } | null>(null);

  const loadSettings = useCallback(async () => {
    const key     = await secretGet(AI_APIKEY_KEY);
    const consent = await secretGet(AI_CONSENT_KEY);
    const saved   = await secretGet(AI_MODEL_KEY);
    setApiKeyState(key);
    setHasConsented(consent === '1');
    if (saved) setModelState(saved);
  }, []);

  React.useEffect(() => { void loadSettings(); }, [loadSettings]);

  const setApiKey = useCallback(async (key: string) => {
    await secretSet(AI_APIKEY_KEY, key.trim());
    setApiKeyState(key.trim() || null);
  }, []);

  const clearApiKey = useCallback(async () => {
    await secretDelete(AI_APIKEY_KEY);
    setApiKeyState(null);
  }, []);

  const setModel = useCallback(async (m: string) => {
    await secretSet(AI_MODEL_KEY, m);
    setModelState(m);
  }, []);

  const giveConsent = useCallback(async () => {
    await secretSet(AI_CONSENT_KEY, '1');
    setHasConsented(true);
    setPendingConsent(false);

    const pending = pendingCallRef.current;
    if (pending && apiKey) {
      pendingCallRef.current = null;
      setIsLoading(true);
      const result = await askAi({
        noteContent: pending.noteContent,
        instruction: pending.instruction,
        apiKey,
        model,
      });
      setIsLoading(false);
      pending.resolve(result);
    }
  }, [apiKey, model]);

  const requestWithConsent = useCallback(
    (noteContent: string, instruction: string): Promise<Result<string, Error>> => {
      if (!apiKey) return Promise.resolve(err(new Error('No API key configured')));

      if (!hasConsented) {
        return new Promise((resolve) => {
          pendingCallRef.current = { noteContent, instruction, resolve };
          setPendingConsent(true);
        });
      }

      setIsLoading(true);
      return askAi({ noteContent, instruction, apiKey, model }).finally(() =>
        setIsLoading(false),
      );
    },
    [apiKey, hasConsented, model],
  );

  return (
    <AiContext.Provider
      value={{
        apiKey,
        setApiKey,
        clearApiKey,
        model,
        setModel,
        hasConsented,
        giveConsent,
        pendingConsent,
        requestWithConsent,
        isLoading,
      }}
    >
      {children}
    </AiContext.Provider>
  );
}

export function useAi(): AiContextValue {
  const ctx = useContext(AiContext);
  if (!ctx) throw new Error('useAi must be used inside AiProvider');
  return ctx;
}
