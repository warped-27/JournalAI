import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { T }                  from '../design/components/T';
import { Colors, Spacing }    from '../design/tokens';
import { getRelatedNotes }    from '../notes/relatedNotes';
import type { Note } from '../notes/Note';

interface Props {
  currentNote: Note;
  allNotes:    Note[];
  onOpen:      (note: Note) => void;
}

export function RelatedNotes({ currentNote, allNotes, onOpen }: Props) {
  const related = useMemo(
    () => getRelatedNotes(currentNote, allNotes, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentNote.id, currentNote.title, currentNote.content, allNotes],
  );

  if (related.length === 0) return null;

  return (
    <View style={styles.wrap} testID="related-notes">
      <T variant="label" style={styles.heading}>// RELATED</T>
      {related.map((note) => (
        <Pressable
          key={note.id}
          style={styles.card}
          onPress={() => onOpen(note)}
          testID={`related-${note.id}`}
        >
          <T variant="kicker" style={styles.title} numberOfLines={1}>
            {note.title || '(untitled)'}
          </T>
          <T variant="muted" style={styles.snippet} numberOfLines={2}>
            {note.content}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: Spacing.sm,
    gap:            Spacing.xs,
  },
  heading: {
    color:         Colors.textMuted,
    marginBottom:  Spacing.xs,
  },
  card: {
    borderWidth:  1,
    borderColor:  Colors.border,
    padding:      Spacing.sm,
    gap:          2,
  },
  title:   { color: Colors.green },
  snippet: { lineHeight: 16 },
});
