import type { AiProvider } from './types';

/** Web / Tauri stub — llama.rn requires native iOS/Android. */
export const LLAMA_RN_AVAILABLE = false;

export async function initLlamaRnProvider(_modelPath: string, _onProgress?: (progress: number) => void): Promise<AiProvider | null> {
  return null;
}

export async function releaseLlamaRnProvider(): Promise<void> {}
