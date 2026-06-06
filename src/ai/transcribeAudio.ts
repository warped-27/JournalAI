import type { Result } from '../lib/result';
import { ok, err } from '../lib/result';
import { DEFAULT_GEMINI_MODEL } from './geminiService';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export async function transcribeAudio(
  base64Audio: string,
  mimeType: string,
  apiKey: string,
  model = DEFAULT_GEMINI_MODEL,
): Promise<Result<string, Error>> {
  if (!apiKey.trim()) return err(new Error('No API key configured'));

  const url = `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType, data: base64Audio } },
            { text: 'Transcribe this audio accurately. Return only the transcription text, no metadata.' },
          ],
        }],
        generationConfig: { temperature: 0, maxOutputTokens: 2048 },
      }),
    });
  } catch (e) {
    return err(new Error(`Network error: ${e instanceof Error ? e.message : String(e)}`));
  }

  let body: any;
  try {
    body = await response.json();
  } catch {
    return err(new Error(`Invalid JSON (status ${response.status})`));
  }

  if (!response.ok || body.error) {
    return err(new Error(body.error?.message ?? `API error ${response.status}`));
  }

  const text: string | undefined = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return err(new Error('Empty transcription from Gemini'));

  return ok(text.trim());
}
