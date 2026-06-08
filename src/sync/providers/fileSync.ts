import type { SyncBundle } from '../SyncBundle';
import { serializeBundle, parseBundle } from '../SyncBundle';
import { pickFileToRead, saveTextFile } from '../../platform/fileSystem';

const BUNDLE_FILENAME = 'nerd_journal_.njvault';

export async function exportToFile(bundle: SyncBundle): Promise<void> {
  await saveTextFile(serializeBundle(bundle), BUNDLE_FILENAME);
}

export async function importFromFile(): Promise<SyncBundle | null> {
  const text = await pickFileToRead();
  if (!text) return null;
  return parseBundle(text);
}
