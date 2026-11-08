'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, useField } from '@payloadcms/ui';
import type { UploadFieldClientComponent } from 'payload';
import { altFromFilename } from '../media-fields';
import { AudioLibraryPicker } from './AudioLibraryPicker';
import { SelectedAudioPreview } from './SelectedAudioPreview';
import { validateIllustrationUpload } from './illustration-size';

export const MediaBrowse: UploadFieldClientComponent = ({ path, readOnly }) => {
  const { value, setValue, disabled, filterOptions } = useField({ path });
  const input = useRef<HTMLInputElement>(null);
  const uploading = useRef(false);
  const current = useRef({ path, value });
  current.current = { path, value };
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const isNarration = /(?:^|\.)narration$/.test(path);
  const isIllustration = /(?:^|\.)illustration$/.test(path);
  const isStoryImage =
    /(?:^|\.)(?:illustration|defaultCover|defaultThumbnail|cover|thumbnail)$/.test(
      path,
    );
  const library = /(?:^|\.)music\.asset$/.test(path)
    ? 'background-music'
    : /(?:^|\.)effects\.\d+\.asset$/.test(path)
      ? 'sound-effects'
      : undefined;
  const audioId = value
    ? String(typeof value === 'object' ? (value as { id: string }).id : value)
    : '';
  const [selectedTrack, setSelectedTrack] = useState<{
    audioId: string;
    name: string;
  }>();
  useEffect(() => {
    if (!library || !audioId || selectedTrack?.audioId === audioId) return;
    const controller = new AbortController();
    const query = new URLSearchParams({
      'where[audio][equals]': audioId,
      depth: '0',
      limit: '1',
    });
    fetch(`/api/${library}?${query}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        const track = data?.docs?.[0];
        if (!controller.signal.aborted && track)
          setSelectedTrack({ audioId, name: track.name });
      })
      .catch(() => {});
    return () => controller.abort();
  }, [library, audioId, selectedTrack?.audioId]);
  const mimeFilters: string[] = [];
  function collect(filter: any) {
    if (!filter || typeof filter !== 'object') return;
    if (filter.mimeType?.equals) mimeFilters.push(filter.mimeType.equals);
    if (filter.mimeType?.contains)
      mimeFilters.push(`${filter.mimeType.contains}*`);
    for (const child of filter.or ?? filter.and ?? []) collect(child);
    if (filter.media) collect(filter.media);
  }
  collect(filterOptions);
  const accept = mimeFilters.length
    ? mimeFilters.join(',')
    : 'image/png,image/jpeg,image/webp,video/mp4,audio/mpeg,audio/wav,audio/x-wav,audio/mp4';
  if (readOnly || disabled) return null;
  return (
    <div
      className={`direct-media-browse${isNarration && value ? ' direct-media-browse--narration-selected' : ''}${library ? ' direct-media-browse--library' : ''}${isStoryImage ? ' direct-media-browse--story-image' : ''}`}
    >
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        aria-label="Browse media file"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file || uploading.current) return;
          if (
            file.type &&
            mimeFilters.length &&
            !mimeFilters.some((mime) =>
              mime.endsWith('*')
                ? file.type.startsWith(mime.slice(0, -1))
                : file.type === mime,
            )
          ) {
            setError('Choose a file of the type allowed by this field.');
            return;
          }
          uploading.current = true;
          const originalValue = current.current.value;
          setBusy(true);
          setError('');
          try {
            if (isIllustration) await validateIllustrationUpload(file);
            const form = new FormData();
            form.append('file', file);
            form.append(
              '_payload',
              JSON.stringify({ alt: altFromFilename(file.name) }),
            );
            const response = await fetch('/api/media', {
              method: 'POST',
              headers: isIllustration
                ? { 'X-Story-Illustration': '1' }
                : undefined,
              body: form,
            });
            const body = await response.json();
            if (!response.ok || !body.doc?.id)
              throw new Error(
                body.errors?.[0]?.message ?? 'Upload failed. Please try again.',
              );
            if (
              current.current.path === path &&
              current.current.value === originalValue
            )
              setValue(body.doc.id);
          } catch (err) {
            setError(
              err instanceof Error
                ? err.message
                : 'Upload failed. Please try again.',
            );
          } finally {
            uploading.current = false;
            setBusy(false);
          }
        }}
      />
      {!value && (
        <Button
          buttonStyle="pill"
          size="small"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? 'Uploading…' : 'Browse'}
        </Button>
      )}
      {!!value && !library && !isStoryImage && (
        <Button
          aria-label={isNarration ? 'Remove narration audio' : 'Remove media'}
          buttonStyle="pill"
          size="small"
          disabled={busy}
          onClick={() => {
            setValue(null);
            setError('');
          }}
        >
          {isNarration ? '×' : 'Remove'}
        </Button>
      )}
      {library && !value && (
        <Button
          buttonStyle="pill"
          size="small"
          disabled={busy}
          onClick={() => setLibraryOpen((open) => !open)}
        >
          Choose from library
        </Button>
      )}
      {library && !value && libraryOpen && (
        <AudioLibraryPicker
          collection={library}
          onClose={() => setLibraryOpen(false)}
          onSelect={(id, name) => {
            setSelectedTrack({ audioId: String(id), name });
            setValue(id);
            setLibraryOpen(false);
            setError('');
          }}
        />
      )}
      {library && audioId && (
        <SelectedAudioPreview
          key={audioId}
          id={audioId}
          name={
            selectedTrack?.audioId === audioId ? selectedTrack.name : undefined
          }
        />
      )}
      {isIllustration && !value && (
        <p className="field-description">
          Image or video: exactly 2752 × 1536 pixels.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
};
