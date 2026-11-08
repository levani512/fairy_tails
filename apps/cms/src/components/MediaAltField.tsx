'use client';
import { useEffect, useRef } from 'react';
import { TextInput, useField, useFormFields } from '@payloadcms/ui';
import type { TextFieldClientComponent } from 'payload';
import { altFromFilename } from '../media-fields';

export const MediaAltField: TextFieldClientComponent = ({ path, readOnly }) => {
  const { value, setValue, showError, errorMessage } = useField<string>({
    path,
  });
  const file = useFormFields(
    ([fields]) => fields.file?.value as File | undefined,
  );
  const previousAuto = useRef('');
  useEffect(() => {
    if (!file?.name) return;
    const next = altFromFilename(file.name);
    if (!value || value === previousAuto.current) setValue(next);
    previousAuto.current = next;
  }, [file?.name, setValue]);
  return (
    <div style={{ marginBottom: 24 }}>
      <TextInput
        path={path}
        label="Alt"
        value={value ?? ''}
        readOnly={readOnly}
        showError={showError}
        Error={showError ? errorMessage : undefined}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setValue(e.target.value)
        }
      />
      <p className="admin-hint">
        Filled from the filename. You can change it to a more helpful
        description.
      </p>
    </div>
  );
};
