import { parseBundle, serializeBundle, type SyncBundle } from '../SyncBundle';

const validBundle: SyncBundle = {
  version:    1,
  salt:       'AAAAAAAAAAAAAAAAAAAAAA',
  notes:      [],
  exportedAt: 1700000000000,
  deviceId:   'dev-1',
};

describe('SyncBundle', () => {
  it('round-trips correctly', () => {
    const json   = serializeBundle(validBundle);
    const parsed = parseBundle(json);
    expect(parsed.version).toBe(1);
    expect(parsed.salt).toBe(validBundle.salt);
    expect(parsed.exportedAt).toBe(validBundle.exportedAt);
  });

  it('throws on invalid JSON', () => {
    expect(() => parseBundle('not json')).toThrow();
  });

  it('throws when version is wrong', () => {
    const broken = JSON.stringify({ ...validBundle, version: 2 });
    expect(() => parseBundle(broken)).toThrow('Invalid sync bundle format');
  });

  it('throws when salt is missing', () => {
    const { salt: _s, ...noSalt } = validBundle;
    expect(() => parseBundle(JSON.stringify(noSalt))).toThrow('Invalid sync bundle format');
  });

  it('throws when notes is not an array', () => {
    const broken = JSON.stringify({ ...validBundle, notes: 'bad' });
    expect(() => parseBundle(broken)).toThrow('Invalid sync bundle format');
  });

  it('throws when exportedAt is missing', () => {
    const { exportedAt: _e, ...noTs } = validBundle;
    expect(() => parseBundle(JSON.stringify(noTs))).toThrow('Invalid sync bundle format');
  });

  it('preserves note rows inside bundle', () => {
    const bundleWithNotes: SyncBundle = {
      ...validBundle,
      notes: [{ id: 'n1', envelope: 'abc', updated_at: 1, created_at: 0 }],
    };
    const parsed = parseBundle(serializeBundle(bundleWithNotes));
    expect(parsed.notes).toHaveLength(1);
    expect(parsed.notes[0]!.id).toBe('n1');
  });

  it('throws when notes array exceeds the maximum count', () => {
    // Build a bundle JSON with 100 001 minimal note entries without actually
    // allocating a 100 001-element array in memory (faster in tests).
    const fakeNote = '{"id":"x","envelope":"e","updated_at":1,"created_at":0}';
    const manyNotes = Array.from({ length: 100_001 }, () => fakeNote).join(',');
    const raw = `{"version":1,"salt":"AAAA","exportedAt":1,"deviceId":"x","notes":[${manyNotes}]}`;
    expect(() => parseBundle(raw)).toThrow('too many notes');
  });

  it('throws when raw string exceeds the size limit', () => {
    // Pass an object whose .length exceeds MAX_BUNDLE_BYTES without allocating that memory.
    // The guard check runs before JSON.parse, so the fake length is enough.
    const oversized = { length: 512 * 1024 * 1024 + 1 } as unknown as string;
    expect(() => parseBundle(oversized)).toThrow('maximum allowed size');
  });

  it('preserves optional isFull and since fields', () => {
    const delta: SyncBundle = { ...validBundle, isFull: false, since: 9000 };
    const parsed = parseBundle(serializeBundle(delta));
    expect(parsed.isFull).toBe(false);
    expect(parsed.since).toBe(9000);
  });

  it('preserves optional blobs array', () => {
    const withBlobs: SyncBundle = {
      ...validBundle,
      blobs: [{
        id: 'blob-1', noteId: 'n1', mimeType: 'image/png', size: 1024, envelope: 'enc==',
      }],
    };
    const parsed = parseBundle(serializeBundle(withBlobs));
    expect(parsed.blobs).toHaveLength(1);
    expect(parsed.blobs![0]!.id).toBe('blob-1');
  });
});
