import { isTauri } from '../platform/detect';
import type { Attachment } from '../notes/Note';
import { newId } from '../lib/id';
import * as DocumentPicker from 'expo-document-picker';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function extToMime(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'pdf':  return 'application/pdf';
    case 'txt':  return 'text/plain';
    case 'md':   return 'text/markdown';
    case 'csv':  return 'text/csv';
    case 'json': return 'application/json';
    default:     return 'application/octet-stream';
  }
}

// ─── Tauri desktop ────────────────────────────────────────────────────────────

async function pickFileTauri(): Promise<Attachment | null> {
  const { open }   = await import('@tauri-apps/plugin-dialog');
  const { invoke } = await import('@tauri-apps/api/core');

  const selected = await open({ multiple: false });
  if (!selected) return null;

  const path = selected as string;
  const bytes: number[] = await invoke('read_file_bytes', { path });
  const uint8 = new Uint8Array(bytes);

  if (uint8.length > MAX_SIZE_BYTES) {
    throw new Error(`File too large (max 5 MB). This file is ~${Math.round(uint8.length / 1024 / 1024)} MB.`);
  }

  const name = path.split(/[\\/]/).pop() ?? 'file';

  return {
    id:        newId(),
    type:      'file',
    createdAt: Date.now(),
    data:      uint8ToBase64(uint8),
    mimeType:  extToMime(name),
    name,
    size:      uint8.length,
  };
}

// ─── Native (iOS / Android) ───────────────────────────────────────────────────

async function pickFileNative(): Promise<Attachment | null> {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];

  if (asset.size && asset.size > MAX_SIZE_BYTES) {
    throw new Error(`File too large (max 5 MB). This file is ~${Math.round(asset.size / 1024 / 1024)} MB.`);
  }

  let base64: string;
  try {
    const response = await fetch(asset.uri);
    const blob     = await response.blob();
    base64 = await blobToBase64(blob);
  } catch {
    throw new Error('Could not read file. Please try again.');
  }

  const sizeBytes = asset.size ?? Math.round(base64.length * 0.75);

  return {
    id:        newId(),
    type:      'file',
    createdAt: Date.now(),
    data:      base64,
    mimeType:  asset.mimeType ?? 'application/octet-stream',
    name:      asset.name,
    size:      sizeBytes,
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function pickFile(): Promise<Attachment | null> {
  if (isTauri()) return pickFileTauri();
  return pickFileNative();
}
