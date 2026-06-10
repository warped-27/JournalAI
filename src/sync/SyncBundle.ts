import type { NoteRow } from '../notes/Note';

/**
 * An attachment's binary payload, encrypted with the vault key and stored
 * separately from the note envelope so large blobs don't inflate the main bundle.
 * Sync providers upload these as individual files alongside the bundle.
 */
export interface AttachmentBlob {
  id:       string;   // matches Attachment.id inside the decrypted Note
  noteId:   string;   // owning note
  mimeType: string;
  size:     number;   // unencrypted byte count
  envelope: string;   // base64url AES-256-GCM encrypted data (vault key)
}

export interface SyncBundle {
  version:    1;
  salt:       string;      // base64url, 16 bytes — KDF salt for this vault
  notes:      NoteRow[];   // already-encrypted envelopes, safe to transfer
  exportedAt: number;      // unix ms
  deviceId:   string;
  // Optional delta / attachment fields (ignored by older clients)
  isFull?:    boolean;     // true = all notes, false = delta (notes since `since`)
  since?:     number;      // unix ms cutoff used when isFull === false
  blobs?:     AttachmentBlob[];  // separately-encrypted attachment payloads
}

export function serializeBundle(bundle: SyncBundle): string {
  return JSON.stringify(bundle);
}

const MAX_BUNDLE_BYTES = 512 * 1024 * 1024; // 512 MB
const MAX_NOTES_COUNT  = 100_000;

export function parseBundle(raw: string): SyncBundle {
  if (raw.length > MAX_BUNDLE_BYTES) {
    throw new Error('Sync bundle exceeds maximum allowed size (512 MB)');
  }

  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch { throw new Error('Sync bundle is not valid JSON'); }

  if (
    typeof parsed !== 'object' || parsed === null ||
    (parsed as Record<string, unknown>)['version'] !== 1 ||
    typeof (parsed as Record<string, unknown>)['salt'] !== 'string' ||
    !Array.isArray((parsed as Record<string, unknown>)['notes']) ||
    typeof (parsed as Record<string, unknown>)['exportedAt'] !== 'number' ||
    typeof (parsed as Record<string, unknown>)['deviceId'] !== 'string'
  ) {
    throw new Error('Invalid sync bundle format');
  }

  const notes = (parsed as Record<string, unknown>)['notes'] as unknown[];
  if (notes.length > MAX_NOTES_COUNT) {
    throw new Error(`Sync bundle contains too many notes (max ${MAX_NOTES_COUNT.toLocaleString()})`);
  }

  return parsed as SyncBundle;
}
