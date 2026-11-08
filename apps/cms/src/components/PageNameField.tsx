'use client';

import { useEffect, useRef } from 'react';
import { TextInput, useField } from '@payloadcms/ui';
import type { TextFieldClientComponent } from 'payload';

export const PageNameField: TextFieldClientComponent = ({ path, readOnly }) => {
  const { value, setValue, showError, errorMessage } = useField<string>({
    path,
  });
  const initialized = useRef(false);
  useEffect(() => {
    if (readOnly || initialized.current) return;
    initialized.current = true;
    const match = /^pages\.(\d+)\.name$/.exec(path);
    if (!value && match) setValue(`page_${Number(match[1]) + 1}`);
  }, [path, readOnly, value, setValue]);
  return (
    <TextInput
      path={path}
      label="Name"
      value={value ?? ''}
      readOnly={readOnly}
      showError={showError}
      Error={showError ? errorMessage : undefined}
      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
        setValue(event.target.value)
      }
    />
  );
};
