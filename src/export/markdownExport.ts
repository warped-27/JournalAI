import type { Note } from '../notes/Note';

export function noteToMarkdown(note: Note): string {
  const created = new Date(note.createdAt).toISOString().slice(0, 10);
  const updated = new Date(note.updatedAt).toISOString().slice(0, 10);

  let md = `---\nid: ${note.id}\ncreated: ${created}\nupdated: ${updated}\n`;
  if (note.tags?.length) md += `tags: [${note.tags.join(', ')}]\n`;
  md += `---\n\n`;

  md += `# ${note.title || 'Untitled'}\n\n`;

  if (note.summary) {
    md += `> ${note.summary.replace(/\n/g, '\n> ')}\n\n`;
  }

  md += note.content;

  const transcriptions = note.attachments.filter(a => a.type === 'voice' && a.transcription);
  if (transcriptions.length) {
    md += '\n\n---\n\n## Voice Transcriptions\n\n';
    transcriptions.forEach((v, i) => {
      md += `### Voice ${i + 1}\n\n${v.transcription}\n\n`;
    });
  }

  return md;
}

export function bundleToMarkdown(notes: Note[]): string {
  return notes
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(noteToMarkdown)
    .join('\n\n---\n\n');
}
