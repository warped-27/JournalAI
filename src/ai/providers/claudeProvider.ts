import type { AiProvider } from './types';

export interface ClaudeConfig {
  enabled: boolean;
  apiKey:  string;
  model:   string;
}

export const CLAUDE_MODELS = [
  { id: 'claude-fable-5',            label: 'Claude Fable 5 (most capable)' },
  { id: 'claude-opus-4-8',           label: 'Claude Opus 4.8' },
  { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6 (recommended)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fast)' },
] as const;

export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-6';

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>;
  error?:   { message: string };
}

export function makeClaudeProvider(config: ClaudeConfig): AiProvider {
  return {
    id: 'claude',
    async complete(prompt: string): Promise<string> {
      let response: Response;
      try {
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method:  'POST',
          headers: {
            'Content-Type':      'application/json',
            'x-api-key':         config.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model:      config.model,
            max_tokens: 1024,
            messages:   [{ role: 'user', content: prompt }],
          }),
        });
      } catch (e) {
        throw new Error(`claude: network error — ${e instanceof Error ? e.message : String(e)}`);
      }

      let body: AnthropicResponse;
      try {
        body = (await response.json()) as AnthropicResponse;
      } catch {
        throw new Error(`claude: invalid JSON (HTTP ${response.status})`);
      }

      if (!response.ok || body.error) {
        throw new Error(`claude: ${body.error?.message ?? `HTTP ${response.status}`}`);
      }

      const text = body.content?.find((b) => b.type === 'text')?.text;
      if (typeof text !== 'string' || !text) {
        throw new Error('claude: empty response');
      }
      return text.trim();
    },
  };
}

/** Validates the key and model by making a minimal real API call. */
export async function testClaudeConnection(apiKey: string, model: string): Promise<void> {
  const provider = makeClaudeProvider({ enabled: true, apiKey, model });
  await provider.complete('Reply with exactly one word: ok');
}
