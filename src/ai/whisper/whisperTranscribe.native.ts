// eslint-disable-next-line import/no-unresolved
import { initWhisper, type WhisperContext } from 'whisper.rn';

export const WHISPER_RN_AVAILABLE = true;

let whisperCtx: WhisperContext | null = null;

export async function initWhisperModel(modelPath: string): Promise<boolean> {
  try {
    whisperCtx = await initWhisper({ filePath: modelPath });
    return true;
  } catch {
    whisperCtx = null;
    return false;
  }
}

export async function transcribeWithWhisper(audioPath: string): Promise<string | null> {
  if (!whisperCtx) return null;
  try {
    const { promise } = whisperCtx.transcribe(audioPath, {
      language: 'auto',
      translate: false,
    });
    const { result } = await promise;
    return result?.trim() || null;
  } catch {
    return null;
  }
}

export async function releaseWhisperModel(): Promise<void> {
  if (whisperCtx) {
    await whisperCtx.release?.();
    whisperCtx = null;
  }
}
