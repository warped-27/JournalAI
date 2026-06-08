export interface ModelInfo {
  id:        string;
  name:      string;
  url:       string;
  sizeBytes: number;
  filename:  string;
}

export const GEMMA_3_4B: ModelInfo = {
  id:        'gemma-3-4b-it-q4km',
  name:      'Gemma 3 4B IT (Q4_K_M)',
  url:       'https://huggingface.co/bartowski/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it-Q4_K_M.gguf',
  sizeBytes: 2_530_000_000,
  filename:  'gemma-3-4b-it-Q4_K_M.gguf',
};

export const DEFAULT_ON_DEVICE_MODEL = GEMMA_3_4B;
