import type { Endpoint } from 'payload';
import { readFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { privateObjectURL } from './s3';
import { alignmentTimings } from './narration-alignment';

async function eleven(path: string, init: RequestInit = {}) {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key)
    throw new Error(
      'ElevenLabs is not configured. Add ELEVENLABS_API_KEY to the backend environment and restart it. Manual uploads are still available.',
    );
  const response = await fetch(`https://api.elevenlabs.io/${path}`, {
    ...init,
    headers: { ...init.headers, 'xi-api-key': key },
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail;
    const reason =
      typeof detail?.message === 'string'
        ? detail.message
        : 'Check your API key, permissions, credits and selected voice/model.';
    const safeReason = reason
      .replaceAll(key, '[redacted]')
      .replace(/sk_[a-zA-Z0-9_-]+/g, '[redacted]')
      .slice(0, 1000);
    throw new Error(
      `ElevenLabs request failed (${response.status}): ${safeReason}`,
    );
  }
  return response;
}
const busy = new Set<string>();
export const narrationEndpoints: Endpoint[] = [
  {
    path: '/narration/:action',
    method: 'post',
    handler: async (req) => {
      if (!req.user)
        return Response.json(
          { error: 'Sign in as an administrator.' },
          { status: 401 },
        );
      const origin = req.headers.get('origin');
      if (origin && origin !== new URL(req.url!).origin)
        return Response.json({ error: 'Invalid origin.' }, { status: 403 });
      const user = String(req.user.id);
      const action = req.routeParams?.action;
      const exclusive = action !== 'voices';
      if (exclusive && busy.has(user))
        return Response.json(
          { error: 'A narration request is already running. Please wait.' },
          { status: 429 },
        );
      if (exclusive) busy.add(user);
      try {
        if (action === 'voices') {
          if (!process.env.ELEVENLABS_API_KEY)
            return Response.json({ configured: false, voices: [] });
          const voices: { voice_id: string; name: string }[] = [];
          let next = '';
          do {
            const result = await (
              await eleven(
                `v2/voices?page_size=100${next ? `&next_page_token=${encodeURIComponent(next)}` : ''}`,
              )
            ).json();
            voices.push(
              ...result.voices.map((v: any) => ({
                voice_id: v.voice_id,
                name: v.name,
              })),
            );
            next = result.has_more ? result.next_page_token : '';
          } while (next);
          return Response.json({ configured: true, voices });
        }
        const input = await req.json!();
        if (
          typeof input.text !== 'string' ||
          !input.text.trim() ||
          input.text.length > 5000
        )
          throw new Error('Enter narration text (up to 5,000 characters).');
        if (action === 'generate') {
          if (
            typeof input.voiceId !== 'string' ||
            !/^[a-zA-Z0-9_-]{1,100}$/.test(input.voiceId)
          )
            throw new Error('Select a narration voice.');
          const audio = await eleven(
            `v1/text-to-speech/${input.voiceId}?output_format=mp3_44100_128`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: input.text,
                model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_v3',
              }),
            },
          );
          return new Response(await audio.arrayBuffer(), {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Cache-Control': 'no-store',
            },
          });
        }
        if (action === 'sync') {
          const media = await req.payload.findByID({
            collection: 'media',
            id: input.audioId,
            req,
            overrideAccess: false,
          });
          if (!media.mimeType?.startsWith('audio/'))
            throw new Error('Select an audio file.');
          if (media.processing !== 'ready' || !media.durationMs)
            throw new Error(
              'Audio is still processing. Wait a moment, then sync again.',
            );
          if (!media.filename || basename(media.filename) !== media.filename)
            throw new Error('Invalid audio filename.');
          const bytes = process.env.S3_BUCKET
            ? new Uint8Array(
                await (
                  await fetch(await privateObjectURL(media.filename))
                ).arrayBuffer(),
              )
            : new Uint8Array(await readFile(resolve('media', media.filename)));
          const form = new FormData();
          form.append(
            'file',
            new Blob([bytes], { type: media.mimeType }),
            media.filename,
          );
          form.append('text', input.text);
          const result = await (
            await eleven('v1/forced-alignment', { method: 'POST', body: form })
          ).json();
          const timings = alignmentTimings(
            input.text,
            result.words,
            media.durationMs,
          );
          return Response.json({
            timings,
            durationMs: media.durationMs,
            syncState: { text: input.text, audioId: String(media.id) },
          });
        }
        return Response.json(
          { error: 'Unknown narration action.' },
          { status: 404 },
        );
      } catch (error) {
        return Response.json(
          {
            error:
              error instanceof Error
                ? error.message
                : 'Narration request failed.',
          },
          { status: 400 },
        );
      } finally {
        if (exclusive) busy.delete(user);
      }
    },
  },
];
