import { illustrationSizeError } from '../../../../packages/shared/src/illustration';

export async function validateIllustrationUpload(file: File) {
  const video = file.type.startsWith('video/');
  if (!video && !file.type.startsWith('image/'))
    throw new Error('Choose an image or video illustration.');
  const url = URL.createObjectURL(file);
  const element = video ? document.createElement('video') : new Image();
  try {
    const size = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const timer = setTimeout(
          () =>
            reject(
              new Error(
                'Could not read illustration dimensions. Try another file.',
              ),
            ),
          15000,
        );
        const fail = () => {
          clearTimeout(timer);
          reject(
            new Error(
              'Could not read illustration dimensions. Try another file.',
            ),
          );
        };
        element.onerror = fail;
        if (element instanceof HTMLVideoElement) {
          element.preload = 'metadata';
          element.onloadedmetadata = () => {
            clearTimeout(timer);
            resolve({ width: element.videoWidth, height: element.videoHeight });
          };
        } else {
          element.onload = () => {
            clearTimeout(timer);
            resolve({
              width: element.naturalWidth,
              height: element.naturalHeight,
            });
          };
        }
        element.src = url;
      },
    );
    const error = illustrationSizeError(size.width, size.height);
    if (error) throw new Error(error);
  } finally {
    element.removeAttribute('src');
    if (element instanceof HTMLVideoElement) element.load();
    URL.revokeObjectURL(url);
  }
}
