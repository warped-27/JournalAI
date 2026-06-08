/**
 * jest-expo resolves whisperTranscribe.native.ts for this test.
 * whisper.rn is mocked so the jest module resolver can load the native file.
 */
jest.mock('whisper.rn', () => ({
  initWhisper: jest.fn(),
}));

import { initWhisper } from 'whisper.rn';
import {
  WHISPER_RN_AVAILABLE,
  initWhisperModel,
  transcribeWithWhisper,
  releaseWhisperModel,
} from '../whisperTranscribe';

const mockInitWhisper = initWhisper as jest.Mock;

let mockTranscribe: jest.Mock;
let mockRelease: jest.Mock;
let mockCtx: { transcribe: jest.Mock; release: jest.Mock };

beforeEach(async () => {
  jest.clearAllMocks();
  mockRelease    = jest.fn().mockResolvedValue(undefined);
  mockTranscribe = jest.fn().mockReturnValue({
    promise: Promise.resolve({ result: '  hello world  ' }),
  });
  mockCtx = { transcribe: mockTranscribe, release: mockRelease };
  mockInitWhisper.mockResolvedValue(mockCtx);
  await releaseWhisperModel();
});

describe('whisperTranscribe (native)', () => {
  it('WHISPER_RN_AVAILABLE is true on native', () => {
    expect(WHISPER_RN_AVAILABLE).toBe(true);
  });

  it('initWhisperModel calls initWhisper with correct path', async () => {
    const ok = await initWhisperModel('/models/whisper-small.bin');
    expect(ok).toBe(true);
    expect(mockInitWhisper).toHaveBeenCalledWith({ filePath: '/models/whisper-small.bin' });
  });

  it('initWhisperModel returns false when initWhisper throws', async () => {
    mockInitWhisper.mockRejectedValue(new Error('native error'));
    const ok = await initWhisperModel('/bad/path');
    expect(ok).toBe(false);
  });

  it('transcribeWithWhisper returns trimmed text', async () => {
    await initWhisperModel('/models/whisper-small.bin');
    const result = await transcribeWithWhisper('/audio/clip.wav');
    expect(result).toBe('hello world');
    expect(mockTranscribe).toHaveBeenCalledWith('/audio/clip.wav', {
      language: 'auto',
      translate: false,
    });
  });

  it('transcribeWithWhisper returns null when model not loaded', async () => {
    const result = await transcribeWithWhisper('/audio/clip.wav');
    expect(result).toBeNull();
  });

  it('transcribeWithWhisper returns null when transcription returns empty string', async () => {
    mockTranscribe.mockReturnValue({ promise: Promise.resolve({ result: '   ' }) });
    await initWhisperModel('/models/whisper-small.bin');
    const result = await transcribeWithWhisper('/audio/clip.wav');
    expect(result).toBeNull();
  });

  it('transcribeWithWhisper returns null when transcription throws', async () => {
    mockTranscribe.mockReturnValue({ promise: Promise.reject(new Error('oops')) });
    await initWhisperModel('/models/whisper-small.bin');
    const result = await transcribeWithWhisper('/audio/clip.wav');
    expect(result).toBeNull();
  });

  it('releaseWhisperModel calls release on the context', async () => {
    await initWhisperModel('/models/whisper-small.bin');
    await releaseWhisperModel();
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('releaseWhisperModel is a no-op when nothing is loaded', async () => {
    await releaseWhisperModel();
    expect(mockRelease).not.toHaveBeenCalled();
  });
});
