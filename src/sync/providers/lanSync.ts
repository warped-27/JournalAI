import type { SyncBundle } from '../SyncBundle';
import { parseBundle, serializeBundle } from '../SyncBundle';
import type { ConflictInfo } from '../syncRepository';

// ── Shared types ──────────────────────────────────────────────────────────────

export interface LanSyncInfo {
  ip:   string;
  port: number;
  pin:  string;
  url:  string;  // njlan://<ip>:<port>?pin=<PIN>
}

export interface LanSyncTarget {
  host: string;
  port: number;
  pin:  string;
}

// ── URL helpers ───────────────────────────────────────────────────────────────

// Reject any host that is not a RFC-1918 / loopback address to prevent SSRF.
const PRIVATE_HOST_RE =
  /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|localhost|::1)$/;

export function parseLanUrl(url: string): LanSyncTarget {
  const normalized = url.replace(/^njlan:\/\//, 'http://');
  const u = new URL(normalized);
  const pin = u.searchParams.get('pin') ?? '';
  if (!pin) throw new Error('LAN sync URL missing PIN');
  if (!PRIVATE_HOST_RE.test(u.hostname))
    throw new Error('LAN sync URL must use a local network address');
  const port = parseInt(u.port, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('LAN sync URL has invalid port');
  return { host: u.hostname, port, pin };
}

// ── Desktop (Tauri) — server control via IPC ──────────────────────────────────
// Lazy-imported so the @tauri-apps/api bundle is excluded on native builds.

export async function startLanServer(bundleJson: string): Promise<LanSyncInfo> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<LanSyncInfo>('lan_sync_start', { bundleJson });
}

export async function getLanSyncResult(): Promise<string | null> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string | null>('lan_sync_status');
}

export async function stopLanServer(): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<void>('lan_sync_stop');
}

// ── Mobile — HTTP client that talks to the desktop server ─────────────────────

export async function mobileSync(
  target:       LanSyncTarget,
  exportBundle: () => Promise<SyncBundle>,
  importBundle: (b: SyncBundle) => Promise<{ imported: number; conflicts: ConflictInfo[] }>,
): Promise<{ imported: number; conflicts: ConflictInfo[] }> {
  const { host, port, pin } = target;
  const base = `http://${host}:${port}`;

  // 1. Pull desktop bundle
  const getRes = await fetch(`${base}/bundle`, {
    headers: { 'X-Lan-Pin': pin },
    signal:  AbortSignal.timeout(30_000),
  });
  if (!getRes.ok) throw new Error(`LAN sync: server returned ${getRes.status}`);
  const desktopBundle = parseBundle(await getRes.text());

  // 2. Merge into local DB
  const mergeResult = await importBundle(desktopBundle);

  // 3. Export merged state
  const merged = await exportBundle();

  // 4. Push merged bundle back to desktop
  const putRes = await fetch(`${base}/bundle`, {
    method:  'PUT',
    headers: { 'X-Lan-Pin': pin, 'Content-Type': 'application/json' },
    body:    serializeBundle(merged),
    signal:  AbortSignal.timeout(30_000),
  });
  if (!putRes.ok) throw new Error(`LAN sync: PUT returned ${putRes.status}`);

  return mergeResult;
}
