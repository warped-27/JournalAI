/**
 * jest-expo resolves secureSecrets.native.ts (expo-secure-store path),
 * so these tests exercise that path with an in-memory mock.
 */
import { secretGet, secretSet, secretDelete } from '../secureSecrets';
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

beforeEach(() => {
  (SecureStoreMock as any).__clear();
});

describe('secureSecrets (native / expo-secure-store path)', () => {
  it('returns null for unknown key', async () => {
    expect(await secretGet('missing')).toBeNull();
  });

  it('stores and retrieves a value', async () => {
    await secretSet('k', 'value123');
    expect(await secretGet('k')).toBe('value123');
  });

  it('overwrites an existing value', async () => {
    await secretSet('k', 'first');
    await secretSet('k', 'second');
    expect(await secretGet('k')).toBe('second');
  });

  it('deletes a key', async () => {
    await secretSet('k', 'v');
    await secretDelete('k');
    expect(await secretGet('k')).toBeNull();
  });
});
