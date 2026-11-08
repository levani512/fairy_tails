'use client';
import { useField, useFormFields, TextInput } from '@payloadcms/ui';
import type { TextFieldClientComponent } from 'payload';
import { slugFromName } from '../editor-utils';

export const SlugField: TextFieldClientComponent = ({ path, readOnly }) => {
  const { value, setValue, showError, errorMessage } = useField<string>({
    path,
  });
  const name = useFormFields(([fields]) => String(fields.title?.value ?? ''));
  return (
    <div className="compact-slug">
      <TextInput
        path={path}
        label="Slug"
        required
        value={value ?? ''}
        readOnly={readOnly}
        showError={showError}
        Error={showError ? errorMessage : undefined}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setValue(e.target.value)
        }
      />
      <button
        type="button"
        disabled={readOnly || !slugFromName(name)}
        onClick={() => setValue(slugFromName(name))}
      >
        Copy title
      </button>
      <p className="field-description">
        Lowercase, with hyphens between words.
      </p>
    </div>
  );
};
