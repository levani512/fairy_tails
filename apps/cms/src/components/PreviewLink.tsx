'use client';
import React from 'react';
import { useDocumentInfo } from '@payloadcms/ui';
export function PreviewLink() {
  const { id } = useDocumentInfo();
  return (
    <p>
      Save changes, then{' '}
      <a href={`/preview/${id}`} target="_blank" rel="noreferrer">
        open the authenticated draft preview
      </a>
      . Publication checks every configured language.
    </p>
  );
}
