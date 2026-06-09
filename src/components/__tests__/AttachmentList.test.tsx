import React, { act } from 'react';
import TestRenderer from 'react-test-renderer';
import { AttachmentList } from '../AttachmentList';
import type { Attachment } from '../../notes/Note';

jest.mock('react-native', () => ({
  Platform:   { OS: 'web' },
  View:       'View',
  Pressable:  'Pressable',
  Image:      'Image',
  Text:       'Text',
  StyleSheet: { create: (s: object) => s, flatten: (s: unknown) => s },
  Linking:    { openURL: jest.fn() },
}));

jest.mock('../../design/components/T',      () => ({ T: 'Text' }));
jest.mock('../../design/tokens',            () => ({
  Colors:     { border: '#333', textMuted: '#888', green: '#0f0', error: '#f00', surface: '#111' },
  Spacing:    { xs: 4, sm: 8, md: 16 },
  Typography: { sizeSm: 14, sizeXs: 12 },
}));

function makeAttachment(overrides: Partial<Attachment>): Attachment {
  return {
    id:        'a1',
    type:      'file',
    createdAt: 1000,
    ...overrides,
  };
}

describe('AttachmentList', () => {
  it('renders nothing for empty list', () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AttachmentList attachments={[]} onRemove={jest.fn()} />
      );
    });
    expect(renderer.toJSON()).toBeNull();
  });

  it('renders a file attachment row', () => {
    const onRemove = jest.fn();
    const a = makeAttachment({ id: 'f1', type: 'file', name: 'note.txt' });
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AttachmentList attachments={[a]} onRemove={onRemove} />
      );
    });
    expect(renderer.root.findByProps({ testID: 'attachment-f1' })).toBeTruthy();
    const removeBtn = renderer.root.findByProps({ testID: 'attachment-remove-f1' });
    act(() => { removeBtn.props.onPress(); });
    expect(onRemove).toHaveBeenCalledWith('f1');
  });

  it('renders a link attachment with url', () => {
    const { Linking } = require('react-native');
    const a = makeAttachment({
      id:    'l1',
      type:  'link',
      url:   'https://example.com',
      title: 'Example',
    });
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AttachmentList attachments={[a]} onRemove={jest.fn()} />
      );
    });
    const labelPress = renderer.root.findByProps({ testID: 'attachment-label-l1' });
    act(() => { labelPress.props.onPress(); });
    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com');
  });

  it('renders image attachment in thumbnail strip', () => {
    const a = makeAttachment({
      id:       'i1',
      type:     'image',
      name:     'photo.jpg',
      mimeType: 'image/jpeg',
      data:     'base64data',
    });
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AttachmentList attachments={[a]} onRemove={jest.fn()} />
      );
    });
    expect(renderer.root.findByProps({ testID: 'attachment-images' })).toBeTruthy();
    const img = renderer.root.findByProps({ testID: 'attachment-image-i1' });
    expect(img).toBeTruthy();
  });

  it('renders image thumbnail with correct data URI', () => {
    const a = makeAttachment({
      id:       'i2',
      type:     'image',
      mimeType: 'image/png',
      data:     'abc123',
    });
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AttachmentList attachments={[a]} onRemove={jest.fn()} />
      );
    });
    const imageEl = renderer.root.findByType('Image' as unknown as React.ComponentType);
    expect(imageEl.props.source.uri).toBe('data:image/png;base64,abc123');
  });

  it('renders placeholder when image has no data', () => {
    const a = makeAttachment({ id: 'i3', type: 'image', name: 'missing.jpg' });
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AttachmentList attachments={[a]} onRemove={jest.fn()} />
      );
    });
    expect(() => renderer.root.findByType('Image' as unknown as React.ComponentType)).toThrow();
  });

  it('separates images from other attachments', () => {
    const img  = makeAttachment({ id: 'i4', type: 'image', data: 'x' });
    const file = makeAttachment({ id: 'f2', type: 'file', name: 'doc.pdf' });
    let renderer!: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(
        <AttachmentList attachments={[img, file]} onRemove={jest.fn()} />
      );
    });
    expect(renderer.root.findByProps({ testID: 'attachment-images' })).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'attachment-f2' })).toBeTruthy();
  });
});
