jest.mock('../../platform/detect', () => ({ isTauri: () => false }));
jest.mock('../../lib/id', () => ({ newId: () => 'test-id' }));

const mockRequestMediaLibraryPermissions = jest.fn();
const mockLaunchImageLibrary             = jest.fn();

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: () => mockRequestMediaLibraryPermissions(),
  launchImageLibraryAsync:             (...args: unknown[]) => mockLaunchImageLibrary(...args),
  MediaTypeOptions: { Images: 'Images' },
}));

import { pickImage } from '../pickImage';

describe('pickImage (native)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when permission denied', async () => {
    mockRequestMediaLibraryPermissions.mockResolvedValue({ granted: false });
    expect(await pickImage()).toBeNull();
  });

  it('returns null when picker cancelled', async () => {
    mockRequestMediaLibraryPermissions.mockResolvedValue({ granted: true });
    mockLaunchImageLibrary.mockResolvedValue({ canceled: true, assets: [] });
    expect(await pickImage()).toBeNull();
  });

  it('returns null when base64 missing', async () => {
    mockRequestMediaLibraryPermissions.mockResolvedValue({ granted: true });
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ base64: null, mimeType: 'image/jpeg', fileName: 'photo.jpg' }],
    });
    expect(await pickImage()).toBeNull();
  });

  it('returns image attachment on success', async () => {
    mockRequestMediaLibraryPermissions.mockResolvedValue({ granted: true });
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ base64: 'abc123', mimeType: 'image/png', fileName: 'photo.png' }],
    });
    const result = await pickImage();
    expect(result).not.toBeNull();
    expect(result?.type).toBe('image');
    expect(result?.id).toBe('test-id');
    expect(result?.data).toBe('abc123');
    expect(result?.mimeType).toBe('image/png');
    expect(result?.name).toBe('photo.png');
  });

  it('throws when image exceeds 5 MB', async () => {
    mockRequestMediaLibraryPermissions.mockResolvedValue({ granted: true });
    // base64 that decodes to > 5 MB: length * 0.75 > 5 * 1024 * 1024
    const bigBase64 = 'A'.repeat(Math.ceil((5 * 1024 * 1024 + 1) / 0.75));
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ base64: bigBase64, mimeType: 'image/jpeg', fileName: 'big.jpg' }],
    });
    await expect(pickImage()).rejects.toThrow('too large');
  });
});
