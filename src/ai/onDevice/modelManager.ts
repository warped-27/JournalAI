import * as FileSystem from 'expo-file-system/legacy';
import type { ModelInfo } from './modelInfo';

const MODEL_DIR_SUFFIX = 'nerd_journal_models/';

export function getModelDir(): string {
  return (FileSystem.documentDirectory ?? '') + MODEL_DIR_SUFFIX;
}

export function getModelPath(model: ModelInfo): string {
  return getModelDir() + model.filename;
}

export async function isModelDownloaded(model: ModelInfo): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(getModelPath(model));
  return info.exists;
}

/**
 * Starts a download. Returns a cancel handle and a completion promise.
 * `completion` resolves when the file is fully written, or rejects on error/cancel.
 */
export function startModelDownload(
  model: ModelInfo,
  onProgress: (fraction: number) => void,
): { cancel: () => Promise<void>; completion: Promise<void> } {
  const modelPath = getModelPath(model);
  const modelDir  = getModelDir();

  const resumable = FileSystem.createDownloadResumable(
    model.url,
    modelPath,
    {},
    ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      if (totalBytesExpectedToWrite > 0) {
        onProgress(totalBytesWritten / totalBytesExpectedToWrite);
      }
    },
  );

  const completion = (async () => {
    await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true });
    const result = await resumable.downloadAsync();
    if (!result) throw new Error('Download was cancelled');
    onProgress(1);
  })();

  return { cancel: () => resumable.cancelAsync(), completion };
}

export async function deleteModel(model: ModelInfo): Promise<void> {
  const path = getModelPath(model);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true });
}
