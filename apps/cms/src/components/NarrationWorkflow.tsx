'use client';
import { useEffect, useRef, useState } from 'react';
import { useField, useFormFields } from '@payloadcms/ui';
import type { TextFieldClientComponent, UIFieldClientComponent } from 'payload';

async function request(action: string, input: object = {}) {
  const response = await fetch(`/api/narration/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Request failed.');
  }
  return response;
}
const idOf = (value: any) => String(value?.id ?? value ?? '');
let voiceRequest: Promise<any> | undefined;
function loadVoices() {
  return (voiceRequest ??= request('voices')
    .then((r) => r.json())
    .catch((error) => {
      voiceRequest = undefined;
      throw error;
    }));
}

export const NarrationVoice: TextFieldClientComponent = ({
  path,
  readOnly,
}) => {
  const parent = path.slice(0, path.lastIndexOf('.'));
  const { value: voice, setValue: setVoice } = useField<string>({ path });
  const text = useFormFields(([fields]) =>
    String(fields[`${parent}.text`]?.value ?? ''),
  );
  const { setValue: setAudio } = useField({ path: `${parent}.narration` });
  const { setValue: setTimings } = useField({ path: `${parent}.timings` });
  const { setValue: setSync } = useField({ path: `${parent}.syncState` });
  const { setValue: setDuration } = useField({ path: `${parent}.durationMs` });
  const [voices, setVoices] = useState<{ voice_id: string; name: string }[]>(
    [],
  );
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<{
    blob: Blob;
    url: string;
    text: string;
    voice: string;
  }>();
  const current = useRef({ text, voice });
  current.current = { text, voice };
  useEffect(() => {
    let active = true;
    loadVoices()
      .then((data) => {
        if (active) {
          setVoices(data.voices);
          setConfigured(data.configured);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );
  const stale = preview && (preview.text !== text || preview.voice !== voice);
  const generate = async () => {
    const source = { text, voice: voice! };
    setBusy('Generating…');
    setError('');
    setNotice('');
    try {
      const blob = await (
        await request('generate', { text, voiceId: voice })
      ).blob();
      if (
        current.current.text !== source.text ||
        current.current.voice !== source.voice
      )
        throw new Error(
          'Text or voice changed during generation. Generate again for the current selection.',
        );
      setPreview({ blob, url: URL.createObjectURL(blob), ...source });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };
  const useAudio = async () => {
    if (!preview || stale) return;
    setBusy('Saving audio…');
    setError('');
    try {
      const form = new FormData();
      form.append('file', preview.blob, `narration-${Date.now()}.mp3`);
      form.append(
        '_payload',
        JSON.stringify({ alt: `Narration: ${preview.text.slice(0, 80)}` }),
      );
      const response = await fetch('/api/media', {
        method: 'POST',
        body: form,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.errors?.[0]?.message || 'Could not save generated audio.',
        );
      if (
        current.current.text !== preview.text ||
        current.current.voice !== preview.voice
      )
        throw new Error(
          'Text or voice changed. Audio was saved in Media but was not assigned.',
        );
      setAudio(result.doc.id);
      setTimings([]);
      setSync(null);
      setDuration(0);
      setPreview(undefined);
      setNotice(
        'Audio assigned. Wait for processing, then click Sync audio with text. Save the story to keep your changes.',
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy('');
    }
  };
  return (
    <div className="narration-workflow">
      <label htmlFor={`${path}-voice`}>Narration voice</label>
      <div className="narration-actions narration-voice-actions">
        <select
          id={`${path}-voice`}
          value={voice || ''}
          disabled={readOnly || !!busy || configured !== true}
          onChange={(e) => setVoice(e.target.value)}
        >
          <option value="">
            {configured === false
              ? 'ElevenLabs not configured'
              : 'Choose a voice'}
          </option>
          {voice && !voices.some((v) => v.voice_id === voice) && (
            <option value={voice}>{voice}</option>
          )}
          {voices.map((v) => (
            <option key={v.voice_id} value={v.voice_id}>
              {v.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={
            readOnly || !!busy || !text.trim() || !voice || configured !== true
          }
          onClick={generate}
        >
          {busy || 'Generate voice'}
        </button>
      </div>
      {configured === false && (
        <p className="admin-warning">
          Add ELEVENLABS_API_KEY to the backend configuration to enable
          generation and syncing. Manual upload remains available.
        </p>
      )}
      {configured && (
        <p>
          Generation uses ElevenLabs credits. Preview before assigning the
          recording.
        </p>
      )}
      {preview && (
        <div>
          <audio
            controls
            src={preview.url}
            aria-label="Generated narration preview"
          />
          <div className="narration-actions">
            <button
              type="button"
              disabled={readOnly || !!busy || !!stale}
              onClick={useAudio}
            >
              Use this audio
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => setPreview(undefined)}
            >
              Discard preview
            </button>
          </div>
          {stale && <p className="admin-warning">Text or voice changed. Generate a new preview.</p>}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
    </div>
  );
};

export const NarrationSync: UIFieldClientComponent = ({ path }) => {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const parent = path.slice(0, path.lastIndexOf('.'));
  const text = useFormFields(([fields]) =>
    String(fields[`${parent}.text`]?.value ?? ''),
  );
  const audioId = useFormFields(([fields]) =>
    idOf(fields[`${parent}.narration`]?.value),
  );
  const { setValue: setState } = useField<{
    text: string;
    audioId: string;
  }>({ path: `${parent}.syncState` });
  const { setValue: setTimings } = useField({ path: `${parent}.timings` });
  const { setValue: setDuration } = useField({ path: `${parent}.durationMs` });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    loadVoices()
      .then((data) => {
        if (active) setConfigured(data.configured);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  const current = useRef({ text, audioId });
  current.current = { text, audioId };
  const previous = useRef({ text, audioId });
  useEffect(() => {
    if (
      previous.current.text !== text ||
      previous.current.audioId !== audioId
    ) {
      setTimings([]);
      setError(
        'Text or audio changed. Sync again to update word highlighting.',
      );
      if (previous.current.audioId !== audioId) setDuration(0);
    }
    previous.current = { text, audioId };
  }, [text, audioId]);
  const sync = async () => {
    const source = { text, audioId };
    setBusy(true);
    setError('');
    try {
      const result = await (await request('sync', source)).json();
      if (
        current.current.text !== source.text ||
        current.current.audioId !== source.audioId
      )
        throw new Error(
          'Text or audio changed during syncing. Please sync again.',
        );
      setTimings(result.timings);
      setDuration(result.durationMs);
      setState(result.syncState);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="narration-workflow narration-sync-workflow">
      <div className="narration-sync-notices">
      {configured === false && (
        <p role="alert">
          Sync requires an ElevenLabs API key, including for manually uploaded
          recordings. Add ELEVENLABS_API_KEY to apps/cms/.env and restart the
          backend.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      </div>
      <button
        type="button"
        disabled={busy || configured !== true || !text.trim() || !audioId}
        onClick={sync}
      >
        {busy ? 'Syncing…' : 'Sync audio with text'}
      </button>
    </div>
  );
};
