import { getRelatedNotes } from '../relatedNotes';
import type { Note } from '../Note';

function note(id: string, title: string, content: string): Note {
  return { id, title, content, attachments: [], createdAt: 0, updatedAt: 0 };
}

describe('getRelatedNotes', () => {
  it('returns empty array when allNotes has only the current note', () => {
    const n = note('a', 'hello', 'world');
    expect(getRelatedNotes(n, [n])).toEqual([]);
  });

  it('returns empty array when allNotes is empty', () => {
    const n = note('a', 'hello', 'world');
    expect(getRelatedNotes(n, [])).toEqual([]);
  });

  it('excludes the current note from results', () => {
    const current = note('a', 'javascript programming', 'functions closures async');
    const other   = note('b', 'javascript programming', 'functions closures async');
    const result  = getRelatedNotes(current, [current, other]);
    expect(result.map((n) => n.id)).not.toContain('a');
  });

  it('ranks the more similar note first', () => {
    const current  = note('a', 'machine learning neural network', 'training data model');
    const related  = note('b', 'deep learning neural network',   'training gradient model');
    const unrelated = note('c', 'cooking pasta recipe', 'boil water salt');
    const result = getRelatedNotes(current, [current, related, unrelated], 3);
    expect(result[0]!.id).toBe('b');
  });

  it('respects topK parameter', () => {
    const current = note('a', 'foo bar baz', 'alpha beta gamma');
    const others  = ['b', 'c', 'd', 'e'].map((id) =>
      note(id, 'foo bar', 'alpha beta'),
    );
    const result = getRelatedNotes(current, [current, ...others], 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('returns empty when no notes have any token overlap', () => {
    const current  = note('a', 'zzz yyy xxx', 'vvv www');
    const unrelated = note('b', 'apple orange banana', 'grape lemon');
    const result = getRelatedNotes(current, [current, unrelated]);
    expect(result).toEqual([]);
  });
});
