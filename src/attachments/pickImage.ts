import * as ImagePicker from 'expo-image-picker';
import type { Attachment } from '../notes/Note';
import { newId } from '../lib/id';

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export async function pickImage(): Promise<Attachment | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  const mimeType = asset.mimeType ?? 'image/jpeg';

  return {
    id:        newId(),
    type:      'image',
    createdAt: Date.now(),
    data:      asset.base64,
    mimeType,
    name:      asset.fileName ?? `photo_${Date.now()}.jpg`,
    size:      sizeBytes,
  };
}

export async function takePhoto(): Promise<Attachment | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    base64:  true,
    quality: 0.7,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  if (!asset.base64) return null;

  const sizeBytes = Math.round(asset.base64.length * 0.75);
  if (sizeBytes > MAX_SIZE_BYTES) {
    throw new Error(`Image too large (max 5 MB).`);
  }

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
