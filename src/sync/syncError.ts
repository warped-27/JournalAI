/**
 * Converts raw sync/network errors into user-readable messages.
 * Distinguishes common failure modes without leaking internal details.
 */
export function classifySyncError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);

  if (
    msg.includes('Failed to fetch') ||
    msg.includes('Network request failed') ||
    msg.includes('NetworkError') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('ERR_NAME_NOT_RESOLVED')
  ) {
    return 'Cannot reach server — check your connection or the server URL.';
  }

  if (msg.includes('401') || msg.includes('Unauthorized')) {
    return 'Authentication failed — check your username and password.';
  }

  if (msg.includes('403') || msg.includes('Forbidden')) {
    return 'Access denied — your account may not have permission to this folder.';
  }

  if (msg.includes('404') && msg.toLowerCase().includes('get')) {
    return 'No vault file on server yet — push will create it.';
  }

  if (msg.includes('409') || msg.includes('Conflict')) {
    return 'Server conflict — another client may have written simultaneously. Try again.';
  }

  if (/5\d\d/.test(msg)) {
    return 'Server error — the sync server returned an internal error. Try again later.';
  }

  if (msg.includes('Invalid URL') || msg.includes('URL scheme')) {
    return 'Invalid server URL — use https:// for remote servers.';
  }

  if (msg.includes('Unencrypted HTTP')) {
    return 'Unencrypted HTTP is only allowed for localhost. Use https:// for remote servers.';
  }

  return msg;
}
