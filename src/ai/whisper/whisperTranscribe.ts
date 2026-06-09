/**
 * whisper.rn transcription — web/Tauri stub.
 * Metro selects whisperTranscribe.native.ts for iOS/Android.
 * On-device audio transcription requires native whisper.cpp runtime.
 */

export const WHISPER_RN_AVAILABLE = false;

export async function initWhisperModel(_modelPath: string): Promise<boolean> {
  return false;
}

export async function transcribeWithWhisper(_audioPath: string): Promise<string | null> {
  return null;
}

export async function releaseWhisperModel(): Promise<void> {}
