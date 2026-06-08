import type { AiProvider } from './providers/types';
import type { Result } from '../lib/result';
import { ok, err } from '../lib/result';
import { logger } from '../lib/logger';

export async function cascadeComplete(
  providers: AiProvider[],
  prompt: string,
): Promise<Result<string, Error>> {
  if (providers.length === 0) return err(new Error('No AI providers configured'));

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      return ok(await provider.complete(prompt));
    } catch (e) {
      errors.push(`${provider.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  logger.warn('cascadeComplete: all providers failed', { errors });
  return err(new Error('AI request failed — no provider could complete the request'));
}
