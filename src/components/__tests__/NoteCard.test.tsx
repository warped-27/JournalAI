import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { NoteCard } from '../NoteCard';
import type { Note } from '../../notes/Note';

jest.mock('react-native', () => ({
  Platform:   { OS: 'web' },
  View:       'View',
  Text:       'Text',
  Pressable:  'Pressable',
  StyleSheet: { create: (s: object) => s, flatten: (s: unknown) => s },
}));

const NOTE: Note = {
  id:          'abc123',
  title:       'My Test Note',
  content:     'This is the content of the test note that is quite long and should be truncated in preview.',
  attachments: [],
  createdAt:   new Date('2025-01-15').getTime(),
  updatedAt:   new Date('2025-01-15').getTime(),
};

describe('NoteCard', () => {
  it('renders the note title', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<NoteCard note={NOTE} onPress={() => {}} />); });
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('My Test Note');
  });

  it('renders a content preview', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<NoteCard note={NOTE} onPress={() => {}} />); });
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('This is the content');
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => { renderer = TestRenderer.create(<NoteCard note={NOTE} onPress={onPress} />); });
    const pressable = renderer.root.findByProps({ testID: 'note-card' });
    act(() => pressable.props.onPress());
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
