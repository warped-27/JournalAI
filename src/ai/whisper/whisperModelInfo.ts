import type { ModelInfo } from '../onDevice/modelInfo';

export const WHISPER_SMALL: ModelInfo = {
  id:        'whisper-small',
  name:      'Whisper Small',
  url:       'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
  sizeBytes: 244_000_000,
  filename:  'whisper-small.bin',
};

export const DEFAULT_WHISPER_MODEL = WHISPER_SMALL;
