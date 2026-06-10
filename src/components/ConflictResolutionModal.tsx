import React, { useState } from 'react';
import { Modal, View, ScrollView, StyleSheet } from 'react-native';
import { T }   from '../design/components/T';
import { Btn } from '../design/components/Btn';
import { Colors, Spacing } from '../design/tokens';
import type { ConflictInfo } from '../sync/syncRepository';
import { useNotes } from '../notes/NotesContext';

interface Props {
  conflicts: ConflictInfo[];
  onDone:    () => void;
}

function fmtDate(ms: number): string {
  return new Date(ms).toLocaleString(undefined, {
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

export function ConflictResolutionModal({ conflicts, onDone }: Props) {
  const notes = useNotes();
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [loading,  setLoading]  = useState<string | null>(null);

  async function handleUseRemote(conflict: ConflictInfo) {
    setLoading(conflict.noteId);
    try {
      await notes.resolveConflict(conflict.noteId, conflict.remoteEnvelope, conflict.remoteUpdatedAt);
      setResolved((prev) => new Set([...prev, conflict.noteId]));
    } finally {
      setLoading(null);
    }
  }

  const remaining = conflicts.filter((c) => !resolved.has(c.noteId));

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onDone}
      testID="conflict-modal"
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <T variant="heading" style={styles.title}>SYNC CONFLICTS</T>

          <T variant="muted" style={styles.desc}>
            {conflicts.length} note{conflicts.length !== 1 ? 's' : ''} existed on both devices with
            different content. Your local version was kept. You can replace any note with the
            remote version below.
          </T>

          <ScrollView style={styles.list} testID="conflict-list">
            {conflicts.map((c) => {
              const done = resolved.has(c.noteId);
              return (
                <View key={c.noteId} style={[styles.row, done && styles.rowDone]}>
                  <View style={styles.rowInfo}>
                    <T variant="mono" style={styles.noteId}>
                      {c.noteId.slice(0, 8)}…
                    </T>
                    <T variant="muted" style={styles.ts}>
                      Local:  {fmtDate(c.localUpdatedAt)}
                    </T>
                    <T variant="muted" style={styles.ts}>
                      Remote: {fmtDate(c.remoteUpdatedAt)}
                    </T>
                  </View>

                  {done ? (
                    <T variant="label" style={styles.resolvedBadge}>REPLACED ✓</T>
                  ) : (
                    <View style={styles.rowActions}>
                      <Btn
                        variant="ghost"
                        label="KEEP LOCAL"
                        onPress={() => setResolved((prev) => new Set([...prev, c.noteId]))}
                        style={styles.actionBtn}
                        testID={`conflict-keep-local-${c.noteId}`}
                      />
                      <Btn
                        variant="primary"
                        label={loading === c.noteId ? 'APPLYING…' : 'USE REMOTE'}
                        loading={loading === c.noteId}
                        onPress={() => handleUseRemote(c)}
                        style={styles.actionBtn}
                        testID={`conflict-use-remote-${c.noteId}`}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <Btn
            variant="primary"
            label={remaining.length === 0 ? 'DONE' : `KEEP LOCAL FOR REMAINING (${remaining.length})`}
            onPress={onDone}
            style={styles.doneBtn}
            testID="conflict-done"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent:  'center',
    alignItems:      'center',
    padding:         Spacing.md,
  },
  dialog: {
    width:           '100%',
    maxWidth:        520,
    maxHeight:       '80%',
    backgroundColor: Colors.bgSurface,
    borderWidth:     1,
    borderColor:     Colors.border,
    padding:         Spacing.lg,
  },
  title:   { marginBottom: Spacing.sm },
  desc:    { marginBottom: Spacing.md, lineHeight: 18 },
  list:    { maxHeight: 340 },
  row: {
    borderWidth:   1,
    borderColor:   Colors.border,
    padding:       Spacing.sm,
    marginBottom:  Spacing.xs,
  },
  rowDone: { borderColor: Colors.green, backgroundColor: Colors.greenBg },
  rowInfo: { marginBottom: Spacing.xs },
  noteId:  { marginBottom: 2 },
  ts:      { lineHeight: 16 },
  rowActions: {
    flexDirection: 'row',
    gap:           Spacing.xs,
    marginTop:     Spacing.xs,
  },
  actionBtn:     { flex: 1 },
  resolvedBadge: { alignSelf: 'flex-start', marginTop: Spacing.xs },
  doneBtn:       { marginTop: Spacing.md },
});
