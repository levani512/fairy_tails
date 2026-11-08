'use client';
import { useField } from '@payloadcms/ui';
import type { NumberFieldClientComponent } from 'payload';

// Display seconds while keeping existing stored values and playback timings intact.
export const FadeDurationField: NumberFieldClientComponent = ({
  path,
  readOnly,
}) => {
  const { value, setValue, showError, errorMessage } = useField<number | null>({
    path,
  });
  return (
    <div className="fade-duration-field field-type">
      <label className="field-label" htmlFor={`field-${path}`}>
        Fade Duration
      </label>
      <div className="seconds-input">
        <input
          id={`field-${path}`}
          aria-label="Fade Duration in seconds"
          type="number"
          min={0}
          step="0.1"
          value={value == null ? '' : value / 1000}
          readOnly={readOnly}
          onChange={(e) =>
            setValue(
              e.target.value === ''
                ? null
                : Math.round(Number(e.target.value) * 1000),
            )
          }
        />
        <span>seconds</span>
      </div>
      {showError && <p role="alert">{errorMessage}</p>}
    </div>
  );
};
