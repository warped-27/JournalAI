import * as DocumentPicker from 'expo-document-picker';
import type { Attachment } from '../notes/Note';
import { newId } from '../lib/id';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function pickFile(): Promise<Attachment | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];

  if (asset.size && asset.size > MAX_SIZE_BYTES) {
    throw new Error(`File too large (max 5 MB). This file is ~${Math.round(asset.size / 1024 / 1024)} MB.`);
  }

  // Read file as base64
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
      // Strip data URL prefix: "data:<mime>;base64,"
      resolve(result.split(',')[1] ?? result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
