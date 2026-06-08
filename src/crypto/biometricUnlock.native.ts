import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { toBase64url, fromBase64url } from './encoding';

const STORE_KEY = 'nj_biometric_vault_key';

export async function isBiometricsAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

export async function storeBiometricKey(key: Uint8Array): Promise<void> {
  await SecureStore.setItemAsync(STORE_KEY, toBase64url(key), {
    requireAuthentication: true,
    authenticationPrompt: 'Confirm identity to enable biometric unlock',
  });
}

export async function retrieveBiometricKey(): Promise<Uint8Array | null> {
  try {
    const b64 = await SecureStore.getItemAsync(STORE_KEY, {
      requireAuthentication: true,
      authenticationPrompt: 'Unlock NERD_JOURNAL_',
    });
    return b64 ? fromBase64url(b64) : null;
  } catch {
    // User cancelled, biometrics changed, or key invalidated
    return null;
  }
}

export async function deleteBiometricKey(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORE_KEY);
  } catch {
    // key may not exist
  }
}
