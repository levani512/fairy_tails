'use client';
import { useState } from 'react';
import type { Manifest } from '../../../../../../packages/shared/src/index';
import {
  textSegments,
  activeWord,
} from '../../../../../../packages/story-player/src/index';
export default function Preview({ manifest }: { manifest: Manifest }) {
  const [page, setPage] = useState(0),
    [position, setPosition] = useState(0),
    p = manifest.pages[page],
    active = activeWord(p.timings, position);
  return (
    <section style={{ maxWidth: 800, marginBottom: 40 }}>
      <h2>
        {manifest.title} ({manifest.language})
      </h2>
      {p.video ? (
        <video
          key={p.id}
          src={p.video.url}
          controls
          muted
          style={{ width: '100%' }}
        />
      ) : (
        <img src={p.illustration.url} alt={p.name} style={{ width: '100%' }} />
      )}
      <p style={{ fontSize: 26, lineHeight: 1.7 }}>
        {textSegments(p.text, p.timings).map((s, i) => (
          <span
            key={i}
            style={{
              background: s.index === active ? '#f6d58c' : 'transparent',
            }}
          >
            {s.text}
          </span>
        ))}
      </p>
      {p.narration && <audio
        key={p.narration.id}
        controls
        src={p.narration.url}
        onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime * 1000)}
      />}
      <p>
        <button
          disabled={page === 0}
          onClick={() => {
            setPage(page - 1);
            setPosition(0);
          }}
        >
          Previous
        </button>{' '}
        {page + 1}/{manifest.pages.length}{' '}
        <button
          disabled={page === manifest.pages.length - 1}
          onClick={() => {
            setPage(page + 1);
            setPosition(0);
          }}
        >
          Next
        </button>
      </p>
    </section>
  );
}
