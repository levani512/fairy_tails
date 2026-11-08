'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useField, useFormFields } from '@payloadcms/ui';
import type { JSONFieldClientComponent } from 'payload';
import type { Timing } from '../../../../packages/shared/src/index';
import {
  activeWord,
  textSegments,
} from '../../../../packages/story-player/src/index';

export const TimingEditor: JSONFieldClientComponent = ({ path, readOnly }) => {
  const { value, setValue } = useField<Timing[]>({ path });
  const audioElement = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    let frame: number;
    const update = () => {
      if (audioElement.current)
        setPosition(audioElement.current.currentTime * 1000);
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);
  const parent = path.slice(0, path.lastIndexOf('.'));
  const { value: duration, setValue: setDuration } = useField<number>({
    path: `${parent}.durationMs`,
  });
  const {
    value: delay,
    setValue: setDelay,
    showError: delayHasError,
    errorMessage: delayError,
  } = useField<number>({ path: `${parent}.delayMs` });
  const text = useFormFields(([fields]) =>
    String(fields[`${parent}.text`]?.value ?? ''),
  );
  const narrationId = useFormFields(
    ([fields]) => fields[`${parent}.narration`]?.value,
  );
  const [audio, setAudio] = useState(''),
    [position, setPosition] = useState(0),
    [error, setError] = useState(''),
    [audioStatus, setAudioStatus] = useState(''),
    [reloadAudio, setReloadAudio] = useState(0);
  const audioId =
    narrationId && typeof narrationId === 'object'
      ? String((narrationId as { id: string }).id)
      : narrationId
        ? String(narrationId)
        : '';
  const rows = Array.isArray(value) ? value : [];
  const segments = useMemo(
    () =>
      textSegments(
        text,
        rows.filter(
          (t) =>
            Number.isInteger(t.offset) &&
            t.offset >= 0 &&
            text.slice(t.offset, t.offset + t.text.length) === t.text,
        ),
      ),
    [text, value],
  );
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    setAudio('');
    setPosition(0);
    setError('');
    setAudioStatus(audioId ? 'Loading narration…' : '');
    if (!audioId) setDuration(0);
    async function loadAudio() {
      try {
        const response = await fetch(
          `/api/media/${encodeURIComponent(audioId)}`,
          {
            cache: 'no-store',
            signal: controller.signal,
          },
        );
        if (!response.ok)
          throw new Error(
            'Could not load narration. Try reloading the audio preview.',
          );
        const media = await response.json();
        if (controller.signal.aborted) return;
        if (media.processing === 'error')
          throw new Error(
            'Narration processing failed. Check the selected media.',
          );
        if (media.processing && media.processing !== 'ready') {
          setDuration(0);
          setAudioStatus(
            'Processing narration… Preview will become available automatically.',
          );
          timer = setTimeout(loadAudio, 1000);
          return;
        }
        if (!media.url)
          throw new Error('Narration has no playable audio URL yet.');
        if (Number.isFinite(media.durationMs) && media.durationMs > 0)
          setDuration(Math.round(media.durationMs));
        setAudio(media.url);
        setAudioStatus('');
      } catch (err) {
        if (!controller.signal.aborted) {
          setAudioStatus('');
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }
    if (audioId) void loadAudio();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [audioId, reloadAudio]);
  const edit = (i: number, key: keyof Timing, input: string) =>
    setValue(
      rows.map((r, n) =>
        n === i ? { ...r, [key]: key === 'text' ? input : Number(input) } : r,
      ),
    );
  const highlighted = activeWord(rows, position);
  return (
    <details
      onToggle={(event) => {
        if (event.currentTarget.open) setReloadAudio((n) => n + 1);
        else audioElement.current?.pause();
      }}
      style={{
        margin: '16px 0',
        padding: 16,
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 8,
      }}
    >
      <summary style={{ cursor: 'pointer', fontWeight: 600 }}>
        Word timings · milliseconds
      </summary>
      <div className="timing-duration-fields">
        <label>
          Duration Ms
          <input
            type="number"
            value={duration ?? 0}
            readOnly
            aria-label="Duration Ms"
          />
        </label>
        <label>
          Delay Ms
          <input
            type="number"
            min={0}
            step={1}
            value={delay ?? 0}
            readOnly={readOnly}
            aria-label="Delay Ms"
            onChange={(event) =>
              setDelay(
                event.target.value === '' ? 0 : Number(event.target.value),
              )
            }
          />
        </label>
      </div>
      {delayHasError && <p role="alert">{delayError}</p>}
      <p className="admin-hint">
        Import a JSON array or adjust each token below. Offsets refer to the
        exact text, including punctuation and spaces.
      </p>
      <input
        aria-label="Import word timing JSON"
        type="file"
        accept="application/json,.json"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const data = JSON.parse(await file.text());
            if (
              !Array.isArray(data) ||
              data.some(
                (t) =>
                  typeof t.text !== 'string' ||
                  !Number.isFinite(t.startMs) ||
                  !Number.isFinite(t.endMs) ||
                  !Number.isInteger(t.offset),
              )
            )
              throw new Error(
                'Expected timing rows with text, offset, startMs and endMs.',
              );
            setValue(data.map((t, i) => ({ ...t, index: i })));
            setError('');
          } catch (err) {
            setError(String(err));
          }
        }}
      />
      {error && (
        <p role="alert" style={{ color: 'var(--theme-error-500)' }}>
          {error}
        </p>
      )}
      {audioStatus && <p role="status">{audioStatus}</p>}
      {error && audioId && (
        <button type="button" onClick={() => setReloadAudio((n) => n + 1)}>
          Reload audio preview
        </button>
      )}
      {audio && (
        <audio
          key={`${audioId}:${reloadAudio}:${audio}`}
          ref={audioElement}
          preload="metadata"
          onError={() =>
            setError(
              'Could not play narration. Reload the audio preview to try again.',
            )
          }
          controls
          src={audio}
          onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime * 1000)}
          style={{ width: '100%', marginTop: 16 }}
        />
      )}
      <p style={{ fontSize: 20, lineHeight: 1.8 }}>
        {segments.map((part, i) => (
          <span
            key={i}
            style={{
              background:
                part.index >= 0 && part.index === highlighted
                  ? '#f5d68b'
                  : undefined,
              color:
                part.index >= 0 && part.index === highlighted
                  ? '#263f36'
                  : undefined,
            }}
          >
            {part.text}
          </span>
        ))}
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%' }}>
          <thead>
            <tr>
              {['Token', 'Offset', 'Start ms', 'End ms', ''].map((x, i) => (
                <th key={i} style={{ textAlign: 'left' }}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {(['text', 'offset', 'startMs', 'endMs'] as const).map(
                  (key) => (
                    <td key={key}>
                      <input
                        aria-label={`Token ${i + 1} ${key}`}
                        type={key === 'text' ? 'text' : 'number'}
                        min={0}
                        value={row[key]}
                        onChange={(e) => edit(i, key, e.target.value)}
                        style={{ width: key === 'text' ? 150 : 95, padding: 7 }}
                      />
                    </td>
                  ),
                )}
                <td>
                  <button
                    type="button"
                    onClick={() =>
                      setValue(
                        rows
                          .filter((_, n) => n !== i)
                          .map((r, n) => ({ ...r, index: n })),
                      )
                    }
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={() =>
          setValue([
            ...rows,
            {
              index: rows.length,
              text: '',
              offset: 0,
              startMs: rows.at(-1)?.endMs ?? 0,
              endMs: (rows.at(-1)?.endMs ?? 0) + 300,
            },
          ])
        }
      >
        Add timing
      </button>
      <p className="admin-hint">
        Publication validates matching text, ordering and audio bounds. This
        editor never invents synchronization.
      </p>
    </details>
  );
};
