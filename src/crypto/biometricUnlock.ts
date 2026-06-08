/**
 * Biometric unlock — web/Tauri stub.
 * Metro selects biometricUnlock.native.ts for iOS/Android builds.
 * Biometrics require OS secure enclave — not available in browser or Tauri WebView.
 */

export async function isBiometricsAvailable(): Promise<boolean> {
  return false;
}

export async function storeBiometricKey(_key: Uint8Array): Promise<void> {}

export async function retrieveBiometricKey(): Promise<Uint8Array | null> {
  return null;
}

export async function deleteBiometricKey(): Promise<void> {}
