'use client';

import { useEffect } from 'react';
import { useField, useForm, useFormFields } from '@payloadcms/ui';
import type {
  ArrayFieldClientComponent,
  CheckboxFieldClientComponent,
  FormState,
} from 'payload';

function answerPaths(fields: FormState, prefix: string) {
  return Object.keys(fields)
    .filter(
      (path) =>
        path.startsWith(`${prefix}.`) &&
        /^\d+\.correct$/.test(path.slice(prefix.length + 1)),
    )
    .sort(
      (a, b) =>
        Number(a.slice(prefix.length + 1).split('.')[0]) -
        Number(b.slice(prefix.length + 1).split('.')[0]),
    );
}

// This remains mounted even when answer rows are collapsed. Removing or
// duplicating a selected answer must still leave exactly one choice selected.
export const QuizAnswerSelection: ArrayFieldClientComponent = ({
  path: suppliedPath,
  readOnly,
}) => {
  const { path, disabled, formInitializing } = useField({
    potentiallyStalePath: suppliedPath,
    hasRows: true,
  });
  const fields = useFormFields(([fields]) => fields);
  const { dispatchFields, setModified } = useForm();
  useEffect(() => {
    if (readOnly || disabled || formInitializing) return;
    const paths = answerPaths(fields, path);
    const selected = paths.filter((key) => fields[key].value === true);
    if (!paths.length || selected.length === 1) return;
    const chosen = selected[0] ?? paths[0];
    const updates: FormState = {};
    for (const key of paths)
      if (fields[key].value !== (key === chosen))
        updates[key] = { ...fields[key], value: key === chosen };
    dispatchFields({ type: 'UPDATE_MANY', formState: updates });
    setModified(true);
  }, [
    fields,
    path,
    disabled,
    readOnly,
    formInitializing,
    dispatchFields,
    setModified,
  ]);
  return null;
};

export const QuizCorrectAnswer: CheckboxFieldClientComponent = ({
  path: suppliedPath,
  readOnly,
}) => {
  const { path, value, disabled } = useField<boolean>({
    potentiallyStalePath: suppliedPath,
  });
  const fields = useFormFields(([fields]) => fields);
  const { dispatchFields, setModified } = useForm();
  return (
    <label
      style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 40 }}
    >
      <input
        type="radio"
        checked={!!value}
        disabled={readOnly || disabled}
        aria-label="Correct answer"
        onChange={() => {
          const prefix = path.replace(/\.\d+\.correct$/, '');
          const updates: FormState = {};
          for (const key of answerPaths(fields, prefix))
            updates[key] = { ...fields[key], value: key === path };
          dispatchFields({ type: 'UPDATE_MANY', formState: updates });
          setModified(true);
        }}
      />
      Correct answer
    </label>
  );
};
