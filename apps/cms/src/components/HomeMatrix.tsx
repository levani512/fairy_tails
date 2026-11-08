'use client';
import { useEffect, useState } from 'react';
import { useField, useForm, useFormFields } from '@payloadcms/ui';
type Row = {
  id: number;
  name: string;
  access: 'free' | 'premium';
  status: string;
};
export function HomeMatrix() {
  const [stories, setStories] = useState<Row[]>([]),
    [error, setError] = useState('');
  const { getData, dispatchFields, setModified } = useForm();
  useFormFields(([fields]) => fields);
  const { value: excludedValue, setValue: setExcluded } = useField<number[]>({
    path: 'exclude',
  });
  const { value: includedValue, setValue: setIncluded } = useField<number[]>({
    path: 'include',
  });
  const excluded = Array.isArray(excludedValue) ? excludedValue : [],
    included = Array.isArray(includedValue) ? includedValue : [];
  const data = getData(),
    entries = (data.entries ?? []) as {
      story: number;
      access?: string;
      featured?: boolean;
      order?: number;
    }[];
  useEffect(() => {
    fetch('/api/stories?limit=1000&depth=0')
      .then((r) =>
        r.ok ? r.json() : Promise.reject(new Error('Could not load stories')),
      )
      .then((r) => setStories(r.docs))
      .catch((e) => setError(String(e)));
  }, []);
  const entry = (story: number, key: string, value: unknown) => {
    const index = entries.findIndex((e) => String(e.story) === String(story));
    if (index >= 0)
      dispatchFields({
        type: 'UPDATE',
        path: `entries.${index}.${key}`,
        value,
      });
    else
      dispatchFields({
        type: 'ADD_ROW',
        path: 'entries',
        subFieldState: {
          story: { value: story, valid: true },
          access: { value: key === 'access' ? value : null, valid: true },
          featured: { value: key === 'featured' ? value : false, valid: true },
          order: { value: key === 'order' ? value : 0, valid: true },
        },
      });
    setModified(true);
  };
  return (
    <div style={{ margin: '20px 0', overflowX: 'auto' }}>
      <h3>Regional catalog matrix</h3>
      <p className="admin-hint">
        Changes below are part of this form. Use Save to apply them.
        Draft/archived stories remain unavailable regardless of visibility.
      </p>
      {error && <p role="alert">{error}</p>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Story', 'Visible', 'Access', 'Featured', 'Order'].map((x) => (
              <th key={x} style={{ textAlign: 'left', padding: 8 }}>
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stories.map((story) => {
            const e = entries.find((e) => String(e.story) === String(story.id)),
              visible =
                !excluded.map(String).includes(String(story.id)) &&
                (!included.length ||
                  included.map(String).includes(String(story.id)));
            return (
              <tr key={story.id}>
                <td style={{ padding: 8 }}>
                  {story.name}
                  <small> · {story.status}</small>
                </td>
                <td>
                  <input
                    aria-label={`${story.name} visible`}
                    type="checkbox"
                    checked={visible}
                    onChange={(event) => {
                      if (event.target.checked) {
                        setExcluded(
                          excluded.filter(
                            (id) => String(id) !== String(story.id),
                          ),
                        );
                        if (
                          included.length &&
                          !included.map(String).includes(String(story.id))
                        )
                          setIncluded([...included, story.id]);
                      } else setExcluded([...new Set([...excluded, story.id])]);
                    }}
                  />
                </td>
                <td>
                  <select
                    aria-label={`${story.name} access`}
                    value={e?.access ?? ''}
                    onChange={(event) =>
                      entry(story.id, 'access', event.target.value || null)
                    }
                  >
                    <option value="">Default ({story.access})</option>
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                  </select>
                </td>
                <td>
                  <input
                    aria-label={`${story.name} featured`}
                    type="checkbox"
                    checked={e?.featured ?? false}
                    onChange={(event) =>
                      entry(story.id, 'featured', event.target.checked)
                    }
                  />
                </td>
                <td>
                  <input
                    aria-label={`${story.name} order`}
                    type="number"
                    min={0}
                    value={e?.order ?? 0}
                    style={{ width: 80 }}
                    onChange={(event) =>
                      entry(story.id, 'order', Number(event.target.value))
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
