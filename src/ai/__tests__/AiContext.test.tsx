import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AiProvider, useAi } from '../AiContext';
import * as secureSecrets from '../../crypto/secureSecrets';
import * as aiService from '../aiService';
import { ok } from '../../lib/result';

jest.mock('../../crypto/secureSecrets');
jest.mock('../aiService');
jest.mock('../onDevice/OnDeviceContext', () => ({
  useOnDevice: () => ({
    provider:         null,
    status:           'unavailable',
    downloadProgress: 0,
    errorMessage:     null,
    modelInfo:        { id: 'test', name: 'Test', sizeBytes: 0, url: '', filename: '' },
    startDownload:    jest.fn(),
    cancelDownload:   jest.fn(),
    loadModel:        jest.fn(),
    unloadModel:      jest.fn(),
    deleteLocalModel: jest.fn(),
  }),
}));

const mockSecretGet = secureSecrets.secretGet as jest.MockedFunction<typeof secureSecrets.secretGet>;
const mockSecretSet = secureSecrets.secretSet as jest.MockedFunction<typeof secureSecrets.secretSet>;
const mockSecretDelete = secureSecrets.secretDelete as jest.MockedFunction<typeof secureSecrets.secretDelete>;
const mockAskAi = aiService.askAi as jest.MockedFunction<typeof aiService.askAi>;

function TestConsumer({ onValue }: { onValue: (v: ReturnType<typeof useAi>) => void }) {
  const ctx = useAi();
  onValue(ctx);
  return null;
}

function renderWithProvider(onValue: (v: ReturnType<typeof useAi>) => void) {
  return TestRenderer.create(
    <AiProvider>
      <TestConsumer onValue={onValue} />
    </AiProvider>,
  );
}

describe('AiContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecretGet.mockResolvedValue(null);
    mockSecretSet.mockResolvedValue(undefined);
    mockSecretDelete.mockResolvedValue(undefined);
  });

  it('starts with null apiKey and no consent', async () => {
    let ctx!: ReturnType<typeof useAi>;
    await act(async () => {
      renderWithProvider((v) => (ctx = v));
    });
    expect(ctx.apiKey).toBeNull();
    expect(ctx.hasConsented).toBe(false);
  });

  it('loads persisted apiKey and consent on mount', async () => {
    mockSecretGet.mockImplementation(async (key) => {
      if (key === 'nj_gemini_apikey') return 'my-key';
      if (key === 'nj_ai_consent') return '1';
      return null;
    });
    let ctx!: ReturnType<typeof useAi>;
    await act(async () => {
      renderWithProvider((v) => (ctx = v));
    });
    expect(ctx.apiKey).toBe('my-key');
    expect(ctx.hasConsented).toBe(true);
  });

  it('setApiKey persists and updates state', async () => {
    let ctx!: ReturnType<typeof useAi>;
    await act(async () => {
      renderWithProvider((v) => (ctx = v));
    });
    await act(async () => {
      await ctx.setApiKey('new-key');
    });
    expect(mockSecretSet).toHaveBeenCalledWith('nj_gemini_apikey', 'new-key');
  });

  it('clearApiKey removes key from storage', async () => {
    let ctx!: ReturnType<typeof useAi>;
    await act(async () => {
      renderWithProvider((v) => (ctx = v));
    });
    await act(async () => {
      await ctx.clearApiKey();
    });
    expect(mockSecretDelete).toHaveBeenCalledWith('nj_gemini_apikey');
  });

  it('requestWithConsent returns err when no providers configured', async () => {
    let ctx!: ReturnType<typeof useAi>;
    await act(async () => {
      renderWithProvider((v) => (ctx = v));
    });
    let result!: Awaited<ReturnType<typeof ctx.requestWithConsent>>;
    await act(async () => {
      result = await ctx.requestWithConsent('content', 'summarize');
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.message).toContain('No AI providers');
  });

  it('requestWithConsent triggers pendingConsent when no consent yet', async () => {
    mockSecretGet.mockImplementation(async (key) => {
      if (key === 'nj_gemini_apikey') return 'my-key';
      return null;
    });
    let ctx!: ReturnType<typeof useAi>;
    await act(async () => {
      renderWithProvider((v) => (ctx = v));
    });

    let resolved = false;
    act(() => {
      ctx.requestWithConsent('note', 'summarize').then(() => (resolved = true));
    });

    // Should set pendingConsent = true but not resolve yet
    expect(ctx.pendingConsent).toBe(true);
    expect(resolved).toBe(false);
  });

  it('giveConsent resolves pending call and persists consent', async () => {
    mockSecretGet.mockImplementation(async (key) => {
      if (key === 'nj_gemini_apikey') return 'my-key';
      return null;
    });
    mockAskAi.mockResolvedValue(ok('AI result'));

    let ctx!: ReturnType<typeof useAi>;
    await act(async () => {
      renderWithProvider((v) => (ctx = v));
    });

    let result: any;
    act(() => {
      ctx.requestWithConsent('note content', 'summarize').then((r) => (result = r));
    });

    await act(async () => {
      await ctx.giveConsent();
    });

    expect(mockSecretSet).toHaveBeenCalledWith('nj_ai_consent', '1');
    expect(result?.ok).toBe(true);
    if (result?.ok) expect(result.value).toBe('AI result');
  });

  it('exposes cloudProviderName and hasCloudProvider when Gemini key is set', async () => {
    mockSecretGet.mockImplementation(async (key) => {
      if (key === 'nj_gemini_apikey') return 'my-key';
      return null;
    });
    let ctx!: ReturnType<typeof useAi>;
    await act(async () => {
      renderWithProvider((v) => (ctx = v));
    });
    expect(ctx.hasCloudProvider).toBe(true);
    expect(ctx.cloudProviderName).toBe('Google Gemini');
  });

  it('canAutoEnrich is true when no cloud providers are configured', async () => {
    let ctx!: ReturnType<typeof useAi>;
    await act(async () => {
      renderWithProvider((v) => (ctx = v));
    });
    expect(ctx.canAutoEnrich).toBe(true);
  });

  it('canAutoEnrich is false when cloud provider exists and no consent', async () => {
    mockSecretGet.mockImplementation(async (key) => {
      if (key === 'nj_gemini_apikey') return 'my-key';
      return null;
    });
    let ctx!: ReturnType<typeof useAi>;
    await act(async () => {
      renderWithProvider((v) => (ctx = v));
    });
    expect(ctx.hasCloudProvider).toBe(true);
    expect(ctx.hasConsented).toBe(false);
    expect(ctx.canAutoEnrich).toBe(false);
  });

  it('canAutoEnrich becomes true after giveConsent when cloud provider exists', async () => {
    mockSecretGet.mockImplementation(async (key) => {
      if (key === 'nj_gemini_apikey') return 'my-key';
      return null;
    });
    mockAskAi.mockResolvedValue(ok('result'));

    let ctx!: ReturnType<typeof useAi>;
    await act(async () => {
      renderWithProvider((v) => (ctx = v));
    });
    expect(ctx.canAutoEnrich).toBe(false);

    act(() => { ctx.requestWithConsent('note', 'summarize'); });
    await act(async () => { await ctx.giveConsent(); });

    expect(ctx.hasConsented).toBe(true);
    expect(ctx.canAutoEnrich).toBe(true);
  });

  it('migrates legacy nj_gemini_consent key to nj_ai_consent on load', async () => {
    mockSecretGet.mockImplementation(async (key) => {
      if (key === 'nj_gemini_consent') return '1';
      return null;
    });
    let ctx!: ReturnType<typeof useAi>;
    await act(async () => {
      renderWithProvider((v) => (ctx = v));
    });
    expect(ctx.hasConsented).toBe(true);
    expect(mockSecretSet).toHaveBeenCalledWith('nj_ai_consent', '1');
    expect(mockSecretDelete).toHaveBeenCalledWith('nj_gemini_consent');
  });
});
