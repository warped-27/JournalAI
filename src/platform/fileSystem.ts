import { isTauri, isNativePlatform } from './detect';

/**
 * Cross-platform file system bridge.
 *
 * - Tauri  : native OS open/save dialogs via @tauri-apps/plugin-dialog + plugin-fs
 * - Native : expo-document-picker for import; expo-sharing/expo-file-system for export
 * - Browser: <input type="file"> + Blob download (legacy / dev only)
 */

// ─── Tauri ───────────────────────────────────────────────────────────────────

async function tauriReadFile(): Promise<string | null> {
  const { open }         = await import('@tauri-apps/plugin-dialog');
  const { readTextFile } = await import('@tauri-apps/plugin-fs');
  const selected = await open({
    multiple: false,
    filters: [{ name: 'NERD_JOURNAL_ Bundle', extensions: ['njvault', 'json'] }],
  });
  if (!selected) return null;
  return readTextFile(selected as string);
}

async function tauriWriteFile(content: string, defaultName: string): Promise<void> {
  const { save }          = await import('@tauri-apps/plugin-dialog');
  const { writeTextFile } = await import('@tauri-apps/plugin-fs');
  const ext      = defaultName.split('.').pop() ?? 'txt';
  const selected = await save({
    defaultPath: defaultName,
    filters: [{ name: 'Export', extensions: [ext] }],
  });
  if (!selected) return;
  await writeTextFile(selected, content);
}

// ─── Native (iOS / Android) ──────────────────────────────────────────────────

async function nativeReadFile(): Promise<string | null> {
  const { getDocumentAsync } = await import('expo-document-picker');
  const result = await getDocumentAsync({
    type: ['application/json', '*/*'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const uri = result.assets?.[0]?.uri;
  if (!uri) return null;
  const { readAsStringAsync, EncodingType } = await import('expo-file-system/legacy');
  return readAsStringAsync(uri, { encoding: EncodingType.UTF8 });
}

async function nativeWriteFile(content: string, name: string): Promise<void> {
  const FileSystem = await import('expo-file-system/legacy');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uri = ((FileSystem as any).cacheDirectory ?? '') + name;
  await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
  const Sharing = await import('expo-sharing');
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { dialogTitle: 'Export' });
  }
}

// ─── Browser (legacy / dev) ──────────────────────────────────────────────────

function browserReadFile(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input  = document.createElement('input');
    input.type   = 'file';
    input.accept = '.njvault,.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const reader   = new FileReader();
      reader.onload  = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsText(file);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

function browserWriteFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  try {
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Opens a file picker and returns the file contents as a string, or null if cancelled. */
export async function pickFileToRead(): Promise<string | null> {
  if (isTauri())          return tauriReadFile();
  if (isNativePlatform()) return nativeReadFile();
  return browserReadFile();
}

/** Opens a save dialog and writes content to the chosen file. */
export async function saveTextFile(content: string, filename: string): Promise<void> {
  if (isTauri())          return tauriWriteFile(content, filename);
  if (isNativePlatform()) return nativeWriteFile(content, filename);
  browserWriteFile(content, filename);
}
