import React from 'react';
import { View, Pressable, StyleSheet, Linking } from 'react-native';
import type { Attachment } from '../notes/Note';
import { T } from '../design/components/T';
import { Colors, Spacing, Typography } from '../design/tokens';

interface Props {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}

function icon(type: Attachment['type']): string {
  switch (type) {
    case 'image': return '🖼';
    case 'file':  return '📄';
    case 'link':  return '🔗';
    case 'voice': return '🎙';
  }
}

function label(a: Attachment): string {
  if (a.type === 'link')  return a.title ?? a.url ?? 'Link';
  if (a.type === 'voice') return a.transcription
    ? a.transcription.slice(0, 60) + (a.transcription.length > 60 ? '…' : '')
    : `Voice (${a.duration != null ? Math.round(a.duration) + 's' : '?'})`;
  return a.name ?? a.mimeType ?? a.type;
}

export function AttachmentList({ attachments, onRemove }: Props) {
  if (!attachments.length) return null;

  return (
    <View style={styles.root} testID="attachment-list">
      {attachments.map((a) => (
        <View key={a.id} style={styles.row} testID={`attachment-${a.id}`}>
          <T variant="mono" style={styles.icon}>{icon(a.type)}</T>

          <Pressable
            style={styles.labelWrap}
            onPress={() => {
              if (a.type === 'link' && a.url) Linking.openURL(a.url);
            }}
            testID={`attachment-label-${a.id}`}
          >
            <T
              variant={a.type === 'link' ? 'label' : 'body'}
              style={[styles.label, a.type === 'link' && styles.linkLabel]}
              numberOfLines={2}
            >
              {label(a)}
            </T>
            {a.type === 'link' && a.url && (
              <T variant="caption" style={styles.url} numberOfLines={1}>{a.url}</T>
            )}
          </Pressable>

          <Pressable
            onPress={() => onRemove(a.id)}
            style={styles.removeBtn}
            testID={`attachment-remove-${a.id}`}
            accessibilityLabel="Remove attachment"
          >
            <T variant="label" style={styles.removeIcon}>✕</T>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: Spacing.sm },
  row: {
    flexDirection:  'row',
    alignItems:     'flex-start',
    borderWidth:    1,
    borderColor:    Colors.border,
    paddingVertical:   Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginBottom:   Spacing.xs,
    gap:            Spacing.sm,
  },
  icon:      { fontSize: 16, lineHeight: 22 },
  labelWrap: { flex: 1 },
  label:     { fontSize: Typography.sizeSm, lineHeight: 20 },
  linkLabel: { color: Colors.green, textDecorationLine: 'underline' },
  url:       { color: Colors.textMuted, fontSize: Typography.sizeXs, marginTop: 2 },
  removeBtn: { paddingLeft: Spacing.xs },
  removeIcon:{ color: Colors.error, fontSize: 14 },
});
