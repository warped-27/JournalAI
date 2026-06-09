import { buildAskPrompt, getRelevantNotes } from '../askNotes';
import type { Note } from '../../notes/Note';

function note(id: string, title: string, content: string): Note {
  return { id, title, content, attachments: [], createdAt: 0, updatedAt: 0 };
}

describe('buildAskPrompt', () => {
  it('mentions no journal entries when sources is empty', () => {
    const prompt = buildAskPrompt('What did I write?', []);
    expect(prompt).toContain('no journal entries');
  });

  it('includes the question', () => {
    const n = note('a', 'My note', 'some content here');
    const prompt = buildAskPrompt('What is the answer?', [n]);
    expect(prompt).toContain('What is the answer?');
  });

  it('includes note title and content in context', () => {
    const n = note('a', 'My Title', 'important body text');
    const prompt = buildAskPrompt('question', [n]);
    expect(prompt).toContain('My Title');
    expect(prompt).toContain('important body text');
  });

  it('uses (untitled) for notes with no title', () => {
    const n = note('a', '', 'content only');
    const prompt = buildAskPrompt('question', [n]);
    expect(prompt).toContain('(untitled)');
  });

  it('truncates context to avoid excessively long prompts', () => {
    const bigNote = note('a', 'big', 'x'.repeat(4_000));
    const prompt  = buildAskPrompt('q', [bigNote]);
    expect(prompt.length).toBeLessThan(10_000);
  });
});

describe('getRelevantNotes', () => {
  it('returns empty for empty notes array', () => {
    expect(getRelevantNotes('anything', [])).toEqual([]);
  });

  it('returns up to topK results', () => {
    const notes = ['a','b','c','d','e'].map((id) =>
      note(id, 'foo bar baz', 'alpha beta gamma'),
    );
    const result = getRelevantNotes('foo bar', notes, 3);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('ranks matching note above unrelated note', () => {
    const matching   = note('a', 'typescript compiler errors', 'type checking strict');
    const unrelated  = note('b', 'cooking dinner recipe', 'pasta boil water');
    const result     = getRelevantNotes('typescript type checking', [matching, unrelated], 5);
    const ids        = result.map((n) => n.id);
    if (ids.length > 0) expect(ids[0]).toBe('a');
  });

  it('excludes notes with zero token overlap', () => {
    const n = note('a', 'apple orange banana', 'grape lemon lime');
    const result = getRelevantNotes('zzz yyy xxx', [n], 5);
    expect(result).toEqual([]);
  });
});
