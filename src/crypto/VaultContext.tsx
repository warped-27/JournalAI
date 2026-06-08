import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { createVault, unlockVault, isVaultInitialised } from './vaultService';
import { clearVault } from './vaultStorage';
import { secretGet, secretSet, secretDelete } from './secureSecrets';
import {
  isBiometricsAvailable,
  storeBiometricKey,
  retrieveBiometricKey,
  deleteBiometricKey,
} from './biometricUnlock';
import { type Result, ok, err } from '../lib/result';

const AUTO_LOCK_MS = 2 * 60 * 1000; // 2 minutes in background
const BIOMETRIC_ENABLED_KEY = 'nj_biometric_enabled';

interface VaultState {
  /** true while the vault is unlocked (key is in RAM) */
  isUnlocked: boolean;
  /** true if a vault has been created on this device */
  isInitialised: boolean | null; // null = not yet checked
  /** true if the device has enrolled biometrics (FaceID / Fingerprint) */
  biometricAvailable: boolean;
  /** true if the user has enabled biometric unlock */
  biometricEnabled: boolean;
}

interface VaultActions {
  create:  (password: string) => Promise<Result<void>>;
  unlock:  (password: string) => Promise<Result<void>>;
  /** Retrieve vault key via OS biometric prompt. Returns err if user cancels or biometrics fail. */
  unlockWithBiometrics: () => Promise<Result<void>>;
  lock:    () => void;
  wipe:    () => Promise<void>;
  /** Store vault key in secure enclave and enable biometric unlock. Requires vault to be unlocked. */
  enableBiometrics:  () => Promise<void>;
  /** Remove stored key from secure enclave and disable biometric unlock. */
  disableBiometrics: () => Promise<void>;
  /** Exposed for encrypting/decrypting notes — undefined when locked */
  getKey: () => Uint8Array | undefined;
}

const VaultContext = createContext<(VaultState & VaultActions) | undefined>(undefined);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const keyRef               = useRef<Uint8Array | undefined>(undefined);
  const bgTimerRef           = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isUnlocked, setIsUnlocked]         = useState(false);
  const [isInitialised, setIsInitialised]   = useState<boolean | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled,   setBiometricEnabled]   = useState(false);

  // Check vault state and biometric availability on mount
  useEffect(() => {
    isVaultInitialised().then(setIsInitialised);
    isBiometricsAvailable().then(setBiometricAvailable);
    secretGet(BIOMETRIC_ENABLED_KEY).then((v) => setBiometricEnabled(v === 'true'));
  }, []);

  // Auto-lock when the app goes to background for > AUTO_LOCK_MS
  useEffect(() => {
    const handler = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        bgTimerRef.current = setTimeout(lock, AUTO_LOCK_MS);
      } else if (nextState === 'active') {
        if (bgTimerRef.current !== undefined) {
          clearTimeout(bgTimerRef.current);
          bgTimerRef.current = undefined;
        }
      }
    };
    const sub = AppState.addEventListener('change', handler);
    return () => {
      sub.remove();
      if (bgTimerRef.current !== undefined) clearTimeout(bgTimerRef.current);
    };
  }, []);

  const lock = useCallback(() => {
    if (keyRef.current) {
      keyRef.current.fill(0); // zero the key bytes before GC
      keyRef.current = undefined;
    }
    setIsUnlocked(false);
  }, []);

  const create = useCallback(async (password: string): Promise<Result<void>> => {
    try {
      const key = await createVault(password);
      keyRef.current = key;
      setIsInitialised(true);
      setIsUnlocked(true);
      return ok(undefined);
    } catch (e) {
      return err(e instanceof Error ? e.message : 'createVault failed');
    }
  }, []);

  const unlock = useCallback(async (password: string): Promise<Result<void>> => {
    const result = await unlockVault(password);
    if (!result.ok) return result;
    keyRef.current = result.value;
    setIsUnlocked(true);
    return ok(undefined);
  }, []);

  const unlockWithBiometrics = useCallback(async (): Promise<Result<void>> => {
    const key = await retrieveBiometricKey();
    if (!key) return err('Biometric unlock cancelled or unavailable.');
    keyRef.current = key;
    setIsUnlocked(true);
    return ok(undefined);
  }, []);

  const enableBiometrics = useCallback(async () => {
    if (!keyRef.current) return;
    await storeBiometricKey(keyRef.current);
    await secretSet(BIOMETRIC_ENABLED_KEY, 'true');
    setBiometricEnabled(true);
  }, []);

  const disableBiometrics = useCallback(async () => {
    await deleteBiometricKey();
    await secretDelete(BIOMETRIC_ENABLED_KEY);
    setBiometricEnabled(false);
  }, []);

  const wipe = useCallback(async () => {
    await disableBiometrics();
    lock();
    await clearVault();
    setIsInitialised(false);
  }, [lock, disableBiometrics]);

  const getKey = useCallback(() => keyRef.current, []);

  return (
    <VaultContext.Provider value={{
      isUnlocked, isInitialised,
      biometricAvailable, biometricEnabled,
      create, unlock, unlockWithBiometrics,
      lock, wipe,
      enableBiometrics, disableBiometrics,
      getKey,
    }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used inside <VaultProvider>');
  return ctx;
}
