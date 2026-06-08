/**
 * jest-expo resolves llamaRnProvider.native.ts for this test.
 * llama.rn is mocked — its mock factory must not reference outer variables
 * (Jest hoists jest.mock above all declarations).
 */
jest.mock('llama.rn', () => ({
  initLlama: jest.fn(),
}));

import { initLlama } from 'llama.rn';
import { initLlamaRnProvider, releaseLlamaRnProvider, LLAMA_RN_AVAILABLE } from '../providers/llamaRnProvider';

const mockInitLlama = initLlama as jest.Mock;

let mockRelease:    jest.Mock;
let mockCompletion: jest.Mock;
let mockCtx:        { completion: jest.Mock; release: jest.Mock };

beforeEach(async () => {
  jest.clearAllMocks();
  mockRelease    = jest.fn().mockResolvedValue(undefined);
  mockCompletion = jest.fn().mockResolvedValue({ text: '  hello world  ' });
  mockCtx        = { completion: mockCompletion, release: mockRelease };
  mockInitLlama.mockResolvedValue(mockCtx);
  // Ensure no leftover context from previous test
  await releaseLlamaRnProvider();
});

describe('llamaRnProvider (native)', () => {
  it('LLAMA_RN_AVAILABLE is true on native', () => {
    expect(LLAMA_RN_AVAILABLE).toBe(true);
  });

  it('initLlamaRnProvider calls initLlama with correct params', async () => {
    await initLlamaRnProvider('/path/to/model.gguf');
    const firstArg = mockInitLlama.mock.calls[0]![0];
    expect(firstArg).toMatchObject({ model: '/path/to/model.gguf', n_ctx: 4096 });
  });

  it('returns a provider with id "on-device"', async () => {
    const provider = await initLlamaRnProvider('/path/model.gguf');
    expect(provider!.id).toBe('on-device');
  });

  it('provider.complete calls ctx.completion and trims text', async () => {
    const provider = await initLlamaRnProvider('/path/model.gguf');
    const text = await provider!.complete('test prompt');
    expect(text).toBe('hello world');
    expect(mockCompletion).toHaveBeenCalledWith(
      expect.objectContaining({
        messages:  [{ role: 'user', content: 'test prompt' }],
        n_predict: 1024,
      }),
    );
  });

  it('releases previous context before loading a new one', async () => {
    await initLlamaRnProvider('/model1.gguf');
    // Reset so the second call uses a fresh ctx
    const mockRelease2    = jest.fn().mockResolvedValue(undefined);
    const mockCompletion2 = jest.fn().mockResolvedValue({ text: 'ok' });
    mockInitLlama.mockResolvedValue({ completion: mockCompletion2, release: mockRelease2 });
    await initLlamaRnProvider('/model2.gguf');
    // The first context's release should have been called
    expect(mockRelease).toHaveBeenCalledTimes(1);
    expect(mockInitLlama).toHaveBeenCalledTimes(2);
  });

  it('releaseLlamaRnProvider releases the context', async () => {
    await initLlamaRnProvider('/model.gguf');
    await releaseLlamaRnProvider();
    expect(mockRelease).toHaveBeenCalledTimes(1);
  });

  it('releaseLlamaRnProvider is a no-op when nothing is loaded', async () => {
    // Nothing loaded at this point (beforeEach called release)
    await releaseLlamaRnProvider();
    expect(mockRelease).not.toHaveBeenCalled();
  });
});
