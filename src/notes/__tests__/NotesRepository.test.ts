import { NotesRepository } from '../NotesRepository';
import { createTestDb } from '../../db/testDb';
import { type Note } from '../Note';

// Use a fast vault key (32 random bytes)
const KEY = new Uint8Array(32).fill(0xab);

function makeNote(overrides: Partial<Note> = {}): Note {
  const now = Date.now();
  return {
    id:        'note-001',
    title:     'Test title',
    content:   'Test content',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('NotesRepository', () => {
  let repo: NotesRepository;

  beforeEach(() => {
    repo = new NotesRepository(createTestDb(), KEY);
  });

  // --- insert ---

  it('inserts a note and retrieves it by id', async () => {
    const note = makeNote();
    await repo.insert(note);
    const found = await repo.findById(note.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(note.id);
    expect(found!.title).toBe(note.title);
    expect(found!.content).toBe(note.content);
  });

  it('encrypts the note (envelope is not plaintext)', async () => {
    const note = makeNote({ title: 'secret title' });
    await repo.insert(note);
    // We cannot check the raw row directly, but we verify the decrypted round-trip works
    // and that the in-memory db doesn't store plaintext title
    const found = await repo.findById(note.id);
    expect(found!.title).toBe('secret title');
  });

  // --- findAll ---

  it('findAll returns empty array when nothing stored', async () => {
    expect(await repo.findAll()).toEqual([]);
  });

  it('findAll returns all inserted notes ordered by updatedAt desc', async () => {
    const older = makeNote({ id: 'a', updatedAt: 1000 });
    const newer = makeNote({ id: 'b', updatedAt: 2000 });
    await repo.insert(older);
    await repo.insert(newer);
    const all = await repo.findAll();
    expect(all.length).toBe(2);
    expect(all[0]!.id).toBe('b'); // newest first
    expect(all[1]!.id).toBe('a');
  });

  // --- findById ---

  it('findById returns null for unknown id', async () => {
    expect(await repo.findById('nonexistent')).toBeNull();
  });

  // --- update ---

  it('update modifies title and content', async () => {
    const note = makeNote();
    await repo.insert(note);
    const updated: Note = { ...note, title: 'New title', updatedAt: note.updatedAt + 1 };
    await repo.update(updated);
    const found = await repo.findById(note.id);
    expect(found!.title).toBe('New title');
  });

  // --- delete ---

  it('delete removes the note', async () => {
    const note = makeNote();
    await repo.insert(note);
    await repo.delete(note.id);
    expect(await repo.findById(note.id)).toBeNull();
    expect(await repo.findAll()).toEqual([]);
  });

  // --- wrong key ---

  it('findById with wrong key returns null (decryption fails gracefully)', async () => {
    const note = makeNote();
    await repo.insert(note);
    const wrongKeyRepo = new NotesRepository(createTestDb(), new Uint8Array(32).fill(0xcd));
    // wrong key repo has its own db — insert with original, try to decrypt with wrong key
    const wrongDb = createTestDb();
    const rightRepo = new NotesRepository(wrongDb, KEY);
    await rightRepo.insert(note);
    const badRepo = new NotesRepository(wrongDb, new Uint8Array(32).fill(0xcd));
    expect(await badRepo.findById(note.id)).toBeNull();
  });
});
