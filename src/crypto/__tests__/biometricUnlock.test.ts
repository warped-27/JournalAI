/**
 * Tests for biometricUnlock.ts (web/Tauri stub).
 * The native implementation is tested on-device via EAS.
 */

import {
  isBiometricsAvailable,
  storeBiometricKey,
  retrieveBiometricKey,
  deleteBiometricKey,
} from '../biometricUnlock';

describe('biometricUnlock (web stub)', () => {
  it('reports biometrics as unavailable', async () => {
    expect(await isBiometricsAvailable()).toBe(false);
  });

  it('storeBiometricKey is a no-op', async () => {
    await expect(storeBiometricKey(new Uint8Array(32))).resolves.toBeUndefined();
  });

  it('retrieveBiometricKey always returns null', async () => {
    expect(await retrieveBiometricKey()).toBeNull();
  });

  it('deleteBiometricKey is a no-op', async () => {
    await expect(deleteBiometricKey()).resolves.toBeUndefined();
  });
});
