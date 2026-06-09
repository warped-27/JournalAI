import type { SyncBundle } from '../SyncBundle';
import { serializeBundle, parseBundle } from '../SyncBundle';
import { assertSafeUrl } from '../../lib/urlValidation';

export interface WebDavConfig {
  url:      string;   // base URL, e.g. https://cloud.example.com/dav/files/user
  username: string;
  password: string;
}

export interface WebDavPullResult {
  bundle: SyncBundle;
  etag:   string | null;
}

const BUNDLE_FILENAME = 'nerd_journal_.njvault';
const BLOBS_DIR       = 'nerd_journal_blobs';

function bundleUrl(config: WebDavConfig): string {
  return `${config.url.replace(/\/+$/, '')}/${BUNDLE_FILENAME}`;
}

function blobDirUrl(config: WebDavConfig): string {
  return `${config.url.replace(/\/+$/, '')}/${BLOBS_DIR}`;
}

function blobUrl(config: WebDavConfig, blobId: string): string {
  return `${blobDirUrl(config)}/${encodeURIComponent(blobId)}.njblob`;
}

function basicAuth(username: string, password: string): string {
  return 'Basic ' + btoa(`${username}:${password}`);
}

export async function webdavPush(config: WebDavConfig, bundle: SyncBundle): Promise<void> {
  assertSafeUrl(config.url);
  const res = await fetch(bundleUrl(config), {
    method:  'PUT',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': basicAuth(config.username, config.password),
    },
    body: serializeBundle(bundle),
  });
  if (!res.ok) throw new Error(`WebDAV PUT failed: ${res.status} ${res.statusText}`);
}

/**
 * Pull the remote bundle.
 * - Pass `ifNoneMatchEtag` (previously stored) to skip download when server hasn't changed.
 * - Returns `null` for 404 (no bundle yet) or 304 (not modified).
 * - Returns `{ bundle, etag }` on success; `etag` may be null if server doesn't provide one.
 */
export async function webdavPull(
  config:           WebDavConfig,
  ifNoneMatchEtag?: string | null,
): Promise<WebDavPullResult | null> {
  assertSafeUrl(config.url);
  const headers: Record<string, string> = {
    'Authorization': basicAuth(config.username, config.password),
  };
  if (ifNoneMatchEtag) headers['If-None-Match'] = ifNoneMatchEtag;

  const res = await fetch(bundleUrl(config), { method: 'GET', headers });

  if (res.status === 304) return null;  // not modified — caller can skip merge
  if (res.status === 404) return null;  // no bundle on server yet
  if (!res.ok) throw new Error(`WebDAV GET failed: ${res.status} ${res.statusText}`);

  const text = await res.text();
  const etag = res.headers.get('ETag');
  return { bundle: parseBundle(text), etag };
}

/**
 * Upload a single attachment blob (encrypted envelope) to the blobs directory.
 * MKCOL is attempted first (best-effort); servers that already have the dir return 405/409 which is fine.
 */
export async function webdavPushBlob(
  config: WebDavConfig,
  blobId: string,
  envelope: string,
): Promise<void> {
  assertSafeUrl(config.url);
  const auth = basicAuth(config.username, config.password);

  // Ensure the blobs directory exists — ignore failures (dir may already exist)
  await fetch(blobDirUrl(config), {
    method:  'MKCOL',
    headers: { 'Authorization': auth },
  }).catch(() => {});

  const res = await fetch(blobUrl(config, blobId), {
    method:  'PUT',
    headers: { 'Content-Type': 'application/octet-stream', 'Authorization': auth },
    body:    envelope,
  });
  if (!res.ok) throw new Error(`Blob PUT failed: ${res.status} ${res.statusText}`);
}

/**
 * Download a single attachment blob envelope.
 * Returns null if the blob doesn't exist on the server.
 */
export async function webdavPullBlob(
  config: WebDavConfig,
  blobId: string,
): Promise<string | null> {
  assertSafeUrl(config.url);
  const res = await fetch(blobUrl(config, blobId), {
    method:  'GET',
    headers: { 'Authorization': basicAuth(config.username, config.password) },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Blob GET failed: ${res.status} ${res.statusText}`);
  return res.text();
}

export async function testWebDavConnection(config: WebDavConfig): Promise<void> {
  assertSafeUrl(config.url);
  // PROPFIND on the root to verify credentials and reachability
  const res = await fetch(config.url.replace(/\/+$/, ''), {
    method:  'PROPFIND',
    headers: {
      'Authorization': basicAuth(config.username, config.password),
      'Depth': '0',
    },
  });
  // 207 = Multi-Status (WebDAV success), 200 also acceptable
  if (res.status !== 207 && res.status !== 200) {
    throw new Error(`Connection failed: ${res.status} ${res.statusText}`);
  }
}
