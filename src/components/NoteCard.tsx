import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { T }   from '../design/components/T';
import { Box } from '../design/components/Box';
import { Colors, Spacing, BorderWidth } from '../design/tokens';
import type { Note } from '../notes/Note';

const PREVIEW_LENGTH = 120;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-CA'); // YYYY-MM-DD
}

interface Props {
  note:    Note;
  onPress: () => void;
}

export function NoteCard({ note, onPress }: Props) {
  const preview = note.content.length > PREVIEW_LENGTH
    ? note.content.slice(0, PREVIEW_LENGTH) + '…'
    : note.content;

  return (
    <Pressable testID="note-card" onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      <Box surface style={styles.card}>
        <T variant="heading" style={styles.title} numberOfLines={1}>{note.title || '(no title)'}</T>
        {preview ? <T variant="muted" style={styles.preview} numberOfLines={2}>{preview}</T> : null}
        <T variant="caption" style={styles.date}>{formatDate(note.updatedAt)}</T>
      </Box>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth:   BorderWidth.normal,
    borderColor:   Colors.border,
    padding:       Spacing.md,
    marginBottom:  Spacing.sm,
  },
  title:   { marginBottom: Spacing.xs },
  preview: { marginBottom: Spacing.xs },
  date:    {},
  pressed: { opacity: 0.7 },
});
