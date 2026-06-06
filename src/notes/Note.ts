export interface Note {
  id:        string;
  title:     string;
  content:   string;
  createdAt: number; // unix ms
  updatedAt: number; // unix ms
}

/** Shape of a row as stored in SQLite (id + encrypted JSON + timestamps). */
export interface NoteRow {
  id:         string;
  envelope:   string; // base64url-encoded AES-GCM envelope of JSON-stringified Note
  updated_at: number;
  created_at: number;
}

export const NOTES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS notes (
    id         TEXT    PRIMARY KEY,
    envelope   TEXT    NOT NULL,
    updated_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
`;
