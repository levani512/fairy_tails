'use client';

import { useEffect, useRef } from 'react';
import { useField, useRowLabel } from '@payloadcms/ui';

export function PageRowLabel() {
  const { path, rowNumber } = useRowLabel<{ name?: string }>();
  const { value, setValue, disabled } = useField<string>({ path: `${path}.name` });
  const number = (rowNumber ?? 0) + 1;
  const initialized = useRef(false);
  useEffect(() => {
    if (disabled || initialized.current) return;
    initialized.current = true;
    if (!value) setValue(`page_${number}`);
  }, [disabled, number, setValue, value]);
  return (
    <span className="page-header-name">
      <span>{`Page ${number} –`}</span>
      <input
        type="text"
        aria-label={`Page ${number} name`}
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => setValue(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Enter') {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
    </span>
  );
}
