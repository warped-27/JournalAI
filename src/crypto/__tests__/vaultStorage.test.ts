import { loadSalt, saveSalt, loadVerifier, saveVerifier, clearVault } from '../vaultStorage';
import { KDF_SALT_BYTES } from '../kdf';
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

beforeEach(() => {
  localStorage.clear();
  (SecureStoreMock as any).__clear();
});

describe('vaultStorage', () => {
  it('loadSalt returns null when nothing stored', async () => {
    expect(await loadSalt()).toBeNull();
  });

  it('saveSalt / loadSalt round-trip', async () => {
    const salt = new Uint8Array(KDF_SALT_BYTES).fill(0xaa);
    await saveSalt(salt);
    const loaded = await loadSalt();
    expect(loaded).toEqual(salt);
  });

  it('loadVerifier returns null when nothing stored', async () => {
    expect(await loadVerifier()).toBeNull();
  });

  it('saveVerifier / loadVerifier round-trip', async () => {
    await saveVerifier('AAABBBCCC==envelope');
    expect(await loadVerifier()).toBe('AAABBBCCC==envelope');
  });

  it('clearVault removes both salt and verifier', async () => {
    const salt = new Uint8Array(KDF_SALT_BYTES).fill(1);
    await saveSalt(salt);
    await saveVerifier('some-verifier');
    await clearVault();
    expect(await loadSalt()).toBeNull();
    expect(await loadVerifier()).toBeNull();
  });
});
