import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import type { Attachment } from '../notes/Note';
import { newId } from '../lib/id';
import { pickImage, takePhoto } from '../attachments/pickImage';
import { pickFile }             from '../attachments/pickFile';
import { T }   from '../design/components/T';
import { Btn } from '../design/components/Btn';
import { LinkInput }    from './LinkInput';
import { VoiceRecorder } from './VoiceRecorder';
import { Colors, Spacing } from '../design/tokens';

type Panel = 'menu' | 'link' | 'voice';

interface Props {
  onAdd:    (a: Attachment) => void;
  onClose:  () => void;
}

export function AttachmentPicker({ onAdd, onClose }: Props) {
  const [panel, setPanel] = useState<Panel>('menu');
  const [error, setError] = useState('');

  async function handleImage() {
    setError('');
    try {
      const a = await pickImage();
      if (a) { onAdd(a); onClose(); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image pick failed');
    }
  }

  async function handlePhoto() {
    setError('');
    try {
      const a = await takePhoto();
      if (a) { onAdd(a); onClose(); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Camera failed');
    }
  }

  async function handleFile() {
    setError('');
    try {
      const a = await pickFile();
      if (a) { onAdd(a); onClose(); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'File pick failed');
    }
  }

  function handleLink(url: string, title: string) {
    onAdd({
      id:        newId(),
      type:      'link',
      createdAt: Date.now(),
      url,
      title: title || undefined,
    });
    onClose();
  }

  if (panel === 'link')  return <LinkInput    onAdd={handleLink}  onCancel={onClose} />;
  if (panel === 'voice') return <VoiceRecorder onAdd={(a) => { onAdd(a); onClose(); }} onCancel={onClose} />;

  return (
    <View style={styles.root} testID="attachment-picker">
      <T variant="label" style={styles.heading}>ADD ATTACHMENT</T>

      {error ? <T variant="error" style={styles.error}>{error}</T> : null}

      <View style={styles.grid}>
        <Btn variant="ghost" label="🔗  LINK"   onPress={() => setPanel('link')}  style={styles.tile} testID="pick-link"  />
        <Btn variant="ghost" label="🎙  VOICE"  onPress={() => setPanel('voice')} style={styles.tile} testID="pick-voice" />
        <Btn variant="ghost" label="🖼  IMAGE"  onPress={handleImage}             style={styles.tile} testID="pick-image" />
        {Platform.OS !== 'web' && (
          <Btn variant="ghost" label="📷  PHOTO"  onPress={handlePhoto}             style={styles.tile} testID="pick-photo" />
        )}
        <Btn variant="ghost" label="📄  FILE"   onPress={handleFile}              style={styles.tile} testID="pick-file"  />
      </View>

      <Btn variant="ghost" label="CANCEL" onPress={onClose} style={styles.cancel} testID="pick-cancel" />
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { borderTopWidth: 1, borderTopColor: Colors.border, padding: Spacing.md },
  heading: { marginBottom: Spacing.md },
  error:   { marginBottom: Spacing.sm },
  grid:    { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  tile:    { minWidth: 120, flex: 1 },
  cancel:  { marginTop: Spacing.xs },
});
