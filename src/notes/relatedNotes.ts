import { rankByRelevance } from '../ai/tfidf';
import type { Note } from './Note';

export function getRelatedNotes(current: Note, allNotes: Note[], topK = 3): Note[] {
  const others = allNotes.filter((n) => n.id !== current.id);
  if (others.length === 0) return [];

  const query  = `${current.title} ${current.content}`;
  const docs   = others.map((n) => `${n.title} ${n.content}`);
  const scores = rankByRelevance(query, docs);

  return others
    .map((note, i) => ({ note, score: scores[i]! }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(({ note }) => note);
}
