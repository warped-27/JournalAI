import * as SQLite from 'expo-sqlite';
import { type Database } from './types';
import { NOTES_TABLE_SQL } from '../notes/Note';

let _db: SQLite.SQLiteDatabase | undefined;

export async function openDatabase(): Promise<Database> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('nerd_journal.db');
    await _db.execAsync(NOTES_TABLE_SQL);
  }
  return _db as unknown as Database;
}

/** Call in tests or on factory-wipe to force a fresh connection next time. */
export function resetDatabaseInstance(): void {
  _db = undefined;
}
