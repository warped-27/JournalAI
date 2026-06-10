export async function isBiometricsAvailable(): Promise<boolean> { return false; }
export async function storeBiometricKey(_key: Uint8Array): Promise<void> {}
export async function retrieveBiometricKey(): Promise<Uint8Array | null> { return null; }
export async function deleteBiometricKey(): Promise<void> {}
