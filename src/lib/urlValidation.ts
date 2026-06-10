/**
 * Returns true for hostnames that refer to the local machine:
 * - "localhost"
 * - IPv4 loopback: full 127.0.0.0/8 range (127.0.0.1 – 127.255.255.255)
 * - IPv6 loopback: [::1] (URL.hostname wraps IPv6 in brackets)
 * - 0.0.0.0 (all-interfaces binding used in local dev servers)
 */
function isLocalhost(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '[::1]' || hostname === '0.0.0.0') return true;
  // IPv4 127.0.0.0/8
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true;
  return false;
}

/**
 * Validates that a URL is safe for provider/sync network calls.
 * Throws with a user-readable message if the URL is unsafe.
 *
 * Rules:
 *  - scheme must be http or https
 *  - http is only permitted for loopback addresses (localhost, 127.x.x.x/8, ::1, 0.0.0.0)
 *    to prevent note content from being sent in plaintext over the network
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

  if (parsed.protocol === 'http:' && !isLocalhost(parsed.hostname)) {
    throw new Error(
      'Unencrypted HTTP is only allowed for localhost addresses. ' +
        'Use https:// to protect your note content in transit.',
    );
  }
}
