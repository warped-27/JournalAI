import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { VaultProvider, useVault } from '../VaultContext';
import type { Result } from '../../lib/result';
import * as SecureStoreMock from 'expo-secure-store';
import * as biometric from '../biometricUnlock';

type UnlockResult = Result<void>;

jest.mock('../biometricUnlock', () => ({
  isBiometricsAvailable: jest.fn().mockResolvedValue(false),
  storeBiometricKey:     jest.fn().mockResolvedValue(undefined),
  retrieveBiometricKey:  jest.fn().mockResolvedValue(null),
  deleteBiometricKey:    jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    getItemAsync:                  jest.fn(async (key: string) => store[key] ?? null),
    setItemAsync:                  jest.fn(async (key: string, v: string) => { store[key] = v; }),
    deleteItemAsync:               jest.fn(async (key: string) => { delete store[key]; }),
    canUseBiometricAuthentication: jest.fn(() => false),
    WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 1,
    __clear:                       () => { Object.keys(store).forEach(k => delete store[k]); },
  };
});

jest.mock('react-native', () => ({
  Platform:  { OS: 'web' },
  AppState:  { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));

jest.mock('../biometricUnlock', () => ({
  isBiometricsAvailable: jest.fn(async () => true),
  storeBiometricKey:     jest.fn(async () => {}),
  retrieveBiometricKey:  jest.fn(async () => new Uint8Array(32).fill(7)),
  deleteBiometricKey:    jest.fn(async () => {}),
}));

jest.mock('../kdf', () => {
  const actual = jest.requireActual('../kdf') as typeof import('../kdf');
  return { ...actual, KDF_PARAMS: { t: 1, m: 256, p: 1 } };
});

beforeEach(() => {
  localStorage.clear();
  (SecureStoreMock as any).__clear();
});

// ---------- helpers ----------

type VaultSnapshot = ReturnType<typeof useVault>;
let captured: VaultSnapshot | undefined;

function Probe() {
  captured = useVault(); // eslint-disable-line react-hooks/globals
  return null;
}

function makeTree() {
  let renderer!: TestRenderer.ReactTestRenderer;
  act(() => {
    renderer = TestRenderer.create(
      <VaultProvider><Probe /></VaultProvider>
    );
  });
  // flush initial useEffect (isVaultInitialised check)
  return renderer;
}

// ---------- tests ----------

describe('VaultContext', () => {
  it('starts locked and uninitialised', async () => {
    makeTree();
    // wait for the async isVaultInitialised check
    await act(async () => {});
    expect(captured!.isUnlocked).toBe(false);
    expect(captured!.isInitialised).toBe(false);
    expect(captured!.getKey()).toBeUndefined();
  });

  it('create → vault is initialised and unlocked', async () => {
    makeTree();
    await act(async () => {});

    await act(async () => { await captured!.create('mypassword'); });

    expect(captured!.isInitialised).toBe(true);
    expect(captured!.isUnlocked).toBe(true);
    expect(captured!.getKey()).toBeInstanceOf(Uint8Array);
  });

  it('lock → vault is locked, key is gone', async () => {
    makeTree();
    await act(async () => {});
    await act(async () => { await captured!.create('mypassword'); });

    act(() => captured!.lock());

    expect(captured!.isUnlocked).toBe(false);
    expect(captured!.getKey()).toBeUndefined();
  });

  it('unlock with correct password succeeds', async () => {
    makeTree();
    await act(async () => {});
    await act(async () => { await captured!.create('mypassword'); });
    act(() => captured!.lock());

    let res!: UnlockResult;
    await act(async () => { res = await captured!.unlock('mypassword'); });
    expect(res.ok).toBe(true);
    expect(captured!.isUnlocked).toBe(true);
  });

  it('unlock with wrong password fails', async () => {
    makeTree();
    await act(async () => {});
    await act(async () => { await captured!.create('mypassword'); });
    act(() => captured!.lock());

    let res!: UnlockResult;
    await act(async () => { res = await captured!.unlock('wrongpass'); });
    expect(res.ok).toBe(false);
    expect(captured!.isUnlocked).toBe(false);
  });

  it('wipe → not initialised and locked', async () => {
    makeTree();
    await act(async () => {});
    await act(async () => { await captured!.create('mypassword'); });
    await act(async () => { await captured!.wipe(); });

    expect(captured!.isInitialised).toBe(false);
    expect(captured!.isUnlocked).toBe(false);
  });

  it('biometricAvailable reflects isBiometricsAvailable()', async () => {
    makeTree();
    await act(async () => {});
    expect(captured!.biometricAvailable).toBe(true);
  });

  it('unlockWithBiometrics succeeds when key is returned', async () => {
    makeTree();
    await act(async () => {});

    let res!: Result<void>;
    await act(async () => { res = await captured!.unlockWithBiometrics(); });

    expect(res.ok).toBe(true);
    expect(captured!.isUnlocked).toBe(true);
    expect(captured!.getKey()).toBeInstanceOf(Uint8Array);
  });

  it('unlockWithBiometrics fails when retrieveBiometricKey returns null', async () => {
    jest.mocked(biometric.retrieveBiometricKey).mockResolvedValueOnce(null);

    makeTree();
    await act(async () => {});

    let res!: Result<void>;
    await act(async () => { res = await captured!.unlockWithBiometrics(); });

    expect(res.ok).toBe(false);
    expect(captured!.isUnlocked).toBe(false);
  });

  it('enableBiometrics stores key and sets biometricEnabled', async () => {
    makeTree();
    await act(async () => {});
    await act(async () => { await captured!.create('mypassword'); });

    await act(async () => { await captured!.enableBiometrics(); });

    expect(biometric.storeBiometricKey).toHaveBeenCalled();
    expect(captured!.biometricEnabled).toBe(true);
  });

  it('disableBiometrics removes key and clears biometricEnabled', async () => {
    makeTree();
    await act(async () => {});
    await act(async () => { await captured!.create('mypassword'); });
    await act(async () => { await captured!.enableBiometrics(); });
    await act(async () => { await captured!.disableBiometrics(); });

    expect(biometric.deleteBiometricKey).toHaveBeenCalled();
    expect(captured!.biometricEnabled).toBe(false);
  });
});
