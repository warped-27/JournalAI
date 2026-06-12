export interface ModelInfo {
  id:           string;
  name:         string;
  url:          string;
  sizeBytes:    number;
  filename:     string;
  description?: string;
}

// Curated GGUF models — all quantised by bartowski, verified on HuggingFace.
// Add Gemma 4 or newer variants here once stable GGUF builds appear.
export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id:          'gemma-3-4b-it-q4km',
    name:        'Gemma 3 4B',
    description: 'Google · Best overall quality · Solid multilingual support',
    url:         'https://huggingface.co/bartowski/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it-Q4_K_M.gguf',
    sizeBytes:   2_530_000_000,
    filename:    'gemma-3-4b-it-Q4_K_M.gguf',
  },
  {
    id:          'gemma-3-2b-it-q4km',
    name:        'Gemma 3 2B',
    description: 'Google · Fastest on-device · Good for tagging and short notes',
    url:         'https://huggingface.co/bartowski/gemma-3-2b-it-GGUF/resolve/main/gemma-3-2b-it-Q4_K_M.gguf',
    sizeBytes:   1_350_000_000,
    filename:    'gemma-3-2b-it-Q4_K_M.gguf',
  },
  {
    id:          'qwen25-3b-it-q4km',
    name:        'Qwen 2.5 3B',
    description: 'Alibaba · Excellent multilingual · Great for mixed-language notes',
    url:         'https://huggingface.co/bartowski/Qwen2.5-3B-Instruct-GGUF/resolve/main/Qwen2.5-3B-Instruct-Q4_K_M.gguf',
    sizeBytes:   1_940_000_000,
    filename:    'Qwen2.5-3B-Instruct-Q4_K_M.gguf',
  },
  {
    id:          'phi4-mini-q4km',
    name:        'Phi-4 Mini',
    description: 'Microsoft · Strong reasoning · 3.8B params in a compact package',
    url:         'https://huggingface.co/bartowski/Phi-4-mini-instruct-GGUF/resolve/main/Phi-4-mini-instruct-Q4_K_M.gguf',
    sizeBytes:   2_500_000_000,
    filename:    'Phi-4-mini-instruct-Q4_K_M.gguf',
  },
];

export const DEFAULT_ON_DEVICE_MODEL = AVAILABLE_MODELS[0]!;

export function findModelById(id: string): ModelInfo | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === id);
}
