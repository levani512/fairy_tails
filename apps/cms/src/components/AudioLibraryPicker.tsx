'use client';

import { useEffect, useState } from 'react';
type Track = {
  id: number;
  name: string;
  audio: { id: number; url?: string; processing?: string };
};
export function AudioLibraryPicker({
  collection,
  onSelect,
  onClose,
}: {
  collection: 'background-music' | 'sound-effects';
  onSelect: (id: number, name: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(''),
    [page, setPage] = useState(1);
  const [tracks, setTracks] = useState<Track[]>([]),
    [next, setNext] = useState(false);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          depth: '1',
          limit: '10',
          page: String(page),
          sort: 'name',
        });
        if (query.trim()) params.set('where[name][contains]', query.trim());
        const response = await fetch(`/api/${collection}?${params}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok)
          throw new Error(
            'Could not load the audio library. Please reopen it to try again.',
          );
        const data = await response.json();
        if (!controller.signal.aborted) {
          setTracks(data.docs);
          setNext(data.hasNextPage);
        }
      } catch (err) {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error ? err.message : 'Could not load library.',
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, page, collection]);
  return (
    <section
      className="audio-library-picker"
      aria-label={
        collection === 'background-music'
          ? 'Background Music library'
          : 'Sound Effects library'
      }
    >
      <div className="audio-library-picker__header">
        <strong>
          {collection === 'background-music'
            ? 'Background Music'
            : 'Sound Effects'}
        </strong>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <input
        type="search"
        aria-label="Search audio library"
        placeholder="Search by name…"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setPage(1);
        }}
      />
      <div className="audio-library-picker__tracks">
        {loading ? (
          <p role="status">Loading…</p>
        ) : error ? (
          <p role="alert">{error}</p>
        ) : tracks.length ? (
          tracks.map((track) => (
            <div key={track.id} className="audio-library-picker__track">
              <strong>{track.name}</strong>
              {track.audio?.url && (
                <audio
                  controls
                  preload="none"
                  src={track.audio.url}
                  aria-label={`Preview ${track.name}`}
                />
              )}
              <button
                type="button"
                disabled={
                  !track.audio?.id || track.audio.processing !== 'ready'
                }
                onClick={() => onSelect(track.audio.id, track.name)}
              >
                {track.audio?.processing === 'ready'
                  ? 'Use this audio'
                  : 'Not ready yet'}
              </button>
            </div>
          ))
        ) : (
          <p>No matching tracks. Add named audio in the library.</p>
        )}
      </div>
      <div className="audio-library-picker__header">
        <button
          type="button"
          disabled={loading || page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          type="button"
          disabled={loading || !next}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
      <a
        href={`/admin/collections/${collection}`}
        target="_blank"
        rel="noreferrer"
      >
        Manage library ↗
      </a>
    </section>
  );
}
