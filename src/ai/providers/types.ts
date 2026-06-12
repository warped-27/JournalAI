export type PrivacyLevel = 'on-device' | 'local';

export interface AiProvider {
  readonly id:           string;
  readonly displayName:  string;
  readonly privacyLevel: PrivacyLevel;
  complete(prompt: string): Promise<string>;
}
