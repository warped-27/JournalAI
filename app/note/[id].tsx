import React, { useEffect, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useNotes } from '../../src/notes/NotesContext';
import { NoteEditor } from '../../src/components/NoteEditor';
import { Box } from '../../src/design/components/Box';
import { T }   from '../../src/design/components/T';
import { Colors, Spacing } from '../../src/design/tokens';
import type { Note } from '../../src/notes/Note';

export default function NoteScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const { notes, updateNote, deleteNote } = useNotes();

  const note = notes.find((n) => n.id === id);

  // Snapshot initial values so edits don't flicker on re-render
  const [initial] = useState<Pick<Note, 'title' | 'content'>>({
    title:   note?.title   ?? '',
    content: note?.content ?? '',
  });

  // Track intentional deletion so the useEffect doesn't double-navigate
  const deletingRef = useRef(false);

  // If note disappears (deleted here or from elsewhere), go home safely
  useEffect(() => {
    if (id && !note && !deletingRef.current) {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    }
  }, [note, id]);

  async function handleSave(patch: Pick<Note, 'title' | 'content'>) {
    if (!id) return;
    await updateNote(id, patch);
    router.back();
  }

  async function handleDelete() {
    if (!id) return;
    deletingRef.current = true;
    await deleteNote(id);
    // Let the useEffect navigate once the store update propagates
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <Box style={styles.root}>
      {/* Nav bar */}
      <View style={styles.nav}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="back-btn">
          <T variant="label">← BACK</T>
        </Pressable>
      </View>

      <NoteEditor
        initialTitle={initial.title}
        initialContent={initial.content}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </Box>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  nav: {
    paddingHorizontal: Spacing.md,
    paddingTop:        Spacing.xl,
    paddingBottom:     Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { alignSelf: 'flex-start' },
});
