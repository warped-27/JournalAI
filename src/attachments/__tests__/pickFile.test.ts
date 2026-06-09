jest.mock('../../platform/detect', () => ({ isTauri: () => false }));
jest.mock('../../lib/id', () => ({ newId: () => 'file-id' }));

const mockGetDocumentAsync = jest.fn();

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: (...args: unknown[]) => mockGetDocumentAsync(...args),
}));

class FakeFileReader {
  onload:   (() => void) | null = null;
  onerror:  ((e: unknown) => void) | null = null;
  result = 'data:text/plain;base64,aGVsbG8=';
  readAsDataURL(_blob: Blob) { setTimeout(() => this.onload?.(), 0); }
}
(globalThis as unknown as Record<string, unknown>).FileReader = FakeFileReader;
(globalThis as unknown as Record<string, unknown>).fetch = jest.fn().mockResolvedValue({
  blob: () => Promise.resolve({} as Blob),
});

import { pickFile } from '../pickFile';

describe('pickFile (native)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when cancelled', async () => {
    mockGetDocumentAsync.mockResolvedValue({ canceled: true, assets: [] });
    expect(await pickFile()).toBeNull();
  });

  it('returns null when no asset', async () => {
    mockGetDocumentAsync.mockResolvedValue({ canceled: false, assets: [] });
    expect(await pickFile()).toBeNull();
  });

  it('throws when file exceeds 5 MB', async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/big.pdf', name: 'big.pdf', mimeType: 'application/pdf', size: 6 * 1024 * 1024 }],
    });
    await expect(pickFile()).rejects.toThrow('too large');
  });

  it('returns file attachment on success', async () => {
    mockGetDocumentAsync.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///tmp/doc.txt', name: 'doc.txt', mimeType: 'text/plain', size: 500 }],
    });
    const result = await pickFile();
    expect(result).not.toBeNull();
    expect(result?.type).toBe('file');
    expect(result?.id).toBe('file-id');
    expect(result?.name).toBe('doc.txt');
    expect(result?.mimeType).toBe('text/plain');
  });
});
