import { makeClaudeProvider, testClaudeConnection } from '../providers/claudeProvider';

const MOCK_CONFIG = { enabled: true, apiKey: 'sk-ant-test', model: 'claude-sonnet-4-6' };

function mockFetch(status: number, body: unknown): void {
  (globalThis as unknown as Record<string, unknown>).fetch = jest.fn().mockResolvedValue({
    ok:   status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function mockFetchNetworkError(message: string): void {
  (globalThis as unknown as Record<string, unknown>).fetch = jest.fn().mockRejectedValue(
    new Error(message),
  );
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('makeClaudeProvider', () => {
  it('returns text from a successful response', async () => {
    mockFetch(200, { content: [{ type: 'text', text: 'hello world' }] });
    const provider = makeClaudeProvider(MOCK_CONFIG);
    const result = await provider.complete('say hello');
    expect(result).toBe('hello world');
  });

  it('sends the correct Anthropic headers', async () => {
    mockFetch(200, { content: [{ type: 'text', text: 'ok' }] });
    const provider = makeClaudeProvider(MOCK_CONFIG);
    await provider.complete('test');

    const call = (fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const headers = call[1].headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-ant-test');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('throws on HTTP error with error body', async () => {
    mockFetch(401, { error: { message: 'Invalid API key' } });
    const provider = makeClaudeProvider(MOCK_CONFIG);
    await expect(provider.complete('test')).rejects.toThrow('Invalid API key');
  });

  it('throws on HTTP error without error body', async () => {
    mockFetch(500, {});
    const provider = makeClaudeProvider(MOCK_CONFIG);
    await expect(provider.complete('test')).rejects.toThrow('HTTP 500');
  });

  it('throws when content array is empty', async () => {
    mockFetch(200, { content: [] });
    const provider = makeClaudeProvider(MOCK_CONFIG);
    await expect(provider.complete('test')).rejects.toThrow('empty response');
  });

  it('throws when content has no text block', async () => {
    mockFetch(200, { content: [{ type: 'tool_use', id: 'x' }] });
    const provider = makeClaudeProvider(MOCK_CONFIG);
    await expect(provider.complete('test')).rejects.toThrow('empty response');
  });

  it('throws on network error', async () => {
    mockFetchNetworkError('Failed to fetch');
    const provider = makeClaudeProvider(MOCK_CONFIG);
    await expect(provider.complete('test')).rejects.toThrow('network error');
  });

  it('trims whitespace from the returned text', async () => {
    mockFetch(200, { content: [{ type: 'text', text: '  trimmed  \n' }] });
    const provider = makeClaudeProvider(MOCK_CONFIG);
    expect(await provider.complete('test')).toBe('trimmed');
  });

  it('has id "claude"', () => {
    const provider = makeClaudeProvider(MOCK_CONFIG);
    expect(provider.id).toBe('claude');
  });
});

describe('testClaudeConnection', () => {
  it('resolves on a successful API response', async () => {
    mockFetch(200, { content: [{ type: 'text', text: 'ok' }] });
    await expect(testClaudeConnection('sk-ant-test', 'claude-sonnet-4-6')).resolves.toBeUndefined();
  });

  it('rejects on an invalid key (401)', async () => {
    mockFetch(401, { error: { message: 'Invalid API key' } });
    await expect(testClaudeConnection('bad-key', 'claude-sonnet-4-6')).rejects.toThrow();
  });
});
