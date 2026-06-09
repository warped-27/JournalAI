import { isTauri } from '../platform/detect';
import type { Attachment } from '../notes/Note';
import { newId } from '../lib/id';
import * as ImagePicker from 'expo-image-picker';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'heif', 'bmp', 'tiff'];

function extToMime(ext: string): string {
  switch (ext.toLowerCase()) {
    case 'png':  return 'image/png';
    case 'gif':  return 'image/gif';
    case 'webp': return 'image/webp';
    case 'bmp':  return 'image/bmp';
    default:     return 'image/jpeg';
  }
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

// ─── Tauri desktop ────────────────────────────────────────────────────────────

async function pickImageTauri(): Promise<Attachment | null> {
  const { open }   = await import('@tauri-apps/plugin-dialog');
  const { invoke } = await import('@tauri-apps/api/core');

  const selected = await open({
    multiple: false,
    filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }],
  });
  if (!selected) return null;

  const path = selected as string;
  const bytes: number[] = await invoke('read_file_bytes', { path });
  const uint8 = new Uint8Array(bytes);

  if (uint8.length > MAX_SIZE_BYTES) {
    throw new Error(`Image too large (max 5 MB). This image is ~${Math.round(uint8.length / 1024 / 1024)} MB.`);
  }

  const ext      = path.split('.').pop() ?? 'jpg';
  const mimeType = extToMime(ext);
  const name     = path.split(/[\\/]/).pop() ?? `image.${ext}`;

  return {
    id:        newId(),
    type:      'image',
    createdAt: Date.now(),
    data:      uint8ToBase64(uint8),
    mimeType,
    name,
    size:      uint8.length,
  };
}

// ─── Native (iOS / Android) ───────────────────────────────────────────────────

async function pickImageNative(): Promise<Attachment | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'Images',
    base64:     true,
    quality:    0.7,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  if (!asset.base64) return null;

  const sizeBytes = Math.round(asset.base64.length * 0.75);
  if (sizeBytes > MAX_SIZE_BYTES) {
    throw new Error(`Image too large (max 5 MB). This image is ~${Math.round(sizeBytes / 1024 / 1024)} MB.`);
  }

  return {
    id:        newId(),
    type:      'image',
    createdAt: Date.now(),
    data:      asset.base64,
    mimeType:  asset.mimeType ?? 'image/jpeg',
    name:      asset.fileName ?? `photo_${Date.now()}.jpg`,
    size:      sizeBytes,
  };
}

async function takePhotoNative(): Promise<Attachment | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  if (!asset.base64) return null;

  const sizeBytes = Math.round(asset.base64.length * 0.75);
  if (sizeBytes > MAX_SIZE_BYTES) throw new Error('Image too large (max 5 MB).');

  return {
    id:        newId(),
    type:      'image',
    createdAt: Date.now(),
    data:      asset.base64,
    mimeType:  asset.mimeType ?? 'image/jpeg',
    name:      `photo_${Date.now()}.jpg`,
    size:      sizeBytes,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function pickImage(): Promise<Attachment | null> {
  if (isTauri()) return pickImageTauri();
  return pickImageNative();
}

export async function takePhoto(): Promise<Attachment | null> {
  if (isTauri()) return pickImageTauri(); // on desktop "take photo" = pick from disk
  return takePhotoNative();
}
