const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Validates that a URL is safe to use for provider/sync network calls.
 * Throws with a user-readable message if the URL is unsafe.
 *
 * Rules:
 *  - scheme must be http or https
 *  - http is only permitted for loopback (localhost, 127.x, ::1)
 *    to prevent note content from being sent in plaintext over the LAN
 */
export function assertSafeUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid URL — must be a fully qualified address (e.g. https://example.com)');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `URL scheme "${parsed.protocol.replace(':', '')}" is not allowed — use http or https`,
    );
  }

  if (parsed.protocol === 'http:' && !LOCAL_HOSTNAMES.has(parsed.hostname)) {
    throw new Error(
      'Unencrypted HTTP is only allowed for localhost addresses. ' +
        'Use https:// to protect your note content in transit.',
    );
  }
}
