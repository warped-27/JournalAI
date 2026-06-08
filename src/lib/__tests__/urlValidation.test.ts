import { assertSafeUrl } from '../urlValidation';

describe('assertSafeUrl', () => {
  it('accepts https:// for any host', () => {
    expect(() => assertSafeUrl('https://example.com')).not.toThrow();
    expect(() => assertSafeUrl('https://192.168.1.10:8080')).not.toThrow();
    expect(() => assertSafeUrl('https://dav.nextcloud.io/files/user')).not.toThrow();
  });

  it('accepts http:// for localhost variants', () => {
    expect(() => assertSafeUrl('http://localhost:11434')).not.toThrow();
    expect(() => assertSafeUrl('http://127.0.0.1:8080')).not.toThrow();
    expect(() => assertSafeUrl('http://[::1]:8080')).not.toThrow();
  });

  it('rejects http:// for non-localhost addresses', () => {
    expect(() => assertSafeUrl('http://192.168.1.10:11434')).toThrow('Unencrypted HTTP');
    expect(() => assertSafeUrl('http://10.0.0.5:8080')).toThrow('Unencrypted HTTP');
    expect(() => assertSafeUrl('http://example.com')).toThrow('Unencrypted HTTP');
  });

  it('rejects unsupported schemes', () => {
    expect(() => assertSafeUrl('file:///etc/passwd')).toThrow('not allowed');
    expect(() => assertSafeUrl('ftp://server.com')).toThrow('not allowed');
    expect(() => assertSafeUrl('javascript:alert(1)')).toThrow();
  });

  it('rejects malformed URLs', () => {
    expect(() => assertSafeUrl('not-a-url')).toThrow('Invalid URL');
    expect(() => assertSafeUrl('')).toThrow('Invalid URL');
  });
});
