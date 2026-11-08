type WebkitDocument = Document & {
  webkitFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
let owned = false;

export async function enterStoryFullscreen(): Promise<boolean> {
  const doc = document as WebkitDocument;
  if (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone
  )
    return true;
  if (doc.fullscreenElement || doc.webkitFullscreenElement) return true;
  const root = document.documentElement as WebkitElement;
  try {
    // Called directly from the Read/Quiz click, before navigation or any await.
    if (root.requestFullscreen)
      await root.requestFullscreen({ navigationUI: 'hide' });
    else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
    else return false;
    owned = true;
    return true;
  } catch {
    return false;
  }
}
export async function leaveStoryFullscreen() {
  if (!owned) return;
  owned = false;
  const doc = document as WebkitDocument;
  try {
    if (doc.fullscreenElement) await doc.exitFullscreen();
    else if (doc.webkitFullscreenElement) await doc.webkitExitFullscreen?.();
  } catch {
    /* The browser may already have exited full screen. */
  }
}
