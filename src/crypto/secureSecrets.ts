import { isTauri } from '../platform/detect';

/**
 * Secure key-value store — web/Tauri variant.
 * Metro automatically selects secureSecrets.native.ts for iOS/Android builds.
 *
 * Priority order:
 *   1. Tauri desktop → OS keychain via Rust `keyring` crate (invoke commands)
 *   2. Web browser  → sessionStorage for plaintext secrets, localStorage for crypto material
 *
 * The web browser path exists only as a developer/fallback surface.
 * The production targets are Tauri (desktop) and EAS native (mobile).
 */

// ─── Tauri — OS keychain via custom Rust commands ───────────────────────────

async function tauriGet(key: string): Promise<string | null> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string | null>('get_secret', { key });
}

async function tauriSet(key: string, value: string): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<void>('set_secret', { key, value });
}

async function tauriDelete(key: string): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<void>('delete_secret', { key });
}

// ─── Browser fallback ────────────────────────────────────────────────────────

// Plaintext secrets use sessionStorage (not persisted across browser sessions)
const SESSION_STORAGE_KEYS = new Set(['nj_gemini_apikey']);

const _sessionStorage: Storage | null = (() => {
  try { return typeof sessionStorage !== 'undefined' ? sessionStorage : null; }
  catch { return null; }
})();

function webGet(key: string): string | null {
  if (SESSION_STORAGE_KEYS.has(key) && _sessionStorage) {
    const val = _sessionStorage.getItem(key);
    if (val !== null) return val;
    // Migrate from localStorage if set by an older version
    const legacy = localStorage.getItem(key);
    if (legacy !== null) {
      _sessionStorage.setItem(key, legacy);
      localStorage.removeItem(key);
      return legacy;
    }
    return null;
  }
  return localStorage.getItem(key);
}

function webSet(key: string, value: string): void {
  const store = (SESSION_STORAGE_KEYS.has(key) && _sessionStorage)
    ? _sessionStorage
    : localStorage;
  store.setItem(key, value);
}

function webDelete(key: string): void {
  if (SESSION_STORAGE_KEYS.has(key) && _sessionStorage) {
    _sessionStorage.removeItem(key);
  }
  localStorage.removeItem(key);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function secretGet(key: string): Promise<string | null> {
  if (isTauri()) return tauriGet(key);
  return webGet(key);
}

export async function secretSet(key: string, value: string): Promise<void> {
  if (isTauri()) return tauriSet(key, value);
  webSet(key, value);
}

export async function secretDelete(key: string): Promise<void> {
  if (isTauri()) return tauriDelete(key);
  webDelete(key);
}
