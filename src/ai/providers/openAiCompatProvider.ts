import type { AiProvider } from './types';
import { assertSafeUrl } from '../../lib/urlValidation';

export interface OpenAiCompatConfig {
  id: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
}

interface OaiResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message: string };
}

export function makeOpenAiCompatProvider(config: OpenAiCompatConfig): AiProvider {
  assertSafeUrl(config.baseUrl);
  const base = config.baseUrl.replace(/\/+$/, '');
  return {
    id: config.id,
    async complete(prompt: string): Promise<string> {
      let response: Response;
      try {
        response = await fetch(`${base}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
          },
          body: JSON.stringify({
            model:      config.model,
            messages:   [{ role: 'user', content: prompt }],
            stream:     false,
            temperature: 0.3,
            max_tokens:  1024,
          }),
        });
      } catch (e) {
        throw new Error(`${config.id}: network error — ${e instanceof Error ? e.message : String(e)}`);
      }

      let body: OaiResponse;
      try {
        body = (await response.json()) as OaiResponse;
      } catch {
        throw new Error(`${config.id}: invalid JSON (HTTP ${response.status})`);
      }

      if (!response.ok || body.error) {
        throw new Error(`${config.id}: ${body.error?.message ?? `HTTP ${response.status}`}`);
      }

      const text = body.choices?.[0]?.message?.content;
      if (typeof text !== 'string' || !text) {
        throw new Error(`${config.id}: empty response`);
      }
      return text.trim();
    },
  };
}

/** Checks whether an OpenAI-compatible server is reachable at baseUrl.
 *  If apiKey is provided, it is sent in the Authorization header and a 401
 *  response is treated as an invalid-key error rather than a reachability pass. */
export async function testOpenAiCompatConnection(baseUrl: string, apiKey?: string): Promise<void> {
  assertSafeUrl(baseUrl);
  const base = baseUrl.replace(/\/+$/, '');
  let response: Response;
  try {
    response = await fetch(`${base}/v1/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    });
  } catch (e) {
    throw new Error(`Cannot reach server: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (response.status === 401 && apiKey) {
    throw new Error('Invalid API key — check your credentials');
  }
  // 401 without a key = server is up but requires auth (local proxy without auth disabled)
  if (!response.ok && response.status !== 401) {
    throw new Error(`Server returned HTTP ${response.status}`);
  }
}
