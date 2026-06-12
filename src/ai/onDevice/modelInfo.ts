export interface ModelInfo {
  id:           string;
  name:         string;
  url:          string;
  sizeBytes:    number;
  filename:     string;
  description?: string;
}

// Curated GGUF models — all quantised by bartowski, sourced from HuggingFace.
// sizeBytes for Gemma 4 E2B is estimated (~3.7 GB) from sibling quantisations;
// update once the Q4_K_M file listing is confirmed.
export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id:          'gemma-4-e2b-it-q4km',
    name:        'Gemma 4 E2B ✦',
    description: 'Google · Newest · MoE architecture — better quality per active param · ~3.7 GB',
    url:         'https://huggingface.co/bartowski/google_gemma-4-E2B-it-GGUF/resolve/main/google_gemma-4-E2B-it-Q4_K_M.gguf',
    sizeBytes:   3_700_000_000,
    filename:    'google_gemma-4-E2B-it-Q4_K_M.gguf',
  },
  {
    id:          'gemma-3-4b-it-q4km',
    name:        'Gemma 3 4B',
    description: 'Google · Proven default · Best overall quality · Solid multilingual support',
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
