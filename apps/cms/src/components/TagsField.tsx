'use client';
import { useEffect, useRef, useState } from 'react';
import { useField, useLocale } from '@payloadcms/ui';
import type { RelationshipFieldClientComponent } from 'payload';
import { slugFromName } from '../editor-utils';

type TagOption = { id: string | number; identifier: string; label?: string };
export const TagsField: RelationshipFieldClientComponent = ({
  path,
  readOnly,
}) => {
  const { value, setValue } = useField<(number | string)[]>({ path });
  const locale = useLocale().code;
  const ids = Array.isArray(value) ? value : [];
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<TagOption[]>([]);
  const [known, setKnown] = useState<Record<string, TagOption>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const adding = useRef(false);
  const remember = (tags: TagOption[]) =>
    setKnown((old) => ({
      ...old,
      ...Object.fromEntries(tags.map((t) => [String(t.id), t])),
    }));
  const selectedKey = ids.join(',');
  useEffect(() => {
    if (!selectedKey) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      'where[id][in]': selectedKey,
      limit: '1000',
      depth: '0',
      locale,
      'fallback-locale': 'en',
    });
    fetch(`/api/tags?${params}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error('Could not load selected tags.');
        remember((await r.json()).docs);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [selectedKey, locale]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          limit: '20',
          depth: '0',
          locale,
          'fallback-locale': 'en',
          sort: 'identifier',
        });
        if (query.trim()) {
          params.set('where[or][0][label][like]', query.trim());
          params.set('where[or][1][identifier][like]', slugFromName(query));
        }
        const response = await fetch(`/api/tags?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error('Could not search tags. Try typing again.');
        const result = await response.json();
        setOptions(result.docs);
        remember(result.docs);
      } catch (e) {
        if (!controller.signal.aborted) setError(String(e));
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, locale]);
  const select = (tag: TagOption) => {
    remember([tag]);
    if (!ids.some((id) => String(id) === String(tag.id)))
      setValue([...ids, tag.id]);
    setQuery('');
    setError('');
  };
  const add = async () => {
    const label = query.trim(),
      identifier = slugFromName(label);
    if (!identifier || readOnly || adding.current) return;
    adding.current = true;
    setBusy(true);
    setError('');
    try {
      const lookup = async () => {
        const params = new URLSearchParams({
          'where[or][0][identifier][equals]': identifier,
          'where[or][1][label][like]': label,
          limit: '1000',
          locale,
          'fallback-locale': 'en',
        });
        const response = await fetch(`/api/tags?${params}`);
        if (!response.ok)
          throw new Error('Could not check existing tags. Please retry.');
        return ((await response.json()).docs as TagOption[]).find(
          (t) =>
            t.identifier === identifier ||
            slugFromName(t.label ?? '') === identifier,
        );
      };
      const existing = await lookup();
      if (existing) {
        select(existing);
        return;
      }
      const response = await fetch(
        `/api/tags?locale=${encodeURIComponent(locale)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, label, active: true }),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        // A second editor may have created the same identifier since our lookup.
        const concurrent = await lookup();
        if (concurrent) {
          select(concurrent);
          return;
        }
        throw new Error(
          result.errors?.[0]?.message ?? 'Could not create tag. Please retry.',
        );
      }
      select(result.doc);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      adding.current = false;
      setBusy(false);
    }
  };
  return (
    <div style={{ marginBottom: 28 }}>
      <label htmlFor={`${path}-tag-input`}>Tags</label>
      <div
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '10px 0' }}
      >
        {ids.map((id) => (
          <span
            key={id}
            className="selected-tag"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              border: '1px solid var(--theme-elevation-300)',
              borderRadius: 18,
              padding: '5px 12px',
            }}
          >
            {known[String(id)]?.label ||
              known[String(id)]?.identifier ||
              `Tag ${id}`}
            <button
              type="button"
              disabled={readOnly || busy}
              aria-label={`Remove ${known[String(id)]?.label || known[String(id)]?.identifier || id}`}
              onClick={() =>
                setValue(ids.filter((x) => String(x) !== String(id)))
              }
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          id={`${path}-tag-input`}
          aria-label="Type a tag"
          value={query}
          disabled={readOnly || busy}
          placeholder="Type a tag, then press Enter"
          style={{ flex: 1, padding: 10 }}
          onChange={(e) => {
            setQuery(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void add();
            }
          }}
        />
        <button
          type="button"
          disabled={readOnly || busy || !slugFromName(query)}
          onClick={() => void add()}
        >
          {busy ? 'Adding…' : 'Add tag'}
        </button>
      </div>
      <p className="admin-hint">
        Choose an existing tag below, or press Enter to create one. New tags are
        saved immediately; save the story to keep its selection.
      </p>
      <div
        aria-label="Existing tags"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
      >
        {options
          .filter((t) => !ids.some((id) => String(id) === String(t.id)))
          .map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={readOnly || busy}
              onClick={() => select(t)}
            >
              {t.label || t.identifier}
            </button>
          ))}
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
};
