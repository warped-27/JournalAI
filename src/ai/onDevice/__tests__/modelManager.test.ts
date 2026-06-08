import { isModelDownloaded, getModelPath, deleteModel } from '../modelManager';
import type { ModelInfo } from '../modelInfo';

const TEST_MODEL: ModelInfo = {
  id:        'test-model',
  name:      'Test Model',
  url:       'https://example.com/model.gguf',
  sizeBytes: 100,
  filename:  'test-model.gguf',
};

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync:       jest.fn(),
  deleteAsync:        jest.fn().mockResolvedValue(undefined),
  createDownloadResumable: jest.fn(() => ({
    downloadAsync: jest.fn().mockResolvedValue({ uri: 'file:///documents/nerd_journal_models/test-model.gguf' }),
    cancelAsync:   jest.fn().mockResolvedValue(undefined),
  })),
}));

import * as FileSystem from 'expo-file-system/legacy';
const mockGetInfoAsync = FileSystem.getInfoAsync as jest.MockedFunction<typeof FileSystem.getInfoAsync>;

describe('getModelPath', () => {
  it('returns path under documentDirectory', () => {
    const path = getModelPath(TEST_MODEL);
    expect(path).toContain('nerd_journal_models');
    expect(path).toContain(TEST_MODEL.filename);
  });
});

describe('isModelDownloaded', () => {
  it('returns true when file exists', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, isDirectory: false, uri: '', size: 100, modificationTime: 0 });
    expect(await isModelDownloaded(TEST_MODEL)).toBe(true);
  });

  it('returns false when file does not exist', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: false, isDirectory: false, uri: '' });
    expect(await isModelDownloaded(TEST_MODEL)).toBe(false);
  });
});

describe('deleteModel', () => {
  it('calls deleteAsync when file exists', async () => {
    mockGetInfoAsync.mockResolvedValue({ exists: true, isDirectory: false, uri: '', size: 100, modificationTime: 0 });
    await deleteModel(TEST_MODEL);
    expect(FileSystem.deleteAsync).toHaveBeenCalled();
  });

  it('does not call deleteAsync when file does not exist', async () => {
    (FileSystem.deleteAsync as jest.Mock).mockClear();
    mockGetInfoAsync.mockResolvedValue({ exists: false, isDirectory: false, uri: '' });
    await deleteModel(TEST_MODEL);
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });
});
