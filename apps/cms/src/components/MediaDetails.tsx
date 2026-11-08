'use client';
import { useDocumentInfo, useFormFields } from '@payloadcms/ui';
import { durationLabel, kindFromMime } from '../media-fields';

export function MediaDetails() {
  const { id, data } = useDocumentInfo();
  const file = useFormFields(
    ([fields]) => fields.file?.value as File | undefined,
  );
  const mime = file?.type || String(data?.mimeType ?? '');
  if (!id) return mime ? <p>File type: {kindFromMime(mime)}</p> : null;
  const timed = /^(audio|video)\//.test(mime);
  return (
    <div style={{ marginBottom: 24 }}>
      <p>File type: {kindFromMime(mime)}</p>
      {timed && data?.processing === 'pending' && (
        <p role="status">
          Preparing this file for playback. Refresh shortly to see when it is
          ready.
        </p>
      )}
      {data?.processing === 'error' && (
        <p role="alert">
          This file could not be prepared:{' '}
          {String(data.processingError || 'Please upload a corrected file.')}
        </p>
      )}
      {timed && data?.processing === 'ready' && (
        <p>
          Ready to play
          {Number(data.durationMs) > 0
            ? ` · Length ${durationLabel(Number(data.durationMs))}`
            : ''}
        </p>
      )}
      <details>
        <summary>File details</summary>
        {data?.hash && (
          <p style={{ overflowWrap: 'anywhere' }}>
            SHA-256: <code>{String(data.hash)}</code>
          </p>
        )}
        {data?.originalFilename && (
          <p>Original file: {String(data.originalFilename)}</p>
        )}
      </details>
    </div>
  );
}
