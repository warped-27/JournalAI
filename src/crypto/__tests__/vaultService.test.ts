import { createVault, unlockVault, isVaultInitialised } from '../vaultService';
import * as SecureStoreMock from 'expo-secure-store';

jest.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    getItemAsync:    jest.fn(async (key: string) => store[key] ?? null),
    setItemAsync:    jest.fn(async (key: string, v: string) => { store[key] = v; }),
    deleteItemAsync: jest.fn(async (key: string) => { delete store[key]; }),
    __clear:         () => { Object.keys(store).forEach(k => delete store[k]); },
  };
});

jest.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

// Use fast KDF params so tests don't take seconds
jest.mock('../kdf', () => {
  const actual = jest.requireActual('../kdf') as typeof import('../kdf');
  return {
    ...actual,
    KDF_PARAMS: { t: 1, m: 256, p: 1 },
  };
});

beforeEach(() => {
  localStorage.clear();
  (SecureStoreMock as any).__clear();
});

describe('isVaultInitialised', () => {
  it('returns false when no vault exists', async () => {
    expect(await isVaultInitialised()).toBe(false);
  });

  it('returns true after createVault', async () => {
    await createVault('mypassword');
    expect(await isVaultInitialised()).toBe(true);
  });
});

describe('createVault', () => {
  it('returns a 32-byte key', async () => {
    const key = await createVault('mypassword');
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBe(32);
  });

  it('two vaults with same password produce different keys (different salts)', async () => {
    const k1 = await createVault('same');
    (SecureStoreMock as any).__clear();
    const k2 = await createVault('same');
    expect(k1).not.toEqual(k2);
  });
});

describe('unlockVault', () => {
  it('returns Ok with the derived key on correct password', async () => {
    const created = await createVault('correct');
    const result  = await unlockVault('correct');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toEqual(created);
  });

  it('returns Err on wrong password', async () => {
    await createVault('correct');
    const result = await unlockVault('wrong');
    expect(result.ok).toBe(false);
  });

  it('returns Err when no vault exists', async () => {
    const result = await unlockVault('password');
    expect(result.ok).toBe(false);
  });
});
