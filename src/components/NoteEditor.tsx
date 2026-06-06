import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { T }     from '../design/components/T';
import { Box }   from '../design/components/Box';
import { Input } from '../design/components/Input';
import { Btn }   from '../design/components/Btn';
import { AiAssistant } from './AiAssistant';
import { useAi } from '../ai/AiContext';
import { Colors, Spacing } from '../design/tokens';
import type { Note } from '../notes/Note';

interface Props {
  initialTitle:   string;
  initialContent: string;
  onSave:   (patch: Pick<Note, 'title' | 'content'>) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const AUTO_TITLE_PROMPT =
  'Generate a concise title (max 60 characters) for this journal note. ' +
  'Return ONLY the title text, no quotes, no punctuation at the end.';

export function NoteEditor({ initialTitle, initialContent, onSave, onDelete }: Props) {
  const [title,          setTitle]          = useState(initialTitle);
  const [content,        setContent]        = useState(initialContent);
  const [saving,         setSaving]         = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [error,          setError]          = useState('');
  const ai = useAi();

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      await onSave({ title: title.trim(), content });
    } catch {
      setError('Save failed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (onDelete) await onDelete();
  }

  async function handleAutoTitle() {
    if (!content.trim()) return;
    setGeneratingTitle(true);
    const result = await ai.requestWithConsent(content, AUTO_TITLE_PROMPT);
    if (result.ok) setTitle(result.value.slice(0, 80));
    setGeneratingTitle(false);
  }

  return (
    <Box style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Title row */}
        <View style={styles.titleRow}>
          <Input
            value={title}
            onChangeText={setTitle}
            placeholder="title"
            style={[styles.titleInput, styles.titleFlex]}
            testID="editor-title"
          />
          <Btn
            label={generatingTitle ? '…' : 'AI'}
            variant="ghost"
            onPress={handleAutoTitle}
            loading={generatingTitle}
            style={styles.autoTitleBtn}
            testID="auto-title-btn"
          />
        </View>

        <Input
          value={content}
          onChangeText={setContent}
          placeholder="start writing…"
          multiline
          style={styles.contentInput}
          textAlignVertical="top"
          testID="editor-content"
        />

        {error ? <T variant="error" style={styles.error}>{error}</T> : null}

        <View style={styles.actions}>
          <Btn
            label="SAVE"
            onPress={handleSave}
            loading={saving}
            style={styles.saveBtn}
            testID="save-btn"
          />
          {onDelete && (
            <Btn
              label="DELETE"
              variant="danger"
              onPress={handleDelete}
              style={styles.deleteBtn}
              testID="delete-btn"
            />
          )}
        </View>
      </ScrollView>

      <AiAssistant noteContent={content} />
    </Box>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { flexGrow: 1, padding: Spacing.md },

  titleRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.xs,
    marginBottom:   Spacing.md,
  },
  titleFlex: { flex: 1, marginBottom: 0 },
  titleInput: {
    fontSize:    20,
    borderColor: Colors.greenMute,
  },
  autoTitleBtn: { width: 44, paddingHorizontal: 0 },

  contentInput: {
    flex:         1,
    minHeight:    300,
    marginBottom: Spacing.md,
    borderColor:  Colors.greenMute,
  },
  error:     { marginBottom: Spacing.sm },
  actions:   { flexDirection: 'row', gap: Spacing.sm },
  saveBtn:   { flex: 1 },
  deleteBtn: { flex: 1 },
});
