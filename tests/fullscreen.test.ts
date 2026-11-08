import { afterEach, expect, it, vi } from 'vitest';
import {
  enterStoryFullscreen,
  leaveStoryFullscreen,
} from '../apps/client/src/fullscreen.web';
afterEach(() => vi.unstubAllGlobals());
function setup() {
  const doc = {
    documentElement: {
      requestFullscreen: vi.fn(async () => {
        doc.fullscreenElement = doc.documentElement;
      }),
    },
    fullscreenElement: null as unknown,
    exitFullscreen: vi.fn(async () => {
      doc.fullscreenElement = null;
    }),
  };
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  vi.stubGlobal('navigator', {});
  return doc;
}
it('requests the whole document and restores browser mode on exit', async () => {
  const doc = setup();
  expect(await enterStoryFullscreen()).toBe(true);
  expect(doc.documentElement.requestFullscreen).toHaveBeenCalledWith({
    navigationUI: 'hide',
  });
  await leaveStoryFullscreen();
  expect(doc.exitFullscreen).toHaveBeenCalledOnce();
});
it('does not exit full screen that was already enabled outside the story', async () => {
  const doc = setup();
  doc.fullscreenElement = doc.documentElement;
  expect(await enterStoryFullscreen()).toBe(true);
  await leaveStoryFullscreen();
  expect(doc.exitFullscreen).not.toHaveBeenCalled();
});
it('handles browser rejection without blocking story navigation', async () => {
  const doc = setup();
  doc.documentElement.requestFullscreen.mockRejectedValueOnce(
    new Error('Unsupported'),
  );
  expect(await enterStoryFullscreen()).toBe(false);
});
it('recognizes Home Screen standalone mode without requesting browser fullscreen', async () => {
  const doc = setup();
  vi.stubGlobal('navigator', { standalone: true });
  expect(await enterStoryFullscreen()).toBe(true);
  expect(doc.documentElement.requestFullscreen).not.toHaveBeenCalled();
});
