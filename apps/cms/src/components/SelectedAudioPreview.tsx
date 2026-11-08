'use client';

import { useEffect, useRef, useState } from 'react';

export function SelectedAudioPreview({
  id,
  name,
}: {
  id: string;
  name?: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [source, setSource] = useState(''),
    [filename, setFilename] = useState('');
  const [playing, setPlaying] = useState(false),
    [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setSource('');
    setError('');
    setPlaying(false);
    async function load() {
      try {
        const response = await fetch(`/api/media/${encodeURIComponent(id)}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Could not load the audio preview.');
        const media = await response.json();
        if (controller.signal.aborted) return;
        setFilename(media.filename ?? 'Selected audio');
        if (media.processing === 'error')
          throw new Error('Audio processing failed.');
        if (media.processing && media.processing !== 'ready') {
          timer = setTimeout(load, 1000);
          return;
        }
        if (!media.url) throw new Error('Audio preview is unavailable.');
        setSource(media.url);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(err instanceof Error ? err.message : 'Preview unavailable.');
      }
    }
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [id, attempt]);
  useEffect(() => {
    const player = audio.current;
    return () => {
      player?.pause();
    };
  }, []);
  return (
    <div className="selected-audio-preview">
      <div className="selected-audio-preview__row">
        <strong title={name || filename || 'Selected audio'}>{name || filename || 'Selected audio'}</strong>
        <button
          type="button"
          disabled={!source || !!error}
          aria-label={`${playing ? 'Pause' : 'Play'} ${name || filename || 'selected audio'}`}
          onClick={() => {
            const player = audio.current;
            if (!player) return;
            if (!player.paused) player.pause();
            else {
              if (player.ended) player.currentTime = 0;
              void player
                .play()
                .catch(() =>
                  setError('Could not play audio. Try reloading the preview.'),
                );
            }
          }}
        >
          {!source && !error ? 'Loading…' : playing ? '❚❚ Pause' : '▶ Play'}
        </button>
      </div>
      <audio
        ref={audio}
        src={source || undefined}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          if (source)
            setError('Could not play audio. Try reloading the preview.');
        }}
      />
      {error && (
        <div role="alert">
          {error}{' '}
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            Reload preview
          </button>
        </div>
      )}
    </div>
  );
}
