// Minimal type shim for whisper.rn — the package ships JS but no bundled .d.ts.
declare module 'whisper.rn' {
  export interface TranscribeOptions {
    language?: string;
    translate?: boolean;
    [key: string]: unknown;
  }

  export interface WhisperContext {
    transcribe(path: string, options?: TranscribeOptions): { promise: Promise<{ result: string }> };
    release?(): Promise<void>;
  }

  export function initWhisper(options: { filePath: string }): Promise<WhisperContext>;
}
