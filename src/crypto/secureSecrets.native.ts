import * as SecureStore from 'expo-secure-store';

/**
 * Native implementation (iOS / Android) — backed by the OS Keychain
 * via expo-secure-store.  Metro automatically picks this file for native
 * builds instead of secureSecrets.ts.
 */

export async function secretGet(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function secretSet(key: string, value: string): Promise<void> {
  return SecureStore.setItemAsync(key, value);
}

export async function secretDelete(key: string): Promise<void> {
  return SecureStore.deleteItemAsync(key);
}
