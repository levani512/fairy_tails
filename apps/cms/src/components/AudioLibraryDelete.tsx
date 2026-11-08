'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDocumentInfo } from '@payloadcms/ui';
import type { DefaultCellComponentProps } from 'payload';

function DeleteButton({
  collection,
  id,
  name,
}: {
  collection: string;
  id: number | string;
  name: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <span>
      <button
        type="button"
        disabled={busy}
        aria-label={`Delete ${name}`}
        style={{
          padding: '6px 12px',
          color: 'var(--theme-error-500)',
          cursor: 'pointer',
        }}
        onClick={async (event) => {
          event.stopPropagation();
          if (
            !window.confirm(
              `Delete “${name}” from the library? Audio already used in stories will stay unchanged.`,
            )
          )
            return;
          setBusy(true);
          setError('');
          try {
            const response = await fetch(
              `/api/${collection}/${encodeURIComponent(id)}`,
              { method: 'DELETE' },
            );
            if (!response.ok) {
              const body = await response.json();
              throw new Error(
                body.errors?.[0]?.message ??
                  'Could not delete this library entry.',
              );
            }
            window.location.assign(`/admin/collections/${collection}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed.');
            setBusy(false);
          }
        }}
      >
        {busy ? 'Deleting…' : 'Delete'}
      </button>
      {error && <span role="alert">{error}</span>}
    </span>
  );
}

export function AudioLibraryNameCell({
  rowData,
  collectionSlug,
}: DefaultCellComponentProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <Link href={`/admin/collections/${collectionSlug}/${rowData.id}`}>
        {rowData.name}
      </Link>
      <DeleteButton
        collection={collectionSlug}
        id={rowData.id}
        name={rowData.name}
      />
    </div>
  );
}

export function AudioLibraryDeleteButton() {
  const { id, collectionSlug, data, hasDeletePermission } = useDocumentInfo();
  if (!id || !collectionSlug || hasDeletePermission === false) return null;
  return (
    <DeleteButton
      collection={collectionSlug}
      id={id}
      name={String(data?.name ?? 'this audio')}
    />
  );
}
