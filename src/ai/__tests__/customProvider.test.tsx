import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AiProvider, useAi } from '../AiContext';
import * as secureSecrets from '../../crypto/secureSecrets';

jest.mock('../../crypto/secureSecrets');
jest.mock('../aiService');
jest.mock('../onDevice/OnDeviceContext', () => ({
  useOnDevice: () => ({ provider: null }),
}));

const mockSecretGet = secureSecrets.secretGet as jest.MockedFunction<typeof secureSecrets.secretGet>;
const mockSecretSet = secureSecrets.secretSet as jest.MockedFunction<typeof secureSecrets.secretSet>;

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

describe('AiContext — custom provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecretGet.mockResolvedValue(null);
    mockSecretSet.mockResolvedValue(undefined);
  });

  it('starts with custom provider disabled by default', async () => {
    let ctx!: ReturnType<typeof useAi>;
    await act(async () => {
      renderWithProvider((v) => (ctx = v));
    });
    expect(ctx.customConfig.enabled).toBe(false);
    expect(ctx.customConfig.baseUrl).toBe('http://localhost:4000');
    expect(ctx.customConfig.model).toBe('gpt-4o-mini');
  });

  it('loads persisted customConfig from keychain on mount', async () => {
    const saved = { enabled: true, baseUrl: 'http://localhost:5000', model: 'llama3', name: 'My LiteLLM' };
    mockSecretGet.mockImplementation(async (key) => {
      if (key === 'nj_custom_config') return JSON.stringify(saved);
      return null;
    });
    let ctx!: ReturnType<typeof useAi>;
    await act(async () => {
      renderWithProvider((v) => (ctx = v));
    });
    expect(ctx.customConfig.enabled).toBe(true);
    expect(ctx.customConfig.baseUrl).toBe('http://localhost:5000');
    expect(ctx.customConfig.model).toBe('llama3');
    expect(ctx.customConfig.name).toBe('My LiteLLM');
  });

  it('setCustomConfig persists to keychain and updates state', async () => {
    let ctx!: ReturnType<typeof useAi>;
    await act(async () => {
      renderWithProvider((v) => (ctx = v));
    });
    const newCfg = { enabled: true, baseUrl: 'http://localhost:8000', model: 'mistral', name: 'My Server' };
    await act(async () => {
      await ctx.setCustomConfig(newCfg);
    });
    expect(mockSecretSet).toHaveBeenCalledWith('nj_custom_config', JSON.stringify(newCfg));
    expect(ctx.customConfig).toEqual(newCfg);
  });

  it('enabled custom provider is included in cascade (hasAnyProvider = true)', async () => {
    let ctx!: ReturnType<typeof useAi>;
    await act(async () => {
      renderWithProvider((v) => (ctx = v));
    });
    await act(async () => {
      await ctx.setCustomConfig({ enabled: true, baseUrl: 'http://localhost:4000', model: 'gpt-4o-mini', name: 'Custom' });
    });
    expect(ctx.hasAnyProvider).toBe(true);
  });

  it('disabled custom provider does not count as provider', async () => {
    let ctx!: ReturnType<typeof useAi>;
    await act(async () => {
      renderWithProvider((v) => (ctx = v));
    });
    expect(ctx.hasAnyProvider).toBe(false);
  });
});
